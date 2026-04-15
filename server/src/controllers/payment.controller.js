/**
 * 支付/积分控制器
 */
const paymentService = require('../services/payment.service');
const { success, successWithPagination } = require('../utils/response');

/**
 * 查询积分余额
 * GET /api/payments/balance
 */
const getBalance = async (req, res, next) => {
  try {
    const payment = paymentService.getStrategy();
    const balance = await payment.getBalance(req.user.id);
    success(res, balance);
  } catch (error) {
    next(error);
  }
};

/**
 * 查询交易记录
 * GET /api/payments/transactions?page=1&pageSize=20&type=all
 */
const getTransactions = async (req, res, next) => {
  try {
    const { page, pageSize, type } = req.query;
    const payment = paymentService.getStrategy();
    const result = await payment.getTransactionHistory({
      userId: req.user.id,
      type,
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
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

module.exports = { getBalance, getTransactions };
