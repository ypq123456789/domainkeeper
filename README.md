
# 域名可视化展示面板

## 项目简介

这是一个简洁高效的域名可视化展示面板，基于Cloudflare Workers构建。它提供了一个直观的界面，让用户能够一目了然地查看他们的域名组合，包括各个域名的状态、注册信息和使用进度。

## 主要特性

- 清晰展示域名列表及其关键信息
- 可视化呈现域名使用进度条
- 显示域名状态、注册商、注册日期和过期日期
- 自动计算并显示域名剩余有效天数
- 响应式设计，完美适配桌面和移动设备
- 轻量级实现，快速加载

## 技术实现

- 前端：HTML5, CSS3, JavaScript
- 部署：Cloudflare Workers

## demo
![image](https://github.com/ypq123456789/domainkeeper/assets/114487221/546d0a4c-a74b-436c-a42e-1b013ff6e62b)


## 快速部署

   - 登录您的Cloudflare账户
   - 创建新的Worker
   - 将 `index.js` 的内容复制到Worker编辑器，编辑 `DOMAINS` 数组，添加您的域名信息：
   ```javascript
   const DOMAINS = [
     { domain: "example.com", registrationDate: "2022-01-01", expirationDate: "2027-01-01", system: "Cloudflare" },
     // 添加更多域名...
   ];
   ```
   - 保存并部署

## 个性化定制

- 建议您绑定自定义域，以确保您的网站不会被墙
- 可修改 `CUSTOM_TITLE` 变量，从而自定义面板标题

## 贡献指南

欢迎通过Issue和Pull Request参与项目改进。如有重大变更，请先提Issue讨论。

## 开源协议

本项目采用 [MIT 许可证](https://choosealicense.com/licenses/mit/)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=ypq123456789/domainkeeper&type=Date)](https://star-history.com/#ypq123456789/domainkeeper&Date)

## 交流TG群：
https://t.me/+ydvXl1_OBBBiZWM1

## 支持作者

<span><small>非常感谢您对 domainkeeper 项目的兴趣！维护开源项目确实需要大量时间和精力投入。若您认为这个项目为您带来了价值，希望您能考虑给予一些支持，哪怕只是一杯咖啡的费用。
您的慷慨相助将激励我继续完善这个项目，使其更加实用。它还能让我更专心地参与开源社区的工作。如果您愿意提供赞助，可通过下列渠道：</small></span>

- 给该项目点赞 [![给该项目点赞](https://img.shields.io/github/stars/ypq123456789/domainkeeper?style=social)](https://github.com/ypq123456789/domainkeeper)
- 关注我的 Github [![关注我的 Github](https://img.shields.io/github/followers/ypq123456789?style=social)](https://github.com/ypq123456789)

| 微信 | 支付宝 |
|------|--------|
| ![微信](https://github.com/ypq123456789/TrafficCop/assets/114487221/fb265eef-e624-4429-b14a-afdf5b2ca9c4) | ![支付宝](https://github.com/ypq123456789/TrafficCop/assets/114487221/884b58bd-d76f-4e8f-99f4-cac4b9e97168) |
