const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/database');

const router = express.Router();

// 初始化管理员用户
const initAdmin = async () => {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  
  try {
    const existingUser = await db.get('SELECT * FROM users WHERE username = ?', [adminUsername]);
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
        [adminUsername, hashedPassword, 'admin']);
      console.log(`管理员用户已创建: ${adminUsername}`);
    }
  } catch (error) {
    console.error('初始化管理员用户失败:', error);
  }
};

// 延迟初始化管理员
setTimeout(initAdmin, 1000);

// 登录
router.post('/login', async (req, res) => {
  try {
    const { username, password, type } = req.body;
    
    // 前台访问检查
    if (type === 'frontend') {
      const accessPassword = process.env.ACCESS_PASSWORD;
      if (!accessPassword) {
        // 如果没有设置前台密码，直接返回成功
        return res.json({
          success: true,
          token: jwt.sign({ type: 'frontend' }, process.env.JWT_SECRET, { expiresIn: '24h' }),
          user: { type: 'frontend' }
        });
      }
      
      if (password !== accessPassword) {
        return res.status(401).json({ error: '密码错误' });
      }
      
      const token = jwt.sign({ type: 'frontend' }, process.env.JWT_SECRET, { expiresIn: '24h' });
      return res.json({
        success: true,
        token,
        user: { type: 'frontend' }
      });
    }
    
    // 后台管理员登录
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const user = await db.get('SELECT * FROM users WHERE username = ?', [username]);
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ error: '登录失败' });
  }
});

// 验证token
router.post('/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '未提供token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ success: true, user: decoded });
  } catch (error) {
    res.status(401).json({ error: 'token无效或已过期' });
  }
});

// 修改密码
router.post('/change-password', async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: '未提供token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    const user = await db.get('SELECT * FROM users WHERE id = ?', [decoded.id]);
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '原密码错误' });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.run('UPDATE users SET password = ? WHERE id = ?', [hashedNewPassword, decoded.id]);

    res.json({ success: true, message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
});

module.exports = router;
