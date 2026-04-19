const rateLimit = require('express-rate-limit');

/**
 * 通用API限流
 * 每个IP每分钟100次请求
 */
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * 发帖限流
 * 每个用户每小时最多发5个帖子
 */
const postLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    code: 429,
    message: '发帖过于频繁，请稍后再试',
    data: null,
  },
  keyGenerator: (req) => req.user?.id || req.ip,
});

/**
 * 接单限流
 * 每个用户每小时最多接10单
 */
const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    code: 429,
    message: '接单过于频繁，请稍后再试',
    data: null,
  },
  keyGenerator: (req) => req.user?.id || req.ip,
});

/**
 * 代金券兑换码查询限流
 * 每个IP每分钟5次（防暴力破解）
 */
const voucherLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    code: 429,
    message: '查询过于频繁，请稍后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { apiLimiter, postLimiter, orderLimiter, voucherLimiter };
