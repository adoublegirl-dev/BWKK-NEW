import request from './index'

// 认证
export const login = (data) => request.post('/login', data)

// Dashboard
export const getDashboard = () => request.get('/dashboard')

// 用户管理
export const getUsers = (params) => request.get('/users', { params })
export const getUserDetail = (id) => request.get(`/users/${id}`)
export const updateUser = (id, data) => request.put(`/users/${id}`, data)
export const resetUserPassword = (id, data) => request.post(`/users/${id}/reset-password`, data)
export const adjustUserPoints = (id, data) => request.put(`/users/${id}/points`, data)
export const adjustUserCredit = (id, data) => request.put(`/users/${id}/credit`, data)

// 帖子管理
export const getPosts = (params) => request.get('/posts', { params })
export const getPostDetail = (id) => request.get(`/posts/${id}`)
export const updatePostStatus = (id, data) => request.put(`/posts/${id}/status`, data)
export const deletePost = (id) => request.delete(`/posts/${id}`)

// 订单管理
export const getOrders = (params) => request.get('/orders', { params })
export const getOrderDetail = (id) => request.get(`/orders/${id}`)

// 交易记录
export const getTransactions = (params) => request.get('/transactions', { params })

// 信用记录
export const getCreditRecords = (params) => request.get('/credit-records', { params })

// 操作日志
export const getLogs = (params) => request.get('/logs', { params })
