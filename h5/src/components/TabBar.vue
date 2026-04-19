<template>
  <van-tabbar v-model="active">
    <van-tabbar-item icon="home-o" name="home" @click="onHomeClick">首页</van-tabbar-item>
    <van-tabbar-item icon="plus" name="publish" @click="onPublishClick">发布</van-tabbar-item>
    <van-tabbar-item name="profile" :dot="orderRedDot" @click="onProfileClick">
      我的
    </van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { showConfirmDialog } from 'vant'

const props = defineProps({
  orderRedDot: {
    type: Boolean,
    default: false
  }
})

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const active = ref(0)

// 根据路由设置激活状态
watch(() => route.path, (path) => {
  if (path === '/') {
    active.value = 0
  } else if (path === '/profile') {
    active.value = 2
  } else {
    active.value = -1
  }
}, { immediate: true })

// 首页点击（始终触发，包括重复点击已激活的tab）
const onHomeClick = () => {
  if (route.path === '/') {
    // 已在首页，重置排序并刷新
    window.dispatchEvent(new CustomEvent('home-refresh'))
  } else {
    // 从其他页面回到首页，带上刷新标记
    router.replace('/?refresh=1&t=' + Date.now())
  }
}

// 发布点击
const onPublishClick = () => {
  if (!authStore.isLoggedIn) {
    showConfirmDialog({
      title: '提示',
      message: '请先登录后再发布需求',
      confirmButtonText: '去登录',
      cancelButtonText: '取消'
    }).then(() => {
      router.push('/login')
    }).catch(() => {})
    active.value = -1
    return
  }
  router.push('/post/create')
}

// 我的点击
const onProfileClick = () => {
  router.replace('/profile')
}
</script>

<style scoped>
:deep(.van-tabbar-item:nth-child(2)) {
  color: #07c160;
}

:deep(.van-tabbar-item:nth-child(2) .van-icon) {
  font-size: 28px;
  background: linear-gradient(135deg, #07c160, #10b981);
  color: white;
  border-radius: 50%;
  padding: 8px;
  box-shadow: 0 2px 8px rgba(7, 193, 96, 0.3);
}
</style>
