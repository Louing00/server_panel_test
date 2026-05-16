#!/bin/bash
# 不使用 set -e，因为端口检测命令可能返回非零但这是正常的
# 关键步骤单独用 || exit 1 做错误处理

echo "========================================="
echo "  ServerPanel - 一键部署"
echo "========================================="
echo ""

# ====== 检查依赖 ======
check_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "[ERROR] 需要安装 '$1'"; exit 1
  }
}

check_cmd docker
check_cmd openssl

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
  local result=1
  if command -v lsof >/dev/null 2>&1; then
    lsof -i :"${port}" -sTCP:LISTEN >/dev/null 2>&1 && result=0
  elif command -v ss >/dev/null 2>&1; then
    ss -tlnp 2>/dev/null | grep -q ":${port} " && result=0
  elif command -v netstat >/dev/null 2>&1; then
    netstat -tlnp 2>/dev/null | grep -q ":${port} " && result=0
  fi
  return $result
}

find_port_process() {
  local port=$1
  local out="未知进程"
  if command -v lsof >/dev/null 2>&1; then
    out=$(lsof -i :"${port}" -sTCP:LISTEN 2>/dev/null | tail -n +2 | awk '{print $1" (PID "$2")"}' | head -3 | tr '\n' ' ')
  fi
  echo "${out:-未知进程}"
}

NGINX_HTTP_PORT=80
NGINX_HTTPS_PORT=443

if port_in_use $NGINX_HTTP_PORT; then
  echo "[WARN] 端口 ${NGINX_HTTP_PORT} 已被占用！"
  echo "  占用进程: $(find_port_process $NGINX_HTTP_PORT)"
  echo ""
  echo "  可能原因："
  echo "    - 服务器已安装 Nginx/Apache 在运行"
  echo "    - 之前的部署未完全关闭"
  echo "    - 其他 Web 服务占用了 80 端口"
  echo ""
  echo "  解决方法："
  echo "    1) 停止占用进程: systemctl stop nginx / apache2"
  echo "    2) 清理旧容器:   docker compose down"
  echo "    3) 使用其他端口 (如 8080)"
  echo ""
  read -p "请选择 (1/2/3): " PORT_CHOICE

  case $PORT_CHOICE in
    1)
      echo "[INFO] 请手动执行以下命令后重新部署:"
      echo "       sudo systemctl stop nginx"
      echo "       sudo systemctl stop apache2"
      exit 1
      ;;
    2)
      echo "[INFO] 清理旧容器..."
      $COMPOSE down 2>/dev/null || true
      docker rm -f sm-nginx sm-server sm-client 2>/dev/null || true
      if port_in_use $NGINX_HTTP_PORT; then
        echo "[ERROR] 清理后端口仍被占用，请手动排查"
        exit 1
      fi
      echo "[OK] 端口已释放"
      ;;
    3)
      read -p "请输入替代端口号: " NGINX_HTTP_PORT
      if port_in_use $NGINX_HTTP_PORT; then
        echo "[ERROR] 端口 ${NGINX_HTTP_PORT} 也被占用"; exit 1
      fi
      echo "[OK] 将使用端口 ${NGINX_HTTP_PORT}"
      ;;
    *)
      echo "已取消"; exit 1
      ;;
  esac
fi

# ====== 交互式输入 ======
echo ""
echo "--- 域名配置 ---"
read -p "请输入域名（留空则本地测试）: " DOMAIN

if [ -n "$DOMAIN" ]; then
  read -p "是否启用 HTTPS? (y/N): " ENABLE_SSL_INPUT
  if [ "$ENABLE_SSL_INPUT" = "y" ] || [ "$ENABLE_SSL_INPUT" = "Y" ]; then
    ENABLE_SSL=true
    read -p "请输入证书通知邮箱: " CERT_EMAIL
    if [ -z "$CERT_EMAIL" ]; then
      echo "[ERROR] 启用 HTTPS 必须提供邮箱"; exit 1
    fi
  else
    ENABLE_SSL=false
    CERT_EMAIL=""
  fi
else
  DOMAIN="_"
  ENABLE_SSL=false
  CERT_EMAIL=""
fi

echo ""
echo "--- 配置确认 ---"
echo "  域名:      ${DOMAIN}"
echo "  访问端口:  ${NGINX_HTTP_PORT}"
echo "  HTTPS:     ${ENABLE_SSL}"
if $ENABLE_SSL; then
  echo "  邮箱:      ${CERT_EMAIL}"
fi
echo ""
read -p "确认开始部署? (Y/n): " CONFIRM
if [ "$CONFIRM" = "n" ] || [ "$CONFIRM" = "N" ]; then
  echo "已取消"; exit 0
fi

# ====== 生成 .env ======
if [ ! -f .env ]; then
  echo "[INFO] 生成 .env..."
  cat > .env <<EOF
JWT_SECRET=$(openssl rand -base64 32)
ENCRYPTION_KEY=$(openssl rand -hex 16)
PORT=3200
DATABASE_URL=file:/app/data/server-manager.db
DOMAIN=$DOMAIN
CERT_EMAIL=$CERT_EMAIL
NGINX_HTTP_PORT=$NGINX_HTTP_PORT
NGINX_HTTPS_PORT=$NGINX_HTTPS_PORT
EOF
  echo "[OK] .env 已生成"
else
  echo "[INFO] .env 已存在，跳过"
  # 补充 NGINX 端口变量
  grep -q "NGINX_HTTP_PORT" .env 2>/dev/null || echo "NGINX_HTTP_PORT=$NGINX_HTTP_PORT" >> .env
  grep -q "NGINX_HTTPS_PORT" .env 2>/dev/null || echo "NGINX_HTTPS_PORT=$NGINX_HTTPS_PORT" >> .env
fi

# ====== 生成 nginx 配置 ======
echo "[INFO] 生成 Nginx 配置..."

sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
    -e '/{{#SSL}}/,/{{\/SSL}}/d' \
    docker/nginx/nginx.conf.template > docker/nginx/nginx.conf

# ====== 创建必要目录 ======
mkdir -p data docker/nginx/ssl docker/nginx/www

# ====== 构建并启动 ======
echo "[INFO] 构建镜像并启动容器..."
echo "       - sm-server    (NestJS 后端 :3200)"
echo "       - sm-client    (React 前端)"
echo "       - sm-nginx     (Nginx 反向代理 :${NGINX_HTTP_PORT})"
$COMPOSE up -d --build || {
  echo ""
  echo "[ERROR] 容器启动失败，请检查 Docker 日志："
  echo "       docker compose logs"
  exit 1
}

# ====== SSL 证书获取 ======
if $ENABLE_SSL; then
  echo ""
  echo "[INFO] 等待 Nginx 就绪..."
  sleep 5

  echo "[INFO] 申请 Let's Encrypt 证书 ($DOMAIN)..."
  docker run --rm \
    --name sm-certbot \
    --network sm-network \
    -v "$(pwd)/docker/nginx/ssl:/etc/letsencrypt" \
    -v "$(pwd)/docker/nginx/www:/var/www/certbot" \
    certbot/certbot \
    certonly --webroot \
    --webroot-path=/var/www/certbot \
    --email "$CERT_EMAIL" \
    --agree-tos --non-interactive \
    -d "$DOMAIN"

  if [ $? -eq 0 ]; then
    echo "[OK] 证书已获取，切换为 HTTPS 配置..."

    sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
        -e 's|{{#SSL}}||g' \
        -e 's|{{/SSL}}||g' \
        docker/nginx/nginx.conf.template > docker/nginx/nginx.conf

    $COMPOSE restart nginx
    echo "[OK] HTTPS 已启用!"

    echo "[INFO] 添加证书自动续期定时任务..."
    CRON_CMD="0 3 * * * docker run --rm --name sm-certbot-renew --network sm-network -v $(pwd)/docker/nginx/ssl:/etc/letsencrypt -v $(pwd)/docker/nginx/www:/var/www/certbot certbot/certbot renew --quiet && docker restart sm-nginx"
    (crontab -l 2>/dev/null | grep -v "sm-certbot-renew"; echo "$CRON_CMD") | crontab -
    echo "[OK] 已配置每天凌晨 3 点自动续期"

    PROTO="https"
  else
    echo "[ERROR] 证书申请失败，保持 HTTP 模式"
    PROTO="http"
  fi
else
  PROTO="http"
fi

# ====== 如果用 HTTPS 但端口不是 443，提示实际端口 ======
DISPLAY_PORT=""
if [ "$NGINX_HTTP_PORT" != "80" ]; then
  DISPLAY_PORT=":${NGINX_HTTP_PORT}"
fi

echo ""
echo "========================================="
echo "  部署完成！"
if [ "$DOMAIN" != "_" ]; then
  echo "  访问地址: ${PROTO}://${DOMAIN}${DISPLAY_PORT}"
else
  echo "  访问地址: http://localhost${DISPLAY_PORT}"
fi
echo "========================================="
