# DomainKeeper

DomainKeeper 是一个基于 Cloudflare Workers 的域名面板，用来集中展示域名状态、注册商、注册日期、到期日期和剩余天数，并支持后台手动维护。

当前仓库包含两套 Workers 版本：

- `index.js`：初级版，手动维护域名列表
- `domainkeeper.js`：高级版，自动同步 Cloudflare Zone，并自动拉取 WHOIS / RDAP 信息

如果你需要完整前后端分离架构，请查看 [`self-hosted/README.md`](./self-hosted/README.md)。

## 当前 Worker 版本特性

`domainkeeper.js` 对应的是当前推荐使用的版本，主要特性如下：

- 自动同步 Cloudflare 账户下的顶级域名
- 支持手动添加二级域名或自定义域名
- 优先使用 Worker 直连 WHOIS，失败后回退到 RDAP
- 针对 `.xyz`、`.org`、`.in` 等后缀增加了额外后备源
- 支持二级域名沿父域名链回溯识别注册商和日期
- WHOIS 结果默认缓存 1 小时
- WHOIS 失败时不会覆盖已有有效数据
- 后台支持手动“更新 WHOIS”“查询 WHOIS”“查看属性”
- 支持前台密码和后台密码分离
- 数据存储在 Cloudflare KV `DOMAIN_INFO`

## 部署方式选择

### 方案一：Workers 初级版

适合少量域名、完全手动维护。

- 文件：`index.js`
- 优点：最简单，无需 KV、无需 Cloudflare API Token
- 缺点：不能自动同步 Cloudflare 域名，也没有自动 WHOIS 缓存逻辑

### 方案二：Workers 高级版

适合当前大多数使用场景。

- 文件：`domainkeeper.js`
- 优点：自动同步、自动 WHOIS、支持二级域名、支持后台管理
- 缺点：需要配置 KV 和 Cloudflare API Token

### 方案三：前后端分离自托管

适合需要完整 API、自定义权限和更强扩展性的场景。

- 目录：`self-hosted/`

## Workers 高级版部署

以下步骤对应当前 `domainkeeper.js` 的实际实现。

### 1. 创建 Worker

在 Cloudflare Dashboard 中创建一个新的 Worker，然后将 [`domainkeeper.js`](./domainkeeper.js) 的内容粘贴进去。

注意：

- 这是模块化 Worker，不是旧版 Service Worker 写法
- 代码使用了 `cloudflare:sockets`，用于直接发起 WHOIS TCP 查询

### 2. 创建 KV 命名空间

创建一个 KV 命名空间，并绑定到 Worker：

- Binding 名称：`DOMAIN_INFO`

这是必填项。没有这个绑定，Worker 会直接报错：

```txt
Missing DOMAIN_INFO binding
```

### 3. 配置环境变量 / Secrets

不要把真实密钥直接写进源码。当前版本从 Worker 运行时读取以下变量：

| 变量名 | 必填 | 说明 |
|---|---|---|
| `CF_API_KEY` | 是 | Cloudflare API Token，用于读取 Zone 列表 |
| `ADMIN_PASSWORD` | 是 | 后台登录密码，同时用于后台接口鉴权 |
| `ACCESS_PASSWORD` | 否 | 前台访问密码；留空则首页可直接访问 |
| `WHOISXML_API_KEY` | 否 | 可选后备源；只有在前置 WHOIS / RDAP 都失败时才会使用 |

建议：

- `CF_API_KEY`、`ADMIN_PASSWORD`、`ACCESS_PASSWORD`、`WHOISXML_API_KEY` 都使用 Worker Secret 存储
- 不要再修改源码里的 `*_DEFAULT` 常量来保存真实值

### 4. 配置 Cloudflare API Token 权限

`CF_API_KEY` 实际上应该填 Cloudflare API Token，而不是 Global API Key。

最少需要能读取 Zone 列表。通常给这个 Token 配置只读权限即可。

建议至少包含：

- `Zone:Read`

如果你只打算同步特定账户下的域名，把 Token 范围收窄到对应账号或指定 Zone，别直接给全局高权限。

### 5. 按需修改标题

如果你要修改页面标题，编辑 [`domainkeeper.js`](./domainkeeper.js) 顶部常量：

```javascript
const CUSTOM_TITLE = "培根的玉米大全";
```

### 6. 部署

保存并部署 Worker。

部署后默认可访问：

- `/`：前台页面
- `/login`：前台登录
- `/admin`：后台页面
- `/admin-login`：后台登录
- `/whois/example.com`：查询原始 WHOIS 文本

## 当前 WHOIS / RDAP 逻辑说明

当前版本和旧 README 最大的区别在这里。

### 不再依赖自建 WHOIS 代理

当前版本优先使用 Worker 直连 WHOIS：

- 通过 `cloudflare:sockets` 直连 43 端口
- 自动识别部分后缀的权威 WHOIS Server
- 必要时跟随 referral server

只有在源码里手动打开 `ENABLE_WHOIS_PROXY_FALLBACK` 时，才会回退到 `WHOIS_PROXY_URL`。

默认配置下：

- `WHOIS_PROXY_URL` 不是必填项
- 不需要额外部署 `whois-proxy`

### RDAP 后备源

当传统 WHOIS 无法提供稳定结构时，会自动尝试 RDAP。

当前已包含：

- 权威 RDAP
- `rdap.org`
- `.xyz` 额外后备源
- 阿里云 RDAP 作为 `.xyz` 的额外补源

### 二级域名识别

对于 `a.b.example.tld` 这类域名，当前版本会：

1. 先尝试查自己
2. 查不到时沿父域名链回溯
3. 例如回退到 `example.tld`
4. 将识别到的注册商、注册日期、到期日期用于展示

因此像 `eu.org`、`pp.ua`、`indevs.in` 这类二级域名，现在可以尽量自动补全注册信息。

## 缓存与刷新策略

当前版本已经不是“每次刷新页面都查一次 WHOIS”。

- 自动查询缓存 1 小时
- 查询失败缓存 10 分钟后才重试
- 页面刷新时优先使用 KV 中已有结果
- 后台手动点击“更新 WHOIS”会立即重新拉取
- WHOIS 失败时不会覆盖已有有效注册商/日期

这也是当前版本相对旧版本的关键差异。

## 后台管理说明

后台主要支持以下操作：

- 同步 Cloudflare 域名
- 手动添加自定义域名
- 编辑注册商 / 注册日期 / 到期日期
- 手动更新 WHOIS
- 查看原始 WHOIS
- 查看域名属性
- 删除域名记录
- 将自定义域名重置为 Cloudflare 同步域名

说明：

- 顶级域名同步来自 Cloudflare Zone 列表
- 自定义域名和二级域名存储在 `DOMAIN_INFO` KV 中
- 同步时不会删除标记为 `isCustom` 的域名

## 自定义域名绑定

你可以把 Worker 绑定到自己的域名，例如：

- `https://ym.example.com/`

绑定后和 `workers.dev` 访问的是同一套逻辑。只要路由指向的是同一个 Worker，自定义域名不会改变 WHOIS 行为。

## 初级版部署

如果你只需要手动维护少量域名，可以使用 [`index.js`](./index.js)。

步骤很简单：

1. 创建一个新的 Worker
2. 复制 [`index.js`](./index.js) 内容
3. 修改 `DOMAINS` 数组
4. 保存并部署

示例：

```javascript
const DOMAINS = [
  {
    domain: "example.com",
    registrationDate: "2024-01-01",
    expirationDate: "2026-01-01",
    system: "Cloudflare"
  }
];
```

## 版本对比

| 功能 | `index.js` | `domainkeeper.js` | `self-hosted` |
|---|---|---|---|
| 部署复杂度 | 低 | 中 | 高 |
| 自动同步 Cloudflare | 否 | 是 | 是 |
| 自动 WHOIS / RDAP | 否 | 是 | 是 |
| 二级域名自动识别 | 否 | 是 | 可扩展 |
| KV 存储 | 否 | 是 | 否 |
| 后台管理 | 否 | 是 | 是 |
| 自定义扩展能力 | 低 | 中 | 高 |

## 安全建议

当前 Worker 版本已经移除了会把登录密码写入日志的调试输出，但仍建议你按下面方式使用：

- 所有密钥都放到 Worker Secrets，不要写死在源码里
- `ADMIN_PASSWORD` 使用高强度随机密码
- `ACCESS_PASSWORD` 只在你确实需要前台鉴权时开启
- `CF_API_KEY` 使用最小权限 Token

如果你要进一步加强安全性，下一步应改为签名 Session，而不是直接用密码值做 Cookie 校验。

## 相关文档

- 项目总览：[`PROJECT_OVERVIEW.md`](./PROJECT_OVERVIEW.md)
- 自托管版本：[`self-hosted/README.md`](./self-hosted/README.md)

## 开源协议

本项目采用 [MIT License](https://choosealicense.com/licenses/mit/)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ypq123456789/domainkeeper&type=Date)](https://star-history.com/#ypq123456789/domainkeeper&Date)

## 交流TG群

https://t.me/+ydvXl1_OBBBiZWM1

## 支持作者

<span><small>非常感谢您对 domainkeeper 项目的兴趣！维护开源项目确实需要大量时间和精力投入。若您认为这个项目为您带来了价值，希望您能考虑给予一些支持，哪怕只是一杯咖啡的费用。您的慷慨相助将激励我继续完善这个项目，使其更加实用。它还能让我更专心地参与开源社区的工作。如果您愿意提供赞助，可通过下列渠道：</small></span>

- 给该项目点赞 [![给该项目点赞](https://img.shields.io/github/stars/ypq123456789/domainkeeper?style=social)](https://github.com/ypq123456789/domainkeeper)
- 关注我的 Github [![关注我的 Github](https://img.shields.io/github/followers/ypq123456789?style=social)](https://github.com/ypq123456789)

| 微信 | 支付宝 |
|---|---|
| ![微信](https://github.com/ypq123456789/TrafficCop/assets/114487221/fb265eef-e624-4429-b14a-afdf5b2ca9c4) | ![支付宝](https://github.com/ypq123456789/TrafficCop/assets/114487221/884b58bd-d76f-4e8f-99f4-cac4b9e97168) |
