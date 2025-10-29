const axios = require('axios');

class WhoisService {
  constructor() {
    this.proxyUrl = process.env.WHOIS_PROXY_URL;
  }

  async fetchWhoisInfo(domain, includeRaw = false) {
    try {
      if (!this.proxyUrl) {
        return {
          success: false,
          message: 'WHOIS代理服务未配置'
        };
      }

      console.log(`查询WHOIS信息: ${domain}`);
      
      const response = await axios.get(`${this.proxyUrl}/whois/${domain}`, {
        timeout: 30000 // 30秒超时
      });

      const whoisData = response.data;

      if (whoisData.error) {
        return {
          success: false,
          message: whoisData.message || 'WHOIS查询失败'
        };
      }

      const result = {
        success: true,
        data: {
          registrar: whoisData.registrar || 'Unknown',
          registrationDate: this.formatDate(whoisData.creationDate) || 'Unknown',
          expirationDate: this.formatDate(whoisData.expirationDate) || 'Unknown',
          nameservers: whoisData.nameServers || [],
          status: whoisData.status || []
        }
      };

      if (includeRaw) {
        result.rawData = whoisData.rawData || '';
      }

      return result;
    } catch (error) {
      console.error(`WHOIS查询失败 (${domain}):`, error);
      
      let errorMessage = error.message;
      if (error.code === 'ECONNREFUSED') {
        errorMessage = 'WHOIS代理服务连接失败';
      } else if (error.code === 'ETIMEDOUT') {
        errorMessage = 'WHOIS查询超时';
      } else if (error.response) {
        errorMessage = `WHOIS服务返回错误: ${error.response.status}`;
      }

      return {
        success: false,
        message: errorMessage
      };
    }
  }

  formatDate(dateString) {
    if (!dateString) return null;
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // 如果无法解析，返回原始字符串
      }
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateString;
    }
  }

  async batchFetchWhoisInfo(domains) {
    const results = [];
    
    for (const domain of domains) {
      try {
        const result = await this.fetchWhoisInfo(domain);
        results.push({
          domain,
          ...result
        });
        
        // 避免请求过于频繁，每次查询后等待1秒
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          domain,
          success: false,
          message: error.message
        });
      }
    }
    
    return results;
  }
}

module.exports = new WhoisService();
