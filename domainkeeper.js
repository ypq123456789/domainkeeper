// 自定义标题
const CUSTOM_TITLE = "我的域名管理";

// 在这里设置你的 Cloudflare API Token
const CF_API_KEY = "";

// 自建 WHOIS 代理服务地址
const WHOIS_PROXY_URL = "";

// 访问密码（可为空）
const ACCESS_PASSWORD = "";

// 后台密码（不可为空）
const ADMIN_PASSWORD = "";

// KV 命名空间绑定名称
const KV_NAMESPACE = DOMAIN_INFO;

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
    Powered by DomainKeeper v1.2.5 <span style="margin: 0 10px;">|</span> 作者：bacon159
  </footer>
`;


addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
});

async function handleRequest(request) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/") {
    return handleFrontend(request);
  } else if (path === "/admin") {
    return handleAdmin(request);
  } else if (path === "/api/update") {
    return handleApiUpdate(request);
  } else if (path === "/login") {
    return handleLogin(request);
  } else if (path === "/admin-login") {  // 确保这里是 /admin-login
    return handleAdminLogin(request);
  } else {
    return new Response("Not Found", { status: 404 });
  }
}


async function handleFrontend(request) {
  const cookie = request.headers.get("Cookie");
  if (ACCESS_PASSWORD && (!cookie || !cookie.includes(`access_token=${ACCESS_PASSWORD}`))) {
    return Response.redirect(`${new URL(request.url).origin}/login`, 302);
  }

  const domains = await fetchCloudflareDomainsInfo();
  const domainsWithInfo = await fetchDomainInfo(domains);
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
    const { domain, registrar, registrationDate, expirationDate } = data;

    // 获取当前存储的域名信息
    let domainInfo = await KV_NAMESPACE.get(domain, 'json') || {};

    // 更新信息
    domainInfo = {
      ...domainInfo,
      registrar,
      registrationDate,
      expirationDate
    };

    // 保存更新后的信息
    await KV_NAMESPACE.put(domain, JSON.stringify(domainInfo));

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
  for (const domain of domains) {
    if (domain.domain.split('.').length === 2) {
      // 顶级域名
      const cachedInfo = await getCachedWhoisInfo(domain.domain);
      if (cachedInfo) {
        result.push({ ...domain, ...cachedInfo });
      } else {
        const whoisInfo = await fetchWhoisInfo(domain.domain);
        await cacheWhoisInfo(domain.domain, whoisInfo);
        result.push({ ...domain, ...whoisInfo });
      }
    } else {
      // 二级域名
      const storedInfo = await KV_NAMESPACE.get(domain.domain, 'json');
      result.push({ ...domain, ...storedInfo });
    }
  }
  return result;
}

async function fetchWhoisInfo(domain) {
  try {
    const response = await fetch(`${WHOIS_PROXY_URL}/whois/${domain}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch WHOIS data for ${domain}`);
    }
    const data = await response.json();
    return {
      expirationDate: data.expirationDate ? data.expirationDate.split('T')[0] : 'Unknown',
      registrar: data.registrar || '未知',
    };
  } catch (error) {
    return {
      expirationDate: 'WHOIS查询失败',
      registrar: '未知',
      whoisError: error.message
    };
  }
}

async function getCachedWhoisInfo(domain) {
  const cacheKey = `whois_${domain}`;
  const cachedData = await KV_NAMESPACE.get(cacheKey);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData);
    if (Date.now() - timestamp < 12 * 60 * 60 * 1000) {
      return data;
    }
  }
  return null;
}

async function cacheWhoisInfo(domain, data) {
  const cacheKey = `whois_${domain}`;
  await KV_NAMESPACE.put(cacheKey, JSON.stringify({
    data,
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
  
  const generateTable = (domainList) => {
    return domainList.map(info => {
      const today = new Date();
      const expirationDate = new Date(info.expirationDate);
      const daysRemaining = isNaN(expirationDate.getTime()) ? 'N/A' : Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
      const totalDays = isNaN(expirationDate.getTime()) ? 'N/A' : Math.ceil((expirationDate - new Date(info.registrationDate)) / (1000 * 60 * 60 * 24));
      const progressPercentage = isNaN(daysRemaining) || isNaN(totalDays) ? 0 : 100 - (daysRemaining / totalDays * 100);
      
      const whoisErrorMessage = info.whoisError 
        ? `<br><span style="color: red;">WHOIS错误: ${info.whoisError}</span><br><span style="color: blue;">建议：请检查域名状态或API配置</span>`
        : '';

      const editButton = isAdmin
        ? `<button onclick="editDomain('${info.domain}', this)">编辑</button>`
        : '';

        return `
        <tr data-domain="${info.domain}">
          <td><span class="status-dot" style="background-color: ${getStatusColor(daysRemaining)};" title="${getStatusTitle(daysRemaining)}"></span></td>
          <td>${info.domain}</td>
          <td>${info.system}</td>
          <td class="editable">${info.registrar || '未知'}${whoisErrorMessage}</td>
          <td class="editable">${info.registrationDate}</td>
          <td class="editable">${info.expirationDate}</td>
          <td>${daysRemaining}</td>
          <td>
            <div class="progress-bar">
              <div class="progress" style="width: ${progressPercentage}%;"></div>
            </div>
          </td>
          <td>${editButton}</td>
        </tr>
      `;
    }).join('');
  };

  const topLevelTable = generateTable(categorizedDomains.topLevel);
  const secondLevelTable = generateTable(categorizedDomains.secondLevel);

  const adminScript = isAdmin ? `
<script>
  function editDomain(domain, button) {
    const row = button.closest('tr');
    const editableCells = row.querySelectorAll('.editable');
    
    editableCells.forEach((cell, index) => {
      const currentValue = cell.textContent;
      if (index === 0) { // 注册商
        cell.innerHTML = '<input type="text" value="' + currentValue + '">';
      } else { // 注册日期和到期日期
        cell.innerHTML = '<input type="date" value="' + currentValue + '">';
      }
    });
    
    button.textContent = '保存';
    button.onclick = function() { saveDomain(domain, this); };
  }

  function saveDomain(domain, button) {
    const row = button.closest('tr');
    const editableCells = row.querySelectorAll('.editable');
    const data = {
      domain: domain,
      registrar: editableCells[0].querySelector('input').value,
      registrationDate: editableCells[1].querySelector('input').value,
      expirationDate: editableCells[2].querySelector('input').value
    };
  
    fetch('/api/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
      },
      body: JSON.stringify(data)
    }).then(response => response.json())
    .then(result => {
      if (result.success) {
        alert('更新成功');
        // 更新表格中的数据
        editableCells[0].textContent = data.registrar;
        editableCells[1].textContent = data.registrationDate;
        editableCells[2].textContent = data.expirationDate;
        
        // 重置按钮
        button.textContent = '编辑';
        button.onclick = function() { editDomain(domain, this); };
        
        // 更新剩余天数、状态点和进度条
        updateRowData(row);
      } else {
        alert('更新失败: ' + (result.error || '未知错误'));
      }
    }).catch(error => {
      alert('更新失败: ' + error.message);
    });
  }
  
  function updateRowData(row) {
    const cells = row.cells;
    const registrationDate = new Date(cells[4].textContent);
    const expirationDate = new Date(cells[5].textContent);
    const today = new Date();
    
    // 检查到期日是否有效且在当前日期之后
    const isValidExpiration = !isNaN(expirationDate.getTime()) && expirationDate > today;
    
    const daysRemaining = isValidExpiration ? Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24)) : 'N/A';
    const totalDays = isValidExpiration ? Math.ceil((expirationDate - registrationDate) / (1000 * 60 * 60 * 24)) : 'N/A';
    const progressPercentage = isValidExpiration ? 100 - (daysRemaining / totalDays * 100) : 0;
    
    // 更新状态点
    const statusDot = cells[0].querySelector('.status-dot');
    if (isValidExpiration) {
      if (daysRemaining > 30) {
        statusDot.style.backgroundColor = '#2ecc71'; // 绿色
        statusDot.title = '正常';
      } else if (daysRemaining > 0) {
        statusDot.style.backgroundColor = '#f1c40f'; // 黄色
        statusDot.title = '即将过期';
      } else {
        statusDot.style.backgroundColor = '#e74c3c'; // 红色
        statusDot.title = '已过期';
      }
    } else {
      statusDot.style.backgroundColor = '#e74c3c'; // 红色
      statusDot.title = '无效的到期日期或已过期';
    }
    
    // 更新剩余天数
    cells[6].textContent = daysRemaining;
    
    // 更新进度条
    cells[7].querySelector('.progress').style.width = \`\${progressPercentage}%\`;
  }
</script>
` : '';


  // 添加管理员链接或标识
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
        margin: 0;
        padding: 20px;
        background-color: #f4f4f4;
      }
      .container {
        max-width: 1200px;
        margin: 0 auto;
        background-color: #fff;
        padding: 20px;
        border-radius: 5px;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      }
      h1, h2 {
        color: #2c3e50;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        margin-bottom: 20px;
      }
      th, td {
        padding: 12px;
        text-align: left;
        border-bottom: 1px solid #ddd;
      }
      th {
        background-color: #2c3e50;
        color: #fff;
      }
      tr:hover {
        background-color: #f5f5f5;
      }
      .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .progress-bar {
        width: 100%;
        background-color: #e0e0e0;
        padding: 3px;
        border-radius: 3px;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, .2);
      }
      .progress {
        display: block;
        height: 22px;
        background-color: #659cef;
        border-radius: 3px;
        transition: width 500ms ease-in-out;
      }
      .admin-link {
        text-align: right;
        margin-bottom: 20px;
      }
      .admin-link a, .admin-link span {
        color: #3498db;
        text-decoration: none;
        font-weight: bold;
      }
      .admin-link a:hover {
        text-decoration: underline;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="admin-link">${adminLink}</div>
      <h1>${CUSTOM_TITLE}${isAdmin ? ' - 后台管理' : ''}</h1>
      <h2>顶级域名</h2>
      <table>
        <thead>
          <tr>
            <th>状态</th>
            <th>域名</th>
            <th>系统</th>
            <th>注册商</th>
            <th>注册日期</th>
            <th>到期日期</th>
            <th>剩余天数</th>
            <th>进度条</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${topLevelTable}
        </tbody>
      </table>
      <h2>二级域名</h2>
      <table>
        <thead>
          <tr>
            <th>状态</th>
            <th>域名</th>
            <th>系统</th>
            <th>注册商</th>
            <th>注册日期</th>
            <th>到期日期</th>
            <th>剩余天数</th>
            <th>进度条</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          ${secondLevelTable}
        </tbody>
      </table>
    </div>
    ${adminScript}
    ${footerHTML}
  </body>
  </html>
  `;
}

function categorizeDomains(domains) {
  const topLevel = [];
  const secondLevel = [];

  for (const domain of domains) {
    if (domain.domain.split('.').length === 2) {
      topLevel.push(domain);
    } else {
      secondLevel.push(domain);
    }
  }

  return { topLevel, secondLevel };
}
