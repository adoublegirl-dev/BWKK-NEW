const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { postLimiter } = require('../middleware/rate-limiter');
const postController = require('../controllers/post.controller');

/**
 * @route   GET    /api/posts              帖子列表（公开）
 * @route   GET    /api/posts/my-posts     我的帖子（需登录）
 * @route   GET    /api/posts/:id          帖子详情（公开/可选登录）
 * @route   POST   /api/posts              发布帖子（需登录+限流）
 * @route   PUT    /api/posts/:id          更新帖子（需登录）
 * @route   DELETE /api/posts/:id          删除帖子（需登录）
 */
router.get('/', postController.getPosts);
router.get('/my-posts', authMiddleware, postController.getMyPosts);
router.get('/:id', optionalAuth, postController.getPostDetail);
router.post('/', authMiddleware, postLimiter, postController.createPost);
router.put('/:id', authMiddleware, postController.updatePost);
router.delete('/:id', authMiddleware, postController.deletePost);

module.exports = router;
