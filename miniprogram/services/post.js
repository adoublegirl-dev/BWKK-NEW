/**
 * 帖子相关 API
 */
const { get, post, put, del } = require('../utils/request');

const postApi = {
  /**
   * 获取我的帖子列表
   * @param {Object} params - { page, pageSize, status }
   */
  getMyPosts: (params) => get('/posts/my-posts', params),

  /**
   * 获取帖子列表
   * @param {Object} params - { page, pageSize, sort, city }
   */
  getList: (params) => get('/posts', params),

  /**
   * 获取帖子详情
   * @param {string} id - 帖子ID
   */
  getDetail: (id) => get(`/posts/${id}`),

  /**
   * 发布帖子
   * @param {Object} data - { title, description, location, reward, deadline, compensateRate }
   */
  create: (data) => post('/posts', data),

  /**
   * 更新帖子
   */
  update: (id, data) => put(`/posts/${id}`, data),

  /**
   * 删除帖子
   */
  delete: (id) => del(`/posts/${id}`),
};

module.exports = postApi;
