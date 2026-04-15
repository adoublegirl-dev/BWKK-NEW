/**
 * 邮件服务模块
 * 使用 Resend API 发送验证码邮件
 */
const { Resend } = require('resend');
const crypto = require('crypto');
const config = require('../config');

// 初始化 Resend 客户端
const RESEND_API_KEY = config.resend?.apiKey || process.env.RESEND_API_KEY;
const resend = new Resend(RESEND_API_KEY);

// 发件人邮箱（已在 Resend 控制台验证域名 zhaguzhagu.com）
const FROM_EMAIL = config.resend?.fromEmail || 'verify@zhaguzhagu.com';

// 验证码缓存（内存存储，生产环境建议使用 Redis）
const codeCache = new Map();

// 验证token缓存（验证成功后生成，注册时使用）
const verifyTokenCache = new Map();

/**
 * 生成6位数字验证码
 */
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * 生成验证token（用于验证通过后注册使用）
 */
const generateVerifyToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

/**
 * 发送验证码邮件
 * @param {string} email - 收件人邮箱
 * @param {string} type - 验证码类型: login | bind | reset
 * @returns {Promise<{success: boolean, message: string, code?: string}>}
 */
const sendCode = async (email, type = 'login') => {
  // 检查发送冷却（60秒）
  const cacheKey = `${email}:${type}`;
  const existingData = codeCache.get(cacheKey);
  
  if (existingData) {
    const elapsedSeconds = Math.floor((Date.now() - existingData.sentAt) / 1000);
    const remainingSeconds = 60 - elapsedSeconds;
    
    if (remainingSeconds > 0) {
      return {
        success: false,
        message: `请${remainingSeconds}秒后再试`,
        remainingSeconds
      };
    }
  }

  // 生成验证码
  const code = generateCode();
  const expiresAt = Date.now() + 3 * 60 * 1000; // 3分钟有效期

  try {
    console.log('[EmailService] 开始发送邮件到:', email);
    console.log('[EmailService] 使用发件人:', FROM_EMAIL);
    
    // 发送邮件
    const { data, error } = await resend.emails.send({
      from: `帮我看看 <${FROM_EMAIL}>`,
      to: email,
      subject: '【帮我看看】验证码',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">验证码</h2>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            您好，您正在登录「帮我看看」，验证码如下：
          </p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">
            验证码3分钟内有效，请勿泄露给他人。如非本人操作，请忽略此邮件。
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="color: #ccc; font-size: 12px; text-align: center;">
            帮我看看 - 基于地理位置的众包互助社区
          </p>
        </div>
      `,
    });

    if (error) {
      console.error('[EmailService] Resend 发送失败:', error);
      return {
        success: false,
        message: '邮件发送失败，请稍后重试'
      };
    }
    
    console.log('[EmailService] 邮件发送成功:', data);

    // 缓存验证码
    codeCache.set(cacheKey, {
      code,
      type,
      sentAt: Date.now(),
      expiresAt,
      attempts: 0
    });

    // 清理过期缓存（简单实现，生产环境建议用 LRU）
    setTimeout(() => {
      codeCache.delete(cacheKey);
    }, 3 * 60 * 1000);

    return {
      success: true,
      message: '验证码已发送',
      // 测试环境返回验证码（方便测试）
      ...(config.isDev && { code })
    };

  } catch (error) {
    console.error('[EmailService] 发送邮件异常:', error);
    return {
      success: false,
      message: '邮件服务异常，请稍后重试'
    };
  }
};

/**
 * 验证验证码
 * @param {string} email - 邮箱
 * @param {string} code - 用户输入的验证码
 * @param {string} type - 验证码类型
 * @returns {{success: boolean, message: string, attemptsLeft?: number, verifyToken?: string}}
 */
const verifyCode = (email, code, type = 'login') => {
  const cacheKey = `${email}:${type}`;
  const data = codeCache.get(cacheKey);

  // 验证码不存在或已过期
  if (!data) {
    return {
      success: false,
      message: '验证码已过期，请重新获取'
    };
  }

  // 检查有效期
  if (Date.now() > data.expiresAt) {
    codeCache.delete(cacheKey);
    return {
      success: false,
      message: '验证码已过期，请重新获取'
    };
  }

  // 检查尝试次数（最多3次）
  if (data.attempts >= 3) {
    codeCache.delete(cacheKey);
    return {
      success: false,
      message: '验证失败次数过多，请重新获取验证码'
    };
  }

  // 验证码匹配
  if (data.code === code) {
    // 删除验证码（防止重复使用）
    codeCache.delete(cacheKey);
    
    // 生成验证token（有效期5分钟，用于注册阶段）
    const verifyToken = generateVerifyToken();
    verifyTokenCache.set(verifyToken, {
      email,
      type,
      createdAt: Date.now(),
      expiresAt: Date.now() + 5 * 60 * 1000 // 5分钟有效期
    });
    
    // 5分钟后清理token
    setTimeout(() => {
      verifyTokenCache.delete(verifyToken);
    }, 5 * 60 * 1000);
    
    return {
      success: true,
      message: '验证成功',
      verifyToken
    };
  }

  // 验证码不匹配，增加尝试次数
  data.attempts += 1;
  const attemptsLeft = 3 - data.attempts;
  
  if (attemptsLeft <= 0) {
    codeCache.delete(cacheKey);
  }

  return {
    success: false,
    message: '验证码错误',
    attemptsLeft
  };
};

/**
 * 验证注册token
 * @param {string} verifyToken - 验证token
 * @param {string} email - 邮箱（用于验证token与邮箱匹配）
 * @returns {{success: boolean, message: string}}
 */
const verifyToken = (verifyToken, email) => {
  const data = verifyTokenCache.get(verifyToken);
  
  if (!data) {
    return {
      success: false,
      message: '验证已过期，请重新验证'
    };
  }
  
  if (Date.now() > data.expiresAt) {
    verifyTokenCache.delete(verifyToken);
    return {
      success: false,
      message: '验证已过期，请重新验证'
    };
  }
  
  if (data.email !== email) {
    return {
      success: false,
      message: '邮箱不匹配'
    };
  }
  
  // 使用后删除token
  verifyTokenCache.delete(verifyToken);
  
  return {
    success: true,
    message: '验证成功'
  };
};

/**
 * 清除验证码（用于测试或手动清理）
 * @param {string} email - 邮箱
 * @param {string} type - 验证码类型
 */
const clearCode = (email, type = 'login') => {
  const cacheKey = `${email}:${type}`;
  codeCache.delete(cacheKey);
};

module.exports = {
  sendCode,
  verifyCode,
  verifyToken,
  clearCode
};
