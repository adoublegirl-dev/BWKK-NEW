const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { merchantAuth } = require('../middleware/merchant-auth');
const { merchantRoleCheck } = require('../middleware/merchant-auth');
const { merchantLoginLimiter } = require('../middleware/login-security');
const ctrl = require('../controllers/merchant.controller');

// ========== H5商家轻量入口（/api/merchant，复用用户JWT + role校验） ==========

// 商家信息
router.get('/profile', authMiddleware, merchantRoleCheck, ctrl.getProfile);

// 代金券批次列表（简要）
router.get('/voucher-batches', authMiddleware, merchantRoleCheck, ctrl.getVoucherBatches);

// 核销历史（简要）
router.get('/vouchers/redeem-history', authMiddleware, merchantRoleCheck, ctrl.getRedeemHistory);

// 核销代金券
router.post('/vouchers/redeem', authMiddleware, merchantRoleCheck, ctrl.redeemVoucher);

// ========== 商家管理后台（/api/merchant-admin，独立JWT认证） ==========

// 登录（无需认证，带限流防暴力破解）
router.post('/admin/auth/login', merchantLoginLimiter, ctrl.login);

// 以下路由需要商家JWT认证
router.use('/admin', merchantAuth);

// 商家信息
router.get('/admin/profile', ctrl.getProfile);
router.put('/admin/profile', ctrl.updateProfile);

// 代金券批次管理
router.post('/admin/voucher-batches', ctrl.createVoucherBatch);
router.get('/admin/voucher-batches', ctrl.getVoucherBatches);
router.get('/admin/voucher-batches/:id', ctrl.getVoucherBatchDetail);
router.get('/admin/voucher-batches/:id/codes', ctrl.getVoucherBatchCodes);

// 代金券核销
router.post('/admin/vouchers/redeem', ctrl.redeemVoucher);
router.get('/admin/vouchers/redeem-history', ctrl.getRedeemHistory);

// 查询兑换码
router.get('/admin/vouchers/:redeemCode/detail', ctrl.queryVoucherByCode);

// 帖子管理
router.get('/admin/posts', ctrl.getPosts);
router.get('/admin/posts/:id', ctrl.getPostDetail);
router.post('/admin/posts', ctrl.createPost);

module.exports = router;
