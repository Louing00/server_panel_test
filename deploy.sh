#!/bin/bash
set -e

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

# ====== 交互式输入 ======
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
echo "  域名:     ${DOMAIN}"
echo "  HTTPS:    ${ENABLE_SSL}"
if $ENABLE_SSL; then
  echo "  邮箱:     ${CERT_EMAIL}"
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
EOF
  echo "[OK] .env 已生成"
else
  echo "[INFO] .env 已存在，跳过"
fi

# ====== 生成 nginx 配置 ======
echo "[INFO] 生成 Nginx 配置..."

# 先用 HTTP-only 配置启动（SSL 后续再切）
sed -e "s|{{DOMAIN}}|$DOMAIN|g" \
    -e '/{{#SSL}}/,/{{\/SSL}}/d' \
    docker/nginx/nginx.conf.template > docker/nginx/nginx.conf

# ====== 创建必要目录 ======
mkdir -p data docker/nginx/ssl docker/nginx/www

# ====== 构建并启动 ======
echo "[INFO] 构建镜像并启动容器..."
echo "       - sm-server    (NestJS 后端 :3200)"
echo "       - sm-client    (React 前端)"
echo "       - sm-nginx     (Nginx 反向代理 :80)"
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

echo ""
echo "========================================="
echo "  部署完成！"
if [ "$DOMAIN" != "_" ]; then
  echo "  访问地址: ${PROTO}://${DOMAIN}"
else
  echo "  访问地址: http://localhost"
fi
echo "========================================="
