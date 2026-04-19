/**
 * 用户控制器
 */
const prisma = require('../config/database');
const { ApiError, success } = require('../utils/response');

/**
 * 文本防注入清洗
 * 去除HTML标签、脚本、特殊字符，防止XSS和注入攻击
 */
const sanitizeText = (text) => {
  if (typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '')           // 去除HTML标签
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // 去除script标签
    .replace(/javascript:/gi, '')       // 去除javascript协议
    .replace(/on\w+\s*=/gi, '')         // 去除事件处理属性
    .replace(/[<>"'&\\]/g, '')          // 去除特殊字符
    .trim();
};

/**
 * 根据昵称生成默认头像URL
 * 中文名取第一个字，英文名取第一个字母大写
 * 使用SVG内联生成，返回data URL
 */
const generateDefaultAvatar = (nickname) => {
  if (!nickname || typeof nickname !== 'string') {
    // 默认头像
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="#667eea" width="80" height="80"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="32" font-family="sans-serif">?</text></svg>`;
    return `data:image/svg+xml,${encodeURIComponent(svg)}`;
  }

  // 取第一个字符
  let initial = nickname.charAt(0).toUpperCase();
  
  // 颜色池，根据昵称第一个字符的charCode选颜色
  const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#a18cd1', '#fbc2eb', '#84fab0'];
  const colorIndex = nickname.charCodeAt(0) % colors.length;
  const bgColor = colors[colorIndex];

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 80 80"><rect fill="${bgColor}" width="80" height="80"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="32" font-family="sans-serif">${initial}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};

/**
 * 获取个人信息
 * GET /api/users/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        email: true,
        city: true,
        posterCredit: true,
        doerCredit: true,
        creditStatus: true,
        frozenUntil: true,
        totalPoints: true,
        frozenPoints: true,
        role: true,
        merchantName: true,
        merchantDesc: true,
        merchantContact: true,
        createdAt: true,
      },
    });

    if (!user) throw new ApiError(404, '用户不存在');

    // 如果没有头像，生成默认头像
    const avatarUrl = user.avatarUrl || generateDefaultAvatar(user.nickname);

    success(res, {
      ...user,
      avatarUrl,
      availablePoints: user.totalPoints - user.frozenPoints,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 更新个人信息
 * PUT /api/users/profile
 * Body: { nickname?: string, avatarUrl?: string, city?: string }
 */
const updateProfile = async (req, res, next) => {
  try {
    const { nickname, avatarUrl, city } = req.body;
    const updateData = {};

    // 昵称处理：防注入清洗 + 长度限制
    if (nickname !== undefined) {
      const cleaned = sanitizeText(nickname);
      if (cleaned.length === 0) {
        throw new ApiError(400, '昵称不能为空');
      }
      if (cleaned.length > 20) {
        throw new ApiError(400, '昵称不能超过20个字符');
      }
      updateData.nickname = cleaned;
    }

    // 头像URL处理
    if (avatarUrl !== undefined) {
      // 只允许 data:image/svg+xml, data:image/png, data:image/jpeg, /uploads/ 开头的URL
      const isValidAvatarUrl = 
        avatarUrl.startsWith('data:image/svg+xml,') ||
        avatarUrl.startsWith('data:image/png;base64,') ||
        avatarUrl.startsWith('data:image/jpeg;base64,') ||
        avatarUrl.startsWith('/uploads/');
      
      if (!isValidAvatarUrl) {
        throw new ApiError(400, '头像格式无效');
      }
      updateData.avatarUrl = avatarUrl;
    }

    // 城市处理：防注入清洗
    if (city !== undefined) {
      const cleaned = sanitizeText(city);
      if (cleaned.length > 50) {
        throw new ApiError(400, '城市名不能超过50个字符');
      }
      updateData.city = cleaned;
    }

    if (Object.keys(updateData).length === 0) {
      throw new ApiError(400, '没有需要更新的内容');
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: updateData,
      select: {
        id: true,
        nickname: true,
        avatarUrl: true,
        email: true,
        city: true,
      },
    });

    // 返回时确保有头像
    const resultAvatarUrl = user.avatarUrl || generateDefaultAvatar(user.nickname);

    success(res, {
      ...user,
      avatarUrl: resultAvatarUrl,
    }, '更新成功');
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, updateProfile, generateDefaultAvatar, sanitizeText };
