import axios from 'axios'
import { showToast, showFailToast } from 'vant'
import { useAuthStore } from '@/stores/auth'

// 创建axios实例
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 添加token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data
    
    // 版本标识：如果浏览器显示 "v2" 说明加载了修复后的版本
    console.log('[REQUEST] v2 - response code:', res.code, 'message:', res.message, 'url:', response.config.url)
    
    // 业务成功（接受 0 和所有 2xx 状态码）
    if (res.code === 0 || (res.code >= 200 && res.code < 300)) {
      return res.data
    }
    
    // 业务错误
    showFailToast(res.message || '请求失败')
    return Promise.reject(new Error(res.message || '请求失败'))
  },
  (error) => {
    // HTTP错误
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.message || '请求失败'
      
      switch (status) {
        case 401:
          // Token失效，清除登录状态并跳转登录页
          const authStore = useAuthStore()
          authStore.clearAuth()
          showFailToast('登录已过期，请重新登录')
          window.location.href = '/login'
          break
        case 429:
          // 请求过于频繁，不弹Toast，由调用方自行处理（如验证码倒计时）
          break
        case 403:
          showFailToast('没有权限')
          break
        case 404:
          showFailToast('请求的资源不存在')
          break
        case 500:
          showFailToast('服务器错误')
          break
        default:
          showFailToast(message)
      }
      
      // 将服务端返回的message附加到error上，方便调用方读取
      error.message = message
    } else if (error.request) {
      showFailToast('网络错误，请检查网络连接')
    } else {
      showFailToast(error.message)
    }
    
    return Promise.reject(error)
  }
)

export default request
