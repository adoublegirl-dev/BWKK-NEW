/**
 * 登录安全中间件
 * 包含：登录限流 + 登录失败锁定 + 密码强度校验
 */

const rateLimit = require('express-rate-limit');

// ========== 登录限流 ==========

/**
 * Admin 登录限流
 * 每个IP每15分钟最多10次登录尝试
 */
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    code: 429,
    message: '登录尝试过于频繁，请15分钟后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Merchant 登录限流
 * 每个IP每15分钟最多10次登录尝试
 */
const merchantLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    code: 429,
    message: '登录尝试过于频繁，请15分钟后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * H5 用户登录/注册限流
 * 每个IP每15分钟最多15次尝试
 */
const userAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    code: 429,
    message: '操作过于频繁，请稍后再试',
    data: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ========== 登录失败锁定（内存存储，适合单实例部署） ==========

/**
 * 登录失败记录
 * 结构: { key: { count, lockedUntil } }
 * key 格式: "admin:username:ip" 或 "merchant:email:ip" 或 "user:email:ip"
 */
const loginFailures = new Map();

const MAX_LOGIN_ATTEMPTS = 5;       // 最大连续失败次数
const LOCK_DURATION = 15 * 60 * 1000; // 锁定时长：15分钟

/**
 * 检查账号是否被锁定
 * @param {string} type - 'admin' | 'merchant' | 'user'
 * @param {string} account - 用户名或邮箱
 * @param {string} ip - 客户端IP
 * @returns {{ locked: boolean, remainingSeconds: number }}
 */
function checkLoginLock(type, account, ip) {
  const key = `${type}:${account}:${ip}`;
  const record = loginFailures.get(key);

  if (!record) return { locked: false, remainingSeconds: 0 };

  // 锁定已过期，清除记录
  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    loginFailures.delete(key);
    return { locked: false, remainingSeconds: 0 };
  }

  // 当前仍在锁定中
  if (record.lockedUntil) {
    const remaining = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    return { locked: true, remainingSeconds: remaining };
  }

  return { locked: false, remainingSeconds: 0 };
}

/**
 * 记录登录失败
 * @param {string} type - 'admin' | 'merchant' | 'user'
 * @param {string} account - 用户名或邮箱
 * @param {string} ip - 客户端IP
 * @returns {{ locked: boolean, attemptsLeft: number }}
 */
function recordLoginFailure(type, account, ip) {
  const key = `${type}:${account}:${ip}`;
  const record = loginFailures.get(key) || { count: 0, lockedUntil: null };

  // 如果之前锁定已过期，重置
  if (record.lockedUntil && Date.now() > record.lockedUntil) {
    record.count = 0;
    record.lockedUntil = null;
  }

  record.count += 1;

  if (record.count >= MAX_LOGIN_ATTEMPTS) {
    record.lockedUntil = Date.now() + LOCK_DURATION;
    loginFailures.set(key, record);
    return { locked: true, attemptsLeft: 0 };
  }

  loginFailures.set(key, record);
  return { locked: false, attemptsLeft: MAX_LOGIN_ATTEMPTS - record.count };
}

/**
 * 记录登录成功，清除失败记录
 * @param {string} type - 'admin' | 'merchant' | 'user'
 * @param {string} account - 用户名或邮箱
 * @param {string} ip - 客户端IP
 */
function recordLoginSuccess(type, account, ip) {
  const key = `${type}:${account}:${ip}`;
  loginFailures.delete(key);
}

// 定期清理过期记录（每10分钟）
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of loginFailures.entries()) {
    if (record.lockedUntil && now > record.lockedUntil) {
      loginFailures.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ========== 密码强度校验 ==========

/**
 * 校验密码强度
 * 规则：
 * - 至少8个字符
 * - 必须包含字母
 * - 必须包含数字
 * - 建议包含特殊字符（不强制）
 * @param {string} password
 * @returns {{ valid: boolean, message: string }}
 */
function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: '密码不能为空' };
  }

  if (password.length < 8) {
    return { valid: false, message: '密码长度不能少于8位' };
  }

  if (password.length > 128) {
    return { valid: false, message: '密码长度不能超过128位' };
  }

  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个字母' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: '密码必须包含至少一个数字' };
  }

  // 检查常见弱密码
  const weakPasswords = [
    '12345678', 'password', 'Password1', 'qwerty12',
    'abc12345', '11111111', '00000000', 'abcd1234',
  ];
  if (weakPasswords.some(weak => password.toLowerCase() === weak.toLowerCase())) {
    return { valid: false, message: '密码过于简单，请使用更复杂的密码' };
  }

  return { valid: true, message: '密码强度合格' };
}

module.exports = {
  // 限流器
  adminLoginLimiter,
  merchantLoginLimiter,
  userAuthLimiter,
  // 登录锁定
  checkLoginLock,
  recordLoginFailure,
  recordLoginSuccess,
  MAX_LOGIN_ATTEMPTS,
  LOCK_DURATION,
  // 密码强度
  validatePasswordStrength,
};
