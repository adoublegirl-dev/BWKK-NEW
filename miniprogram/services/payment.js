/**
 * 支付/积分相关 API
 */
const { get } = require('../utils/request');

const paymentApi = {
  /**
   * 获取积分余额
   */
  getBalance: () => get('/payments/balance'),

  /**
   * 获取积分交易记录
   * @param {Object} params - { page, pageSize, type }
   */
  getTransactions: (params) => get('/payments/transactions', params),
};

module.exports = paymentApi;
