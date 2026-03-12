import { connect } from 'cloudflare:sockets';

// 在文件顶部添加版本信息后台密码（不可为空）
const VERSION = "1.7.0";

// 自定义标题
const CUSTOM_TITLE = "培根的玉米大全";

// 在这里设置你的 Cloudflare API Token
const CF_API_KEY_DEFAULT = "";
let CF_API_KEY = CF_API_KEY_DEFAULT;

// 自建 WHOIS 代理服务地址
const WHOIS_PROXY_URL = "https://whois.0o11.com";
const ENABLE_WHOIS_PROXY_FALLBACK = false;
const WHOIS_CACHE_TTL_MS = 60 * 60 * 1000;
const WHOIS_CACHE_SCHEMA_VERSION = 9;
const WHOIS_ERROR_RETRY_MS = 10 * 60 * 1000;
const WHOIS_PORT = 43;
const WHOIS_QUERY_TIMEOUT_MS = 15000;
const WHOIS_MAX_RESPONSE_BYTES = 256 * 1024;
const WHOIS_LOOKUP_MEMO_TTL_MS = 5 * 60 * 1000;

const ACCESS_PASSWORD_DEFAULT = "";
let ACCESS_PASSWORD = ACCESS_PASSWORD_DEFAULT;

const ADMIN_PASSWORD_DEFAULT = "";
let ADMIN_PASSWORD = ADMIN_PASSWORD_DEFAULT;
const WHOISXML_API_KEY_DEFAULT = "";
let WHOISXML_API_KEY = WHOISXML_API_KEY_DEFAULT;

let KV_NAMESPACE = null;
const WHOIS_LOOKUP_MEMO = new Map();
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

export default {
  async fetch(request, env) {
    applyRuntimeBindings(env);
    return handleRequest(request);
  }
};

function applyRuntimeBindings(env) {
  CF_API_KEY = env.CF_API_KEY || CF_API_KEY_DEFAULT;
  ACCESS_PASSWORD = env.ACCESS_PASSWORD || ACCESS_PASSWORD_DEFAULT;
  ADMIN_PASSWORD = env.ADMIN_PASSWORD || ADMIN_PASSWORD_DEFAULT;
  WHOISXML_API_KEY = env.WHOISXML_API_KEY || WHOISXML_API_KEY_DEFAULT;
  KV_NAMESPACE = env.DOMAIN_INFO || null;
  if (!KV_NAMESPACE) {
    throw new Error('Missing DOMAIN_INFO binding');
  }
}

async function handleRequest(request) {
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
      try {
        const { data } = JSON.parse(value);
        if (data.whoisError) {
          await KV_NAMESPACE.delete(key.name);
        }
      } catch (error) {
        console.error(`Error parsing data for ${key.name}:`, error);
      }
    }
  }
}

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
    const password = formData.get("password");

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
    const { action, domain, system, registrar, registrationDate, expirationDate } = data;

    if (action === 'delete') {
      // 删除自定义域名
      await KV_NAMESPACE.delete(`whois_${domain}`);
    } else if (action === 'update-whois') {
      // 更新 WHOIS 信息
      const cachedInfo = await getCachedWhoisInfo(domain) || { domain };
      const whoisInfo = await fetchWhoisInfo(domain);
      const mergedInfo = mergeWhoisInfoWithFallback(cachedInfo, whoisInfo);
      await cacheWhoisInfo(domain, mergedInfo);
    } else if (action === 'add') {
      // 添加新域名
      const newDomainInfo = {
        domain,
        system,
        registrar,
        registrationDate,
        expirationDate,
        isCustom: true
      };
      await cacheWhoisInfo(domain, newDomainInfo);
    } else if (action === 'reset-custom') {
      // 重置域名的自定义标记
      const domainInfo = await getCachedWhoisInfo(domain);
      if (domainInfo) {
        domainInfo.isCustom = false;
        await cacheWhoisInfo(domain, domainInfo);
      }
    } else if (action === 'get-props') {
      // 获取域名属性
      const domainInfo = await getCachedWhoisInfo(domain);
      if (domainInfo) {
        return new Response(JSON.stringify({
          success: true,
          props: domainInfo
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } else {
        return new Response(JSON.stringify({
          success: false,
          message: '找不到域名'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } else if (action === 'sync-cloudflare') {
      // 同步Cloudflare域名
      const cfDomains = await fetchCloudflareDomainsInfo();
      
      // 获取域名列表以显示
      const domainNamesList = cfDomains.map(d => d.domain);
      
      // 获取KV中所有域名
      const allDomainKeys = await KV_NAMESPACE.list({ prefix: 'whois_' });
      
      // 处理KV中的域名
      for (const key of allDomainKeys.keys) {
        const domainName = key.name.replace('whois_', '');
        const domainData = await getCachedWhoisInfo(domainName);
        
        // 记录特定域名的信息，用于调试
        if (domainName === 'yyas.top') {
          console.log('Current yyas.top status:', JSON.stringify(domainData));
        }
        
        // 如果不是自定义域名，且不在CF域名列表中，则删除
        if (domainData && !domainData.isCustom) {
          const cfDomain = cfDomains.find(d => d.domain === domainName);
          if (!cfDomain) {
            console.log(`Removing domain not in CF: ${domainName}`);
            await KV_NAMESPACE.delete(key.name);
          }
        }
      }
      
      // 处理CF中的域名，确保它们在KV中
      for (const cfDomain of cfDomains) {
        const cachedRecord = await getCachedWhoisRecord(cfDomain.domain);
        const cachedInfo = cachedRecord ? cachedRecord.data : null;
        const baseInfo = { ...cfDomain, ...(cachedInfo || {}) };

        if (shouldRefreshWhoisCache(baseInfo, cachedRecord)) {
          try {
            const whoisInfo = await fetchWhoisInfo(cfDomain.domain);
            const mergedInfo = mergeWhoisInfoWithFallback(baseInfo, whoisInfo);
            await cacheWhoisInfo(cfDomain.domain, mergedInfo);
          } catch (error) {
            console.error(`Error fetching WHOIS for ${cfDomain.domain}:`, error);
            await cacheWhoisInfo(cfDomain.domain, {
              ...baseInfo,
              whoisError: error.message
            });
          }
        } else if (!cachedInfo) {
          await cacheWhoisInfo(cfDomain.domain, baseInfo);
        }
      }
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Cloudflare域名同步完成',
        count: cfDomains.length,
        domains: domainNamesList  // 返回域名列表
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // 更新域名信息
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
    console.error('Error in handleApiUpdate:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function handleWhoisRequest(domain) {
  console.log(`Handling WHOIS request for domain: ${domain}`);

  try {
    const rawData = await fetchWhoisRawData(domain);

    return new Response(JSON.stringify({
      error: false,
      rawData
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

async function fetchCloudflareDomainsInfo() {
  let allZones = [];
  let page = 1;
  let hasMorePages = true;
  
  // 使用分页获取所有域名
  while (hasMorePages) {
    console.log(`Fetching Cloudflare zones page ${page}...`);
    const response = await fetch(`https://api.cloudflare.com/client/v4/zones?page=${page}&per_page=50`, {
      headers: {
        'Authorization': `Bearer ${CF_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch domains from Cloudflare: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error('Cloudflare API request failed');
    }

    allZones = [...allZones, ...data.result];
    
    // 检查是否有更多页面
    if (data.result_info.total_pages > page) {
      page++;
    } else {
      hasMorePages = false;
    }
  }

  console.log(`Total zones fetched from Cloudflare: ${allZones.length}`);
  
  // 只返回Zone信息，不获取DNS记录
  return allZones.map(zone => ({
    domain: zone.name,
    registrationDate: new Date(zone.created_on).toISOString().split('T')[0],
    system: 'Cloudflare',
    zoneId: zone.id
  }));
}


async function fetchDomainInfo(domains) {
  const result = [];
  
  // 获取所有域名信息，包括自定义域名
  const allDomainKeys = await KV_NAMESPACE.list({ prefix: 'whois_' });
  const allDomains = await Promise.all(allDomainKeys.keys.map(async (key) => {
    const value = await KV_NAMESPACE.get(key.name);
    if (value) {
      try {
        const parsedValue = JSON.parse(value);
        return extractCachedWhoisData(parsedValue);
      } catch (error) {
        console.error(`Error parsing data for ${key.name}:`, error);
        return null;
      }
    }
    return null;
  }));

  // 过滤掉无效的域名数据
  const validAllDomains = allDomains.filter(d => d && d.isCustom);

  // 合并 Cloudflare 域名和自定义域名
  const mergedDomains = [...domains, ...validAllDomains];
  
  for (const domain of mergedDomains) {
    if (!domain) continue; // 跳过无效的域名数据

    let domainInfo = { ...domain };

    const domainName = domain.domain || domain;
    const cachedRecord = await getCachedWhoisRecord(domainName);
    const cachedInfo = cachedRecord ? cachedRecord.data : null;
    if (cachedInfo) {
      domainInfo = { ...domainInfo, ...cachedInfo };
    }

    if (shouldRefreshWhoisCache(domainInfo, cachedRecord)) {
      try {
        const whoisInfo = await fetchWhoisInfo(domainInfo.domain);
        domainInfo = mergeWhoisInfoWithFallback(domainInfo, whoisInfo);
        await cacheWhoisInfo(domainInfo.domain, domainInfo);
      } catch (error) {
        console.error(`Error fetching WHOIS info for ${domainInfo.domain}:`, error);
        domainInfo.whoisError = error.message;
        await cacheWhoisInfo(domainInfo.domain, domainInfo);
      }
    }

    result.push(domainInfo);
  }
  return result;
}

async function fetchWhoisInfo(domain) {
  try {
    console.log(`Fetching WHOIS data for: ${domain}`);
    const lookupResult = await resolveBestWhoisResultForDomain(domain);
    const parsed = lookupResult.parsed;

    if (!isWhoisInfoCompletelyUnknown(parsed)) {
      return {
        ...parsed,
        whoisLookupDomain: lookupResult.lookupDomain
      };
    }

    return {
      registrar: 'Unknown',
      registrationDate: 'Unknown',
      expirationDate: 'Unknown',
      whoisError: 'WHOIS raw data parsed but required fields were not found'
    };
  } catch (error) {
    console.error(`Error fetching WHOIS info for ${domain}:`, error);

    return {
      registrar: 'Unknown',
      registrationDate: 'Unknown',
      expirationDate: 'Unknown',
      whoisError: error.message
    };
  }
}

async function fetchWhoisRawData(domain) {
  const lookupResult = await resolveBestWhoisResultForDomain(domain);
  return lookupResult.rawData;
}

async function resolveBestWhoisResultForDomain(domain) {
  const candidates = getWhoisLookupCandidates(domain);
  let bestResult = null;
  const errors = [];

  for (const candidateDomain of candidates) {
    try {
      const candidateResult = await resolveBestWhoisResult(candidateDomain);
      const scoredCandidate = {
        ...candidateResult,
        lookupDomain: candidateDomain
      };

      if (!bestResult || scoredCandidate.score > bestResult.score || (scoredCandidate.score === bestResult.score && String(scoredCandidate.rawData).length > String(bestResult.rawData).length)) {
        bestResult = scoredCandidate;
      }

      if (hasCompleteWhoisData(scoredCandidate.parsed)) {
        return scoredCandidate;
      }
    } catch (error) {
      errors.push(`${candidateDomain}: ${error.message}`);
      console.error(`WHOIS candidate lookup failed for ${candidateDomain}:`, error);
    }
  }

  if (bestResult) {
    return bestResult;
  }

  throw new Error(`WHOIS query failed (${errors.join(' | ')})`);
}

function getWhoisLookupCandidates(domain) {
  const labels = String(domain || '').trim().toLowerCase().split('.').filter(Boolean);
  if (labels.length < 2) {
    return [domain];
  }

  const candidates = [];
  for (let i = 0; i <= labels.length - 2; i++) {
    candidates.push(labels.slice(i).join('.'));
  }

  return [...new Set(candidates)];
}

async function resolveBestWhoisResult(domain) {
  const cachedMemo = WHOIS_LOOKUP_MEMO.get(domain);
  if (cachedMemo && (Date.now() - cachedMemo.timestamp) < WHOIS_LOOKUP_MEMO_TTL_MS) {
    return cachedMemo.result;
  }

  const result = await performWhoisLookup(domain);
  WHOIS_LOOKUP_MEMO.set(domain, {
    timestamp: Date.now(),
    result
  });
  return result;
}

async function performWhoisLookup(domain) {
  const tld = domain.split('.').pop().toLowerCase();
  const attempts = [
    { name: 'direct', fetcher: fetchWhoisRawDataDirect },
    { name: 'authoritative-rdap', fetcher: fetchWhoisRawDataViaAuthoritativeRdap },
    { name: 'rdap-org', fetcher: fetchWhoisRawDataViaRdapOrg }
  ];

  if (tld === 'xyz') {
    attempts.push({ name: 'rdap-xyz', fetcher: fetchWhoisRawDataViaXyzRdap });
    attempts.push({ name: 'rdap-aliyun', fetcher: fetchWhoisRawDataViaAliyunRdap });
  }

  attempts.push({ name: 'whoisxml', fetcher: fetchWhoisRawDataViaWhoisXml });

  if (ENABLE_WHOIS_PROXY_FALLBACK && WHOIS_PROXY_URL) {
    attempts.push({ name: 'proxy', fetcher: fetchWhoisRawDataViaProxy });
  }

  const errors = [];
  let bestResult = null;

  for (const attempt of attempts) {
    try {
      const rawData = await attempt.fetcher(domain);
      const parsed = sanitizeWhoisInfo(parseWhoisResult({ rawData }));
      const score = getWhoisDataScore(parsed);
      const candidate = {
        source: attempt.name,
        rawData,
        parsed,
        score
      };

      if (!bestResult || score > bestResult.score || (score === bestResult.score && String(rawData).length > String(bestResult.rawData).length)) {
        bestResult = candidate;
      }

      if (hasCompleteWhoisData(parsed)) {
        return candidate;
      }

      errors.push(`${attempt.name}: parsed but required fields were not found`);
    } catch (error) {
      errors.push(`${attempt.name}: ${error.message}`);
      console.error(`${attempt.name} WHOIS failed for ${domain}:`, error);
    }
  }

  if (bestResult) {
    return bestResult;
  }

  throw new Error(`WHOIS query failed (${errors.join(' | ')})`);
}

function getWhoisDataScore(data) {
  if (!data || typeof data !== 'object') return 0;

  let score = 0;
  if (data.registrar && data.registrar !== 'Unknown') score += 1;
  if (data.registrationDate && data.registrationDate !== 'Unknown') score += 1;
  if (data.expirationDate && data.expirationDate !== 'Unknown') score += 1;
  return score;
}

async function fetchWhoisRawDataDirect(domain) {
  const connect = getWhoisConnect();
  const tld = domain.split('.').pop().toLowerCase();
  const whoisServer = await resolveWhoisServer(connect, tld);

  if (!whoisServer) {
    throw new Error(`Unable to resolve WHOIS server for .${tld}`);
  }

  let rawData = await queryWhoisServer(connect, whoisServer, domain);
  rawData = rawData || '';
  let bestRawData = rawData;
  let bestScore = getWhoisDataScore(parseWhoisResult({ rawData }));

  const referralServer = parseWhoisFieldFromRaw(rawData, ['Whois Server']);
  if (referralServer && !sameWhoisServer(referralServer, whoisServer)) {
    const referredData = await queryWhoisServer(connect, referralServer, domain);
    if (referredData && referredData.trim()) {
      const referredScore = getWhoisDataScore(parseWhoisResult({ rawData: referredData }));
      if (referredScore >= bestScore) {
        bestRawData = referredData;
        bestScore = referredScore;
      }
    }
  }

  if (!bestRawData.trim()) {
    throw new Error(`WHOIS response is empty from ${whoisServer}`);
  }

  return bestRawData;
}

function getWhoisConnect() {
  if (typeof connect === 'function') {
    return connect;
  }
  if (typeof globalThis.connect === 'function') {
    return globalThis.connect;
  }
  throw new Error('TCP connect() API is unavailable in the current Worker runtime');
}

async function fetchWhoisRawDataViaWhoisXml(domain) {
  if (!WHOISXML_API_KEY) {
    throw new Error('WHOISXML_API_KEY is not configured');
  }

  const url = new URL('https://www.whoisxmlapi.com/whoisserver/WhoisService');
  url.searchParams.set('apiKey', WHOISXML_API_KEY);
  url.searchParams.set('domainName', domain);
  url.searchParams.set('outputFormat', 'JSON');

  const response = await fetch(url.toString(), {
    headers: { 'Accept': 'application/json' }
  });

  if (!response.ok) {
    throw new Error(`WHOISXML responded with status ${response.status}`);
  }

  const payload = await response.json();
  const errorMessage =
    payload?.ErrorMessage?.msg ||
    payload?.ErrorMessage?.errorMessage ||
    payload?.errorMessage;
  if (errorMessage) {
    throw new Error(errorMessage);
  }

  const record = payload?.WhoisRecord || payload?.whoisRecord;
  if (!record || typeof record !== 'object') {
    throw new Error('WHOISXML returned empty WhoisRecord');
  }

  const rawText =
    record.rawText ||
    record?.registryData?.rawText ||
    record?.audit?.rawText ||
    '';

  if (String(rawText).trim()) {
    return String(rawText);
  }

  const structuredRecord = JSON.stringify(record);
  if (structuredRecord && structuredRecord !== '{}') {
    return structuredRecord;
  }

  const synthesized = synthesizeRawWhoisFromWhoisXml(record);
  if (synthesized.trim()) {
    return synthesized;
  }

  throw new Error('WHOISXML response did not include parsable WHOIS data');
}

async function fetchWhoisRawDataViaXyzRdap(domain) {
  const response = await fetch(`https://rdap.centralnic.com/xyz/domain/${encodeURIComponent(domain)}`, {
    headers: {
      'Accept': 'application/rdap+json, application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`XYZ RDAP responded with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('XYZ RDAP returned empty payload');
  }

  return JSON.stringify(payload);
}

async function fetchWhoisRawDataViaRdapOrg(domain) {
  const response = await fetch(`https://rdap.org/domain/${encodeURIComponent(domain)}`, {
    headers: {
      'Accept': 'application/rdap+json, application/json'
    },
    redirect: 'follow'
  });

  if (!response.ok) {
    throw new Error(`RDAP.org responded with status ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('json')) {
    throw new Error(`RDAP.org returned non-JSON payload (${contentType})`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('RDAP.org returned empty payload');
  }

  return JSON.stringify(payload);
}

async function fetchWhoisRawDataViaAuthoritativeRdap(domain) {
  const tld = domain.split('.').pop().toLowerCase();
  const rdapEndpointMap = {
    in: 'https://rdap.nixiregistry.in/rdap/domain/',
    org: 'https://rdap.publicinterestregistry.org/rdap/domain/'
  };

  const baseUrl = rdapEndpointMap[tld];
  if (!baseUrl) {
    throw new Error(`No authoritative RDAP endpoint configured for .${tld}`);
  }

  const response = await fetch(`${baseUrl}${encodeURIComponent(domain)}`, {
    headers: {
      'Accept': 'application/rdap+json, application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Authoritative RDAP responded with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Authoritative RDAP returned empty payload');
  }

  return JSON.stringify(payload);
}

async function fetchWhoisRawDataViaAliyunRdap(domain) {
  const response = await fetch(`https://whois.aliyun.com/rdap/domain/${encodeURIComponent(domain)}`, {
    headers: {
      'Accept': 'application/rdap+json, application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Aliyun RDAP responded with status ${response.status}`);
  }

  const payload = await response.json();
  if (!payload || typeof payload !== 'object') {
    throw new Error('Aliyun RDAP returned empty payload');
  }

  return JSON.stringify(payload);
}

function synthesizeRawWhoisFromWhoisXml(record) {
  const lines = [];
  const domainName =
    record.domainName ||
    record?.registryData?.domainName ||
    '';
  const registrar =
    record.registrarName ||
    record.registrarIANAID ||
    record?.registryData?.registrarName ||
    '';
  const created =
    record.createdDateNormalized ||
    record.createdDate ||
    record?.registryData?.createdDateNormalized ||
    record?.registryData?.createdDate ||
    '';
  const expires =
    record.expiresDateNormalized ||
    record.expiresDate ||
    record?.registryData?.expiresDateNormalized ||
    record?.registryData?.expiresDate ||
    '';

  if (domainName) lines.push(`Domain Name: ${domainName}`);
  if (registrar) lines.push(`Registrar: ${registrar}`);
  if (created) lines.push(`Creation Date: ${created}`);
  if (expires) lines.push(`Registry Expiry Date: ${expires}`);

  return lines.join('\n');
}

async function fetchWhoisRawDataViaProxy(domain) {
  const response = await fetch(`${WHOIS_PROXY_URL}/whois/${domain}`);
  const contentType = response.headers.get('content-type') || '';
  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`WHOIS proxy responded with status ${response.status}`);
  }

  if (!responseText) {
    throw new Error('WHOIS proxy returned empty response');
  }

  let proxyData = null;
  try {
    proxyData = JSON.parse(responseText);
  } catch (error) {
    proxyData = null;
  }

  if (proxyData && typeof proxyData === 'object') {
    if (proxyData.error) {
      throw new Error(proxyData.message || 'WHOIS proxy returned error');
    }
    if (proxyData.rawData && String(proxyData.rawData).trim()) {
      return String(proxyData.rawData);
    }
  }

  if (contentType.includes('text/plain') || responseText.includes('\n')) {
    return responseText;
  }

  throw new Error(`WHOIS proxy returned unsupported payload (${contentType})`);
}

async function resolveWhoisServer(connect, tld) {
  const staticMap = {
    art: 'whois.nic.art',
    blog: 'whois.nic.blog',
    com: 'whois.verisign-grs.com',
    cool: 'whois.nic.cool',
    my: 'whois.mynic.my',
    net: 'whois.verisign-grs.com',
    org: 'whois.pir.org',
    top: 'whois.nic.top',
    xyz: 'whois.nic.xyz',
    yoga: 'whois.nic.yoga'
  };

  if (staticMap[tld]) {
    return staticMap[tld];
  }

  const ianaData = await queryWhoisServer(connect, 'whois.iana.org', tld);
  const discovered = parseWhoisFieldFromRaw(ianaData, ['whois']);
  return discovered || null;
}

async function queryWhoisServer(connect, hostname, query) {
  const socket = connect({
    hostname,
    port: WHOIS_PORT
  }, {
    secureTransport: 'off'
  });

  const writer = socket.writable.getWriter();
  const encoder = new TextEncoder();

  try {
    await withTimeout(
      writer.write(encoder.encode(`${query}\r\n`)),
      WHOIS_QUERY_TIMEOUT_MS,
      `WHOIS write timeout (${hostname})`
    );
    await writer.close();

    const rawData = await withTimeout(
      readAllFromSocket(socket.readable),
      WHOIS_QUERY_TIMEOUT_MS,
      `WHOIS read timeout (${hostname})`
    );
    return rawData;
  } finally {
    try {
      writer.releaseLock();
    } catch (error) {
      // ignore writer release errors
    }
    try {
      await socket.close();
    } catch (error) {
      // ignore socket close errors
    }
  }
}

async function readAllFromSocket(readable) {
  const reader = readable.getReader();
  const chunks = [];
  let total = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value || !value.byteLength) continue;

      total += value.byteLength;
      if (total > WHOIS_MAX_RESPONSE_BYTES) {
        throw new Error('WHOIS response too large');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (!chunks.length) return '';

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

function withTimeout(promise, timeoutMs, timeoutMessage) {
  let timeoutId = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

function sameWhoisServer(a, b) {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

function parseWhoisResult(whoisData) {
  const source = typeof whoisData === 'string'
    ? { rawData: whoisData }
    : (whoisData && typeof whoisData === 'object' ? whoisData : {});

  const rawText =
    normalizeWhoisValue(source.rawData) ||
    normalizeWhoisValue(source.rawWhoisText) ||
    normalizeWhoisValue(source.raw) ||
    '';

  const structuredRaw = parseStructuredWhoisPayload(rawText);
  const structuredParsed = structuredRaw ? parseStructuredWhoisResult(structuredRaw) : null;

  const registrarFromFields = getFirstWhoisValue(source, [
    'registrar',
    'registrarName',
    'sponsoringRegistrar',
    'registrar_name',
    'Registrar'
  ]);

  const registrationDateFromFields = getFirstWhoisValue(source, [
    'creationDate',
    'createdDate',
    'createdOn',
    'creation_date',
    'registeredOn',
    'registrationDate'
  ]);

  const expirationDateFromFields = getFirstWhoisValue(source, [
    'expirationDate',
    'registryExpiryDate',
    'registryExpirationDate',
    'RegistryExpiryDate',
    'RegistryExpirationDate',
    'expiryDate',
    'expiresDate',
    'expireDate',
    'expiration_date',
    'paidTill'
  ]);

  const registrarFromRaw = parseWhoisFieldFromRaw(rawText, [
    'Registrar',
    'Sponsoring Registrar',
    'Registrar Name'
  ]);

  const registrationDateFromRaw = parseWhoisFieldFromRaw(rawText, [
    'Creation Date',
    'Created Date',
    'Created On',
    'Registered On',
    'created'
  ]);

  const expirationDateFromRaw = parseWhoisFieldFromRaw(rawText, [
    'Registry Expiry Date',
    'Registrar Registration Expiration Date',
    'Expiration Date',
    'Expiry Date',
    'Expire Date',
    'Expires On',
    'Paid-till',
    'expires'
  ]);

  return {
    registrar: structuredParsed?.registrar || registrarFromFields || registrarFromRaw || 'Unknown',
    registrationDate: formatDate(structuredParsed?.registrationDate || registrationDateFromFields || registrationDateFromRaw) || 'Unknown',
    expirationDate: formatDate(structuredParsed?.expirationDate || expirationDateFromFields || expirationDateFromRaw) || 'Unknown'
  };
}

function parseStructuredWhoisPayload(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return null;
  }

  const trimmed = rawText.trim();
  if (!trimmed || (trimmed[0] !== '{' && trimmed[0] !== '[')) {
    return null;
  }

  try {
    return JSON.parse(trimmed);
  } catch (error) {
    return null;
  }
}

function parseStructuredWhoisResult(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const registryData = payload?.registryData && typeof payload.registryData === 'object'
    ? payload.registryData
    : null;

  const registrationDate =
    extractWhoisEventDate(payload, ['registration', 'created', 'creation']) ||
    getFirstWhoisValue(payload, ['createdDateNormalized', 'createdDate', 'creationDate', 'createdOn', 'registeredDate']) ||
    getFirstWhoisValue(registryData, ['createdDateNormalized', 'createdDate', 'creationDate', 'createdOn', 'registeredDate']);

  const expirationDate =
    extractWhoisEventDate(payload, ['expiration', 'expiry', 'expires', 'registrar expiration']) ||
    getFirstWhoisValue(payload, ['expiresDateNormalized', 'expiresDate', 'expirationDate', 'registryExpiryDate', 'registryExpirationDate']) ||
    getFirstWhoisValue(registryData, ['expiresDateNormalized', 'expiresDate', 'expirationDate', 'registryExpiryDate', 'registryExpirationDate']);

  return {
    registrar: extractRegistrarFromStructuredWhois(payload) || extractRegistrarFromStructuredWhois(registryData),
    registrationDate,
    expirationDate
  };
}

function extractRegistrarFromStructuredWhois(payload) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const directRegistrar = getFirstWhoisValue(payload, [
    'registrar',
    'registrarName',
    'sponsoringRegistrar',
    'name'
  ]);
  if (directRegistrar) {
    return directRegistrar;
  }

  const entities = Array.isArray(payload.entities) ? payload.entities : [];
  for (const entity of entities) {
    const roles = Array.isArray(entity?.roles) ? entity.roles.map(role => String(role).toLowerCase()) : [];
    if (!roles.includes('registrar')) {
      continue;
    }

    const vcardName = extractNameFromVcardArray(entity.vcardArray);
    if (vcardName) {
      return vcardName;
    }

    const entityName = getFirstWhoisValue(entity, ['fn', 'handle', 'name']);
    if (entityName) {
      return entityName;
    }
  }

  return null;
}

function extractWhoisEventDate(payload, expectedActions) {
  const events = Array.isArray(payload.events) ? payload.events : [];
  const normalizedExpected = expectedActions.map(action => normalizeWhoisEventAction(action));

  for (const event of events) {
    const action = normalizeWhoisEventAction(event?.eventAction);
    if (!action || !normalizedExpected.includes(action)) {
      continue;
    }

    const eventDate = normalizeWhoisValue(event?.eventDate);
    if (eventDate) {
      return eventDate;
    }
  }

  return null;
}

function normalizeWhoisEventAction(action) {
  return String(action || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ');
}

function extractNameFromVcardArray(vcardArray) {
  if (!Array.isArray(vcardArray) || !Array.isArray(vcardArray[1])) {
    return null;
  }

  for (const entry of vcardArray[1]) {
    if (!Array.isArray(entry) || entry.length < 4) {
      continue;
    }

    if (entry[0] === 'fn' || entry[0] === 'org') {
      const value = normalizeWhoisValue(entry[3]);
      if (value) {
        return value;
      }
    }
  }

  return null;
}

function getFirstWhoisValue(data, keys) {
  if (!data || typeof data !== 'object') return null;

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const normalized = normalizeWhoisValue(data[key]);
      if (normalized) return normalized;
    }
  }

  return null;
}

function normalizeWhoisValue(value) {
  if (value === null || value === undefined) return null;

  if (Array.isArray(value)) {
    for (const item of value) {
      const normalizedItem = normalizeWhoisValue(item);
      if (normalizedItem) return normalizedItem;
    }
    return null;
  }

  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'value')) {
      return normalizeWhoisValue(value.value);
    }
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function parseWhoisFieldFromRaw(rawData, fieldNames) {
  if (!rawData || typeof rawData !== 'string' || !fieldNames || !fieldNames.length) {
    return null;
  }

  const escapedNames = fieldNames.map(escapeRegExp);
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:${escapedNames.join('|')})\\s*:\\s*(.+)$`, 'im');
  const match = rawData.match(pattern);

  return match && match[1] ? match[1].trim() : null;
}

function escapeRegExp(text) {
  return String(text).replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  return isNaN(date.getTime()) ? dateString : date.toISOString().split('T')[0];
}

async function getCachedWhoisRecord(domain) {
  const cacheKey = `whois_${domain}`;
  const cachedData = await KV_NAMESPACE.get(cacheKey);
  if (!cachedData) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(cachedData);
    const record = normalizeWhoisCacheRecord(parsedValue);

    if (!record || !record.data || typeof record.data !== 'object') {
      await KV_NAMESPACE.delete(cacheKey);
      return null;
    }

    record.data = sanitizeWhoisInfo(record.data);
    return record;
  } catch (error) {
    console.error(`Error parsing cached data for ${domain}:`, error);
    await KV_NAMESPACE.delete(cacheKey);
    return null;
  }
}

async function getCachedWhoisInfo(domain) {
  const record = await getCachedWhoisRecord(domain);
  return record ? record.data : null;
}

function extractCachedWhoisData(parsedCacheValue) {
  const record = normalizeWhoisCacheRecord(parsedCacheValue);
  if (!record || !record.data || typeof record.data !== 'object') {
    return null;
  }
  return record.data;
}

function normalizeWhoisCacheRecord(parsedCacheValue) {
  if (!parsedCacheValue || typeof parsedCacheValue !== 'object') {
    return null;
  }

  if (parsedCacheValue.data && typeof parsedCacheValue.data === 'object') {
    return {
      data: parsedCacheValue.data,
      timestamp: typeof parsedCacheValue.timestamp === 'number' ? parsedCacheValue.timestamp : null,
      version: typeof parsedCacheValue.version === 'number' ? parsedCacheValue.version : null
    };
  }

  // Backward compatibility for legacy cache shape: direct object without { data, timestamp, version }.
  return {
    data: parsedCacheValue,
    timestamp: null,
    version: null
  };
}
async function cacheWhoisInfo(domain, whoisInfo) {
  const cacheKey = `whois_${domain}`;
  const sanitizedInfo = sanitizeWhoisInfo(whoisInfo);
  await KV_NAMESPACE.put(cacheKey, JSON.stringify({
    data: sanitizedInfo,
    timestamp: Date.now(),
    version: WHOIS_CACHE_SCHEMA_VERSION
  }));
}

function isWhoisInfoCompletelyUnknown(data) {
  if (!data || typeof data !== 'object') return false;

  const registrarUnknown = !data.registrar || data.registrar === 'Unknown';
  const registrationUnknown = !data.registrationDate || data.registrationDate === 'Unknown';
  const expirationUnknown = !data.expirationDate || data.expirationDate === 'Unknown';

  return registrarUnknown && registrationUnknown && expirationUnknown;
}

function hasCompleteWhoisData(data) {
  if (!data || typeof data !== 'object') return false;
  return (
    data.registrar && data.registrar !== 'Unknown' &&
    data.registrationDate && data.registrationDate !== 'Unknown' &&
    data.expirationDate && data.expirationDate !== 'Unknown'
  );
}

function sanitizeWhoisInfo(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sanitized = { ...data };
  if (sanitized.isCustom || !isTopLevelDomain(sanitized.domain)) {
    delete sanitized.whoisError;
    return sanitized;
  }

  if (hasCompleteWhoisData(sanitized)) {
    delete sanitized.whoisError;
  }

  return sanitized;
}

function shouldRefreshWhoisCache(domainInfo, cachedRecord) {
  if (!domainInfo || typeof domainInfo !== 'object') return false;
  if (!domainInfo.domain) return false;
  if (domainInfo.isCustom) return false;
  if (!cachedRecord || !cachedRecord.data) return true;

  const cachedData = cachedRecord.data;
  const hasTimestamp = typeof cachedRecord.timestamp === 'number';
  const ageMs = hasTimestamp ? Date.now() - cachedRecord.timestamp : null;
  const isCurrentSchema = cachedRecord.version === WHOIS_CACHE_SCHEMA_VERSION;

  if (!isCurrentSchema) {
    return true;
  }

  if (!hasCompleteWhoisData(cachedData)) {
    if (!cachedData.whoisError) {
      return true;
    }
    if (!hasTimestamp) {
      return true;
    }
    return ageMs > WHOIS_ERROR_RETRY_MS;
  }

  // Keep legacy complete records without timestamps to prevent accidental data loss.
  if (!hasTimestamp) {
    return false;
  }

  return ageMs > WHOIS_CACHE_TTL_MS;
}

function mergeWhoisInfoWithFallback(baseInfo, whoisInfo) {
  const mergedInfo = { ...baseInfo };
  if (!whoisInfo || typeof whoisInfo !== 'object') {
    return sanitizeWhoisInfo(mergedInfo);
  }

  if (whoisInfo.registrar && whoisInfo.registrar !== 'Unknown') {
    mergedInfo.registrar = whoisInfo.registrar;
  }
  if (whoisInfo.registrationDate && whoisInfo.registrationDate !== 'Unknown') {
    mergedInfo.registrationDate = whoisInfo.registrationDate;
  }
  if (whoisInfo.expirationDate && whoisInfo.expirationDate !== 'Unknown') {
    mergedInfo.expirationDate = whoisInfo.expirationDate;
  }
  if (whoisInfo.whoisLookupDomain) {
    mergedInfo.whoisLookupDomain = whoisInfo.whoisLookupDomain;
  }

  if (whoisInfo.whoisError) {
    mergedInfo.whoisError = whoisInfo.whoisError;
  } else {
    delete mergedInfo.whoisError;
  }

  return sanitizeWhoisInfo(mergedInfo);
}

function isTopLevelDomain(domain) {
  if (!domain || typeof domain !== 'string') return false;
  return domain.split('.').length === 2;
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
      line-height: 1.6;
      margin: 0;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
      background-color: #fff;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
      margin-bottom: 60px;
    }
    .table-wrapper {
      overflow-x: auto;
      width: 100%;
    }
    
    table {
      width: 100%;
      table-layout: auto;
    }

    thead {
      position: sticky;
      top: 0;
      background-color: #f2f2f2;
      z-index: 1;
    }

    th, td {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      padding: 8px;
    }
    
    .status-column { width: 30px; min-width: 30px; max-width: 50px; }
    .domain-column { max-width: 200px; }
    .system-column, .registrar-column { max-width: 150px; }
    .date-column { max-width: 100px; }
    .days-column { max-width: 80px; }
    .progress-column { max-width: 150px; }
    .operation-column { max-width: 200px; }
    
    @media (max-width: 768px) {
      .container {
        padding: 0 10px;
      }
    
      table {
        table-layout: auto;
        font-size: 12px;
      }
      
      th, td {
        padding: 6px;
      }
    
      .system-column, .registrar-column {
        display: none;
      }
      
      .domain-column, 
      .date-column, 
      .days-column, 
      .progress-column, 
      .operation-column { 
        width: auto; 
      }
    
      button {
        padding: 3px 6px;
        font-size: 12px;
      }
    }
    
    @media (min-width: 1921px) {
      .container {
        max-width: 1800px;
      }
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
      border-radius: 5px;
      overflow: hidden;
    }
    .progress {
      height: 20px;
      background-color: #4CAF50;
      transition: width 0.5s ease-in-out;
    }
    button {
      padding: 5px 10px;
      margin: 2px;
      cursor: pointer;
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

function generateHTML(domains, isAdmin) {
  const categorizedDomains = categorizeDomains(domains);
  
  console.log("Categorized domains:", categorizedDomains);
  const generateTable = (domainList, isCFTopLevel) => {
    if (!domainList || !Array.isArray(domainList)) {
      console.error('Invalid domainList:', domainList);
      return '';
    }
    return domainList.map(info => {
      const normalizedInfo = sanitizeWhoisInfo(info);
      const hasCompleteInfo = hasCompleteWhoisData(normalizedInfo);
      const registrar = normalizedInfo.registrar || 'Unknown';
      const registrationDateText = normalizedInfo.registrationDate || 'Unknown';
      const expirationDateText = normalizedInfo.expirationDate || 'Unknown';
      info = normalizedInfo;
      const today = new Date();
      const expirationDate = new Date(expirationDateText);
      const registrationDate = new Date(registrationDateText);
      const hasValidExpiry = expirationDateText !== 'Unknown' && !isNaN(expirationDate.getTime());
      const hasValidRegistration = registrationDateText !== 'Unknown' && !isNaN(registrationDate.getTime());
      const daysRemaining = hasValidExpiry ? Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24)) : 'N/A';
      const totalDays = (hasValidRegistration && hasValidExpiry) ? Math.ceil((expirationDate - registrationDate) / (1000 * 60 * 60 * 24)) : 'N/A';
      const progressPercentage = isNaN(daysRemaining) || isNaN(totalDays) ? 0 : 100 - (daysRemaining / totalDays * 100);
      const whoisErrorMessage = (!hasCompleteInfo && normalizedInfo.whoisError)
        ? `<br><span style="color: red;">WHOIS错误: ${normalizedInfo.whoisError}</span><br><span style="color: blue;">建议：请检查域名状态或API配置</span>`
        : '';
  
      let operationButtons = '';
      if (isAdmin) {
        if (isCFTopLevel) {
          operationButtons = `
            <button onclick="editDomain('${info.domain}', this)">编辑</button>
            <button onclick="deleteDomain('${info.domain}')">删除</button>
            <button data-action="update-whois" data-domain="${info.domain}">更新WHOIS</button>
            <button data-action="query-whois" data-domain="${info.domain}">查询WHOIS</button>
            <button data-action="view-props" data-domain="${info.domain}">查看属性</button>
            ${info.isCustom ? `<button data-action="reset-custom" data-domain="${info.domain}">重置为非自定义</button>` : ''}
          `;
        } else {
          operationButtons = `
            <button onclick="editDomain('${info.domain}', this)">编辑</button>
            <button onclick="deleteDomain('${info.domain}')">删除</button>
            <button data-action="view-props" data-domain="${info.domain}">查看属性</button>
            ${info.isCustom ? `<button data-action="reset-custom" data-domain="${info.domain}">重置为非自定义</button>` : ''}
          `;
        }
      }
  
      return `
        <tr data-domain="${info.domain}">
          <td class="status-column"><span class="status-dot" style="background-color: ${getStatusColor(daysRemaining)};" title="${getStatusTitle(daysRemaining)}"></span></td>
          <td class="domain-column" title="${info.domain}">${info.domain}</td>
          <td class="system-column" title="${info.system}">${info.system}</td>
          <td class="registrar-column editable" title="${registrar}${whoisErrorMessage}">${registrar}${whoisErrorMessage}</td>
          <td class="date-column editable" title="${registrationDateText}">${registrationDateText}</td>
          <td class="date-column editable" title="${expirationDateText}">${expirationDateText}</td>
          <td class="days-column" title="${daysRemaining}">${daysRemaining}</td>
          <td class="progress-column">
            <div class="progress-bar">
              <div class="progress" style="width: ${progressPercentage}%;" title="${progressPercentage.toFixed(2)}%"></div>
            </div>
          </td>
          ${isAdmin ? `<td class="operation-column">${operationButtons}</td>` : ''}
        </tr>
      `;
    }).join('');
  };

  const cfTopLevelTable = generateTable(categorizedDomains.cfTopLevel, true);
  const cfSecondLevelAndCustomTable = generateTable(categorizedDomains.cfSecondLevelAndCustom, false);

  const adminLink = isAdmin 
    ? '<span>当前为后台管理页面</span> | <a href="/">返回前台</a>' 
    : '<a href="/admin">进入后台管理</a>';
    
  const adminTools = isAdmin ? `
    <div style="margin: 20px 0;">
      <button id="syncCloudflareBtn" class="btn btn-primary">同步Cloudflare域名</button>
      <span id="syncStatus" style="margin-left: 10px;"></span>
    </div>
  ` : '';

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
      margin: 0;
      padding: 20px;
      background-color: #f4f4f4;
    }
    .container {
      margin: 0 auto;
      padding: 0 15px;
    }

    .container {
    padding-bottom: 60px; /* 根据页脚高度调整 */
    }

    footer {
      position: relative;
      left: 0;
      bottom: 0;
      width: 100%;
    }

    .table-wrapper {
      width: 100%;
      overflow-x: auto;
    }
  
    h2.table-title {
      font-size: 1.5em;
      margin-top: 30px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #ddd;
    }
  
    .table-separator {
      height: 2px;
      background-color: #eee;
      margin: 30px 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      table-layout: auto;
    }
    th, td {
      padding: 8px;
      text-align: left;
      border-bottom: 1px solid #ddd;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .status-column { width: 30px; min-width: 30px; max-width: 50px; }
    .domain-column { min-width: 120px; max-width: 25%; }
    .system-column, .registrar-column { min-width: 80px; max-width: 15%; }
    .date-column { min-width: 90px; max-width: 12%; }
    .days-column { min-width: 60px; max-width: 10%; }
    .progress-column { min-width: 100px; max-width: 20%; }
    .operation-column { min-width: 120px; max-width: 20%; }
    .status-dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }
    .progress-bar {
      width: 100%;
      background-color: #e0e0e0;
      border-radius: 5px;
      overflow: hidden;
    }
    .progress {
      height: 20px;
      background-color: #4CAF50;
      transition: width 0.5s ease-in-out;
    }
    button {
      padding: 5px 10px;
      margin: 2px;
      cursor: pointer;
    }
    .section-header {
      background-color: #e9ecef;
      font-weight: bold;
    }
    .section-header td {
      padding: 10px;
    }
    @media (max-width: 768px) {
      table {
        font-size: 12px;
      }
      th, td {
        padding: 6px;
      }
      .system-column, .registrar-column {
        display: none;
      }
      .operation-column {
        width: auto;
      }
      button {
        padding: 3px 6px;
        font-size: 12px;
      }
      .less-important-column {
        display: none;
      }
    }
    
    .domain-modal {
      display: none;
      position: fixed;
      z-index: 1000;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0,0,0,0.4);
    }
    
    .domain-modal-content {
      background-color: #fefefe;
      margin: 10% auto;
      padding: 20px;
      border: 1px solid #888;
      width: 80%;
      max-width: 600px;
      border-radius: 5px;
    }
    
    .domain-modal-close {
      color: #aaa;
      float: right;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
    }
    
    .domain-property {
      margin-bottom: 10px;
    }
    
    .domain-property-label {
      font-weight: bold;
    }
  </style>
  </head>
  <body>
    <div class="container">
        <h1>${CUSTOM_TITLE}${isAdmin ? ' - 后台管理' : ''}</h1>
        <div class="admin-link">${adminLink}</div>
        
        ${adminTools}
  
        <div class="table-wrapper">
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
            <tr class="section-header"><td colspan="${isAdmin ? '9' : '8'}"><h2>CF顶级域名</h2></td></tr>
            ${cfTopLevelTable}
            <tr class="section-separator"><td colspan="${isAdmin ? '9' : '8'}"></td></tr>
            <tr class="section-header"><td colspan="${isAdmin ? '9' : '8'}"><h2>CF二级域名or自定义域名</h2></td></tr>
            ${cfSecondLevelAndCustomTable}
          </tbody>
        </table>
      </div>
  
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
    
    <!-- 域名属性模态框 -->
    <div id="domainPropsModal" class="domain-modal">
      <div class="domain-modal-content">
        <span class="domain-modal-close">&times;</span>
        <h2>域名属性</h2>
        <div id="domainPropsContent"></div>
      </div>
    </div>
    
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
    
    async function deleteDomain(domain) {
      const isCFTopLevel = domain.split('.').length === 2;
      
      let confirmMessage = '确定要删除这个域名吗？';
      if (isCFTopLevel) {
        confirmMessage = '注意：这将只从列表中删除此域名的记录，但不会从Cloudflare中删除域名。下次同步时可能重新获取此域名。确定要继续吗？';
      }
      
      if (confirm(confirmMessage)) {
        try {
          const response = await fetch('/api/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
            },
            body: JSON.stringify({
              action: 'delete',
              domain: domain
            })
          });
    
          if (response.ok) {
            alert('删除成功');
            location.reload();
          } else {
            throw new Error('删除失败');
          }
        } catch (error) {
          alert('删除失败: ' + error.message);
        }
      }
    }
    
    document.addEventListener('click', function(event) {
      if (event.target.dataset.action === 'update-whois') {
        updateWhoisInfo(event.target.dataset.domain);
      } else if (event.target.dataset.action === 'query-whois') {
        queryWhoisInfo(event.target.dataset.domain);
      } else if (event.target.dataset.action === 'view-props') {
        viewDomainProps(event.target.dataset.domain);
      } else if (event.target.dataset.action === 'reset-custom') {
        resetCustomFlag(event.target.dataset.domain);
      }
    });
    
    async function updateWhoisInfo(domain) {
      try {
        const response = await fetch('/api/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
          },
          body: JSON.stringify({
            action: 'update-whois',
            domain: domain
          })
        });
    
        if (response.ok) {
          alert('WHOIS信息更新成功');
          location.reload();
        } else {
          throw new Error('WHOIS信息更新失败');
        }
      } catch (error) {
        alert('WHOIS信息更新失败: ' + error.message);
      }
    }
    
    async function queryWhoisInfo(domain) {
      try {
        const response = await fetch('/whois/' + domain);
        const data = await response.json();
    
        if (data.error) {
          alert('查询WHOIS信息失败: ' + data.message);
        } else {
          alert('WHOIS信息：\\n' + data.rawData);
        }
      } catch (error) {
        alert('查询WHOIS信息失败: ' + error.message);
      }
    }
    
    // 域名属性查看功能
    async function viewDomainProps(domain) {
      try {
        const response = await fetch('/api/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
          },
          body: JSON.stringify({
            action: 'get-props',
            domain: domain
          })
        });
        
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.props) {
            const props = result.props;
            let content = '';
            
            // 格式化属性显示
            content += createPropertyHTML('域名', domain);
            content += createPropertyHTML('自定义域名', props.isCustom ? '是' : '否');
            content += createPropertyHTML('系统', props.system || 'Unknown');
            content += createPropertyHTML('注册商', props.registrar || 'Unknown');
            content += createPropertyHTML('注册日期', props.registrationDate || 'Unknown');
            content += createPropertyHTML('到期日期', props.expirationDate || 'Unknown');
            if (props.parentZone) {
              content += createPropertyHTML('父域名', props.parentZone);
            }
            
            document.getElementById('domainPropsContent').innerHTML = content;
            document.getElementById('domainPropsModal').style.display = 'block';
          } else {
            throw new Error('获取属性失败');
          }
        } else {
          throw new Error('获取属性失败');
        }
      } catch (error) {
        alert('获取属性失败: ' + error.message);
      }
    }
    
    function createPropertyHTML(label, value) {
      return '<div class="domain-prop">' +
             '<span class="domain-prop-label">' + label + ':</span> ' +
             '<span class="domain-prop-value">' + value + '</span>' +
             '</div>';
    }
    
    // 关闭模态框
    document.querySelector('.domain-modal-close').addEventListener('click', function() {
      document.getElementById('domainPropsModal').style.display = 'none';
    });
    
    // 点击模态框外部关闭
    window.addEventListener('click', function(event) {
      if (event.target == document.getElementById('domainPropsModal')) {
        document.getElementById('domainPropsModal').style.display = 'none';
      }
    });
    
    // 重置自定义标记功能
    async function resetCustomFlag(domain) {
      if (confirm('确定要将 ' + domain + ' 重置为非自定义域名吗？这将使其在下次同步时按照Cloudflare的情况处理。')) {
        try {
          const response = await fetch('/api/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
            },
            body: JSON.stringify({
              action: 'reset-custom',
              domain: domain
            })
          });
          
          if (response.ok) {
            alert('域名类型重置成功！下次同步时将根据Cloudflare中的状态处理此域名。');
            location.reload();
          } else {
            throw new Error('重置失败');
          }
        } catch (error) {
          alert('重置失败: ' + error.message);
        }
      }
    }

    ${isAdmin ? `
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
      
      document.getElementById('syncCloudflareBtn').addEventListener('click', async function() {
        if (confirm('确定要同步Cloudflare域名列表吗？这将更新域名状态并可能移除已不存在的域名。')) {
          try {
            const statusEl = document.getElementById('syncStatus');
            statusEl.textContent = '正在同步...';
            
            const response = await fetch('/api/update', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Basic ' + btoa(':${ADMIN_PASSWORD}')
              },
              body: JSON.stringify({
                action: 'sync-cloudflare'
              })
            });
            
            const result = await response.json();
            if (result.success) {
              statusEl.textContent = "同步成功! 共获取" + result.count + "个域名";
              
              // 显示获取到的域名列表
              if (result.domains && result.domains.length > 0) {
                const domainList = result.domains.join('\\n');
                alert("成功同步以下域名:\\n\\n" + domainList);
              }
              
              setTimeout(() => {
                location.reload();
              }, 1500);
            } else {
              throw new Error(result.message || '同步失败');
            }
          } catch (error) {
            document.getElementById('syncStatus').textContent = '同步失败: ' + error.message;
          }
        }
      });
    ` : ''}
    </script>
    ${footerHTML}
    </body>
  </html>
  `;
}

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
