const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/response');

/**
 * 管理员 JWT 认证中间件
 * 与普通用户认证隔离，使用 admin JWT secret
 */
const adminAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, '未提供管理员认证令牌'));
    }

    const token = authHeader.substring(7);

    // 管理员 token payload 中包含 adminId 标识，用于区分普通用户 token
    const decoded = jwt.verify(token, config.admin.jwtSecret);

    if (decoded.adminId === undefined) {
      return next(new ApiError(403, '非管理员令牌'));
    }

    req.admin = {
      id: decoded.adminId,
      username: decoded.username,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, '管理员令牌已过期，请重新登录'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, '无效的管理员令牌'));
    }
    next(error);
  }
};

module.exports = { adminAuth };
