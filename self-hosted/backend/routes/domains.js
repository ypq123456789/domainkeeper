const express = require('express');
const db = require('../utils/database');
const cloudflareService = require('../services/cloudflareService');
const whoisService = require('../services/whoisService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 获取域名列表
router.get('/', authMiddleware, async (req, res) => {
  try {
    const domains = await db.all(`
      SELECT d.*, w.whois_data, w.cached_at
      FROM domains d
      LEFT JOIN whois_cache w ON d.domain = w.domain
      ORDER BY d.domain
    `);

    const domainsWithInfo = domains.map(domain => {
      const today = new Date();
      const expirationDate = domain.expiration_date ? new Date(domain.expiration_date) : null;
      const registrationDate = domain.registration_date ? new Date(domain.registration_date) : null;
      
      let daysRemaining = 'N/A';
      let progressPercentage = 0;
      
      if (expirationDate) {
        daysRemaining = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));
        
        if (registrationDate && expirationDate) {
          const totalDays = Math.ceil((expirationDate - registrationDate) / (1000 * 60 * 60 * 24));
          const daysElapsed = Math.ceil((today - registrationDate) / (1000 * 60 * 60 * 24));
          progressPercentage = Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100));
        }
      }

      return {
        id: domain.id,
        domain: domain.domain,
        system: domain.system,
        registrar: domain.registrar,
        registrationDate: domain.registration_date,
        expirationDate: domain.expiration_date,
        zoneId: domain.zone_id,
        isCustom: Boolean(domain.is_custom),
        daysRemaining,
        progressPercentage: Math.round(progressPercentage * 100) / 100,
        whoisData: domain.whois_data ? JSON.parse(domain.whois_data) : null,
        whoisCachedAt: domain.cached_at,
        createdAt: domain.created_at,
        updatedAt: domain.updated_at
      };
    });

    res.json({
      success: true,
      domains: domainsWithInfo,
      total: domainsWithInfo.length
    });
  } catch (error) {
    console.error('获取域名列表错误:', error);
    res.status(500).json({ error: '获取域名列表失败' });
  }
});

// 获取单个域名信息
router.get('/:domain', authMiddleware, async (req, res) => {
  try {
    const { domain } = req.params;
    
    const domainInfo = await db.get(`
      SELECT d.*, w.whois_data, w.cached_at
      FROM domains d
      LEFT JOIN whois_cache w ON d.domain = w.domain
      WHERE d.domain = ?
    `, [domain]);

    if (!domainInfo) {
      return res.status(404).json({ error: '域名不存在' });
    }

    res.json({
      success: true,
      domain: {
        ...domainInfo,
        whoisData: domainInfo.whois_data ? JSON.parse(domainInfo.whois_data) : null,
        isCustom: Boolean(domainInfo.is_custom)
      }
    });
  } catch (error) {
    console.error('获取域名信息错误:', error);
    res.status(500).json({ error: '获取域名信息失败' });
  }
});

// 添加域名
router.post('/', authMiddleware('admin'), async (req, res) => {
  try {
    const { domain, system, registrar, registrationDate, expirationDate } = req.body;

    if (!domain) {
      return res.status(400).json({ error: '域名不能为空' });
    }

    // 检查域名是否已存在
    const existing = await db.get('SELECT id FROM domains WHERE domain = ?', [domain]);
    if (existing) {
      return res.status(400).json({ error: '域名已存在' });
    }

    const result = await db.run(
      'INSERT INTO domains (domain, system, registrar, registration_date, expiration_date, is_custom) VALUES (?, ?, ?, ?, ?, 1)',
      [domain, system, registrar, registrationDate, expirationDate]
    );

    res.json({
      success: true,
      message: '域名添加成功',
      id: result.id
    });
  } catch (error) {
    console.error('添加域名错误:', error);
    res.status(500).json({ error: '添加域名失败' });
  }
});

// 更新域名信息
router.put('/:id', authMiddleware('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { system, registrar, registrationDate, expirationDate } = req.body;

    const result = await db.run(
      'UPDATE domains SET system = ?, registrar = ?, registration_date = ?, expiration_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [system, registrar, registrationDate, expirationDate, id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: '域名不存在' });
    }

    res.json({
      success: true,
      message: '域名信息更新成功'
    });
  } catch (error) {
    console.error('更新域名信息错误:', error);
    res.status(500).json({ error: '更新域名信息失败' });
  }
});

// 删除域名
router.delete('/:id', authMiddleware('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await db.run('DELETE FROM domains WHERE id = ?', [id]);

    if (result.changes === 0) {
      return res.status(404).json({ error: '域名不存在' });
    }

    res.json({
      success: true,
      message: '域名删除成功'
    });
  } catch (error) {
    console.error('删除域名错误:', error);
    res.status(500).json({ error: '删除域名失败' });
  }
});

// 同步Cloudflare域名
router.post('/sync-cloudflare', authMiddleware('admin'), async (req, res) => {
  try {
    const result = await cloudflareService.syncDomains();
    
    // 记录同步日志
    await db.run(
      'INSERT INTO sync_logs (sync_type, status, message, domains_count) VALUES (?, ?, ?, ?)',
      ['cloudflare', result.success ? 'success' : 'failed', result.message, result.count || 0]
    );

    if (result.success) {
      res.json({
        success: true,
        message: `同步成功，共处理 ${result.count} 个域名`,
        domains: result.domains
      });
    } else {
      res.status(500).json({
        error: '同步失败',
        message: result.message
      });
    }
  } catch (error) {
    console.error('同步Cloudflare域名错误:', error);
    res.status(500).json({ error: '同步失败' });
  }
});

// 更新WHOIS信息
router.post('/:domain/whois', authMiddleware('admin'), async (req, res) => {
  try {
    const { domain } = req.params;
    
    // 检查域名是否存在
    const domainExists = await db.get('SELECT id FROM domains WHERE domain = ?', [domain]);
    if (!domainExists) {
      return res.status(404).json({ error: '域名不存在' });
    }

    const whoisResult = await whoisService.fetchWhoisInfo(domain);
    
    if (whoisResult.success) {
      // 更新域名信息（如果WHOIS查询成功）
      await db.run(
        'UPDATE domains SET registrar = ?, registration_date = ?, expiration_date = ?, updated_at = CURRENT_TIMESTAMP WHERE domain = ?',
        [whoisResult.data.registrar, whoisResult.data.registrationDate, whoisResult.data.expirationDate, domain]
      );

      // 缓存WHOIS数据
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7天后过期

      await db.run(
        'INSERT OR REPLACE INTO whois_cache (domain, whois_data, expires_at) VALUES (?, ?, ?)',
        [domain, JSON.stringify(whoisResult.data), expiresAt.toISOString()]
      );

      res.json({
        success: true,
        message: 'WHOIS信息更新成功',
        data: whoisResult.data
      });
    } else {
      res.status(500).json({
        error: 'WHOIS信息获取失败',
        message: whoisResult.message
      });
    }
  } catch (error) {
    console.error('更新WHOIS信息错误:', error);
    res.status(500).json({ error: 'WHOIS信息更新失败' });
  }
});

// 获取统计信息
router.get('/stats/overview', authMiddleware, async (req, res) => {
  try {
    const totalDomains = await db.get('SELECT COUNT(*) as count FROM domains');
    const customDomains = await db.get('SELECT COUNT(*) as count FROM domains WHERE is_custom = 1');
    const cfDomains = await db.get('SELECT COUNT(*) as count FROM domains WHERE system = "Cloudflare"');
    
    // 计算即将过期的域名（30天内）
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const expiringDomains = await db.get(
      'SELECT COUNT(*) as count FROM domains WHERE expiration_date BETWEEN ? AND ?',
      [today.toISOString().split('T')[0], thirtyDaysLater.toISOString().split('T')[0]]
    );

    const expiredDomains = await db.get(
      'SELECT COUNT(*) as count FROM domains WHERE expiration_date < ?',
      [today.toISOString().split('T')[0]]
    );

    res.json({
      success: true,
      stats: {
        total: totalDomains.count,
        custom: customDomains.count,
        cloudflare: cfDomains.count,
        expiring: expiringDomains.count,
        expired: expiredDomains.count
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({ error: '获取统计信息失败' });
  }
});

module.exports = router;
