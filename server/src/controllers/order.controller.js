/**
 * 接单控制器
 */
const orderService = require('../services/order.service');
const { success, successWithPagination } = require('../utils/response');

/**
 * 接单
 * POST /api/orders
 * Body: { postId: string }
 */
const acceptOrder = async (req, res, next) => {
  try {
    const order = await orderService.acceptOrder(req.user.id, req.body);
    success(res, order, '接单成功', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的接单记录
 * GET /api/orders/my-orders?page=1&pageSize=20&status=all
 */
const getMyOrders = async (req, res, next) => {
  try {
    const { page, pageSize, status } = req.query;
    const result = await orderService.getMyOrders(req.user.id, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      status,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 提交任务
 * POST /api/orders/:id/submit
 * Body: { description?: string, images?: string }
 */
const submitTask = async (req, res, next) => {
  try {
    const order = await orderService.submitTask(req.user.id, req.params.id, req.body);
    success(res, order, '提交成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 查看帖子提交内容（发单人）
 * GET /api/orders/submissions/:postId
 */
const getSubmissions = async (req, res, next) => {
  try {
    const submissions = await orderService.getSubmissions(req.user.id, req.params.postId);
    success(res, submissions);
  } catch (error) {
    next(error);
  }
};

/**
 * 确认选中接单人
 * POST /api/orders/:id/confirm
 */
const confirmOrder = async (req, res, next) => {
  try {
    const result = await orderService.confirmOrder(req.user.id, req.params.id);
    success(res, result, '确认成功，积分已结算');
  } catch (error) {
    next(error);
  }
};

module.exports = { acceptOrder, getMyOrders, submitTask, getSubmissions, confirmOrder };
