#!/bin/bash

echo "========================================="
echo "  Nginx 一键部署"
echo "========================================="
echo ""
echo "  此脚本将基于 Docker 部署 Nginx 反向代理，"
echo "  支持自定义域名和 HTTPS 证书。"
echo ""

# ====== 检查依赖 ======
check_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] 需要安装 '$1'"; exit 1
  }
}

check_cmd docker

if docker compose version >/dev/null 2>&1; then
  COMPOSE="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE="docker-compose"
else
  echo "[ERROR] 未找到 Docker Compose"; exit 1
fi

# ====== 端口检测 ======
port_in_use() {
  local port=$1
  if command -v lsof >/dev/null 2>&1; then
    lsof -i :"${port}" -sTCP:LISTEN >/dev/null 2>&1 && return 0
  elif command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -q ":${port} " && return 0
  fi
  return 1
}

NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

if port_in_use $NGINX_HTTP_PORT; then
  echo "[WARN] 端口 ${NGINX_HTTP_PORT} 已被占用"
  echo ""
  echo "  解决方法："
  echo "    1) 停止占用进程后再部署"
  echo "    2) 使用其他端口（如 8080）"
  echo ""
  read -p "请选择 (1/2): " PORT_CHOICE
  case $PORT_CHOICE in
    2)
      read -p "请输入替代端口号: " NGINX_HTTP_PORT
      if port_in_use $NGINX_HTTP_PORT; then
        echo "[ERROR] 端口 ${NGINX_HTTP_PORT} 也被占用"; exit 1
      fi
      ;;
    *)
      echo "[INFO] 请先执行: sudo systemctl stop nginx && sudo systemctl stop apache2"
      echo "         然后重新运行本脚本"
      exit 1
      ;;
  esac
fi

# ====== 交互式输入 ======
echo ""
echo "--- 基础配置 ---"
read -p "请输入域名: " DOMAIN
if [ -z "$DOMAIN" ]; then
  echo "[ERROR] 域名不能为空"; exit 1
fi

read -p "请输入后端服务地址（如 http://localhost:3200）: " BACKEND
if [ -z "$BACKEND" ]; then
  echo "[ERROR] 后端地址不能为空"; exit 1
fi

read -p "是否启用 HTTPS? (y/N): " SSL_INPUT
if [ "$SSL_INPUT" = "y" ] || [ "$SSL_INPUT" = "Y" ]; then
  ENABLE_SSL=true
  read -p "请输入证书通知邮箱: " CERT_EMAIL
  if [ -z "$CERT_EMAIL" ]; then
    echo "[ERROR] 启用 HTTPS 必须提供邮箱"; exit 1
  fi
else
  ENABLE_SSL=false
  CERT_EMAIL=""
fi

echo ""
echo "--- 配置确认 ---"
echo "  域名:       ${DOMAIN}"
echo "  后端地址:   ${BACKEND}"
echo "  HTTP 端口:  ${NGINX_HTTP_PORT}"
echo "  HTTPS:      ${ENABLE_SSL}"
if $ENABLE_SSL; then
  echo "  邮箱:       ${CERT_EMAIL}"
fi
echo ""
read -p "确认开始部署? (Y/n): " CONFIRM
if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
  echo "已取消"; exit 0
fi

# ====== 生成站点配置 ======
echo "[INFO] 生成 Nginx 站点配置..."

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
SITE_CONF="${SCRIPT_DIR}/conf.d/${DOMAIN}.conf"

if $ENABLE_SSL; then
  # 先 HTTP 配置（用于证书验证）
  sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
      -e "s|{{BACKEND}}|$BACKEND|g" \
      -e '/{{#SSL_ONLY_REDIRECT}}/,/{{\/SSL_ONLY_REDIRECT}}/d' \
      -e '/{{#SSL}}/,/{{\/SSL}}/d' \
      "${SCRIPT_DIR}/conf.d/default.conf.template" > "$SITE_CONF"
else
  sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
      -e "s|{{BACKEND}}|$BACKEND|g" \
      -e '/{{#SSL_ONLY_REDIRECT}}/,/{{\/SSL_ONLY_REDIRECT}}/d' \
      -e '/{{#SSL}}/,/{{\/SSL}}/d' \
      "${SCRIPT_DIR}/conf.d/default.conf.template" > "$SITE_CONF"
fi

# ====== 创建目录 ======
mkdir -p "${SCRIPT_DIR}/ssl" "${SCRIPT_DIR}/www" "${SCRIPT_DIR}/log"

# ====== 启动 ======
echo "[INFO] 启动 Nginx 容器..."
cd "$SCRIPT_DIR"
$COMPOSE up -d

if [ $? -ne 0 ]; then
  echo "[ERROR] 容器启动失败，请检查: docker compose logs"
  exit 1
fi

echo "[OK] Nginx 已启动"

# ====== SSL 证书 ======
if $ENABLE_SSL; then
  echo ""
  echo "[INFO] 等待 Nginx 就绪..."
  sleep 3

  echo "[INFO] 申请 Let's Encrypt 证书 (${DOMAIN})..."
  cd "$SCRIPT_DIR"
  docker run --rm \
    --name certbot-nginx \
    --network nginx_nginx-net \
    -v "${SCRIPT_DIR}/ssl:/etc/letsencrypt" \
    -v "${SCRIPT_DIR}/www:/var/www/certbot" \
    certbot/certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$CERT_EMAIL" \
    --agree-tos --non-interactive \
    -d "$DOMAIN"

  if [ $? -eq 0 ]; then
    echo "[OK] 证书已获取"

    # 切换到 HTTPS 配置
    sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
        -e "s|{{BACKEND}}|$BACKEND|g" \
        -e '/{{#SSL_ONLY_REDIRECT}}/,/{{\/SSL_ONLY_REDIRECT}}/d' \
        -e 's|{{#SSL}}||g' \
        -e 's|{{/SSL}}||g' \
        "${SCRIPT_DIR}/conf.d/default.conf.template" > "$SITE_CONF"

    $COMPOSE restart nginx
    echo "[OK] HTTPS 已启用"

    # 自动续期
    echo "[INFO] 添加证书自动续期定时任务..."
    CRON_CMD="0 3 * * * docker run --rm --name certbot-nginx-renew --network nginx_nginx-net -v ${SCRIPT_DIR}/ssl:/etc/letsencrypt -v ${SCRIPT_DIR}/www:/var/www/certbot certbot/certbot renew --quiet && docker restart nginx-proxy"
    (crontab -l 2>/dev/null | grep -v "certbot-nginx-renew"; echo "$CRON_CMD") | crontab -
    echo "[OK] 已配置每天凌晨 3 点自动续期"

    PROTO="https"
    DISPLAY_PORT=""
  else
    echo "[ERROR] 证书申请失败（请确保域名 ${DOMAIN} 已解析到本服务器 IP）"
    echo "       保留 HTTP 模式运行"
    PROTO="http"
    if [ "$NGINX_HTTP_PORT" != "80" ]; then
      DISPLAY_PORT=":${NGINX_HTTP_PORT}"
    else
      DISPLAY_PORT=""
    fi
  fi
else
  PROTO="http"
  if [ "$NGINX_HTTP_PORT" != "80" ]; then
    DISPLAY_PORT=":${NGINX_HTTP_PORT}"
  else
    DISPLAY_PORT=""
  fi
fi

echo ""
echo "========================================="
echo "  Nginx 部署完成！"
echo "  访问地址: ${PROTO}://${DOMAIN}${DISPLAY_PORT}"
echo ""
echo "  配置文件: ${SITE_CONF}"
echo "  查看日志: docker compose logs -f nginx"
echo "  重载配置: docker compose restart nginx"
echo "========================================="
