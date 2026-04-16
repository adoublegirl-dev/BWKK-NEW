<template>
  <div class="post-detail-page">
    <van-nav-bar
      title="帖子详情"
      left-arrow
      @click-left="onClickLeft"
    />
    
    <div v-if="post" class="post-content">
      <!-- 帖子头部 -->
      <div class="post-header">
        <h1 class="post-title">{{ post.title || '帮我看看' }}</h1>
        <van-tag :type="statusType" size="medium">{{ statusText }}</van-tag>
      </div>
      
      <!-- 用户信息 -->
      <div class="user-info">
        <van-image
          round
          width="40"
          height="40"
          :src="post.user?.avatarUrl || 'https://img.yzcdn.cn/vant/cat.jpeg'"
        />
        <div class="user-meta">
          <div class="nickname">{{ post.user?.nickname || '匿名用户' }}</div>
          <div class="post-time">{{ formatTime(post.createdAt) }}</div>
        </div>
      </div>
      
      <!-- 帖子描述 -->
      <div class="post-description">
        {{ post.description }}
      </div>
      
      <!-- 位置信息 -->
      <div v-if="post.locationName" class="post-location">
        <van-icon name="location-o" />
        <span>{{ post.locationName }}</span>
      </div>
      
      <!-- 悬赏信息 -->
      <div class="reward-info">
        <div class="reward-item">
          <span class="label">悬赏积分</span>
          <span class="value highlight">{{ post.rewardAmount }}</span>
        </div>
        <div class="reward-item">
          <span class="label">补偿比例</span>
          <span class="value">{{ post.compensateRate }}%</span>
        </div>
        <div class="reward-item">
          <span class="label">截止时间</span>
          <span class="value">{{ formatDeadline(post.deadline) }}</span>
        </div>
        <div class="reward-item">
          <span class="label">当前接单</span>
          <span class="value">{{ post.orderCount || 0 }}人</span>
        </div>
      </div>
      
      <!-- 接单列表 -->
      <div v-if="orders.length > 0" class="orders-section">
        <h3>接单列表</h3>
        <div class="order-list">
          <div
            v-for="order in orders"
            :key="order.id"
            class="order-item"
          >
            <div class="order-user">
              <van-image
                round
                width="32"
                height="32"
                :src="order.user?.avatarUrl || 'https://img.yzcdn.cn/vant/cat.jpeg'"
              />
              <span class="order-nickname">{{ order.user?.nickname }}</span>
              <van-tag v-if="order.status === 'selected'" type="success">已选中</van-tag>
            </div>
            <div v-if="order.description" class="order-desc">
              {{ order.description }}
            </div>
            <div v-if="order.images" class="order-images">
              <van-image
                v-for="(img, idx) in JSON.parse(order.images)"
                :key="idx"
                width="80"
                height="80"
                :src="img"
                fit="cover"
                @click="previewImage(img, JSON.parse(order.images))"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部操作栏 -->
    <div class="bottom-actions">
      <template v-if="isMyPost">
        <van-button
          v-if="post?.status === 'active'"
          block
          type="danger"
          @click="cancelPost"
        >
          取消帖子
        </van-button>
      </template>
      <template v-else>
        <van-button
          v-if="post?.status === 'active' && !hasOrdered"
          block
          type="primary"
          @click="acceptOrder"
        >
          立即接单
        </van-button>
        <van-button
          v-else-if="hasOrdered"
          block
          type="success"
          @click="submitTask"
        >
          提交任务
        </van-button>
      </template>
    </div>
    
    <van-empty v-if="!post && !loading" description="帖子不存在" />
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showSuccessToast, showFailToast, showConfirmDialog, showImagePreview } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getPostDetail, cancelPost as apiCancelPost } from '@/api/post'
import { acceptOrder as apiAcceptOrder } from '@/api/order'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const post = ref(null)
const orders = ref([])
const loading = ref(false)
const hasOrdered = ref(false)

const postId = route.params.id

// 状态映射
const statusMap = {
  active: { text: '进行中', type: 'primary' },
  completed: { text: '已完成', type: 'success' },
  expired: { text: '已过期', type: 'default' },
  cancelled: { text: '已取消', type: 'default' }
}

const statusText = computed(() => {
  return statusMap[post.value?.status]?.text || '未知'
})

const statusType = computed(() => {
  return statusMap[post.value?.status]?.type || 'default'
})

// 是否是自己的帖子
const isMyPost = computed(() => {
  return post.value?.userId === authStore.userInfo?.id
})

onMounted(() => {
  loadPostDetail()
})

// 加载帖子详情
const loadPostDetail = async () => {
  loading.value = true
  
  try {
    const res = await getPostDetail(postId)
    post.value = res
    orders.value = []
    
    // 检查是否已接单
    if (authStore.isLoggedIn) {
      hasOrdered.value = orders.value.some(
        order => order.userId === authStore.userInfo?.id
      )
    }
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 接单
const acceptOrder = async () => {
  if (!authStore.isLoggedIn) {
    showConfirmDialog({
      title: '提示',
      message: '请先登录后再接单',
      confirmButtonText: '去登录'
    }).then(() => {
      router.push(`/login?redirect=/post/${postId}`)
    })
    return
  }
  
  try {
    await apiAcceptOrder(postId)
    showSuccessToast('接单成功')
    loadPostDetail()
  } catch (error) {
    showFailToast(error.message || '接单失败')
  }
}

// 提交任务
const submitTask = () => {
  router.push(`/order/submit/${postId}`)
}

// 取消帖子
const cancelPost = () => {
  showConfirmDialog({
    title: '确认取消',
    message: '取消后将退还冻结的积分，确定要取消吗？'
  }).then(async () => {
    try {
      await apiCancelPost(postId)
      showSuccessToast('已取消')
      router.back()
    } catch (error) {
      showFailToast(error.message || '取消失败')
    }
  })
}

// 预览图片
const previewImage = (current, images) => {
  showImagePreview({
    images,
    startPosition: images.indexOf(current)
  })
}

// 格式化时间
const formatTime = (time) => {
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 格式化截止时间
const formatDeadline = (deadline) => {
  const date = new Date(deadline)
  const now = new Date()
  const diff = date - now
  
  if (diff < 0) {
    return '已过期'
  }
  
  const days = Math.floor(diff / 86400000)
  if (days > 0) {
    return `${days}天后`
  }
  
  const hours = Math.floor(diff / 3600000)
  return `${hours}小时后`
}

const onClickLeft = () => {
  router.back()
}
</script>

<style scoped>
.post-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
  box-sizing: border-box;
}

.post-content {
  background: white;
  padding: 16px;
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.post-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
  flex: 1;
  margin-right: 12px;
}

.user-info {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.user-meta {
  margin-left: 12px;
}

.nickname {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.post-time {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}

.post-description {
  font-size: 15px;
  color: #333;
  line-height: 1.6;
  margin-bottom: 16px;
  white-space: pre-wrap;
}

.post-location {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: #666;
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
  margin-bottom: 16px;
}

.reward-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 16px;
  background: #f8f8f8;
  border-radius: 8px;
}

.reward-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reward-item .label {
  font-size: 12px;
  color: #999;
}

.reward-item .value {
  font-size: 16px;
  color: #333;
  font-weight: 500;
}

.reward-item .value.highlight {
  color: #ff6b6b;
  font-size: 18px;
}

.orders-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.orders-section h3 {
  font-size: 16px;
  margin-bottom: 12px;
}

.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.order-item {
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.order-user {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.order-nickname {
  font-size: 14px;
  color: #333;
  flex: 1;
}

.order-desc {
  font-size: 13px;
  color: #666;
  margin-bottom: 8px;
  line-height: 1.5;
}

.order-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
}
</style>