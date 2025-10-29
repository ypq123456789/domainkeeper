# DomainKeeper 前后端分离版本

![DomainKeeper](https://img.shields.io/badge/DomainKeeper-v2.0.0-blue)
![Node.js](https://img.shields.io/badge/Node.js-18+-green)
![Vue.js](https://img.shields.io/badge/Vue.js-3.3+-green)
![Docker](https://img.shields.io/badge/Docker-supported-blue)
![License](https://img.shields.io/badge/License-MIT-yellow)

一个现代化的域名管理系统，支持前后端分离部署，提供直观的Web界面来管理和监控您的域名。

## ✨ 功能特性

- 🌐 **域名管理**: 支持添加、编辑、删除域名记录
- 🔄 **Cloudflare集成**: 自动同步Cloudflare域名信息
- 🔍 **WHOIS查询**: 实时获取域名注册信息
- 📊 **可视化仪表板**: 域名状态统计图表和过期监控
- ⏰ **智能提醒**: 域名到期状态实时监控
- 🔐 **权限分离**: 前台访问和后台管理独立控制
- 🐳 **容器化部署**: Docker支持，一键部署
- 📱 **响应式设计**: 完美适配桌面和移动设备
- 🔧 **API支持**: RESTful API接口，支持扩展开发

## 🏗️ 技术架构

### 后端技术栈
- **框架**: Node.js + Express.js
- **数据库**: SQLite（轻量级，免维护）
- **认证**: JWT Token
- **任务调度**: node-cron
- **API**: RESTful架构

### 前端技术栈
- **框架**: Vue.js 3 + Composition API
- **UI组件**: Element Plus
- **状态管理**: Vuex
- **路由**: Vue Router
- **图表**: ECharts
- **构建工具**: Vue CLI

## 🚀 快速开始

### 使用 Docker Compose（推荐）

1. **下载项目**
```bash
git clone https://github.com/your-repo/domainkeeper.git
cd domainkeeper/self-hosted
```

2. **配置环境变量**
```bash
cp .env.example .env
nano .env
```

3. **一键启动**
```bash
docker-compose up -d
```

4. **访问系统**
- 前台: http://your-server-ip
- 管理后台: 点击页面上的管理后台链接

### 自动部署脚本

```bash
# Ubuntu/Debian 系统
wget -O deploy.sh https://raw.githubusercontent.com/your-repo/domainkeeper/main/self-hosted/deploy.sh
chmod +x deploy.sh
sudo ./deploy.sh
```

## ⚙️ 配置说明

### 必需配置

```env
# JWT加密密钥（必须修改）
JWT_SECRET=your_super_secret_jwt_key

# 管理员账户
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_secure_password
```

### 可选配置

```env
# 前台访问密码（可选）
ACCESS_PASSWORD=

# Cloudflare API Token（用于自动同步）
CF_API_TOKEN=your_cloudflare_api_token

# WHOIS代理服务（用于域名信息查询）
WHOIS_PROXY_URL=https://whois.0o11.com

# 自定义设置
CUSTOM_TITLE=我的域名管理
SYNC_INTERVAL=60
```

## 📸 功能截图

### 域名列表界面
- 清晰展示所有域名状态
- 过期时间倒计时
- 使用进度可视化
- 响应式表格设计

### 管理后台
- 域名CRUD操作
- Cloudflare自动同步
- 批量管理功能
- 系统统计信息

### 可视化仪表板
- 域名状态分布图
- 过期时间分析
- 即将过期列表
- 实时数据更新

## 🔧 API 接口

系统提供完整的RESTful API：

```http
GET    /api/domains              # 获取域名列表
POST   /api/domains              # 添加域名
PUT    /api/domains/:id          # 更新域名
DELETE /api/domains/:id          # 删除域名
POST   /api/domains/sync-cloudflare  # 同步Cloudflare
GET    /api/whois/:domain        # 查询WHOIS信息
POST   /api/auth/login           # 用户登录
GET    /api/domains/stats/overview   # 获取统计信息
```

## 🔒 安全特性

- **JWT认证**: 安全的token机制
- **权限分离**: 前台/后台独立权限
- **密码加密**: bcrypt加密存储
- **CORS保护**: 跨域请求保护
- **速率限制**: API调用频次限制
- **输入验证**: 严格的数据验证

## 🛠️ 开发指南

### 本地开发环境

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

### 项目结构

```
self-hosted/
├── backend/                 # 后端代码
│   ├── routes/             # API路由
│   ├── services/           # 业务逻辑
│   ├── middleware/         # 中间件
│   └── utils/              # 工具类
├── frontend/               # 前端代码
│   ├── src/
│   │   ├── views/          # 页面组件
│   │   ├── components/     # 通用组件
│   │   ├── store/          # 状态管理
│   │   └── utils/          # 工具函数
│   └── public/             # 静态资源
├── docker-compose.yml      # Docker编排
└── README.md              # 说明文档
```

## 📊 系统要求

### 最低配置
- **CPU**: 1核
- **内存**: 512MB
- **存储**: 1GB
- **操作系统**: Linux/Windows/macOS

### 推荐配置
- **CPU**: 2核
- **内存**: 1GB
- **存储**: 5GB
- **操作系统**: Ubuntu 20.04+

## 🔄 更新升级

```bash
# 停止服务
docker-compose down

# 拉取更新
git pull

# 重新构建
docker-compose up -d --build
```

## 📝 许可证

本项目基于 MIT 许可证开源 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📞 支持与反馈

- **GitHub Issues**: 报告Bug或功能请求
- **文档**: 查看完整部署文档
- **社区**: 加入讨论群组

## 🌟 Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ypq123456789/domainkeeper&type=Date)](https://star-history.com/#ypq123456789/domainkeeper&Date)

## 🙏 致谢

感谢所有贡献者和使用者的支持！

---

**开始使用 DomainKeeper，让域名管理变得简单高效！** 🚀
