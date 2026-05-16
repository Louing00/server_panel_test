#!/bin/bash
set -e

# ====== 默认值 ======
DOMAIN=""
ENABLE_SSL=false
CERT_EMAIL=""

# ====== 解析参数 ======
show_help() {
  echo "用法: ./deploy.sh [选项]"
  echo ""
  echo "选项:"
  echo "  -d, --domain DOMAIN    绑定域名 (例如 panel.example.com)"
  echo "  --ssl                   启用 Let's Encrypt HTTPS 证书"
  echo "  --email EMAIL          证书通知邮箱 (启用 --ssl 时建议填写)"
  echo "  -h, --help              显示帮助信息"
  echo ""
  echo "示例:"
  echo "  ./deploy.sh                                  # 本地测试，localhost，无 SSL"
  echo "  ./deploy.sh -d panel.example.com             # 绑定域名，HTTP"
  echo "  ./deploy.sh -d panel.example.com --ssl \\"
  echo "              --email admin@example.com         # 绑定域名 + HTTPS"
  exit 0
}

while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--domain)
      DOMAIN="$2"; shift 2 ;;
    --ssl)
      ENABLE_SSL=true; shift ;;
    --email)
      CERT_EMAIL="$2"; shift 2 ;;
    -h|--help)
      show_help ;;
    *)
      echo "未知参数: $1"; show_help ;;
  esac
done

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

# ====== 校验参数 ======
if $ENABLE_SSL && [ -z "$DOMAIN" ]; then
  echo "[ERROR] 启用 SSL 必须提供域名 (-d DOMAIN)"; exit 1
fi

# 没有域名时用 localhost
if [ -z "$DOMAIN" ]; then
  DOMAIN="_"
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
EOF
  echo "[OK] .env 已生成"
else
  echo "[INFO] .env 已存在，跳过"
fi

# ====== 生成 nginx 配置 ======
echo "[INFO] 生成 Nginx 配置 (域名: $DOMAIN, SSL: $ENABLE_SSL)..."

if $ENABLE_SSL; then
  # 首次用 HTTP-only 启动，证书拿到后再切 HTTPS
  sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
      -e '/{{#SSL}}/,/{{\/SSL}}/d' \
      docker/nginx/nginx.conf.template > docker/nginx/nginx.conf
else
  sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
      -e '/{{#SSL}}/,/{{\/SSL}}/d' \
      docker/nginx/nginx.conf.template > docker/nginx/nginx.conf
fi

# ====== 创建必要目录 ======
mkdir -p data
mkdir -p docker/nginx/ssl
mkdir -p docker/nginx/www

# ====== 构建并启动 ======
echo "[INFO] 构建镜像并启动容器..."
echo "       - sm-server    (NestJS 后端 :3200)"
echo "       - sm-client    (React 前端)"
echo "       - sm-nginx     (Nginx 反向代理 :80)"
if $ENABLE_SSL; then
  echo "       - sm-certbot   (Let's Encrypt 证书)"
fi
$COMPOSE up -d --build

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
    --email "${CERT_EMAIL:-admin@$DOMAIN}" \
    --agree-tos --non-interactive \
    -d "$DOMAIN"

  if [ $? -eq 0 ]; then
    echo "[OK] 证书已获取，切换为 HTTPS 配置..."

    # 生成 HTTPS 版 nginx 配置
    sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
        -e 's|{{#SSL}}||g' \
        -e 's|{{/SSL}}||g' \
        docker/nginx/nginx.conf.template > docker/nginx/nginx.conf

    # 重载 nginx
    $COMPOSE restart nginx

    echo "[OK] HTTPS 已启用!"

    # 添加证书自动续期 cron
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

echo ""
echo "========================================="
echo "  部署完成！"
if [ "$DOMAIN" != "_" ]; then
  echo "  访问地址: ${PROTO}://${DOMAIN}"
else
  echo "  访问地址: http://localhost"
fi
echo "========================================="
