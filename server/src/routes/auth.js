const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const { userAuthLimiter } = require('../middleware/login-security');

/**
 * @route   POST /api/auth/login
 * @desc    微信小程序登录
 */
router.post('/login', authController.login);

/**
 * @route   POST /api/auth/send-email-code
 * @desc    发送邮箱验证码
 * @body    { email: string, type?: string }
 */
router.post('/send-email-code', userAuthLimiter, authController.sendEmailCode);

/**
 * @route   POST /api/auth/verify-email-code
 * @desc    仅验证邮箱验证码（不登录/注册）
 * @body    { email: string, code: string }
 */
router.post('/verify-email-code', authController.verifyEmailCode);

/**
 * @route   POST /api/auth/login-email
 * @desc    邮箱验证码登录/注册
 * @body    { email: string, verifyToken: string, nickname?: string, password?: string }
 */
router.post('/login-email', userAuthLimiter, authController.loginEmail);

/**
 * @route   POST /api/auth/login-password
 * @desc    邮箱+密码登录
 * @body    { email: string, password: string }
 */
router.post('/login-password', userAuthLimiter, authController.loginPassword);

/**
 * @route   POST /api/auth/bind-wechat
 * @desc    绑定微信（需要已登录）
 * @body    { email: string, code: string, wxCode: string }
 * @middleware authMiddleware
 */
router.post('/bind-wechat', authMiddleware, authController.bindWechat);

/**
 * @route   POST /api/auth/unbind-wechat
 * @desc    解绑微信（需要已登录且已绑定手机号）
 * @middleware authMiddleware
 */
router.post('/unbind-wechat', authMiddleware, authController.unbindWechat);

module.exports = router;
