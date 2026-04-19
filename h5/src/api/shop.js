import request from '@/utils/request'

// ========== 积分商城 ==========

// 获取商品列表
export const getShopProducts = (params) => {
  return request.get('/shop/products', { params })
}

// 获取商品详情
export const getShopProductDetail = (id) => {
  return request.get(`/shop/products/${id}`)
}

// 兑换商品
export const exchangeProduct = (id) => {
  return request.post(`/shop/products/${id}/exchange`)
}

// 获取兑换记录
export const getExchangeRecords = (params) => {
  return request.get('/shop/exchange-records', { params })
}

// 获取我的代金券列表
export const getMyVouchers = (params) => {
  return request.get('/shop/vouchers', { params })
}

// ========== 商家H5轻量入口 ==========

// 获取商家信息
export const getMerchantProfile = () => {
  return request.get('/merchant/profile')
}

// 获取商家代金券批次
export const getMerchantBatches = (params) => {
  return request.get('/merchant/voucher-batches', { params })
}

// 核销代金券
export const redeemVoucher = (data) => {
  return request.post('/merchant/vouchers/redeem', data)
}

// 核销历史
export const getRedeemHistory = (params) => {
  return request.get('/merchant/vouchers/redeem-history', { params })
}

// ========== 分类 ==========

// 获取分类列表
export const getCategories = (params) => {
  return request.get('/shop/categories', { params })
}
