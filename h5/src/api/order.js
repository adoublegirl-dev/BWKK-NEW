import request from '@/utils/request'

// 接单
export const acceptOrder = (postId) => {
  return request.post('/orders', { postId })
}

// 提交任务
export const submitOrder = (orderId, data) => {
  return request.post(`/orders/${orderId}/submit`, data)
}

// 确认完成
export const confirmOrder = (orderId, data) => {
  return request.post(`/orders/${orderId}/confirm`, data)
}

// 获取我的接单列表
export const getMyOrders = () => {
  return request.get('/orders/my-orders')
}