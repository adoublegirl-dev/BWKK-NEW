/**
 * 微信配置模块
 * 包含小程序登录配置和微信支付预留配置
 */
const config = require('./index');

const wxConfig = {
  // 小程序登录
  appId: config.wx.appId,
  appSecret: config.wx.appSecret,

  // 微信登录URL
  loginUrl: 'https://api.weixin.qq.com/sns/jscode2session',

  // 微信支付配置（预留，MVP阶段不使用）
  pay: {
    mchId: config.wechatPay.mchId,
    mchKey: config.wechatPay.mchKey,
    mchSerialNo: config.wechatPay.mchSerialNo,
    mchPrivateKey: config.wechatPay.mchPrivateKey,
    notifyUrl: config.wechatPay.notifyUrl,
    // API v3 基础URL
    baseUrl: 'https://api.mch.weixin.qq.com',
    // JSAPI 支付
    jsapiUrl: '/v3/pay/transactions/jsapi',
    // 商家转账到零钱
    transferUrl: '/v3/transfer/batches',
  },
};

module.exports = wxConfig;
