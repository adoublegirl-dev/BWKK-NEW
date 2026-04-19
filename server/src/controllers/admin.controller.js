const service = require('../services/admin.service');
const categoryService = require('../services/category.service');
const shopService = require('../services/shop.service');
const voucherService = require('../services/voucher.service');
const merchantService = require('../services/merchant.service');
const { success, successWithPagination, fail, ApiError } = require('../utils/response');
const { checkLoginLock, recordLoginFailure, recordLoginSuccess, validatePasswordStrength } = require('../middleware/login-security');

// ========== 认证 ==========

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return fail(res, '请输入用户名和密码', 400);
    }

    // 检查登录锁定
    const clientIp = req.ip || req.connection.remoteAddress;
    const lockStatus = checkLoginLock('admin', username, clientIp);
    if (lockStatus.locked) {
      return fail(res, `账号已锁定，请${Math.ceil(lockStatus.remainingSeconds / 60)}分钟后再试`, 423);
    }

    try {
      const result = await service.login(username, password);
      // 登录成功，清除失败记录
      recordLoginSuccess('admin', username, clientIp);
      success(res, result, '登录成功');
    } catch (err) {
      // 登录失败，记录失败
      const failResult = recordLoginFailure('admin', username, clientIp);
      if (failResult.locked) {
        return fail(res, `连续登录失败次数过多，账号已锁定15分钟`, 423);
      }
      next(new ApiError(401, err.message + (failResult.attemptsLeft <= 3 ? `，还剩${failResult.attemptsLeft}次尝试机会` : '')));
    }
  } catch (err) {
    next(err);
  }
}

// ========== Dashboard ==========

async function dashboard(req, res, next) {
  try {
    const data = await service.getDashboard();
    success(res, data);
  } catch (err) {
    next(err);
  }
}

// ========== 用户管理 ==========

async function getUsers(req, res, next) {
  try {
    const { page, pageSize, keyword, creditStatus, role } = req.query;
    const { list, total } = await service.getUsers({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      keyword: keyword || '',
      creditStatus: creditStatus || '',
      role: role || '',
    });
    successWithPagination(res, list, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      total,
    });
  } catch (err) {
    next(err);
  }
}

async function getUserDetail(req, res, next) {
  try {
    const data = await service.getUserDetail(req.params.id);
    success(res, data);
  } catch (err) {
    next(new ApiError(404, err.message));
  }
}

async function updateUser(req, res, next) {
  try {
    const data = await service.updateUser(req.params.id, req.body);
    await service.createLog(req.admin.id, 'edit_user', 'user', req.params.id, req.body);
    success(res, data, '用户信息已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function resetUserPassword(req, res, next) {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return fail(res, '新密码不能少于6位', 400);
    }
    // 密码强度校验
    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      return fail(res, strengthCheck.message, 400);
    }
    const data = await service.resetUserPassword(req.params.id, newPassword);
    await service.createLog(req.admin.id, 'reset_password', 'user', req.params.id, '重置用户密码');
    success(res, data, '密码已重置');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function adjustUserPoints(req, res, next) {
  try {
    const { amount, reason } = req.body;
    if (amount === undefined || !reason) {
      return fail(res, '请提供调整数量和原因', 400);
    }
    const data = await service.adjustUserPoints(req.params.id, parseInt(amount), reason, req.admin.id);
    await service.createLog(req.admin.id, 'adjust_points', 'user', req.params.id, { amount, reason });
    success(res, data, '积分已调整');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function adjustUserCredit(req, res, next) {
  try {
    const { type, change, reason } = req.body;
    if (!type || change === undefined || !reason) {
      return fail(res, '请提供信用分类型、变动值和原因', 400);
    }
    const data = await service.adjustUserCredit(req.params.id, type, parseInt(change), reason);
    await service.createLog(req.admin.id, 'adjust_credit', 'user', req.params.id, { type, change, reason });
    success(res, data, '信用分已调整');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 帖子管理 ==========

async function getPosts(req, res, next) {
  try {
    const { page, pageSize, status, city, startTime, endTime } = req.query;
    const { list, total } = await service.getPosts({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status: status || '',
      city: city || '',
      startTime: startTime || '',
      endTime: endTime || '',
    });
    successWithPagination(res, list, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      total,
    });
  } catch (err) {
    next(err);
  }
}

async function getPostDetail(req, res, next) {
  try {
    const data = await service.getPostDetail(req.params.id);
    success(res, data);
  } catch (err) {
    next(new ApiError(404, err.message));
  }
}

async function updatePostStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return fail(res, '请提供新的帖子状态', 400);
    }
    const data = await service.updatePostStatus(req.params.id, status);
    await service.createLog(req.admin.id, 'edit_post', 'post', req.params.id, { status });
    success(res, data, '帖子状态已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function deletePost(req, res, next) {
  try {
    const data = await service.deletePost(req.params.id);
    await service.createLog(req.admin.id, 'delete_post', 'post', req.params.id, null);
    success(res, data, '帖子已删除');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 订单管理 ==========

async function getOrders(req, res, next) {
  try {
    const { page, pageSize, status, startTime, endTime } = req.query;
    const { list, total } = await service.getOrders({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status: status || '',
      startTime: startTime || '',
      endTime: endTime || '',
    });
    successWithPagination(res, list, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      total,
    });
  } catch (err) {
    next(err);
  }
}

async function getOrderDetail(req, res, next) {
  try {
    const data = await service.getOrderDetail(req.params.id);
    success(res, data);
  } catch (err) {
    next(new ApiError(404, err.message));
  }
}

async function adminConfirmOrder(req, res, next) {
  try {
    const data = await service.adminConfirmOrder(req.params.id);
    await service.createLog(req.admin.id, 'admin_confirm_order', 'order', req.params.id, '管理员强制选中订单');
    success(res, data, '已强制选中');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function adminRejectOrder(req, res, next) {
  try {
    const data = await service.adminRejectOrder(req.params.id);
    await service.createLog(req.admin.id, 'admin_reject_order', 'order', req.params.id, '管理员驳回订单');
    success(res, data, '已驳回');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) {
      return fail(res, '请提供新的订单状态', 400);
    }
    const data = await service.updateOrderStatus(req.params.id, status);
    await service.createLog(req.admin.id, 'admin_update_order', 'order', req.params.id, { status });
    success(res, data, '订单状态已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 交易记录 ==========

async function getTransactions(req, res, next) {
  try {
    const { page, pageSize, userId, type, startTime, endTime } = req.query;
    const { list, total } = await service.getTransactions({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      userId: userId || '',
      type: type || '',
      startTime: startTime || '',
      endTime: endTime || '',
    });
    successWithPagination(res, list, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 信用记录 ==========

async function getCreditRecords(req, res, next) {
  try {
    const { page, pageSize, userId, type } = req.query;
    const { list, total } = await service.getCreditRecords({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      userId: userId || '',
      type: type || '',
    });
    successWithPagination(res, list, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 操作日志 ==========

async function getLogs(req, res, next) {
  try {
    const { page, pageSize, action, startTime, endTime } = req.query;
    const { list, total } = await service.getLogs({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      action: action || '',
      startTime: startTime || '',
      endTime: endTime || '',
    });
    successWithPagination(res, list, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      total,
    });
  } catch (err) {
    next(err);
  }
}

// ========== 用户角色管理 ==========

async function updateUserRole(req, res, next) {
  try {
    const { role, merchantName, merchantDesc, merchantContact } = req.body;
    if (!['normal', 'merchant'].includes(role)) {
      return fail(res, '无效的角色', 400);
    }
    if (role === 'merchant' && !merchantName) {
      return fail(res, '设为商家时必须填写商家名称', 400);
    }

    const user = await service.updateUserRole(req.params.id, {
      role,
      merchantName,
      merchantDesc,
      merchantContact,
    });
    await service.createLog(req.admin.id, 'update_user_role', 'user', req.params.id, { role, merchantName });
    success(res, user, '角色已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 积分调整（全量） ==========

async function adjustAllPoints(req, res, next) {
  try {
    const { amount, reason } = req.body;
    if (amount === undefined || !reason) {
      return fail(res, '请提供调整数量和原因', 400);
    }
    const data = await merchantService.adjustAllUsersPoints(req.admin.id, parseInt(amount), reason);
    await service.createLog(req.admin.id, 'adjust_all_points', null, null, { amount, reason });
    success(res, data, '全量积分调整完成');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 积分调整日志 ==========

async function getPointsAdjustmentLogs(req, res, next) {
  try {
    const { page, pageSize, targetType } = req.query;
    const result = await merchantService.getPointsAdjustmentLogs({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      targetType: targetType || undefined,
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

// ========== 商家列表 ==========

async function getMerchants(req, res, next) {
  try {
    const { page, pageSize } = req.query;
    const result = await service.getMerchants({
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

// ========== 商品分类管理 ==========

async function getCategories(req, res, next) {
  try {
    const { status, level, parentId } = req.query;
    const data = await categoryService.getCategories({
      status: status || undefined,
      level: level || undefined,
      parentId: parentId || undefined,
    });
    success(res, data);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const data = await categoryService.createCategory(req.body);
    await service.createLog(req.admin.id, 'create_category', 'category', data.id, req.body);
    success(res, data, '分类创建成功', 201);
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function getCategoryDetail(req, res, next) {
  try {
    const data = await categoryService.getCategoryById(req.params.id);
    success(res, data);
  } catch (err) {
    next(new ApiError(404, err.message));
  }
}

async function updateCategory(req, res, next) {
  try {
    const data = await categoryService.updateCategory(req.params.id, req.body);
    await service.createLog(req.admin.id, 'update_category', 'category', req.params.id, req.body);
    success(res, data, '分类已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function deleteCategory(req, res, next) {
  try {
    const data = await categoryService.deleteCategory(req.params.id);
    await service.createLog(req.admin.id, 'delete_category', 'category', req.params.id, null);
    success(res, data, '分类已删除');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 商品管理 ==========

async function getProducts(req, res, next) {
  try {
    const { page, pageSize, status, categoryId, keyword } = req.query;
    const result = await shopService.getProducts({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status: status || undefined,
      categoryId: categoryId || undefined,
      keyword: keyword || undefined,
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

async function createProduct(req, res, next) {
  try {
    const data = await shopService.createProduct(req.body);
    await service.createLog(req.admin.id, 'create_product', 'product', data.id, req.body);
    success(res, data, '商品创建成功', 201);
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function getProductDetail(req, res, next) {
  try {
    const data = await shopService.getProductById(req.params.id);
    success(res, data);
  } catch (err) {
    next(new ApiError(404, err.message));
  }
}

async function updateProduct(req, res, next) {
  try {
    const data = await shopService.updateProduct(req.params.id, req.body);
    await service.createLog(req.admin.id, 'update_product', 'product', req.params.id, req.body);
    success(res, data, '商品已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function updateProductStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!status) return fail(res, '请提供新的商品状态', 400);
    const data = await shopService.updateProductStatus(req.params.id, status);
    await service.createLog(req.admin.id, 'update_product_status', 'product', req.params.id, { status });
    success(res, data, '商品状态已更新');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

async function deleteProduct(req, res, next) {
  try {
    const data = await shopService.deleteProduct(req.params.id);
    await service.createLog(req.admin.id, 'delete_product', 'product', req.params.id, null);
    success(res, data, '商品已删除');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

// ========== 代金券管理 ==========

async function getVoucherBatches(req, res, next) {
  try {
    const { page, pageSize, status, merchantId } = req.query;
    const result = await voucherService.getAllVoucherBatches({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status: status || undefined,
      merchantId: merchantId || undefined,
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

async function getVoucherCodes(req, res, next) {
  try {
    const { page, pageSize, status, batchId } = req.query;
    const result = await voucherService.getAllVoucherCodes({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status: status || undefined,
      batchId: batchId || undefined,
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

// ========== 管理员修改自己密码 ==========

async function changePassword(req, res, next) {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return fail(res, '请输入旧密码和新密码', 400);
    }

    // 密码强度校验
    const strengthCheck = validatePasswordStrength(newPassword);
    if (!strengthCheck.valid) {
      return fail(res, strengthCheck.message, 400);
    }

    const data = await service.changeAdminPassword(req.admin.id, oldPassword, newPassword);
    await service.createLog(req.admin.id, 'change_own_password', null, null, '修改自己的密码');
    success(res, data, '密码修改成功');
  } catch (err) {
    next(new ApiError(400, err.message));
  }
}

module.exports = {
  login,
  dashboard,
  getUsers,
  getUserDetail,
  updateUser,
  resetUserPassword,
  adjustUserPoints,
  adjustUserCredit,
  updateUserRole,
  adjustAllPoints,
  getPointsAdjustmentLogs,
  getMerchants,
  getPosts,
  getPostDetail,
  updatePostStatus,
  deletePost,
  getOrders,
  getOrderDetail,
  adminConfirmOrder,
  adminRejectOrder,
  updateOrderStatus,
  getTransactions,
  getCreditRecords,
  getLogs,
  getCategories,
  createCategory,
  getCategoryDetail,
  updateCategory,
  deleteCategory,
  getProducts,
  createProduct,
  getProductDetail,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  getVoucherBatches,
  getVoucherCodes,
  changePassword,
};
