import request from '@/utils/request'

// 获取积分明细
export const getPoints = () => {
  return request.get('/payments/transactions')
}

// 获取信用分记录
export const getCredit = () => {
  return request.get('/credit/records')
}

// 获取商城商品
export const getShopItems = () => {
  return request.get('/shop/products')
}