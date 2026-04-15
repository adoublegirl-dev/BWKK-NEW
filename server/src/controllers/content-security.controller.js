/**
 * 内容安全控制器
 */
const contentSecurity = require('../services/content-security.service');
const { success } = require('../utils/response');

/**
 * 文本内容审核
 * POST /api/moderate/text
 * Body: { text: string }
 */
const moderateText = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ code: 400, message: '缺少待审核文本', data: null });
    }
    const result = await contentSecurity.moderateText(text);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

/**
 * 图片内容审核
 * POST /api/moderate/image
 * Body: { imageUrl: string }
 */
const moderateImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ code: 400, message: '缺少图片URL', data: null });
    }
    const result = await contentSecurity.moderateImage(imageUrl);
    success(res, result);
  } catch (error) {
    next(error);
  }
};

module.exports = { moderateText, moderateImage };
