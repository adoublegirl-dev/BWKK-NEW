const service = require('../services/admin.service');
const { success, successWithPagination, fail, ApiError } = require('../utils/response');

// ========== 认证 ==========

async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return fail(res, '请输入用户名和密码', 400);
    }
    const result = await service.login(username, password);
    success(res, result, '登录成功');
  } catch (err) {
    next(new ApiError(401, err.message));
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
    const { page, pageSize, keyword, creditStatus } = req.query;
    const { list, total } = await service.getUsers({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      keyword: keyword || '',
      creditStatus: creditStatus || '',
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
    const data = await service.adjustUserPoints(req.params.id, parseInt(amount), reason);
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

module.exports = {
  login,
  dashboard,
  getUsers,
  getUserDetail,
  updateUser,
  resetUserPassword,
  adjustUserPoints,
  adjustUserCredit,
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
};
