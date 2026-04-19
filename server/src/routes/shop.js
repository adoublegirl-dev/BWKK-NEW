const express = require('express');
const router = express.Router();
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const shopController = require('../controllers/shop.controller');

// ========== 用户端商城（/api/shop） ==========

// 商品分类（无需登录）
router.get('/categories', shopController.getCategories);

// 商品列表（可选登录，登录后可看到积分信息）
router.get('/products', optionalAuth, shopController.getProducts);

// 商品详情
router.get('/products/:id', optionalAuth, shopController.getProductDetail);

// 兑换商品（需登录）
router.post('/products/:id/exchange', authMiddleware, shopController.exchangeProduct);

// 我的兑换记录（需登录）
router.get('/exchange-records', authMiddleware, shopController.getExchangeRecords);

// 我的代金券（需登录）
router.get('/vouchers', authMiddleware, shopController.getMyVouchers);

module.exports = router;
