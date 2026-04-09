# DomainKeeper

DomainKeeper 是一款闭源域名管理产品。

客户购买的是激活码和使用权限，只能在官方站点使用，不提供源码，不开放自部署。

这个 GitHub 仓库只用于公开展示产品说明、使用入口和界面预览，不包含 Worker 源码、激活码逻辑或内部部署细节。

## 公开入口

- 产品首页：https://ym.bacon123.eu.org/
- 使用文档：https://ym.bacon123.eu.org/docs
- 注册入口：https://ym.bacon123.eu.org/register
- 登录入口：https://ym.bacon123.eu.org/login
- 前台演示：https://ym.bacon123.eu.org/test
- 后台演示：https://ym.bacon123.eu.org/test/admin
- 域名售卖米表演示：https://ym.bacon123.eu.org/test/market
- 激活码购买地址：https://fk.bacon123.eu.org/products/domainkeeper

## 路由说明

假设你注册的用户名是 `abc`，系统会为你生成三条固定入口：

- 前台总表：`/abc`
- 后台管理：`/abc/admin`
- 公开米表：`/abc/market`

## 产品亮点

- 顶级域名、二级域名、自定义域名统一管理
- 顶级和二级视图支持切换显示，注册日期、到期时间、剩余时间会同步切换
- 支持表格排序、筛选、WHOIS 自动对接和手动补录
- 支持 Cloudflare 域名同步
- 前台、后台和公开米表默认读取最近一次同步快照；公开页面再配合短时缓存，打开更快
- 默认排序仍然是“按剩余时间从少到多”，并支持在后台改成你自己的默认规则
- 域名默认支持点击跳转访问，也支持在后台关闭点击跳转
- 支持给域名填写售价，前台总表和公开米表都会显示
- 米表联系方式支持用空格分隔多个内容，并自动识别邮箱、手机号后生成可复制的联系方式卡片
- 每个用户拥有独立用户名、独立路由和独立数据空间
- 前台默认可直接访问，客户也可以在后台设置是否要求前台登录

## 后台可配置项

- 网站标题
- 米表联系方式
- 米表联系方式自动识别与复制展示
- 前台是否需要登录
- 前台总表默认排序规则
- 域名是否允许点击跳转
- 当前用户自己的 Cloudflare API Token
- Cloudflare 域名同步与 WHOIS 补录

## 界面预览

### 前台效果

[![前台效果](https://cdn.nodeimage.com/i/ay4Wr6ZCFssNfWmaL1EqGfeRMvYBnNFH.png)](https://ym.bacon123.eu.org/test)

### 后台效果

[![后台效果](https://cdn.nodeimage.com/i/ja5H7ayzVdvaQaNsWujT0nevBWRSsEF2.png)](https://ym.bacon123.eu.org/test/admin)

### 米表效果

[![米表效果](https://cdn.nodeimage.com/i/SKu56tSGtBm1OccK247eYwjkXYGr45JU.png)](https://ym.bacon123.eu.org/test/market)

## 说明

- 本仓库仅用于公开展示说明
- 软件源码、部署细节与内部实现不公开
- 如果 README 里的文字、入口或预览图与线上不一致，请以官方站点和站内文档为准，我们会继续同步更新

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ypq123456789/domainkeeper&type=Date)](https://star-history.com/#ypq123456789/domainkeeper&Date)
