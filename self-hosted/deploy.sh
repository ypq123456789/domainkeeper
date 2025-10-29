#!/bin/bash

# DomainKeeper 一键部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

echo "================================"
echo "DomainKeeper 自动部署脚本"
echo "================================"

# 检查是否为root用户
if [ "$EUID" -ne 0 ]; then
    echo "请以root权限运行此脚本"
    exit 1
fi

# 更新系统
echo "正在更新系统包..."
apt-get update

# 安装必要的软件
echo "正在安装必要的软件..."
apt-get install -y curl wget git

# 安装Docker
if ! command -v docker &> /dev/null; then
    echo "正在安装Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    systemctl enable docker
    systemctl start docker
    rm get-docker.sh
else
    echo "Docker已安装"
fi

# 安装Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "正在安装Docker Compose..."
    curl -L "https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose已安装"
fi

# 创建项目目录
PROJECT_DIR="/opt/domainkeeper"
echo "正在创建项目目录: $PROJECT_DIR"
mkdir -p $PROJECT_DIR
cd $PROJECT_DIR

# 下载项目文件（这里需要根据实际情况修改）
echo "正在下载项目文件..."
if [ ! -d ".git" ]; then
    # 如果不是git仓库，这里可以替换为实际的下载方式
    echo "请手动下载项目文件到 $PROJECT_DIR 目录"
    echo "或者修改此脚本中的下载逻辑"
    # git clone https://github.com/your-repo/domainkeeper.git .
fi

# 复制环境变量配置文件
if [ ! -f ".env" ]; then
    echo "正在创建环境配置文件..."
    cp .env.example .env
    
    # 生成随机JWT密钥
    JWT_SECRET=$(openssl rand -base64 32)
    sed -i "s/your_super_secret_jwt_key_change_this_in_production/$JWT_SECRET/" .env
    
    echo "======================================="
    echo "重要：请编辑 .env 文件配置您的设置："
    echo "- 修改管理员密码 (ADMIN_PASSWORD)"
    echo "- 配置Cloudflare API Token (可选)"
    echo "- 配置WHOIS服务地址 (可选)"
    echo "======================================="
    echo "配置文件位置: $PROJECT_DIR/.env"
fi

# 设置文件权限
chown -R root:root $PROJECT_DIR
chmod -R 755 $PROJECT_DIR

# 创建systemd服务文件
echo "正在创建系统服务..."
cat > /etc/systemd/system/domainkeeper.service << EOF
[Unit]
Description=DomainKeeper Service
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$PROJECT_DIR
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

# 启用并启动服务
systemctl daemon-reload
systemctl enable domainkeeper.service

# 设置防火墙（如果ufw存在）
if command -v ufw &> /dev/null; then
    echo "正在配置防火墙..."
    ufw allow 80/tcp
    ufw allow 3001/tcp
fi

echo "======================================="
echo "部署完成！"
echo "======================================="
echo "配置文件: $PROJECT_DIR/.env"
echo "启动服务: systemctl start domainkeeper"
echo "查看状态: systemctl status domainkeeper"
echo "查看日志: cd $PROJECT_DIR && docker-compose logs -f"
echo ""
echo "请先编辑配置文件，然后启动服务："
echo "1. nano $PROJECT_DIR/.env"
echo "2. systemctl start domainkeeper"
echo ""
echo "访问地址: http://your-server-ip"
echo "======================================="
