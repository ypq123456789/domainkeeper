# DomainKeeper 项目总览

## 📁 项目结构

```
domainkeeper/
├── index.js                    # Workers 初级版本
├── domainkeeper.js            # Workers 高级版本  
├── README.md                  # Workers 版本说明文档
└── self-hosted/               # 前后端分离版本
    ├── backend/               # Node.js 后端
    ├── frontend/              # Vue.js 前端
    ├── docker-compose.yml     # Docker 编排文件
    ├── .env.example          # 环境变量模板
    ├── deploy.sh             # 一键部署脚本
    └── README.md             # 自托管版本说明文档
```

## 🚀 快速选择部署方案

### 场景一：个人使用，追求简单
**推荐**: Cloudflare Workers 初级版
```bash
# 1. 复制 index.js 内容到 Cloudflare Workers
# 2. 修改域名列表
# 3. 部署完成
```

### 场景二：个人使用，需要自动同步
**推荐**: Cloudflare Workers 高级版  
```bash
# 1. 复制 domainkeeper.js 内容到 Cloudflare Workers
# 2. 配置 API Token 和 KV 存储
# 3. 部署完成
```

### 场景三：企业使用，功能完整
**推荐**: 前后端分离版本
```bash
cd self-hosted
cp .env.example .env
# 编辑配置文件
docker-compose up -d
```

## 📖 详细文档

- **Cloudflare Workers 版本**: 查看 [README.md](./README.md)
- **前后端分离版本**: 查看 [self-hosted/README.md](./self-hosted/README.md)

## 🔗 相关链接

- **GitHub**: https://github.com/ypq123456789/domainkeeper
- **演示地址**: http://demo.0o11.com
- **WHOIS 代理**: https://github.com/ypq123456789/whois-proxy
- **交流群组**: https://t.me/+ydvXl1_OBBBiZWM1

## 📝 版本历史

- **v1.0**: 初级版本 (index.js)
- **v1.1**: 高级版本 (domainkeeper.js) 
- **v2.0**: 前后端分离版本 (self-hosted/)

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！
