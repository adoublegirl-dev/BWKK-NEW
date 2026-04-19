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
          @error="onAvatarError($event, 'post')"
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
      
      <!-- 接单列表（非发单人视角，只显示接单人头像和昵称，隐藏提交内容） -->
      <div v-if="!isMyPost && orders.length > 0" class="orders-section">
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
                @error="onAvatarError($event, 'order')"
              />
              <span class="order-nickname">{{ order.user?.nickname }}</span>
              <van-tag v-if="order.status === 'selected'" type="success">已选中</van-tag>
              <van-tag v-else-if="order.status === 'submitted'" type="primary">已提交</van-tag>
              <van-tag v-else type="default">已接单</van-tag>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 发单人视角：提交列表 + 确认选中 -->
      <div v-if="isMyPost && (post.status === 'active' || post.status === 'completed')" class="submissions-section">
        <h3>提交列表 ({{ submissions.length }})</h3>
        <div v-if="submissions.length === 0 && orders.length > 0" class="no-submissions">
          <van-empty description="暂无提交，请等待接单人完成任务" image="search" />
        </div>
        <div v-else-if="submissions.length === 0" class="no-submissions">
          <van-empty description="暂无人接单" image="search" />
        </div>
        <div v-else class="submission-list">
          <div
            v-for="item in submissions"
            :key="item.id"
            class="submission-item"
          >
            <div class="submission-header">
              <div class="submission-user">
                <van-image
                  round
                  width="32"
                  height="32"
                  :src="item.user?.avatarUrl || 'https://img.yzcdn.cn/vant/cat.jpeg'"
                  @error="onAvatarError($event, 'submission')"
                />
                <span class="submission-nickname">{{ item.user?.nickname }}</span>
                <van-tag v-if="item.user?.doerCredit" plain size="medium">
                  信用 {{ item.user.doerCredit }}
                </van-tag>
                <van-tag v-if="item.status === 'selected'" type="success" size="medium">已选中</van-tag>
              </div>
              <van-button
                v-if="item.status !== 'selected'"
                size="small"
                type="primary"
                @click="confirmSelect(item.id)"
                :loading="confirmingId === item.id"
              >
                确认选中
              </van-button>
              <van-button
                v-else
                size="small"
                type="success"
                disabled
              >
                已选中
              </van-button>
            </div>
            <div v-if="item.description" class="submission-desc">
              {{ item.description }}
            </div>
            <div v-if="item.images" class="submission-images">
              <van-image
                v-for="(img, idx) in parseImages(item.images)"
                :key="idx"
                width="80"
                height="80"
                :src="img"
                fit="cover"
                @click="previewImage(img, parseImages(item.images))"
              />
            </div>
            <div class="submission-time">
              {{ formatTime(item.submittedAt) }} 提交
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 底部操作栏 -->
    <div class="bottom-actions">
      <!-- 发单人视角 -->
      <template v-if="isMyPost">
        <van-button
          v-if="post?.status === 'active'"
          block
          type="danger"
          plain
          @click="cancelPost"
        >
          取消帖子
        </van-button>
        <van-button
          v-else-if="post?.status === 'completed'"
          block
          type="success"
          disabled
        >
          任务已完成
        </van-button>
      </template>
      <!-- 接单人视角 -->
      <template v-else>
        <!-- 未接单 -->
        <van-button
          v-if="post?.status === 'active' && !hasOrdered"
          block
          type="primary"
          @click="acceptOrder"
        >
          立即接单
        </van-button>
        <!-- 已接单，未提交 → 去提交 -->
        <van-button
          v-else-if="myOrder && myOrder.status === 'accepted'"
          block
          type="primary"
          @click="submitTask"
        >
          去提交任务
        </van-button>
        <!-- 已提交，等待确认 -->
        <van-button
          v-else-if="myOrder && myOrder.status === 'submitted'"
          block
          type="warning"
          disabled
        >
          等待发单人确认
        </van-button>
        <!-- 已选中 -->
        <van-button
          v-else-if="myOrder && myOrder.status === 'selected'"
          block
          type="success"
          disabled
        >
          已被选中，积分已到账
        </van-button>
        <!-- 已被拒绝 -->
        <van-button
          v-else-if="myOrder && myOrder.status === 'rejected'"
          block
          type="default"
          disabled
        >
          未被选中
        </van-button>
        <!-- 帖子已结束 -->
        <van-button
          v-else-if="post?.status !== 'active'"
          block
          type="default"
          disabled
        >
          帖子已结束
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
import { getPostDetail, cancelPost as apiCancelPost, viewSubmissions } from '@/api/post'
import { acceptOrder as apiAcceptOrder, confirmOrder, getSubmissions } from '@/api/order'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const post = ref(null)
const orders = ref([])
const submissions = ref([])
const loading = ref(false)
const confirmingId = ref(null)

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

// 是否已接单
const hasOrdered = computed(() => {
  return !!myOrder.value
})

// 当前用户在该帖子的订单
const myOrder = computed(() => {
  if (!authStore.isLoggedIn || !orders.value.length) return null
  return orders.value.find(o => o.userId === authStore.userInfo?.id) || null
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
    // Bug1修复：从API返回的post.orders赋值，不再硬编码空数组
    orders.value = res.orders || []
    
    // 如果是发单人，加载提交列表
    if (isMyPost.value && (post.value.status === 'active' || post.value.status === 'completed')) {
      await loadSubmissions()
    }
  } catch (error) {
    showToast('加载失败')
  } finally {
    loading.value = false
  }
}

// 加载提交列表（发单人视角）
const loadSubmissions = async () => {
  try {
    const res = await getSubmissions(postId)
    submissions.value = res || []
    // 标记提交列表已读（静默，不阻塞）
    viewSubmissions(postId).catch(() => {})
  } catch (error) {
    // 非发单人会403，忽略
    submissions.value = []
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
    console.log('[POST-DETAIL] 开始接单, postId:', postId)
    const result = await apiAcceptOrder(postId)
    console.log('[POST-DETAIL] 接单API返回成功:', result)
    showSuccessToast('接单成功')
    console.log('[POST-DETAIL] 准备跳转到我的接单...')
    // 直接跳转，不使用 setTimeout，不使用 Vue Router
    window.location.replace('/my/orders')
  } catch (error) {
    console.error('[POST-DETAIL] 接单失败:', error)
    showFailToast(error.message || '接单失败')
  }
}

// 提交任务（跳转到提交页，携带来源参数）
const submitTask = () => {
  if (!myOrder.value) return
  router.push({
    path: `/order/submit/${postId}`,
    query: route.query.from ? { from: route.query.from } : {}
  })
}

// 确认选中（发单人操作）
const confirmSelect = async (orderId) => {
  try {
    await showConfirmDialog({
      title: '确认选中',
      message: '选中后将自动结算积分给该接单人，其他已提交的接单将被驳回并按比例发放补偿积分。确认选中吗？'
    })
    
    confirmingId.value = orderId
    await confirmOrder(orderId)
    showSuccessToast('确认成功，积分已结算')
    // 刷新页面
    loadPostDetail()
  } catch (error) {
    if (error !== 'cancel' && error?.message !== 'cancel') {
      showFailToast(error.message || '操作失败')
    }
  } finally {
    confirmingId.value = null
  }
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

// 解析图片JSON字符串
const parseImages = (images) => {
  if (!images) return []
  try {
    return JSON.parse(images)
  } catch {
    return []
  }
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
  if (!time) return ''
  const date = new Date(time)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

// 格式化截止时间
const formatDeadline = (deadline) => {
  if (!deadline) return ''
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
  if (hours > 0) {
    return `${hours}小时后`
  }
  
  const minutes = Math.floor(diff / 60000)
  return `${minutes}分钟后`
}

// 头像加载失败时替换为默认头像
const defaultAvatar = 'https://img.yzcdn.cn/vant/cat.jpeg'
const onAvatarError = (e, type) => {
  const imgEl = e.target
  if (imgEl.tagName === 'IMG') {
    imgEl.src = defaultAvatar
  }
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

/* 接单列表（非发单人） */
.orders-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.orders-section h3,
.submissions-section h3 {
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

.order-user,
.submission-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.order-nickname,
.submission-nickname {
  font-size: 14px;
  color: #333;
  flex: 1;
}

/* 提交列表（发单人） */
.submissions-section {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.no-submissions {
  padding: 16px 0;
}

.submission-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.submission-item {
  padding: 12px;
  background: #f8f8f8;
  border-radius: 8px;
}

.submission-header {
  margin-bottom: 8px;
}

.submission-user {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.submission-desc {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin-bottom: 8px;
}

.submission-images {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.submission-time {
  font-size: 12px;
  color: #999;
}

/* 底部操作栏 */
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
