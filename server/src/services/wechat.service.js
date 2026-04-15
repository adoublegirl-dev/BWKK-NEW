/**
 * 微信API封装服务
 * 包含小程序登录和微信支付预留
 */
const axios = require('axios');
const config = require('../config');
const wxConfig = require('../config/wechat');

/**
 * 微信小程序登录 - 获取 openid 和 session_key
 * @param {string} code - 微信临时登录凭证
 * @returns {{ openid: string, session_key: string, unionid?: string }}
 */
const wxLogin = async (code) => {
  // 开发模式：如果未配置 appId/appSecret，使用模拟登录
  // 使用固定 dev_openid 避免每次登录创建新用户
  if (!wxConfig.appId || !wxConfig.appSecret) {
    console.log('[dev-mode] 未配置微信AppID/AppSecret，使用模拟登录（固定用户）');
    return {
      openid: 'dev_openid_default',
      sessionKey: 'dev_session_key',
      unionid: null,
    };
  }

  const url = `${wxConfig.loginUrl}?appid=${wxConfig.appId}&secret=${wxConfig.appSecret}&js_code=${code}&grant_type=authorization_code`;

  const response = await axios.get(url);
  const data = response.data;

  if (data.errcode) {
    throw new Error(`微信登录失败: ${data.errcode} ${data.errmsg}`);
  }

  return {
    openid: data.openid,
    sessionKey: data.session_key,
    unionid: data.unionid || null,
  };
};

/**
 * 获取微信 Access Token（预留，支付功能需要）
 * @returns {string} access_token
 */
const getAccessToken = async () => {
  // TODO: 实现 access_token 获取和缓存（微信支付时需要）
  throw new Error('微信支付功能尚未实现');
};

/**
 * 微信支付 - JSAPI 下单（预留）
 */
const createPayment = async (_params) => {
  throw new Error('微信支付功能尚未实现');
};

/**
 * 商家转账到零钱（预留）
 */
const transferToUser = async (_params) => {
  throw new Error('微信支付功能尚未实现');
};

module.exports = {
  wxLogin,
  getAccessToken,
  createPayment,
  transferToUser,
};
