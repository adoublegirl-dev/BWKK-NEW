import axios from 'axios'
import { ElMessage } from 'element-plus'
import router from '../router'

const request = axios.create({
  baseURL: '/api/merchant/admin',
  timeout: 15000,
})

// 请求拦截器 - 注入 token
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('merchant_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器 - 统一错误处理
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 接受所有 2xx 状态码
    if (res.code !== 200 && !(res.code >= 200 && res.code < 300)) {
      ElMessage.error(res.message || '请求失败')
      if (res.code === 401) {
        localStorage.removeItem('merchant_token')
        router.push('/login')
      }
      return Promise.reject(new Error(res.message))
    }
    return res
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('merchant_token')
      router.push('/login')
      ElMessage.error('认证已过期，请重新登录')
    } else {
      ElMessage.error(error.response?.data?.message || '网络请求失败')
    }
    return Promise.reject(error)
  }
)

export default request
