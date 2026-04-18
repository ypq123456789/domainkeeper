# 域管家（DomainKeeper）

[English README / 英文版](./README.en.md)

域管家（DomainKeeper）是 `sanpin.ltd` 提供的域名管理工具，用来统一整理 Cloudflare / DNSPod 同步、WHOIS、到期时间、售价和公开米表，并支持接入自有域名。

## 品牌识别

- 中文名称：域管家
- 英文名称：DomainKeeper
- 官方站点：https://sanpin.ltd/

GitHub README、官方站点和站内文档统一使用“域管家（DomainKeeper） / sanpin.ltd”作为公开品牌标识。

本项目为闭源托管产品。客户购买的是激活码和使用权限，只能在官方站点使用，不提供源码，不开放自部署。

这个 GitHub 仓库只用于公开展示产品说明、使用入口和界面预览，不包含 Worker 源码、激活码逻辑或内部部署细节。

## 公开入口

- 产品首页：https://sanpin.ltd/
- 使用文档：https://sanpin.ltd/docs
- 注册入口：https://sanpin.ltd/register
- 登录入口：https://sanpin.ltd/login
- 登录页默认打开“登录账号”，卡密注册使用单独选项卡，并要求二次密码确认
- 忘记密码时可打开：https://sanpin.ltd/login?authMode=reset
- 前台演示：https://sanpin.ltd/test
- 后台演示：https://test.sanpin.ltd/admin
- 域名售卖米表演示：https://test.sanpin.ltd/market
- 激活码购买地址：https://fk.bacon123.eu.org/products/domainkeeper

## 友情链接

- ry.hk：https://ry.hk
- 劳动者博客大全：https://laodongzhe.cn/

## 界面预览

### 前台效果

[![前台效果](https://cdn1.sanpin.ltd/frontend-demo-viewport.png?v=1.9.75)](https://sanpin.ltd/test)

### 后台效果

[![后台效果](https://cdn1.sanpin.ltd/admin-demo-viewport.png?v=1.9.75)](https://sanpin.ltd/test/admin)

### 米表效果

[![米表效果](https://cdn1.sanpin.ltd/market-demo-viewport.png?v=1.9.75)](https://sanpin.ltd/test/market)

## 路由说明

假设你注册的用户名是 `abc`，系统会为你生成三条固定入口：

- 前台总表：`abc.sanpin.ltd`
- 后台管理：`abc.sanpin.ltd/admin`
- 公开米表：`abc.sanpin.ltd/market`

同时保留路径兼容入口，旧链接仍可访问并会跳转到子域形态：

- 前台总表：`/abc`
- 后台管理：`/abc/admin`
- 公开米表：`/abc/market`

演示账号也遵循同样规则：`sanpin.ltd/test*` 会自动跳转到 `test.sanpin.ltd*`。

接入自有域名的第一阶段方式：

- 把你的域名，例如 `sale.example.com`，添加 `CNAME` 到 `abc.sanpin.ltd`
- 同时添加 `_acme-challenge.sale.example.com CNAME sale.example.com.88b45d2aa589730e.dcv.cloudflare.com`
- 接入后支持访问：
  - `sale.example.com`
  - `sale.example.com/admin`
  - `sale.example.com/market`

## 产品亮点

- 顶级域名、二级域名、接入自有域名统一管理
- 顶级和二级视图支持切换显示，注册日期、到期时间、剩余时间会同步切换
- 支持表格排序、筛选、WHOIS 自动对接和手动补录
- 支持 Cloudflare 和 DNSPod 域名同步，并在同步时自动刷新当前列表里的顶级域名 WHOIS
- 前台、后台和公开米表默认读取最近一次同步快照；公开页面再配合短时缓存，打开更快
- 默认排序仍然是“按剩余时间从少到多”，并支持在后台改成你自己的默认规则
- 域名默认支持点击跳转访问，也支持在后台关闭点击跳转
- 支持给域名填写售价，前台总表和公开米表都会显示
- 支持给每个域名填写“宣传语 / 域名含义”，前台总表和公开米表都会同步展示
- 公开米表搜索会同时匹配域名、注册商和宣传语
- 后台支持按当前托管商直接管理 DNS 记录，支持新增、编辑、删除；A / AAAA / CNAME 记录会给出可直接点击的访问链接
- 米表联系方式支持用空格分隔多个内容，并自动识别邮箱、手机号后生成可复制的联系方式卡片
- 联系方式设置支持内置 `Email / WeChat / QQ / Phone` 字段，也支持追加自定义键值项，并兼容旧的自由文本联系方式
- 账户设置支持 DNSHE `API Key / Secret` 和 DNSPod `Token`，这些平台侧域名都可以并入同一份域名快照
- DNSHE 子域名同步会自动补齐对应一级域名 WHOIS；类型列表示当前唯一的 DNS 托管商，如果仍在 DNSHE 解析就显示 `DNSHE`，如果已经托管到 Cloudflare / DNSPod，就显示对应平台；识别到可直达的控制台地址后，点击类型可直接跳到对应平台 DNS 记录页
- DNSHE 子域名同步会自动判断 180 天续期窗口：到窗口内就直接续期，未到窗口则按接口返回的剩余窗口天数反推当前二级域名到期时间
- 每个用户拥有独立用户名、独立路由和独立数据空间
- 前台默认可直接访问，客户也可以在后台设置是否要求前台登录

## 后台可配置项

- 网站标题
- 米表联系方式
- 米表联系方式自动识别与复制展示
- 联系方式结构化配置：默认提供 `Email / WeChat / QQ / Phone`，也支持继续追加自定义字段，并兼容旧的自由文本联系方式
- 前台是否需要登录
- 显示列设置：`域名` 列固定显示，`类型 / 确权 / 注册商 / 注册日期 / 到期时间 / 宣传语 / 售价 / 剩余 / 进度` 可按账号分别开关，并会同时影响后台表格、前台总表和公开米表
- 前台总表默认排序规则
- 域名是否允许点击跳转
- 当前用户自己的 Cloudflare API Token
- 当前用户自己的 DNSPod Token，界面分成 `Token ID` 和 `Token` 两个输入框，保存时仍按完整 `ID,Token` 使用
- DNSHE API Key / Secret 和 DNSHE 子域名同步
- Cloudflare / DNSPod 域名同步与 WHOIS 补录
- DNS 管理入口：按当前唯一托管商加载可编辑的解析记录
- 托管切换入口：只对有注册商 API 的域名开放，当前会按注册商和目标平台的真实可用能力动态显示可切换目标
- 手动录入域名时可补充宣传语，并同步显示到公开米表
- 手动录入域名下方已补上 Excel 批量导入，支持模板下载、表头自动识别、域名必填列和手动字段映射
- 超级管理员后台会单独显示每个客户的前台入口、公开米表入口和已接入自有域名
- DNSHE 永不过期子域名把 `99991231` / `9999-12-31` 视为同一个“永久”哨兵值，后台不会再把这类域名显示成红色空日期框
- 站内文档内置 Cloudflare API Token 图文教程，并推荐一次配置到位：
  - 基础同步：自定义令牌 + 区域-区域-读取 + 包括-账户的所有区域
  - 如果未来可能接入自有域名或希望系统自动写 DNS，建议一开始就在同一个 Token 上把“区域-DNS-编辑”一起配好
- 保存接入自有域名时，系统会同时在 `sanpin.ltd` 这一侧自动创建或刷新 Cloudflare `Custom Hostname`；服务端需提供 `DOMAINKEEPER_SAAS_CF_API_TOKEN` 或 `SAAS_CF_API_TOKEN`，可选提供 `DOMAINKEEPER_SAAS_ZONE_ID` 或 `SAAS_ZONE_ID`
- 如需自动完成证书 DCV，还需提供 `DOMAINKEEPER_SAAS_DCV_DELEGATION_SUFFIX` 或 `SAAS_DCV_DELEGATION_SUFFIX`；用户侧若授予 `DNS Edit`，系统会自动写入业务 CNAME 和 `_acme-challenge` CNAME，两条记录都会先走预检与冲突检查
- 站内文档里，“获取 Cloudflare API 令牌”主要负责讲权限怎么配；“接入自有域名”会单独说明适用场景、访问入口和手动 / 自动接入方式

## 最近更新

- 站内已补上简体中文 `TG Bot` 教程，覆盖 BotFather、Token、Chat ID 和测试发送步骤，并附带截图引导
- 后台 `TG 到期提醒` 区域现在带有一个可直接跳到 `docs#tg-bot-guide` 的 `?` 帮助链接
- 后台注册商 `官网` 控件改成更清晰的按钮式下拉，展开面板会落在整行下方，不再遮挡输入框
- 前台和后台预览截图已经重新拍摄，并同步到 README、站内预览卡片和 `DEMO_ASSETS` 兜底资源

## 说明

- 本仓库仅用于公开展示说明
- 软件源码、部署细节与内部实现不公开
- 如果 README 里的文字、入口或预览图与线上不一致，请以官方站点和站内文档为准，我们会继续同步更新

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ypq123456789/domainkeeper&type=Date)](https://star-history.com/#ypq123456789/domainkeeper&Date)
