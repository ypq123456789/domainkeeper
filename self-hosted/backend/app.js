const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const winston = require('winston');
const path = require('path');

// 加载环境变量
dotenv.config();

// 配置日志
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP最多100个请求
  message: '请求过于频繁，请稍后再试'
});
app.use('/api/', limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 导入路由
const authRoutes = require('./routes/auth');
const domainRoutes = require('./routes/domains');
const whoisRoutes = require('./routes/whois');

// 使用路由
app.use('/api/auth', authRoutes);
app.use('/api/domains', domainRoutes);
app.use('/api/whois', whoisRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// 错误处理中间件
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);
  res.status(error.status || 500).json({
    error: '服务器内部错误',
    message: process.env.NODE_ENV === 'development' ? error.message : '请稍后重试'
  });
});

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({ error: '接口不存在' });
});

// 初始化数据库
const db = require('./utils/database');
db.init().then(() => {
  logger.info('数据库初始化完成');
  
  // 启动服务器
  app.listen(PORT, () => {
    logger.info(`DomainKeeper 后端服务已启动，端口：${PORT}`);
    logger.info(`环境：${process.env.NODE_ENV || 'development'}`);
  });
}).catch((error) => {
  logger.error('数据库初始化失败:', error);
  process.exit(1);
});

// 启动定时同步任务
const syncService = require('./services/syncService');
syncService.start();

module.exports = app;
