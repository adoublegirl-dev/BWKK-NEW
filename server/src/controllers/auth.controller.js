/**
 * 登录控制器
 * 支持多种登录方式：微信登录、邮箱验证码登录
 */
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('../config');
const prisma = require('../config/database');
const wechatService = require('../services/wechat.service');
const emailService = require('../services/email.service');
const { generateDefaultAvatar, sanitizeText } = require('./user.controller');
const { ApiError, success } = require('../utils/response');
const { validateWxCode, validateEmail } = require('../utils/validator');

/**
 * 生成JWT Token
 * @param {object} user - 用户对象
 * @param {string} loginType - 登录方式: wechat | email
 */
const generateToken = (user, loginType = 'wechat') => {
  const payload = {
    userId: user.id,
    loginType,
    // 兼容多种登录标识
    ...(user.openid && { openid: user.openid }),
    ...(user.email && { email: user.email }),
  };

  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn
  });
};

/**
 * 统一用户信息返回格式
 */
const formatUserInfo = (user) => ({
  id: user.id,
  openid: user.openid,
  email: user.email,
  emailVerified: user.emailVerified,
  nickname: user.nickname,
  avatarUrl: user.avatarUrl || generateDefaultAvatar(user.nickname),
  city: user.city,
  totalPoints: user.totalPoints,
  frozenPoints: user.frozenPoints,
  posterCredit: user.posterCredit,
  doerCredit: user.doerCredit,
  creditStatus: user.creditStatus,
});

/**
 * 微信小程序登录
 * POST /api/auth/login
 * Body: { code: string, nickname?: string, avatarUrl?: string }
 */
const login = async (req, res, next) => {
  try {
    const { code, nickname, avatarUrl } = req.body;

    // 参数校验
    if (!validateWxCode(code)) {
      throw new ApiError(400, '缺少有效的微信登录凭证');
    }

    // 1. 调用微信接口获取 openid
    const wxResult = await wechatService.wxLogin(code);

    // 2. 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { openid: wxResult.openid },
    });

    if (!user) {
      // 新用户注册，赠送100初始积分
      const safeNickname = sanitizeText(nickname) || `用户${Date.now().toString(36)}`;
      user = await prisma.user.create({
        data: {
          openid: wxResult.openid,
          unionid: wxResult.unionid || null,
          nickname: safeNickname,
          avatarUrl: avatarUrl || generateDefaultAvatar(safeNickname),
          totalPoints: 100,
          frozenPoints: 0,
        },
      });
    } else {
      // 已有用户，更新昵称和头像（如果提供了新的）
      if (nickname || avatarUrl) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...(nickname && { nickname }),
            ...(avatarUrl && { avatarUrl }),
            // 如果有unionid也更新
            ...(wxResult.unionid && { unionid: wxResult.unionid }),
          },
        });
      }
    }

    // 3. 签发 JWT
    const token = generateToken(user, 'wechat');

    // 4. 返回用户信息和 token
    success(res, {
      token,
      userInfo: formatUserInfo(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    // 微信登录失败的错误处理
    if (error.message.includes('微信登录失败')) {
      return next(new ApiError(401, '微信授权登录失败，请重试'));
    }
    next(error);
  }
};

/**
 * 验证邮箱验证码（仅验证，不登录/注册）
 * POST /api/auth/verify-email-code
 * Body: { email: string, code: string }
 */
const verifyEmailCode = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    // 参数校验
    if (!validateEmail(email)) {
      throw new ApiError(400, '请输入有效的邮箱地址');
    }

    if (!code || code.length !== 6) {
      throw new ApiError(400, '请输入6位验证码');
    }

    // 验证验证码
    const verifyResult = emailService.verifyCode(email, code, 'login');

    if (!verifyResult.success) {
      throw new ApiError(400, verifyResult.message, {
        attemptsLeft: verifyResult.attemptsLeft
      });
    }

    // 验证成功，返回verifyToken供后续注册使用
    success(res, {
      verified: true,
      message: '验证码验证成功',
      verifyToken: verifyResult.verifyToken
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(error);
  }
};

/**
 * 发送邮箱验证码
 * POST /api/auth/send-email-code
 * Body: { email: string, type?: string }
 */
const sendEmailCode = async (req, res, next) => {
  try {
    const { email, type = 'login' } = req.body;

    // 参数校验
    if (!validateEmail(email)) {
      throw new ApiError(400, '请输入有效的邮箱地址');
    }

    // 验证码类型校验
    if (!['login', 'bind'].includes(type)) {
      throw new ApiError(400, '无效的验证码类型');
    }

    // 发送验证码
    const result = await emailService.sendCode(email, type);

    if (!result.success) {
      throw new ApiError(429, result.message, { remainingSeconds: result.remainingSeconds });
    }

    success(res, {
      message: result.message,
      // 测试环境下返回验证码
      ...(result.code && { code: result.code })
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(error);
  }
};

/**
 * 邮箱验证码登录
 * POST /api/auth/login-email
 * Body: { email: string, verifyToken: string, nickname?: string, password?: string }
 */
const loginEmail = async (req, res, next) => {
  try {
    const { email, verifyToken, nickname, password } = req.body;

    // 参数校验
    if (!validateEmail(email)) {
      throw new ApiError(400, '请输入有效的邮箱地址');
    }

    if (!verifyToken) {
      throw new ApiError(400, '请先完成验证码验证');
    }

    // 验证token
    const verifyResult = emailService.verifyToken(verifyToken, email);

    if (!verifyResult.success) {
      throw new ApiError(400, verifyResult.message);
    }

    // 查找或创建用户
    let user = await prisma.user.findUnique({
      where: { email },
    });

    let isNewUser = false;

    if (!user) {
      // 新用户注册，赠送100初始积分
      isNewUser = true;
      const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
      const safeNickname = sanitizeText(nickname) || `用户${Date.now().toString(36)}`;
      user = await prisma.user.create({
        data: {
          email,
          emailVerified: true,
          nickname: safeNickname,
          avatarUrl: generateDefaultAvatar(safeNickname),
          password: hashedPassword,
          totalPoints: 100,
          frozenPoints: 0,
        },
      });
    } else {
      // 已有用户，更新邮箱验证状态
      const updateData = { emailVerified: true };
      
      // 如果提供了新昵称且用户未设置，则更新
      if (nickname && !user.nickname) {
        updateData.nickname = nickname;
      }
      
      // 如果提供了密码，则加密后更新
      if (password) {
        updateData.password = await bcrypt.hash(password, 10);
      }
      
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });
    }

    // 签发JWT
    const token = generateToken(user, 'email');

    // 返回结果
    success(res, {
      token,
      isNewUser,
      userInfo: formatUserInfo(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(error);
  }
};

/**
 * 邮箱+密码登录
 * POST /api/auth/login-password
 * Body: { email: string, password: string }
 */
const loginPassword = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 参数校验
    if (!validateEmail(email)) {
      throw new ApiError(400, '请输入有效的邮箱地址');
    }

    if (!password) {
      throw new ApiError(400, '请输入密码');
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new ApiError(401, '邮箱或密码错误');
    }

    if (!user.password) {
      throw new ApiError(401, '邮箱或密码错误');
    }

    // 验证密码（兼容明文密码和bcrypt加密密码）
    let isPasswordValid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      // bcrypt加密密码
      isPasswordValid = await bcrypt.compare(password, user.password);
    } else {
      // 明文密码（旧数据兼容）
      isPasswordValid = password === user.password;
      // 验证通过后，将明文密码升级为bcrypt加密
      if (isPasswordValid) {
        await prisma.user.update({
          where: { id: user.id },
          data: { password: await bcrypt.hash(password, 10) }
        });
      }
    }

    if (!isPasswordValid) {
      throw new ApiError(401, '邮箱或密码错误');
    }

    // 签发JWT
    const token = generateToken(user, 'email');

    // 返回结果
    success(res, {
      token,
      isNewUser: false,
      userInfo: formatUserInfo(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(error);
  }
};

/**
 * 绑定微信
 * POST /api/auth/bind-wechat
 * Body: { email: string, code: string, wxCode: string }
 * 需要用户已通过邮箱登录，绑定微信openid
 */
const bindWechat = async (req, res, next) => {
  try {
    const { email, code, wxCode } = req.body;
    const authUser = req.user; // 从中间件获取当前登录用户

    // 参数校验
    if (!validateEmail(email)) {
      throw new ApiError(400, '请输入有效的邮箱地址');
    }

    if (!wxCode) {
      throw new ApiError(400, '缺少微信授权凭证');
    }

    // 验证邮箱验证码
    const verifyResult = emailService.verifyCode(email, code, 'bind');

    if (!verifyResult.success) {
      throw new ApiError(400, verifyResult.message, {
        attemptsLeft: verifyResult.attemptsLeft
      });
    }

    // 获取微信openid
    const wxResult = await wechatService.wxLogin(wxCode);

    // 查找是否已有该openid的用户
    const existingUser = await prisma.user.findUnique({
      where: { openid: wxResult.openid },
    });

    if (existingUser && existingUser.id !== authUser.id) {
      // 该openid已被其他用户绑定
      throw new ApiError(400, '该微信已被其他账号绑定');
    }

    // 更新当前用户，绑定微信
    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        email,
        emailVerified: true,
        openid: wxResult.openid,
        unionid: wxResult.unionid || undefined,
      },
    });

    // 重新签发JWT
    const token = generateToken(user, 'wechat');

    success(res, {
      message: '绑定成功',
      token,
      userInfo: formatUserInfo(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);

    if (error.message.includes('微信登录失败')) {
      return next(new ApiError(401, '微信授权失败，请重试'));
    }
    next(error);
  }
};

/**
 * 解绑微信（预留）
 * POST /api/auth/unbind-wechat
 */
const unbindWechat = async (req, res, next) => {
  try {
    const authUser = req.user;

    if (!authUser.email) {
      throw new ApiError(400, '请先绑定邮箱才能解绑微信');
    }

    const user = await prisma.user.update({
      where: { id: authUser.id },
      data: {
        openid: null,
        unionid: null,
      },
    });

    success(res, {
      message: '解绑成功',
      userInfo: formatUserInfo(user),
    });
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(error);
  }
};

module.exports = {
  login,
  sendEmailCode,
  verifyEmailCode,
  loginEmail,
  loginPassword,
  bindWechat,
  unbindWechat,
  generateToken,
  formatUserInfo
};
