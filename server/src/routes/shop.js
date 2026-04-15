const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const shopController = require('../controllers/shop.controller');

/**
 * @route   GET  /api/shop/products     商品列表（预留）
 */
router.get('/products', authMiddleware, shopController.getProducts);

module.exports = router;
