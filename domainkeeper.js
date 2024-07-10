// 在文件顶部添加版本信息
const VERSION = "1.5.3";

// 自定义标题
const CUSTOM_TITLE = "我的域名管理";

// 在这里设置你的 Cloudflare API Token
const CF_API_KEY = "naOtsu1NmO4HOtPUS2fSBIfKLpOt3j3U08xB7wtq";

// 自建 WHOIS 代理服务地址
const WHOIS_PROXY_URL = "http://whois.bacon159.me";

// 访问密码（可为空）
const ACCESS_PASSWORD = "ypq123456";

// 后台密码（不可为空）
const ADMIN_PASSWORD = "ypq123456789";

// KV 命名空间绑定名称
const KV_NAMESPACE = DOMAIN_INFO;

// footerHTML
const footerHTML = `
  <footer style="
    position: fixed;
    left: 0;
    bottom: 0;
    width: 100%;
    background-color: #f8f9fa;
    color: #6c757d;
    text-align: center;
    padding: 10px 0;
    font-size: 14px;
  ">
    Powered by DomainKeeper v${VERSION} <span style="margin: 0 10px;">|</span> © 2023 bacon159. All rights reserved.
  </footer>
`;

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request) {
   // 清理KV中的错误内容
   await cleanupKV();
   const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/manual-query") {
    return handleManualQuery(request);
  }

  if (path === "/") {
    return handleFrontend(request);
  } else if (path === "/admin") {
    return handleAdmin(request);
  } else if (path === "/api/update") {
    return handleApiUpdate(request);
  } else if (path === "/login") {
    return handleLogin(request);
  } else if (path === "/admin-login") {
    return handleAdminLogin(request);
  } else if (path.startsWith("/whois/")) {
    const domain = path.split("/")[2];
    return handleWhoisRequest(domain);
  } else {
    return new Response("Not Found", { status: 404 });
  }
}

async function handleManualQuery(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const data = await request.json();
  const { domain, apiKey } = data;

  try {
    const whoisInfo = await fetchWhoisInfo(domain, apiKey);
    await cacheWhoisInfo(domain, whoisInfo);
    return new Response(JSON.stringify(whoisInfo), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cleanupKV() {
  const list = await KV_NAMESPACE.list();
  for (const key of list.keys) {
    const value = await KV_NAMESPACE.get(key.name);
    if (value) {
      const { data } = JSON.parse(value);
      if (data.whoisError) {
        await KV_NAMESPACE.delete(key.name);
      }
    }
  }
}

  const adminScript = `
<script>
async function editDomain(domain, button) {
  const row = button.closest('tr');
  const cells = row.querySelectorAll('.editable');
  
  if (button.textContent === '编辑') {
    button.textContent = '保存';
    cells.forEach(cell => {
      const input = document.createElement('input');
      input.value = cell.textContent;
      cell.textContent = '';
      cell.appendChild(input);
    });
  } else {
    button.textContent = '编辑';
    const updatedData = {
      domain: domain,
      registrar: cells[0].querySelector('input').value,
      registrationDate: cells[1].querySelector('input').value,
      expirationDate: cells[2].querySelector('input').value
    };

    try {
      const response = await fetch('/api/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
        },
        body: JSON.stringify(updatedData)
      });

      if (response.ok) {
        cells.forEach(cell => {
          cell.textContent = cell.querySelector('input').value;
        });
        alert('更新成功');
      } else {
        throw new Error('更新失败');
      }
    } catch (error) {
      alert('更新失败: ' + error.message);
      location.reload();
    }
  }
}
</script>
`;


async function handleFrontend(request) {
  const cookie = request.headers.get("Cookie");
  if (ACCESS_PASSWORD && (!cookie || !cookie.includes(`access_token=${ACCESS_PASSWORD}`))) {
    return Response.redirect(`${new URL(request.url).origin}/login`, 302);
  }

  console.log("Fetching Cloudflare domains info...");
  const domains = await fetchCloudflareDomainsInfo();
  console.log("Cloudflare domains:", domains);

  console.log("Fetching domain info...");
  const domainsWithInfo = await fetchDomainInfo(domains);
  console.log("Domains with info:", domainsWithInfo);

  return new Response(generateHTML(domainsWithInfo, false), {
    headers: { 'Content-Type': 'text/html' },
  });
}


async function handleAdmin(request) {
  const cookie = request.headers.get("Cookie");
  if (!cookie || !cookie.includes(`admin_token=${ADMIN_PASSWORD}`)) {
    return Response.redirect(`${new URL(request.url).origin}/admin-login`, 302);
  }

  const domains = await fetchCloudflareDomainsInfo();
  const domainsWithInfo = await fetchDomainInfo(domains);
  return new Response(generateHTML(domainsWithInfo, true), {
    headers: { 'Content-Type': 'text/html' },
  });
}

async function handleLogin(request) {
  if (request.method === "POST") {
    const formData = await request.formData();
    const password = formData.get("password");
    
    console.log("Entered password:", password);
    console.log("Expected password:", ACCESS_PASSWORD);
    
    if (password === ACCESS_PASSWORD) {
      return new Response("Login successful", {
        status: 302,
        headers: {
          "Location": "/",
          "Set-Cookie": `access_token=${ACCESS_PASSWORD}; HttpOnly; Path=/; SameSite=Strict`
        }
      });
    } else {
      return new Response(generateLoginHTML("前台登录", "/login", "密码错误，请重试。"), {
        headers: { "Content-Type": "text/html" },
        status: 401
      });
    }
  }
  return new Response(generateLoginHTML("前台登录", "/login"), {
    headers: { "Content-Type": "text/html" }
  });
}


async function handleAdminLogin(request) {
  console.log("Handling admin login request");
  console.log("Request method:", request.method);

  if (request.method === "POST") {
    console.log("Processing POST request for admin login");
    const formData = await request.formData();
    console.log("Form data:", formData);
    const password = formData.get("password");
    console.log("Entered admin password:", password);
    console.log("Expected admin password:", ADMIN_PASSWORD);

    if (password === ADMIN_PASSWORD) {
      return new Response("Admin login successful", {
        status: 302,
        headers: {
          "Location": "/admin",
          "Set-Cookie": `admin_token=${ADMIN_PASSWORD}; HttpOnly; Path=/; SameSite=Strict`
        }
      });
    } else {
      return new Response(generateLoginHTML("后台登录", "/admin-login", "密码错误，请重试。"), {
        headers: { "Content-Type": "text/html" },
        status: 401
      });
    }
  }

  return new Response(generateLoginHTML("后台登录", "/admin-login"), {
    headers: { "Content-Type": "text/html" }
  });
}



async function handleApiUpdate(request) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const auth = request.headers.get("Authorization");
  if (!auth || auth !== `Basic ${btoa(`:${ADMIN_PASSWORD}`)}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const data = await request.json();
    const { action, domain, registrar, registrationDate, expirationDate } = data;

    if (action === 'add' || action === 'edit') {
      // 添加或编辑自定义域名
      const domainInfo = { 
        domain, 
        registrar, 
        registrationDate, 
        expirationDate, 
        isCustom: true,
        system: 'Custom'
      };
      await cacheWhoisInfo(domain, domainInfo);
    } else if (action === 'delete') {
      // 删除自定义域名
      await KV_NAMESPACE.delete(`whois_${domain}`);
    } else {
      // 更新现有域名信息
      let domainInfo = await getCachedWhoisInfo(domain) || {};
      domainInfo = {
        ...domainInfo,
        registrar,
        registrationDate,
        expirationDate
      };
      await cacheWhoisInfo(domain, domainInfo);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}


async function fetchCloudflareDomainsInfo() {
  const response = await fetch('https://api.cloudflare.com/client/v4/zones', {
    headers: {
      'Authorization': `Bearer ${CF_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch domains from Cloudflare');
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error('Cloudflare API request failed');
  }

  return data.result.map(zone => ({
    domain: zone.name,
    registrationDate: new Date(zone.created_on).toISOString().split('T')[0],
    system: 'Cloudflare',
  }));
}


async function fetchDomainInfo(domains) {
  const result = [];
  
  // 获取所有域名信息，包括自定义域名
  const allDomainKeys = await KV_NAMESPACE.list({ prefix: 'whois_' });
  const allDomains = await Promise.all(allDomainKeys.keys.map(async (key) => {
    const value = await KV_NAMESPACE.get(key.name);
    return JSON.parse(value).data;
  }));

  // 合并 Cloudflare 域名和自定义域名
  const mergedDomains = [...domains, ...allDomains.filter(d => d.isCustom)];
  
  for (const domain of mergedDomains) {
    let domainInfo = { ...domain };

    const cachedInfo = await getCachedWhoisInfo(domain.domain || domain);
    if (cachedInfo) {
      domainInfo = { ...domainInfo, ...cachedInfo };
    } else if (!domainInfo.isCustom && domainInfo.domain.split('.').length === 2 && WHOIS_PROXY_URL) {
      try {
        const whoisInfo = await fetchWhoisInfo(domainInfo.domain);
        domainInfo = { ...domainInfo, ...whoisInfo };
        if (!whoisInfo.whoisError) {
          await cacheWhoisInfo(domainInfo.domain, whoisInfo);
        }
      } catch (error) {
        console.error(`Error fetching WHOIS info for ${domainInfo.domain}:`, error);
        domainInfo.whoisError = error.message;
      }
    }

    result.push(domainInfo);
  }
  return result;
}



async function handleWhoisRequest(domain) {
  console.log(`Handling WHOIS request for domain: ${domain}`);

  try {
    console.log(`Fetching WHOIS data from: ${WHOIS_PROXY_URL}/whois/${domain}`);
    const response = await fetch(`${WHOIS_PROXY_URL}/whois/${domain}`);
    
    if (!response.ok) {
      throw new Error(`WHOIS API responded with status: ${response.status}`);
    }
    
    const whoisData = await response.json();
    console.log(`Received WHOIS data:`, whoisData);
    
    return new Response(JSON.stringify({
      error: false,
      rawData: whoisData.rawData
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error(`Error fetching WHOIS data for ${domain}:`, error);
    return new Response(JSON.stringify({
      error: true,
      message: `Failed to fetch WHOIS data for ${domain}. Error: ${error.message}`
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function fetchWhoisInfo(domain) {
  try {
    const response = await fetch(`${WHOIS_PROXY_URL}/whois/${domain}`);
    const whoisData = await response.json();

    console.log('Raw WHOIS proxy response:', JSON.stringify(whoisData, null, 2));

    if (whoisData) {
      return {
        registrar: whoisData.registrar || 'Unknown',
        registrationDate: formatDate(whoisData.creationDate) || 'Unknown',
        expirationDate: formatDate(whoisData.expirationDate) || 'Unknown'
      };
    } else {
      console.warn(`Incomplete WHOIS data for ${domain}`);
      return {
        registrar: 'Unknown',
        registrationDate: 'Unknown',
        expirationDate: 'Unknown',
        whoisError: 'Incomplete WHOIS data'
      };
    }
  } catch (error) {
    console.error('Error fetching WHOIS info:', error);
    return {
      registrar: 'Unknown',
      registrationDate: 'Unknown',
      expirationDate: 'Unknown',
      whoisError: error.message
    };
  }
}

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toISOString().split('T')[0];
}



async function getCachedWhoisInfo(domain) {
  const cacheKey = `whois_${domain}`;
  const cachedData = await KV_NAMESPACE.get(cacheKey);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    // 检查是否有错误内容，如果有，删除它
    if (data.whoisError) {
      await KV_NAMESPACE.delete(cacheKey);
      return null;
    }
    // 这里可以添加缓存过期检查，如果需要的话
    return data;
  }
  return null;
}


async function cacheWhoisInfo(domain, whoisInfo) {
  const cacheKey = `whois_${domain}`;
  await KV_NAMESPACE.put(cacheKey, JSON.stringify({
    data: whoisInfo,
    timestamp: Date.now()
  }));
}


function generateLoginHTML(title, action, errorMessage = "") {
  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${CUSTOM_TITLE}</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        margin: 0;
      }
      .login-container {
        background-color: white;
        padding: 2rem;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        text-align: center;
      }
      h1 {
        color: #2c3e50;
        margin-bottom: 1rem;
      }
      input[type="password"] {
        width: 100%;
        padding: 0.5rem;
        margin-bottom: 1rem;
        border: 1px solid #ddd;
        border-radius: 3px;
      }
      input[type="submit"] {
        background-color: #3498db;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 3px;
        cursor: pointer;
      }
      input[type="submit"]:hover {
        background-color: #2980b9;
      }
      .error-message {
        color: red;
        margin-bottom: 1rem;
      }
    </style>
  </head>
  <body>
    <div class="login-container">
      <h1>${title}</h1>
      ${errorMessage ? `<p class="error-message">${errorMessage}</p>` : ''}
      <form method="POST" action="${action}">
        <input type="password" name="password" placeholder="请输入密码" required>
        <input type="submit" value="登录">
      </form>
    </div>
    ${footerHTML}
  </body>
  </html>
  `;
}

function getStatusColor(daysRemaining) {
  if (daysRemaining === 'N/A' || daysRemaining <= 0) return '#e74c3c'; // 红色
  if (daysRemaining <= 30) return '#f1c40f'; // 黄色
  return '#2ecc71'; // 绿色
}

function getStatusTitle(daysRemaining) {
  if (daysRemaining === 'N/A') return '无效的到期日期';
  if (daysRemaining <= 0) return '已过期';
  if (daysRemaining <= 30) return '即将过期';
  return '正常';
}

function generateHTML(domains, isAdmin) {
  const categorizedDomains = categorizeDomains(domains);
    
  console.log("Categorized domains:", categorizedDomains); // 添加这行日志
  const generateTable = (domainList, isCFTopLevel) => {
    if (!domainList || !Array.isArray(domainList)) {
      console.error('Invalid domainList:', domainList);
      return ''; // 返回空字符串而不是尝试处理无效数据
    }
    return domainList.map(info => {
      const today = new Date();
      const expirationDate = new Date(info.expirationDate);
      const daysRemaining = info.expirationDate === 'Unknown' ? 'N/A' : Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      const totalDays = info.registrationDate === 'Unknown' || info.expirationDate === 'Unknown' ? 'N/A' : Math.ceil((expirationDate - new Date(info.registrationDate)) / (1000 * 60 * 60 * 24));
      const progressPercentage = isNaN(daysRemaining) || isNaN(totalDays) ? 0 : 100 - (daysRemaining / totalDays * 100);
      const whoisErrorMessage = info.whoisError 
        ? `<br><span style="color: red;">WHOIS错误: ${info.whoisError}</span><br><span style="color: blue;">建议：请检查域名状态或API配置</span>`
        : '';

      let operationButtons = '';
      if (isAdmin) {
        if (isCFTopLevel) {
          operationButtons = `
            <button onclick="editDomain('${info.domain}', this)">编辑</button>
            <button data-action="update-whois" data-domain="${info.domain}">更新WHOIS信息</button>
            <button data-action="query-whois" data-domain="${info.domain}">查询WHOIS信息</button>
          `;
        } else {
          operationButtons = `
            <button onclick="editDomain('${info.domain}', this)">编辑</button>
            <button onclick="deleteDomain('${info.domain}')">删除</button>
          `;
        }
      }

      return `
        <tr data-domain="${info.domain}">
          <td><span class="status-dot" style="background-color: ${getStatusColor(daysRemaining)};" title="${getStatusTitle(daysRemaining)}"></span></td>
          <td>${info.domain}</td>
          <td>${info.system}</td>
          <td class="editable">${info.registrar}${whoisErrorMessage}</td>
          <td class="editable">${info.registrationDate}</td>
          <td class="editable">${info.expirationDate}</td>
          <td>${daysRemaining}</td>
          <td>
            <div class="progress-bar">
              <div class="progress" style="width: ${progressPercentage}%;"></div>
            </div>
          </td>
          ${isAdmin ? `<td>${operationButtons}</td>` : ''}
        </tr>
      `;
    }).join('');
  };

  const cfTopLevelTable = generateTable(categorizedDomains.cfTopLevel, true);
  const cfSecondLevelAndCustomTable = generateTable(categorizedDomains.cfSecondLevelAndCustom, false);

  const adminLink = isAdmin 
    ? '<span>当前为后台管理页面</span> | <a href="/">返回前台</a>' 
    : '<a href="/admin">进入后台管理</a>';

  return `
  <!DOCTYPE html>
  <html lang="zh-CN">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${CUSTOM_TITLE}${isAdmin ? ' - 后台管理' : ''}</title>
    <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
  }
  h1 {
      text-align: center;
  }
  .nav {
      text-align: right;
      margin-bottom: 20px;
  }
  table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
  }
  th, td {
      padding: 12px 15px;
      text-align: left;
      border-bottom: 1px solid #ddd;
  }
  th {
      background-color: #f8f8f8;
      font-weight: bold;
  }
  tr:hover {
      background-color: #f5f5f5;
  }
  .status-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 5px;
  }
  .status-active { background-color: #4CAF50; }
  .status-warning { background-color: #FFC107; }
  .progress-bar {
      background-color: #e0e0e0;
      height: 8px;
      border-radius: 4px;
      overflow: hidden;
  }
  .progress {
      background-color: #4CAF50;
      height: 100%;
  }
  .btn {
      padding: 6px 12px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      margin-right: 5px;
  }
  .btn-primary { background-color: #4CAF50; color: white; }
  .btn-secondary { background-color: #2196F3; color: white; }
  footer {
      text-align: center;
      margin-top: 30px;
      color: #777;
  }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>${CUSTOM_TITLE}${isAdmin ? ' - 后台管理' : ''}</h1>
      <div class="admin-link">${adminLink}</div>

      <h2>CF顶级域名</h2>
      <table>
        <thead>
          <tr>
            <th class="status-column">状态</th>
            <th class="domain-column">域名</th>
            <th class="system-column">系统</th>
            <th class="registrar-column">注册商</th>
            <th class="date-column">注册日期</th>
            <th class="date-column">到期日期</th>
            <th class="days-column">剩余天数</th>
            <th class="progress-column">进度</th>
            ${isAdmin ? '<th class="operation-column">操作</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${cfTopLevelTable}
        </tbody>
      </table>

      <h2>CF二级域名or自定义域名</h2>
      <table>
        <thead>
          <tr>
            <th class="status-column">状态</th>
            <th class="domain-column">域名</th>
            <th class="system-column">系统</th>
            <th class="registrar-column">注册商</th>
            <th class="date-column">注册日期</th>
            <th class="date-column">到期日期</th>
            <th class="days-column">剩余天数</th>
            <th class="progress-column">进度</th>
            ${isAdmin ? '<th class="operation-column">操作</th>' : ''}
          </tr>
        </thead>
        <tbody>
          ${cfSecondLevelAndCustomTable}
        </tbody>
      </table>
      ${isAdmin ? `
        <div>
          <h2>添加CF二级域名or自定义域名</h2>
          <form id="addCustomDomainForm">
            <input type="text" id="newDomain" placeholder="域名" required>
            <input type="text" id="newSystem" placeholder="系统" required>
            <input type="text" id="newRegistrar" placeholder="注册商" required>
            <input type="date" id="newRegistrationDate" required>
            <input type="date" id="newExpirationDate" required>
            <button type="submit">添加</button>
          </form>
        </div>
      ` : ''}
    </div>
    ${isAdmin ? `
    <script>
      // 保持原有的 JavaScript 函数

      document.getElementById('addCustomDomainForm').addEventListener('submit', function(e) {
        e.preventDefault();
        const domain = document.getElementById('newDomain').value;
        const system = document.getElementById('newSystem').value;
        const registrar = document.getElementById('newRegistrar').value;
        const registrationDate = document.getElementById('newRegistrationDate').value;
        const expirationDate = document.getElementById('newExpirationDate').value;

        fetch('/api/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(':' + '${ADMIN_PASSWORD}')
          },
          body: JSON.stringify({
            action: 'add',
            domain: domain,
            system: system,
            registrar: registrar,
            registrationDate: registrationDate,
            expirationDate: expirationDate
          })
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            alert('添加成功');
            location.reload();
          } else {
            alert('添加失败');
          }
        })
        .catch(error => {
          console.error('Error:', error);
          alert('添加失败');
        });
      });
    </script>
    ` : ''}
    </body> </html> `; }


function getStatusColor(daysRemaining) {
  if (isNaN(daysRemaining)) return '#808080'; // 灰色表示未知状态
  if (daysRemaining <= 7) return '#ff0000'; // 红色
  if (daysRemaining <= 30) return '#ffa500'; // 橙色
  if (daysRemaining <= 90) return '#ffff00'; // 黄色
  return '#00ff00'; // 绿色
}

function getStatusTitle(daysRemaining) {
  if (isNaN(daysRemaining)) return '未知状态';
  if (daysRemaining <= 7) return '紧急';
  if (daysRemaining <= 30) return '警告';
  if (daysRemaining <= 90) return '注意';
  return '正常';
}

function categorizeDomains(domains) {
  if (!domains || !Array.isArray(domains)) {
    console.error('Invalid domains input:', domains);
    return { cfTopLevel: [], cfSecondLevelAndCustom: [] };
  }

  return domains.reduce((acc, domain) => {
    if (domain.system === 'Cloudflare' && domain.domain.split('.').length === 2) {
      acc.cfTopLevel.push(domain);
    } else {
      acc.cfSecondLevelAndCustom.push(domain);
    }
    return acc;
  }, { cfTopLevel: [], cfSecondLevelAndCustom: [] });
}
