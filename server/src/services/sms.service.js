/**
 * 短信验证码服务（内存存储）
 * 注意：生产环境建议使用Redis存储
 */

const crypto = require('crypto');

// 内存存储验证码（简化版，生产环境建议使用Redis）
const codeStore = new Map();

/**
 * 生成6位数字验证码
 */
const generateCode = () => {
  return Math.random().toString().slice(2, 8);
};

/**
 * 生成唯一key
 */
const generateKey = (phone, type = 'login') => {
  return `${type}:${phone}`;
};

/**
 * 发送验证码
 * @param {string} phone - 手机号
 * @param {string} type - 验证码类型: login | bind | reset
 * @returns {object} 发送结果
 */
const sendCode = (phone, type = 'login') => {
  // 检查发送频率（60秒内不能重复发送）
  const key = generateKey(phone, type);
  const existing = codeStore.get(key);

  if (existing) {
    const timeDiff = Date.now() - existing.createdAt;
    if (timeDiff < 60000) {
      const remaining = Math.ceil((60000 - timeDiff) / 1000);
      return {
        success: false,
        message: `请${remaining}秒后再试`,
        remainingSeconds: remaining
      };
    }
  }

  // 生成新验证码
  const code = generateCode();
  const now = Date.now();

  // 存储验证码（10分钟有效期）
  codeStore.set(key, {
    code,
    type,
    createdAt: now,
    expiresAt: now + 10 * 60 * 1000, // 10分钟后过期
    attempts: 0
  });

  // TODO: 实际调用短信网关发送验证码
  // 目前仅返回验证码用于测试
  console.log(`[SMS] 验证码已发送至 ${phone}: ${code}`);

  return {
    success: true,
    message: '验证码已发送',
    // 测试环境下返回验证码，生产环境应删除
    code: process.env.NODE_ENV === 'development' ? code : undefined
  };
};

/**
 * 验证验证码
 * @param {string} phone - 手机号
 * @param {string} code - 验证码
 * @param {string} type - 验证码类型
 * @returns {object} 验证结果
 */
const verifyCode = (phone, code, type = 'login') => {
  const key = generateKey(phone, type);
  const record = codeStore.get(key);

  // 验证码不存在
  if (!record) {
    return {
      success: false,
      message: '验证码已过期或不存在，请重新获取'
    };
  }

  // 检查是否已使用
  if (record.used) {
    return {
      success: false,
      message: '验证码已使用，请重新获取'
    };
  }

  // 检查是否过期
  if (Date.now() > record.expiresAt) {
    codeStore.delete(key);
    return {
      success: false,
      message: '验证码已过期，请重新获取'
    };
  }

  // 验证错误次数（最多5次）
  if (record.attempts >= 5) {
    codeStore.delete(key);
    return {
      success: false,
      message: '验证失败次数过多，请重新获取验证码'
    };
  }

  // 验证码匹配
  if (record.code !== code) {
    record.attempts += 1;
    return {
      success: false,
      message: '验证码错误',
      attemptsLeft: 5 - record.attempts
    };
  }

  // 验证成功，标记为已使用
  record.used = true;
  record.usedAt = Date.now();

  return {
    success: true,
    message: '验证成功'
  };
};

/**
 * 标记验证码为已使用（登录成功后调用）
 * @param {string} phone - 手机号
 * @param {string} type - 验证码类型
 */
const markAsUsed = (phone, type = 'login') => {
  const key = generateKey(phone, type);
  const record = codeStore.get(key);

  if (record) {
    record.used = true;
    record.usedAt = Date.now();
  }
};

/**
 * 清除过期验证码（定时清理）
 */
const cleanup = () => {
  const now = Date.now();
  for (const [key, record] of codeStore.entries()) {
    if (now > record.expiresAt) {
      codeStore.delete(key);
    }
  }
};

// 每小时清理一次过期验证码
setInterval(cleanup, 60 * 60 * 1000);

module.exports = {
  sendCode,
  verifyCode,
  markAsUsed,
  cleanup
};
