<template>
  <div class="post-card" @click="onClick">
    <div class="post-header">
      <div class="post-title">
        <van-tag v-if="post.postType === 'merchant'" type="warning" size="medium" style="margin-right:6px;">商家</van-tag>
        {{ post.title || '帮我看看' }}
      </div>
      <van-tag :type="statusType" size="medium">{{ statusText }}</van-tag>
    </div>
    
    <div class="post-content">{{ post.description }}</div>
    
    <div class="post-footer">
      <div class="post-info">
        <span class="reward">
          <van-icon name="gold-coin-o" />
          {{ post.rewardAmount }}积分
        </span>
        <span v-if="distance" class="distance">
          <van-icon name="location-o" />
          {{ distance }}
        </span>
        <span class="time">{{ formatTime(post.createdAt) }}</span>
      </div>
      <div class="order-count">{{ post.orderCount || 0 }}人接单</div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  post: {
    type: Object,
    required: true
  },
  userLocation: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['click'])

// 状态映射
const statusMap = {
  active: { text: '进行中', type: 'primary' },
  completed: { text: '已完成', type: 'success' },
  expired: { text: '已过期', type: 'default' },
  cancelled: { text: '已取消', type: 'default' }
}

const statusText = computed(() => {
  return statusMap[props.post.status]?.text || '未知'
})

const statusType = computed(() => {
  return statusMap[props.post.status]?.type || 'default'
})

// 计算距离
const distance = computed(() => {
  if (!props.userLocation || !props.post.latitude || !props.post.longitude) {
    return null
  }
  const dist = calculateDistance(
    props.userLocation.latitude,
    props.userLocation.longitude,
    props.post.latitude,
    props.post.longitude
  )
  return formatDistance(dist)
})

// 计算两点距离（米）
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000 // 地球半径（米）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// 格式化距离
const formatDistance = (meters) => {
  if (meters < 1000) {
    return Math.round(meters) + 'm'
  }
  return (meters / 1000).toFixed(1) + 'km'
}

// 格式化时间
const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }
  // 小于24小时
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  // 显示日期
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

const onClick = () => {
  emit('click', props.post)
}
</script>

<style scoped>
.post-card {
  background: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.post-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.post-content {
  font-size: 14px;
  color: #666;
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.post-info {
  display: flex;
  gap: 12px;
  color: #999;
}

.post-info span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.reward {
  color: #ff6b6b;
  font-weight: 500;
}

.order-count {
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}
</style>