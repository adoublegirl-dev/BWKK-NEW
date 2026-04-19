const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const logger = require('./middleware/logger');
const errorHandler = require('./middleware/error-handler');
const { apiLimiter } = require('./middleware/rate-limiter');
const { startJobs } = require('./jobs/timeout-handler');

// 路由
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const userRoutes = require('./routes/users');
const shopRoutes = require('./routes/shop');
const uploadRoutes = require('./routes/upload');
const moderateRoutes = require('./routes/moderate');
const adminRoutes = require('./routes/admin');
const merchantRoutes = require('./routes/merchant');

// 管理后台服务（确保默认管理员存在）
const adminService = require('./services/admin.service');

const app = express();

// 启动时校验关键安全配置
const requiredEnvVars = ['JWT_SECRET', 'ADMIN_JWT_SECRET'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
// MERCHANT_JWT_SECRET 可选，未设置时自动基于 JWT_SECRET 派生
if (missing.length > 0) {
  console.error(`\n❌ 缺少必要的环境变量: ${missing.join(', ')}`);
  console.error('请在 .env 文件中配置这些变量后重启服务。\n');
  process.exit(1);
}

// Nginx 反向代理：信任第一级代理，正确识别客户端 IP
app.set('trust proxy', 1);

// ========== 中间件 ==========
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);
app.use('/api/', apiLimiter);

// 静态文件服务 - 头像等上传文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ========== 路由 ==========
// 管理后台路由（必须在用户端路由之前注册）
app.use('/api/admin', adminRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/shop', shopRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/moderate', moderateRoutes);

// 商家路由（H5轻量入口 + 商家管理后台）
app.use('/api/merchant', merchantRoutes);

// 健康检查
app.get('/api/health', (_req, res) => {
  res.json({
    code: 200,
    message: 'ok',
    data: {
      name: '帮我看看',
      version: '1.0.0',
      paymentMode: config.paymentMode,
      env: config.nodeEnv,
    },
  });
});

// ========== 生产环境：静态文件 + SPA fallback ==========
// H5 前端静态文件
app.use(express.static(path.join(__dirname, '../../h5')));
// Admin 前端静态文件
app.use('/admin', express.static(path.join(__dirname, '../../admin')));
// Merchant 前端静态文件
app.use('/merchant', express.static(path.join(__dirname, '../../merchant')));

// H5 SPA fallback（非 API 路径返回 index.html）
app.get('*', (req, res, next) => {
  // 跳过 API 和上传文件请求
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) {
    return next();
  }
  // Admin SPA fallback
  if (req.path.startsWith('/admin')) {
    return res.sendFile(path.join(__dirname, '../../admin/index.html'));
  }
  // Merchant SPA fallback
  if (req.path.startsWith('/merchant')) {
    return res.sendFile(path.join(__dirname, '../../merchant/index.html'));
  }
  // H5 SPA fallback
  res.sendFile(path.join(__dirname, '../../h5/index.html'));
});

// 404 处理（仅对 API 请求生效）
app.use((_req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
  });
});

// 全局错误处理
app.use(errorHandler);

// ========== 启动 ==========
// 确保默认管理员存在
adminService.ensureDefaultAdmin().then(() => {
  app.listen(config.port, () => {
    console.log(`\n🚀 帮我看看服务已启动`);
    console.log(`   地址: http://localhost:${config.port}`);
    console.log(`   环境: ${config.nodeEnv}`);
    console.log(`   支付模式: ${config.paymentMode}\n`);

    // 启动定时任务
    if (config.nodeEnv !== 'test') {
      startJobs();
    }
  });
}).catch((err) => {
  console.error('启动失败:', err);
  process.exit(1);
});

module.exports = app;
