require('dotenv').config();

module.exports = {
  // 服务器
  port: process.env.PORT || 5090,
  nodeEnv: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',

  // 微信小程序
  wx: {
    appId: process.env.WX_APP_ID,
    appSecret: process.env.WX_APP_SECRET,
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },

  // 腾讯云COS
  cos: {
    secretId: process.env.COS_SECRET_ID,
    secretKey: process.env.COS_SECRET_KEY,
    bucket: process.env.COS_BUCKET,
    region: process.env.COS_REGION || 'ap-guangzhou',
  },

  // 腾讯云内容安全
  tms: {
    secretId: process.env.TENCENT_SECRET_ID,
    secretKey: process.env.TENCENT_SECRET_KEY,
  },

  // 支付模式
  paymentMode: process.env.PAYMENT_MODE || 'points',

  // 微信支付（预留）
  wechatPay: {
    mchId: process.env.WX_MCH_ID,
    mchKey: process.env.WX_MCH_KEY,
    mchSerialNo: process.env.WX_MCH_SERIAL_NO,
    mchPrivateKey: process.env.WX_MCH_PRIVATE_KEY,
    notifyUrl: process.env.WX_PAY_NOTIFY_URL,
  },

  // Resend 邮件服务
  resend: {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'verify@zhaguzhagu.com',
  },

  // 管理员 JWT（与普通用户隔离）
  admin: {
    jwtSecret: process.env.ADMIN_JWT_SECRET,
    jwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN || '24h',
  },

  // 商家 JWT（独立于用户和管理员）
  merchant: {
    jwtSecret: process.env.MERCHANT_JWT_SECRET || process.env.JWT_SECRET + '-merchant',
    jwtExpiresIn: process.env.MERCHANT_JWT_EXPIRES_IN || '24h',
  },
};
