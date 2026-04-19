/**
 * 商家JWT认证中间件
 * 独立于用户JWT和管理员JWT，使用 merchant JWT secret
 */
const jwt = require('jsonwebtoken');
const config = require('../config');
const { ApiError } = require('../utils/response');

/**
 * 商家JWT认证
 * 用于商家管理后台（/api/merchant-admin/*）
 */
const merchantAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new ApiError(401, '未提供商家认证令牌'));
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, config.merchant.jwtSecret);

    if (decoded.role !== 'merchant' || !decoded.merchantId) {
      return next(new ApiError(403, '非商家令牌'));
    }

    req.merchant = {
      id: decoded.merchantId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return next(new ApiError(401, '商家令牌已过期，请重新登录'));
    }
    if (error.name === 'JsonWebTokenError') {
      return next(new ApiError(401, '无效的商家令牌'));
    }
    next(error);
  }
};

/**
 * H5端商家角色校验（复用用户JWT，在API层校验role）
 * 用于H5商家轻量入口（/api/merchant/*）
 */
const merchantRoleCheck = (req, res, next) => {
  // 先走普通用户认证
  if (!req.user) {
    return next(new ApiError(401, '请先登录'));
  }

  // 这里需要查数据库确认角色（JWT中可能没有role字段）
  // 但为了性能，在auth中间件中已设置req.user，这里直接查
  const checkRole = async () => {
    try {
      const prisma = require('../config/database');
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { role: true },
      });

      if (!user || user.role !== 'merchant') {
        return next(new ApiError(403, '该功能仅限商家使用'));
      }

      req.user.role = 'merchant';
      next();
    } catch (err) {
      next(err);
    }
  };

  checkRole();
};

module.exports = { merchantAuth, merchantRoleCheck };
