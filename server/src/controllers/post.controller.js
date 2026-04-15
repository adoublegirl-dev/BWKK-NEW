/**
 * 帖子控制器
 */
const postService = require('../services/post.service');
const { ApiError, success, successWithPagination } = require('../utils/response');

/**
 * 获取帖子列表
 * GET /api/posts?page=1&pageSize=20&sort=latest&city=xxx
 */
const getPosts = async (req, res, next) => {
  try {
    const { page, pageSize, sort, city, latitude, longitude } = req.query;
    const result = await postService.getPosts({
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      sort: sort || 'latest',
      city,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
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
 * 获取帖子详情
 * GET /api/posts/:id
 */
const getPostDetail = async (req, res, next) => {
  try {
    const post = await postService.getPostDetail(req.params.id, req.user?.id);
    success(res, post);
  } catch (error) {
    next(error);
  }
};

/**
 * 发布帖子
 * POST /api/posts
 */
const createPost = async (req, res, next) => {
  try {
    const post = await postService.createPost(req.user.id, req.body);
    success(res, post, '发布成功', 201);
  } catch (error) {
    next(error);
  }
};

/**
 * 更新帖子
 * PUT /api/posts/:id
 */
const updatePost = async (req, res, next) => {
  try {
    const post = await postService.updatePost(req.params.id, req.user.id, req.body);
    success(res, post, '更新成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 删除帖子
 * DELETE /api/posts/:id
 */
const deletePost = async (req, res, next) => {
  try {
    const result = await postService.deletePost(req.params.id, req.user.id);
    success(res, result, '删除成功');
  } catch (error) {
    next(error);
  }
};

/**
 * 获取我的帖子
 * GET /api/posts/my-posts
 */
const getMyPosts = async (req, res, next) => {
  try {
    const { page, pageSize, status } = req.query;
    const result = await postService.getMyPosts(req.user.id, {
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

module.exports = { getPosts, getPostDetail, createPost, updatePost, deletePost, getMyPosts };
