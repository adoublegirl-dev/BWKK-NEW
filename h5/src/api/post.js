import request from '@/utils/request'

// 获取帖子列表
export const getPosts = (params) => {
  return request.get('/posts', { params })
}

// 获取帖子详情
export const getPostDetail = (id) => {
  return request.get(`/posts/${id}`)
}

// 创建帖子
export const createPost = (data) => {
  return request.post('/posts', data)
}

// 取消帖子
export const cancelPost = (id) => {
  return request.delete(`/posts/${id}`)
}

// 获取帖子未读 badge
export const getPostBadges = () => {
  return request.get('/posts/badges')
}

// 标记帖子提交列表已读
export const viewSubmissions = (postId) => {
  return request.post(`/posts/view-submissions/${postId}`)
}