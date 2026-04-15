import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loginEmail, loginWechat, getUserInfo as apiGetUserInfo } from '@/api/auth'

export const useAuthStore = defineStore('auth', () => {
  // State
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const loginType = ref(localStorage.getItem('loginType') || '') // 'email' | 'wechat'
  const isWechatEnv = ref(false)

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const availablePoints = computed(() => {
    if (!userInfo.value) return 0
    return (userInfo.value.totalPoints || 0) - (userInfo.value.frozenPoints || 0)
  })

  // 检测运行环境
  const detectEnvironment = () => {
    const ua = navigator.userAgent.toLowerCase()
    isWechatEnv.value = ua.includes('micromessenger')
    return isWechatEnv.value
  }

  // 设置认证信息
  const setAuth = (data) => {
    token.value = data.token
    userInfo.value = data.userInfo
    localStorage.setItem('token', data.token)
    localStorage.setItem('loginType', data.loginType || 'phone')
  }

  // 清除认证信息
  const clearAuth = () => {
    token.value = ''
    userInfo.value = null
    loginType.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('loginType')
  }

  // 邮箱验证码登录
  const loginByEmail = async (email, code, nickname, password) => {
    const res = await loginEmail({ email, code, nickname, password })
    setAuth({
      token: res.token,
      userInfo: res.userInfo,
      loginType: 'email'
    })
    return res
  }

  // 微信登录（预留口子）
  const loginByWechat = async (wxCode) => {
    const res = await loginWechat({ code: wxCode })
    setAuth({
      token: res.token,
      userInfo: res.userInfo,
      loginType: 'wechat'
    })
    return res
  }

  // 获取微信授权码（微信环境）
  const getWechatCode = () => {
    return new Promise((resolve, reject) => {
      if (!isWechatEnv.value) {
        reject(new Error('非微信环境'))
        return
      }
      // 微信授权逻辑（预留）
      // 实际接入时需要使用微信JS-SDK
      reject(new Error('微信登录功能待接入'))
    })
  }

  // 智能登录（根据环境自动选择）
  const smartLogin = async () => {
    detectEnvironment()
    if (isWechatEnv.value) {
      try {
        const wxCode = await getWechatCode()
        return await loginByWechat(wxCode)
      } catch (error) {
        // 微信登录失败，降级到邮箱登录
        console.log('微信登录失败，请使用邮箱登录')
        throw error
      }
    } else {
      throw new Error('请使用邮箱登录')
    }
  }

  // 获取用户信息
  const fetchUserInfo = async () => {
    if (!token.value) return
    try {
      const res = await apiGetUserInfo()
      userInfo.value = res
      return res
    } catch (error) {
      // Token失效，清除登录状态
      if (error.code === 401) {
        clearAuth()
      }
      throw error
    }
  }

  // 更新本地用户信息（兼容 userInfo 为 null 的情况）
  const updateUserInfo = (data) => {
    if (userInfo.value) {
      userInfo.value = { ...userInfo.value, ...data }
    } else {
      userInfo.value = { ...data }
    }
  }

  // 初始化
  const init = () => {
    detectEnvironment()
    if (token.value) {
      fetchUserInfo()
    }
  }

  return {
    token,
    userInfo,
    loginType,
    isWechatEnv,
    isLoggedIn,
    availablePoints,
    detectEnvironment,
    setAuth,
    clearAuth,
    loginByEmail,
    loginByWechat,
    getWechatCode,
    smartLogin,
    fetchUserInfo,
    updateUserInfo,
    init
  }
})
