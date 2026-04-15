/**
 * 参数校验工具
 */

/**
 * 校验必填字段
 * @param {object} obj - 待校验对象
 * @param {string[]} fields - 必填字段名数组
 * @returns {{ valid: boolean, missing: string[] }}
 */
const validateRequired = (obj, fields) => {
  const missing = fields.filter((f) => obj[f] === undefined || obj[f] === null || obj[f] === '');
  return {
    valid: missing.length === 0,
    missing,
  };
};

/**
 * 校验积分值（非负整数）
 */
const validatePoints = (points) => {
  const num = Number(points);
  return Number.isInteger(num) && num >= 0;
};

/**
 * 校验经纬度
 */
const validateCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
};

/**
 * 校验微信code
 */
const validateWxCode = (code) => {
  return typeof code === 'string' && code.length > 0;
};

/**
 * 校验手机号（中国大陆）
 */
const validatePhone = (phone) => {
  if (typeof phone !== 'string') return false;
  // 中国大陆手机号：1开头，11位数字
  const phoneRegex = /^1[3-9]\d{9}$/;
  return phoneRegex.test(phone);
};

/**
 * 校验邮箱地址
 */
const validateEmail = (email) => {
  if (typeof email !== 'string') return false;
  // 标准邮箱格式
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
};

/**
 * 校验验证码
 */
const validateSmsCode = (code) => {
  return typeof code === 'string' && /^\d{6}$/.test(code);
};

module.exports = {
  validateRequired,
  validatePoints,
  validateCoordinates,
  validateWxCode,
  validatePhone,
  validateEmail,
  validateSmsCode,
};
