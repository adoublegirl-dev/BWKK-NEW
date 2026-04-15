<template>
  <van-tabbar v-model="active" route>
    <van-tabbar-item to="/" icon="home-o">首页</van-tabbar-item>
    <van-tabbar-item icon="plus" @click="onPublishClick">发布</van-tabbar-item>
    <van-tabbar-item to="/profile" icon="user-o">我的</van-tabbar-item>
  </van-tabbar>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { Dialog } from 'vant'

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

// 发布按钮点击
const onPublishClick = () => {
  if (!authStore.isLoggedIn) {
    Dialog.confirm({
      title: '提示',
      message: '请先登录后再发布需求',
      confirmButtonText: '去登录',
      cancelButtonText: '取消'
    }).then(() => {
      router.push('/login')
    }).catch(() => {})
    return
  }
  router.push('/post/create')
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