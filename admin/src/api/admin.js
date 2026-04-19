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
export const updateUserRole = (id, data) => request.put(`/users/${id}/role`, data)

// 全量积分调整
export const adjustAllPoints = (data) => request.post('/users/adjust-points', data)
export const getPointsAdjustmentLogs = (params) => request.get('/points-adjustment-logs', { params })

// 商家管理
export const getMerchants = (params) => request.get('/merchants', { params })

// 帖子管理
export const getPosts = (params) => request.get('/posts', { params })
export const getPostDetail = (id) => request.get(`/posts/${id}`)
export const updatePostStatus = (id, data) => request.put(`/posts/${id}/status`, data)
export const deletePost = (id) => request.delete(`/posts/${id}`)

// 订单管理
export const getOrders = (params) => request.get('/orders', { params })
export const getOrderDetail = (id) => request.get(`/orders/${id}`)
export const adminConfirmOrder = (id) => request.post(`/orders/${id}/confirm`)
export const adminRejectOrder = (id) => request.post(`/orders/${id}/reject`)
export const updateOrderStatus = (id, data) => request.put(`/orders/${id}/status`, data)

// 交易记录
export const getTransactions = (params) => request.get('/transactions', { params })

// 信用记录
export const getCreditRecords = (params) => request.get('/credit-records', { params })

// 操作日志
export const getLogs = (params) => request.get('/logs', { params })

// ========== 积分商城管理 ==========

// 商品分类
export const getCategories = (params) => request.get('/categories', { params })
export const createCategory = (data) => request.post('/categories', data)
export const getCategoryDetail = (id) => request.get(`/categories/${id}`)
export const updateCategory = (id, data) => request.put(`/categories/${id}`, data)
export const deleteCategory = (id) => request.delete(`/categories/${id}`)

// 商品管理
export const getProducts = (params) => request.get('/products', { params })
export const createProduct = (data) => request.post('/products', data)
export const getProductDetail = (id) => request.get(`/products/${id}`)
export const updateProduct = (id, data) => request.put(`/products/${id}`, data)
export const updateProductStatus = (id, data) => request.put(`/products/${id}/status`, data)
export const deleteProduct = (id) => request.delete(`/products/${id}`)

// 代金券管理
export const getVoucherBatches = (params) => request.get('/voucher-batches', { params })
export const getVoucherCodes = (params) => request.get('/voucher-codes', { params })
