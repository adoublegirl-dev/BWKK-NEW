const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const paymentController = require('../controllers/payment.controller');

/**
 * @route   GET  /api/payments/balance         查询积分余额
 * @route   GET  /api/payments/transactions    积分交易记录
 */
router.get('/balance', authMiddleware, paymentController.getBalance);
router.get('/transactions', authMiddleware, paymentController.getTransactions);

module.exports = router;
