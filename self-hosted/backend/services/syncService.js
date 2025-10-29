const cron = require('node-cron');
const cloudflareService = require('./cloudflareService');
const whoisService = require('./whoisService');
const db = require('../utils/database');

class SyncService {
  constructor() {
    this.isRunning = false;
    this.syncInterval = process.env.SYNC_INTERVAL || 60; // 默认60分钟
  }

  start() {
    // 每小时同步一次Cloudflare域名
    const cronExpression = `0 */${this.syncInterval} * * *`;
    
    console.log(`启动自动同步服务，间隔：${this.syncInterval}分钟`);
    
    cron.schedule(cronExpression, () => {
      this.runSync();
    });

    // 服务启动后立即执行一次同步
    setTimeout(() => {
      this.runSync();
    }, 5000); // 延迟5秒启动
  }

  async runSync() {
    if (this.isRunning) {
      console.log('同步任务已在运行中，跳过本次同步');
      return;
    }

    this.isRunning = true;
    
    try {
      console.log('开始自动同步任务...');
      
      // 1. 同步Cloudflare域名
      const cfSyncResult = await cloudflareService.syncDomains();
      
      // 记录同步日志
      await db.run(
        'INSERT INTO sync_logs (sync_type, status, message, domains_count) VALUES (?, ?, ?, ?)',
        ['auto_cloudflare', cfSyncResult.success ? 'success' : 'failed', cfSyncResult.message, cfSyncResult.count || 0]
      );

      if (cfSyncResult.success) {
        console.log(`Cloudflare域名同步成功: ${cfSyncResult.message}`);
        
        // 2. 自动更新顶级域名的WHOIS信息（仅限没有缓存或缓存过期的）
        await this.updateExpiredWhoisCache();
      } else {
        console.error(`Cloudflare域名同步失败: ${cfSyncResult.message}`);
      }

    } catch (error) {
      console.error('自动同步任务失败:', error);
      
      // 记录错误日志
      await db.run(
        'INSERT INTO sync_logs (sync_type, status, message) VALUES (?, ?, ?)',
        ['auto_sync', 'error', error.message]
      );
    } finally {
      this.isRunning = false;
    }
  }

  async updateExpiredWhoisCache() {
    try {
      // 获取需要更新WHOIS信息的域名（顶级域名且缓存过期或无缓存）
      const domainsNeedUpdate = await db.all(`
        SELECT d.domain 
        FROM domains d
        LEFT JOIN whois_cache w ON d.domain = w.domain
        WHERE d.system = 'Cloudflare' 
          AND LENGTH(d.domain) - LENGTH(REPLACE(d.domain, '.', '')) = 1
          AND (w.expires_at IS NULL OR w.expires_at < datetime('now'))
        LIMIT 5
      `);

      if (domainsNeedUpdate.length === 0) {
        console.log('没有需要更新WHOIS缓存的域名');
        return;
      }

      console.log(`开始更新 ${domainsNeedUpdate.length} 个域名的WHOIS信息`);

      for (const domainRow of domainsNeedUpdate) {
        try {
          const whoisResult = await whoisService.fetchWhoisInfo(domainRow.domain);
          
          if (whoisResult.success) {
            // 更新域名信息
            await db.run(
              'UPDATE domains SET registrar = ?, registration_date = ?, expiration_date = ?, updated_at = CURRENT_TIMESTAMP WHERE domain = ?',
              [whoisResult.data.registrar, whoisResult.data.registrationDate, whoisResult.data.expirationDate, domainRow.domain]
            );

            // 更新WHOIS缓存
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

            await db.run(
              'INSERT OR REPLACE INTO whois_cache (domain, whois_data, expires_at) VALUES (?, ?, ?)',
              [domainRow.domain, JSON.stringify(whoisResult.data), expiresAt.toISOString()]
            );

            console.log(`已更新域名 ${domainRow.domain} 的WHOIS信息`);
          } else {
            console.log(`域名 ${domainRow.domain} WHOIS查询失败: ${whoisResult.message}`);
          }

          // 避免请求过于频繁
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`更新域名 ${domainRow.domain} WHOIS信息失败:`, error);
        }
      }

      console.log('WHOIS信息更新完成');
    } catch (error) {
      console.error('更新WHOIS缓存失败:', error);
    }
  }

  async manualSync() {
    return this.runSync();
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      syncInterval: this.syncInterval,
      nextSync: this.getNextSyncTime()
    };
  }

  getNextSyncTime() {
    const now = new Date();
    const nextSync = new Date(now);
    nextSync.setMinutes(Math.ceil(now.getMinutes() / this.syncInterval) * this.syncInterval);
    nextSync.setSeconds(0);
    nextSync.setMilliseconds(0);
    
    return nextSync.toISOString();
  }
}

module.exports = new SyncService();
