const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const contentSecurityController = require('../controllers/content-security.controller');

/**
 * @route   POST /api/moderate/text   文本内容审核
 * @route   POST /api/moderate/image  图片内容审核
 */
router.post('/text', authMiddleware, contentSecurityController.moderateText);
router.post('/image', authMiddleware, contentSecurityController.moderateImage);

module.exports = router;
