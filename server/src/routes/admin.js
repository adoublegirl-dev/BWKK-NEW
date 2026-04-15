const router = require('express').Router();
const { adminAuth } = require('../middleware/admin-auth');
const ctrl = require('../controllers/admin.controller');

// 登录（无需认证）
router.post('/login', ctrl.login);

// 以下路由需要管理员认证
router.use(adminAuth);

// Dashboard
router.get('/dashboard', ctrl.dashboard);

// 用户管理
router.get('/users', ctrl.getUsers);
router.get('/users/:id', ctrl.getUserDetail);
router.put('/users/:id', ctrl.updateUser);
router.post('/users/:id/reset-password', ctrl.resetUserPassword);
router.put('/users/:id/points', ctrl.adjustUserPoints);
router.put('/users/:id/credit', ctrl.adjustUserCredit);

// 帖子管理
router.get('/posts', ctrl.getPosts);
router.get('/posts/:id', ctrl.getPostDetail);
router.put('/posts/:id/status', ctrl.updatePostStatus);
router.delete('/posts/:id', ctrl.deletePost);

// 订单管理
router.get('/orders', ctrl.getOrders);
router.get('/orders/:id', ctrl.getOrderDetail);

// 交易记录
router.get('/transactions', ctrl.getTransactions);

// 信用记录
router.get('/credit-records', ctrl.getCreditRecords);

// 操作日志
router.get('/logs', ctrl.getLogs);

module.exports = router;
