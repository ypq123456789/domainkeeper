# DomainKeeper 前后端分离版本部署指南

## 项目介绍

DomainKeeper 前后端分离版本是一个现代化的域名管理系统，提供了Web界面来管理和监控您的域名。本版本支持自托管部署，具有以下特性：

### 主要功能

- 🌐 **域名管理**: 添加、编辑、删除域名记录
- 🔄 **Cloudflare集成**: 自动同步Cloudflare域名
- 🔍 **WHOIS查询**: 获取域名注册信息
- 📊 **可视化仪表板**: 域名状态统计图表
- ⏰ **过期提醒**: 域名到期状态监控
- 🔐 **权限管理**: 前台访问和后台管理分离
- 🐳 **Docker支持**: 一键部署，易于维护

### 技术栈

**后端**:
- Node.js + Express
- SQLite 数据库
- JWT 认证
- 定时任务同步

**前端**:
- Vue.js 3
- Element Plus UI
- ECharts 图表
- Responsive 响应式设计

## 快速开始

### 方式一：Docker Compose 部署（推荐）

#### 1. 准备环境

确保您的服务器已安装：
- Docker
- Docker Compose

#### 2. 下载项目

```bash
git clone <repository-url>
cd domainkeeper/self-hosted
```

#### 3. 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑配置文件
nano .env
```

**重要配置说明**:

```bash
# 必须修改的配置
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
ADMIN_PASSWORD=your_secure_admin_password

# Cloudflare配置（可选）
CF_API_TOKEN=your_cloudflare_api_token

# WHOIS服务配置（可选）
WHOIS_PROXY_URL=https://whois.0o11.com

# 前台访问密码（可选）
ACCESS_PASSWORD=
```

#### 4. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看运行状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

#### 5. 访问系统

- **前台地址**: http://your-server-ip
- **管理后台**: 点击页面上的"管理后台"按钮

### 方式二：手动部署

#### 后端部署

1. **环境准备**
```bash
# 安装 Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 进入后端目录
cd backend
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境**
```bash
cp .env.example .env
nano .env
```

4. **启动服务**
```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

#### 前端部署

1. **构建前端**
```bash
cd frontend
npm install
npm run build
```

2. **配置Nginx**
```bash
# 复制构建文件到web目录
sudo cp -r dist/* /var/www/html/

# 配置Nginx代理
sudo nano /etc/nginx/sites-available/domainkeeper
```

Nginx配置示例：
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        root /var/www/html;
        try_files $uri $uri/ /index.html;
    }
    
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 配置说明

### 环境变量详解

| 变量名 | 说明 | 默认值 | 必需 |
|--------|------|---------|------|
| `JWT_SECRET` | JWT加密密钥 | - | ✅ |
| `ADMIN_USERNAME` | 管理员用户名 | admin | ✅ |
| `ADMIN_PASSWORD` | 管理员密码 | admin123 | ✅ |
| `ACCESS_PASSWORD` | 前台访问密码 | 空 | ❌ |
| `CF_API_TOKEN` | Cloudflare API Token | - | ❌ |
| `WHOIS_PROXY_URL` | WHOIS代理服务地址 | - | ❌ |
| `SYNC_INTERVAL` | 同步间隔(分钟) | 60 | ❌ |
| `FRONTEND_URL` | 前端地址 | http://localhost | ❌ |
| `CUSTOM_TITLE` | 自定义标题 | 我的域名管理 | ❌ |

### Cloudflare API Token 获取

1. 访问 [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens)
2. 点击 "Create Token"
3. 选择 "Zone:Read" 模板
4. 配置权限：
   - Zone Resources: Include - All zones
   - Zone Permissions: Zone:Read
5. 复制生成的token到配置文件

### WHOIS 代理服务

如需WHOIS功能，可以：
1. 使用公共服务: `https://whois.0o11.com`
2. 自建WHOIS代理: 参考 [whois-proxy项目](https://github.com/ypq123456789/whois-proxy)

## 使用指南

### 首次登录

1. **前台访问**: 
   - 如果设置了`ACCESS_PASSWORD`，输入前台密码
   - 如果没有设置密码，直接点击"进入系统"

2. **管理后台**:
   - 使用管理员用户名和密码登录
   - 可以管理域名、同步数据、查看统计信息

### 域名管理

1. **同步Cloudflare域名**:
   - 在管理后台点击"同步Cloudflare"按钮
   - 系统会自动获取所有Zone信息

2. **手动添加域名**:
   - 点击"添加域名"按钮
   - 填写域名信息并保存

3. **编辑域名信息**:
   - 点击域名行的"编辑"按钮
   - 修改注册商、日期等信息

### 自动化功能

- **定时同步**: 系统会根据`SYNC_INTERVAL`设置自动同步域名
- **WHOIS更新**: 自动更新顶级域名的WHOIS信息
- **过期监控**: 自动计算剩余天数并提供状态指示

## 维护与监控

### 日志查看

```bash
# Docker方式
docker-compose logs -f backend
docker-compose logs -f frontend

# 手动部署方式
tail -f backend/logs/combined.log
```

### 数据备份

```bash
# 备份数据库
docker-compose exec backend cp /app/data/domains.db /app/backup-$(date +%Y%m%d).db

# 或直接复制数据卷
docker cp domainkeeper-backend:/app/data ./backup/
```

### 更新升级

```bash
# 停止服务
docker-compose down

# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

## 故障排除

### 常见问题

**Q: 无法访问管理后台**
A: 检查管理员密码配置，确保`ADMIN_PASSWORD`已正确设置

**Q: Cloudflare同步失败**
A: 验证`CF_API_TOKEN`是否正确，检查token权限

**Q: WHOIS查询不工作**
A: 检查`WHOIS_PROXY_URL`配置，确保服务可访问

**Q: 前端无法连接后端**
A: 检查网络配置，确保API地址正确

### 端口检查

```bash
# 检查端口占用
netstat -tlnp | grep :3001  # 后端端口
netstat -tlnp | grep :80    # 前端端口

# 测试API连接
curl http://localhost:3001/api/health
```

### 性能优化

1. **数据库优化**:
   - 定期清理过期WHOIS缓存
   - 监控数据库文件大小

2. **内存优化**:
   - 调整Node.js内存限制
   - 监控Docker容器资源使用

## 安全建议

1. **密码安全**:
   - 使用强密码
   - 定期更换密码
   - 启用HTTPS

2. **网络安全**:
   - 使用防火墙限制端口访问
   - 配置反向代理
   - 启用访问日志

3. **数据安全**:
   - 定期备份数据
   - 限制数据库文件权限
   - 监控异常访问

## 开发与扩展

### 本地开发

```bash
# 后端开发
cd backend
npm install
npm run dev

# 前端开发
cd frontend
npm install
npm run serve
```

### API 接口

系统提供RESTful API接口：

- `GET /api/domains` - 获取域名列表
- `POST /api/domains` - 添加域名
- `PUT /api/domains/:id` - 更新域名
- `DELETE /api/domains/:id` - 删除域名
- `POST /api/domains/sync-cloudflare` - 同步Cloudflare
- `GET /api/whois/:domain` - 查询WHOIS信息

### 自定义功能

可以通过修改源码添加自定义功能：

1. **后端**: 在`routes/`目录添加新的API路由
2. **前端**: 在`src/views/`目录添加新的页面组件
3. **数据库**: 修改`utils/database.js`中的表结构

## 许可证

本项目基于 MIT 许可证开源。

## 支持与反馈

如果您遇到问题或有建议，请：

1. 查看本文档的故障排除部分
2. 检查项目的GitHub Issues
3. 提交新的Issue报告问题

---

**注意**: 在生产环境中使用前，请务必修改默认密码和JWT密钥，并根据需要配置HTTPS。
