const axios = require('axios');
const db = require('../utils/database');

class CloudflareService {
  constructor() {
    this.apiToken = process.env.CF_API_TOKEN;
    this.baseURL = 'https://api.cloudflare.com/client/v4';
  }

  async syncDomains() {
    try {
      if (!this.apiToken) {
        return {
          success: false,
          message: 'Cloudflare API Token未配置'
        };
      }

      console.log('开始同步Cloudflare域名...');
      
      const zones = await this.fetchAllZones();
      console.log(`从Cloudflare获取到 ${zones.length} 个域名`);

      let addedCount = 0;
      let updatedCount = 0;
      const domainNames = [];

      for (const zone of zones) {
        domainNames.push(zone.name);
        
        // 检查域名是否已存在
        const existing = await db.get('SELECT * FROM domains WHERE domain = ?', [zone.name]);
        
        if (existing) {
          // 更新已存在的域名信息（但不覆盖自定义域名的信息）
          if (!existing.is_custom) {
            await db.run(
              'UPDATE domains SET system = ?, zone_id = ?, updated_at = CURRENT_TIMESTAMP WHERE domain = ?',
              ['Cloudflare', zone.id, zone.name]
            );
            updatedCount++;
          }
        } else {
          // 添加新域名
          await db.run(
            'INSERT INTO domains (domain, system, zone_id, registration_date, is_custom) VALUES (?, ?, ?, ?, ?)',
            [zone.name, 'Cloudflare', zone.id, zone.created_on.split('T')[0], 0]
          );
          addedCount++;
        }
      }

      // 清理不再存在于Cloudflare的域名（但保留自定义域名）
      const cfDomainsList = zones.map(z => z.name);
      const existingCfDomains = await db.all(
        'SELECT domain FROM domains WHERE system = ? AND is_custom = 0',
        ['Cloudflare']
      );

      let removedCount = 0;
      for (const existingDomain of existingCfDomains) {
        if (!cfDomainsList.includes(existingDomain.domain)) {
          await db.run('DELETE FROM domains WHERE domain = ? AND is_custom = 0', [existingDomain.domain]);
          removedCount++;
        }
      }

      console.log(`同步完成: 新增 ${addedCount} 个，更新 ${updatedCount} 个，移除 ${removedCount} 个`);

      return {
        success: true,
        message: `同步成功: 新增 ${addedCount} 个，更新 ${updatedCount} 个，移除 ${removedCount} 个`,
        count: zones.length,
        domains: domainNames,
        stats: {
          added: addedCount,
          updated: updatedCount,
          removed: removedCount
        }
      };
    } catch (error) {
      console.error('Cloudflare同步失败:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async fetchAllZones() {
    const zones = [];
    let page = 1;
    let totalPages = 1;

    do {
      const response = await axios.get(`${this.baseURL}/zones`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          page,
          per_page: 50
        }
      });

      if (!response.data.success) {
        throw new Error('Cloudflare API请求失败: ' + JSON.stringify(response.data.errors));
      }

      zones.push(...response.data.result);
      totalPages = response.data.result_info.total_pages;
      page++;
    } while (page <= totalPages);

    return zones;
  }

  async getZoneInfo(zoneId) {
    try {
      const response = await axios.get(`${this.baseURL}/zones/${zoneId}`, {
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.data.success) {
        throw new Error('获取Zone信息失败');
      }

      return response.data.result;
    } catch (error) {
      console.error('获取Zone信息失败:', error);
      throw error;
    }
  }
}

module.exports = new CloudflareService();
