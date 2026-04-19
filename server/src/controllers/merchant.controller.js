/**
 * 商家管理控制器
 * 处理商家后台和H5商家轻量入口的请求
 */
const merchantService = require('../services/merchant.service');
const voucherService = require('../services/voucher.service');
const { ApiError, success, successWithPagination } = require('../utils/response');
const { checkLoginLock, recordLoginFailure, recordLoginSuccess } = require('../middleware/login-security');

// ========== 商家认证 ==========

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new ApiError(400, '请输入邮箱和密码'));
    }

    // 检查登录锁定
    const clientIp = req.ip || req.connection.remoteAddress;
    const lockStatus = checkLoginLock('merchant', email, clientIp);
    if (lockStatus.locked) {
      return next(new ApiError(423, `账号已锁定，请${Math.ceil(lockStatus.remainingSeconds / 60)}分钟后再试`));
    }

    try {
      const result = await merchantService.merchantLogin(email, password);
      // 登录成功，清除失败记录
      recordLoginSuccess('merchant', email, clientIp);
      success(res, result, '登录成功');
    } catch (err) {
      // 登录失败，记录失败
      const failResult = recordLoginFailure('merchant', email, clientIp);
      if (failResult.locked) {
        return next(new ApiError(423, '连续登录失败次数过多，账号已锁定15分钟'));
      }
      next(new ApiError(err.statusCode || 401, err.message + (failResult.attemptsLeft <= 3 ? `，还剩${failResult.attemptsLeft}次尝试机会` : '')));
    }
  } catch (err) {
    next(err);
  }
}

// ========== 商家信息 ==========

async function getProfile(req, res, next) {
  try {
    // 商家后台用 req.merchant，H5端用 req.user
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await merchantService.getMerchantProfile(merchantId);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await merchantService.updateMerchantProfile(merchantId, req.body);
    success(res, data, '信息已更新');
  } catch (err) {
    next(err);
  }
}

// ========== 代金券批次管理 ==========

async function createVoucherBatch(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await voucherService.createVoucherBatch(merchantId, req.body);
    success(res, data, '代金券批次创建成功', 201);
  } catch (err) {
    next(err);
  }
}

async function getVoucherBatches(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const { page, pageSize, status } = req.query;
    const result = await voucherService.getVoucherBatches(merchantId, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

async function getVoucherBatchDetail(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await voucherService.getVoucherBatchById(req.params.id, merchantId);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getVoucherBatchCodes(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    // 校验批次归属
    await voucherService.getVoucherBatchById(req.params.id, merchantId);
    const { page, pageSize, status } = req.query;
    const result = await voucherService.getVoucherCodesByBatch(req.params.id, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 代金券核销 ==========

async function redeemVoucher(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const { redeemCode } = req.body;
    if (!redeemCode) return next(new ApiError(400, '请输入兑换码'));
    const data = await voucherService.redeemVoucher(merchantId, redeemCode);
    success(res, data, '核销成功');
  } catch (err) {
    next(err);
  }
}

async function queryVoucherByCode(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await voucherService.getVoucherByRedeemCode(merchantId, req.params.redeemCode);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function getRedeemHistory(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const { page, pageSize } = req.query;
    const result = await voucherService.getRedeemHistory(merchantId, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 帖子管理 ==========

async function getPosts(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const { page, pageSize, status } = req.query;
    const result = await merchantService.getMerchantPosts(merchantId, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
    });
  } catch (err) {
    next(err);
  }
}

async function getPostDetail(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await merchantService.getMerchantPostDetail(merchantId, req.params.id);
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    const merchantId = req.merchant?.id || req.user?.id;
    const data = await merchantService.createMerchantPost(merchantId, req.body);
    success(res, data, '帖子发布成功', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getProfile,
  updateProfile,
  createVoucherBatch,
  getVoucherBatches,
  getVoucherBatchDetail,
  getVoucherBatchCodes,
  redeemVoucher,
  queryVoucherByCode,
  getRedeemHistory,
  getPosts,
  getPostDetail,
  createPost,
};
