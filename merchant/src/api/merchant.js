import request from './index'

// 商家登录
export const merchantLogin = (data) => request.post('/auth/login', data)

// 获取商家信息
export const getMerchantProfile = () => request.get('/profile')

// 修改商家信息
export const updateMerchantProfile = (data) => request.put('/profile', data)

// ========== 代金券批次 ==========

// 创建代金券批次
export const createVoucherBatch = (data) => request.post('/voucher-batches', data)

// 获取代金券批次列表
export const getVoucherBatches = (params) => request.get('/voucher-batches', { params })

// 获取代金券批次详情
export const getVoucherBatchDetail = (id) => request.get(`/voucher-batches/${id}`)

// 获取批次下代金券实例列表
export const getVoucherBatchCodes = (id, params) => request.get(`/voucher-batches/${id}/codes`, { params })

// ========== 核销管理 ==========

// 核销代金券
export const redeemVoucher = (data) => request.post('/vouchers/redeem', data)

// 核销历史
export const getRedeemHistory = (params) => request.get('/vouchers/redeem-history', { params })

// 查询兑换码详情
export const queryVoucherByCode = (code) => request.get(`/vouchers/${code}/detail`)

// ========== 帖子管理 ==========

// 获取帖子列表
export const getMerchantPosts = (params) => request.get('/posts', { params })

// 获取帖子详情
export const getMerchantPostDetail = (id) => request.get(`/posts/${id}`)

// 发布帖子
export const createMerchantPost = (data) => request.post('/posts', data)
