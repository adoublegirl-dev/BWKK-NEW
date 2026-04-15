<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="cachedViews">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <TabBar v-if="showTabBar" />
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import { useAuthStore } from './stores/auth'

const route = useRoute()
const authStore = useAuthStore()

// 需要缓存的页面
const cachedViews = ['Home']

// 是否显示底部导航栏
const showTabBar = computed(() => {
  const noTabBarRoutes = ['/login', '/post/create', '/order/submit', '/post/']
  return !noTabBarRoutes.some(path => route.path.startsWith(path))
})

// 初始化认证状态
onMounted(() => {
  authStore.init()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  background-color: #f5f5f5;
  -webkit-font-smoothing: antialiased;
}

#app {
  min-height: 100vh;
  padding-bottom: 50px;
}

/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>