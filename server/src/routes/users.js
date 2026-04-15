const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const userController = require('../controllers/user.controller');
const creditService = require('../services/credit.service');
const { success, successWithPagination } = require('../utils/response');

/**
 * @route   GET  /api/users/profile      获取个人信息
 * @route   PUT  /api/users/profile      更新个人信息
 * @route   POST /api/users/report       举报差评
 * @route   GET  /api/users/credit       信用记录查询
 */
router.get('/profile', authMiddleware, userController.getProfile);
router.put('/profile', authMiddleware, userController.updateProfile);

/**
 * 举报差评（发单人操作）
 * POST /api/users/report
 * Body: { doerId: string, postId: string, reason?: string }
 */
router.post('/report', authMiddleware, async (req, res, next) => {
  try {
    const { doerId, postId, reason } = req.body;
    if (!doerId || !postId) {
      return res.status(400).json({ code: 400, message: '缺少必填参数', data: null });
    }
    await creditService.reportDoer(doerId, postId, reason);
    success(res, null, '举报已记录');
  } catch (error) {
    next(error);
  }
});

/**
 * 信用记录查询
 * GET /api/users/credit?page=1&pageSize=20&type=all
 */
router.get('/credit', authMiddleware, async (req, res, next) => {
  try {
    const { page, pageSize, type } = req.query;
    const result = await creditService.getCreditRecords(req.user.id, {
      page: parseInt(page) || 1,
      pageSize: parseInt(pageSize) || 20,
      type,
    });
    successWithPagination(res, result.list, {
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
