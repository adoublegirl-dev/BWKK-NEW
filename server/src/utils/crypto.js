const crypto = require('crypto');

/**
 * 生成随机字符串
 * @param {number} length - 字符串长度
 * @returns {string}
 */
const generateRandomString = (length = 16) => {
  return crypto.randomBytes(length).toString('hex').substring(0, length);
};

/**
 * MD5 哈希
 */
const md5 = (str) => {
  return crypto.createHash('md5').update(str).digest('hex');
};

module.exports = { generateRandomString, md5 };
