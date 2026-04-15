const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { orderLimiter } = require('../middleware/rate-limiter');
const orderController = require('../controllers/order.controller');

/**
 * @route   POST   /api/orders                     接单（需登录+限流）
 * @route   GET    /api/orders/my-orders            我的接单记录（需登录）
 * @route   POST   /api/orders/:id/submit           提交任务（需登录）
 * @route   POST   /api/orders/:id/confirm          确认选中（需登录）
 * @route   GET    /api/orders/submissions/:postId  查看提交内容（发单人）
 */
router.post('/', authMiddleware, orderLimiter, orderController.acceptOrder);
router.get('/my-orders', authMiddleware, orderController.getMyOrders);
router.post('/:id/submit', authMiddleware, orderController.submitTask);
router.post('/:id/confirm', authMiddleware, orderController.confirmOrder);
router.get('/submissions/:postId', authMiddleware, orderController.getSubmissions);

module.exports = router;
