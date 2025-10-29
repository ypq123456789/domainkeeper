const jwt = require('jsonwebtoken');

const authMiddleware = (requiredRole = null) => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: '未提供认证token' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // 检查角色权限
      if (requiredRole) {
        if (decoded.type === 'frontend' && requiredRole === 'admin') {
          return res.status(403).json({ error: '权限不足' });
        }
        
        if (decoded.role && decoded.role !== requiredRole && requiredRole === 'admin') {
          return res.status(403).json({ error: '权限不足' });
        }
      }
      
      req.user = decoded;
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: 'token无效' });
      } else if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: 'token已过期' });
      } else {
        return res.status(401).json({ error: '认证失败' });
      }
    }
  };
};

module.exports = authMiddleware;
