/**
 * 用户相关 API
 */
const { get, put } = require('../utils/request');

const userApi = {
  /**
   * 获取个人信息
   */
  getProfile: () => get('/users/profile'),

  /**
   * 获取信用记录
   * @param {string} type - 'poster' | 'doer'
   */
  getCreditRecords: (type) => get('/users/credit', { type }),

  /**
   * 更新个人信息
   * @param {Object} data - { nickname, avatarUrl }
   */
  updateProfile: (data) => put('/users/profile', data),
};

module.exports = userApi;
