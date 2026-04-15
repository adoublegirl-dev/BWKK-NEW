import request from '@/utils/request'

// 获取我的帖子
export const getMyPosts = () => {
  return request.get('/posts/my-posts')
}

// 获取个人资料
export const getProfile = () => {
  return request.get('/users/profile')
}

// 更新个人资料
export const updateProfile = (data) => {
  return request.put('/users/profile', data)
}

// 上传头像
export const uploadAvatar = (file) => {
  const formData = new FormData()
  formData.append('image', file)
  return request.post('/upload/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
