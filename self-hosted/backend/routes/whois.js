const express = require('express');
const whoisService = require('../services/whoisService');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// 查询WHOIS信息
router.get('/:domain', authMiddleware, async (req, res) => {
  try {
    const { domain } = req.params;
    const { raw } = req.query;

    const whoisResult = await whoisService.fetchWhoisInfo(domain, Boolean(raw));

    if (whoisResult.success) {
      res.json({
        success: true,
        domain,
        data: whoisResult.data,
        rawData: whoisResult.rawData
      });
    } else {
      res.status(500).json({
        error: 'WHOIS查询失败',
        message: whoisResult.message
      });
    }
  } catch (error) {
    console.error('WHOIS查询错误:', error);
    res.status(500).json({ error: 'WHOIS查询失败' });
  }
});

// 批量查询WHOIS信息
router.post('/batch', authMiddleware('admin'), async (req, res) => {
  try {
    const { domains } = req.body;

    if (!Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: '域名列表不能为空' });
    }

    if (domains.length > 10) {
      return res.status(400).json({ error: '批量查询最多支持10个域名' });
    }

    const results = await Promise.allSettled(
      domains.map(domain => whoisService.fetchWhoisInfo(domain))
    );

    const formattedResults = results.map((result, index) => ({
      domain: domains[index],
      success: result.status === 'fulfilled' && result.value.success,
      data: result.status === 'fulfilled' ? result.value.data : null,
      error: result.status === 'rejected' ? result.reason.message : 
             (result.value && !result.value.success ? result.value.message : null)
    }));

    res.json({
      success: true,
      results: formattedResults
    });
  } catch (error) {
    console.error('批量WHOIS查询错误:', error);
    res.status(500).json({ error: '批量WHOIS查询失败' });
  }
});

module.exports = router;
