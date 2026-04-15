const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/response');

/**
 * JWT 认证中间件
 * 从请求头 Authorization: Bearer <token> 中提取用户信息
 * 支持多种登录方式：微信登录(openid)、手机号登录(phone)
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, '未提供认证令牌'));
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.jwt.secret);

    req.user = {
      id: decoded.userId,
      loginType: decoded.loginType,
      openid: decoded.openid || null,
      email: decoded.email || null,
      phone: decoded.phone || null,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, '令牌已过期，请重新登录'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, '无效的令牌'));
    }
    next(error);
  }
};

/**
 * 可选认证中间件
 * 如果提供了token则解析用户信息，但不强制要求
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = {
        id: decoded.userId,
        loginType: decoded.loginType,
        openid: decoded.openid || null,
        email: decoded.email || null,
        phone: decoded.phone || null,
      };
    }
  } catch {
    // 可选认证，忽略错误
  }
  next();
};

module.exports = { authMiddleware, optionalAuth };
