
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
   - 将 `index.js` 的内容复制到Worker编辑器，在 `index.js` 文件中编辑 `DOMAINS` 数组，添加您的域名信息：
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
