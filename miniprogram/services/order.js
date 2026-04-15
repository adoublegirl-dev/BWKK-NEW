/**
 * 接单相关 API
 */
const { get, post } = require('../utils/request');

const orderApi = {
  /**
   * 接单
   * @param {string} postId - 帖子ID
   */
  accept: (postId) => post('/orders', { postId }),

  /**
   * 获取我的接单记录
   */
  getMyOrders: (params) => get('/orders/my-orders', params),

  /**
   * 提交任务
   * @param {string} orderId - 订单ID
   * @param {Object} data - { images, description }
   */
  submitTask: (orderId, data) => post(`/orders/${orderId}/submit`, data),

  /**
   * 查看提交内容（发单人）
   * @param {string} orderId - 订单ID
   */
  getSubmissions: (orderId) => get(`/orders/${orderId}/submissions`),
};

module.exports = orderApi;
