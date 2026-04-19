<template>
  <div class="order-submit-page">
    <van-nav-bar title="提交任务" left-arrow @click-left="onClickLeft" />
    <div v-if="order" class="submit-content">
      <van-cell-group inset class="post-info">
        <van-cell title="帖子" :value="order.post?.title || '帮我看看'" />
        <van-cell title="悬赏积分" :value="`${order.post?.rewardAmount || 0} 积分`" />
      </van-cell-group>
      <van-form @submit="onSubmit" class="submit-form">
        <van-cell-group inset>
          <van-field
            v-model="form.description"
            name="description"
            label="任务说明"
            placeholder="请描述您查看的结果..."
            rows="4"
            autosize
            type="textarea"
            maxlength="100"
            show-word-limit
          />
        </van-cell-group>
        <van-cell-group inset class="mt-12">
          <div class="uploader-label">图片上传（最多5张，每张不超过10MB）</div>
          <van-uploader
            v-model="fileList"
            multiple
            :max-count="5"
            :after-read="afterRead"
            @delete="onDelete"
            :max-size="10 * 1024 * 1024"
            @oversize="onOversize"
          />
        </van-cell-group>
        <div class="submit-btn">
          <van-button round block type="primary" native-type="submit" :loading="submitting">
            提交任务
          </van-button>
        </div>
      </van-form>
    </div>
    <van-empty v-else description="订单不存在或已提交" />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast, showFailToast } from 'vant'
import { submitOrder, getMyOrders } from '@/api/order'

const route = useRoute()
const router = useRouter()
const postId = route.params.postId
const fromPage = route.query.from || '' // 来源页面标识

const form = ref({ description: '' })
const fileList = ref([])
const submitting = ref(false)
const uploadedImages = ref([])
const order = ref(null)

onMounted(async () => {
  await loadMyOrder()
})

// 通过 my-orders 接口查找当前帖子的订单（获取 orderId）
const loadMyOrder = async () => {
  try {
    const res = await getMyOrders()
    // res 是分页返回，data 在 res.data 中（响应拦截器已经 return res.data）
    const list = Array.isArray(res) ? res : res.data || []
    const found = list.find(o => o.postId === postId)
    if (found) {
      order.value = found
      // 如果已经提交过，禁止重复提交
      if (found.status !== 'accepted') {
        showFailToast('该订单已提交，无法重复操作')
      }
    } else {
      showToast('未找到相关订单')
    }
  } catch (error) {
    showToast('加载订单失败')
  }
}

const afterRead = async (file) => {
  // afterRead 可能返回数组（multiple=true）
  const files = Array.isArray(file) ? file : [file]
  for (const f of files) {
    f.status = 'uploading'
    f.message = '上传中...'
    try {
      const url = await uploadImage(f.file)
      uploadedImages.value.push(url)
      f.status = 'done'
    } catch (error) {
      f.status = 'failed'
      f.message = '上传失败'
    }
  }
}

const uploadImage = (file) => {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    // Bug4修复：字段名改为 image，路径改为 /api/upload/image
    formData.append('image', file)
    fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.code === 200 || data.code === 0) {
          resolve(data.data.url)
        } else {
          reject(new Error(data.message || '上传失败'))
        }
      })
      .catch(reject)
  })
}

const onDelete = (file, detail) => {
  uploadedImages.value.splice(detail.index, 1)
}

const onOversize = () => {
  showFailToast('图片大小不能超过10MB')
}

const onSubmit = async () => {
  // 至少提供文字或图片
  if (!form.value.description && uploadedImages.value.length === 0) {
    showFailToast('请至少填写任务说明或上传图片')
    return
  }

  if (!order.value) {
    showFailToast('订单不存在')
    return
  }

  // Bug3修复：使用 orderId 而非 postId
  submitting.value = true
  try {
    console.log('[ORDER-SUBMIT] 开始提交任务, orderId:', order.value.id)
    await submitOrder(order.value.id, {
      description: form.value.description || null,
      images: uploadedImages.value.length > 0 ? JSON.stringify(uploadedImages.value) : null
    })
    console.log('[ORDER-SUBMIT] 提交成功, 准备跳转...')
    submitting.value = false
    showSuccessToast('提交成功')
    // 提交成功后跳转到我的接单列表
    window.location.replace('/my/orders')
  } catch (error) {
    console.error('[ORDER-SUBMIT] 提交失败:', error)
    submitting.value = false
    showFailToast(error.message || '提交失败')
  }
}

const onClickLeft = () => {
  if (fromPage === 'my-orders') {
    router.replace('/my/orders')
  } else {
    router.back()
  }
}
</script>

<style scoped>
.order-submit-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

.post-info {
  margin-top: 12px;
}

.submit-form {
  padding: 16px 0;
}

.mt-12 {
  margin-top: 12px;
}

.uploader-label {
  padding: 10px 16px;
  font-size: 14px;
  color: #646566;
}

.submit-btn {
  padding: 24px 16px;
}
</style>
