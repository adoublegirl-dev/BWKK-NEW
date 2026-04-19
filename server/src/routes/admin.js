const router = require('express').Router();
const { adminAuth } = require('../middleware/admin-auth');
const { adminLoginLimiter } = require('../middleware/login-security');
const ctrl = require('../controllers/admin.controller');

// 登录（无需认证，带限流防暴力破解）
router.post('/login', adminLoginLimiter, ctrl.login);

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
router.put('/users/:id/role', ctrl.updateUserRole);

// 积分调整（全量）
router.post('/users/adjust-points', ctrl.adjustAllPoints);

// 积分调整日志
router.get('/points-adjustment-logs', ctrl.getPointsAdjustmentLogs);

// 商家管理
router.get('/merchants', ctrl.getMerchants);

// 帖子管理
router.get('/posts', ctrl.getPosts);
router.get('/posts/:id', ctrl.getPostDetail);
router.put('/posts/:id/status', ctrl.updatePostStatus);
router.delete('/posts/:id', ctrl.deletePost);

// 订单管理
router.get('/orders', ctrl.getOrders);
router.get('/orders/:id', ctrl.getOrderDetail);
router.post('/orders/:id/confirm', ctrl.adminConfirmOrder);
router.post('/orders/:id/reject', ctrl.adminRejectOrder);
router.put('/orders/:id/status', ctrl.updateOrderStatus);

// 交易记录
router.get('/transactions', ctrl.getTransactions);

// 信用记录
router.get('/credit-records', ctrl.getCreditRecords);

// 操作日志
router.get('/logs', ctrl.getLogs);

// 管理员修改自己的密码
router.put('/change-password', ctrl.changePassword);

// ========== 积分商城管理 ==========

// 商品分类管理
router.get('/categories', ctrl.getCategories);
router.post('/categories', ctrl.createCategory);
router.get('/categories/:id', ctrl.getCategoryDetail);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

// 商品管理
router.get('/products', ctrl.getProducts);
router.post('/products', ctrl.createProduct);
router.get('/products/:id', ctrl.getProductDetail);
router.put('/products/:id', ctrl.updateProduct);
router.put('/products/:id/status', ctrl.updateProductStatus);
router.delete('/products/:id', ctrl.deleteProduct);

// 代金券管理
router.get('/voucher-batches', ctrl.getVoucherBatches);
router.get('/voucher-codes', ctrl.getVoucherCodes);

module.exports = router;
