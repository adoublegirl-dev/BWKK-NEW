const config = require('../config');

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, _next) => {
  console.error('[Error]', err.stack || err);

  // 已知业务错误
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      code: err.statusCode,
      message: err.message,
      data: null,
    });
  }

  // Prisma 错误
  if (err.code?.startsWith('P')) {
    return res.status(400).json({
      code: 400,
      message: '数据操作错误',
      data: config.isDev ? { detail: err.message } : null,
    });
  }

  // 未知错误
  return res.status(500).json({
    code: 500,
    message: config.isDev ? err.message : '服务器内部错误',
    data: null,
  });
};

module.exports = errorHandler;
