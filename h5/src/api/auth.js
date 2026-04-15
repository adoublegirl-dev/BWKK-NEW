import request from '@/utils/request'

// 发送邮箱验证码
export const sendEmailCode = (data) => {
  return request.post('/auth/send-email-code', data)
}

// 验证邮箱验证码（仅验证，不登录）
export const verifyEmailCode = (data) => {
  return request.post('/auth/verify-email-code', data)
}

// 邮箱验证码登录/注册
export const loginEmail = (data) => {
  return request.post('/auth/login-email', data)
}

// 邮箱+密码登录
export const loginPassword = (data) => {
  return request.post('/auth/login-password', data)
}

// 微信登录（预留口子）
export const loginWechat = (data) => {
  return request.post('/auth/login', data)
}

// 绑定微信
export const bindWechat = (data) => {
  return request.post('/auth/bind-wechat', data)
}

// 获取用户信息
export const getUserInfo = () => {
  return request.get('/users/profile')
}