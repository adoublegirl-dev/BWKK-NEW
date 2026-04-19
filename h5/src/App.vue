<template>
  <router-view v-slot="{ Component }">
    <keep-alive :include="cachedViews">
      <component :is="Component" />
    </keep-alive>
  </router-view>
  <TabBar :order-red-dot="orderRedDot" v-if="showTabBar" />

  <!-- 首次登录用户引导弹窗 -->
  <van-dialog
    v-model:show="showGuide"
    title="欢迎来到帮我看看"
    confirm-button-text="我知道了"
    :confirm-button-disabled="guideCountdown > 0"
    @confirm="onGuideClose"
  >
    <div class="guide-content">
      <p>这是一个互助接单平台，当你想去某个地方，但是不知道现在这里人多不多或者店开没开门，可以通过这里发布帖子，热心的网友会帮你看一看。</p>
    </div>
    <template #footer>
      <van-button
        block
        type="primary"
        :disabled="guideCountdown > 0"
        @click="onGuideClose"
      >
        我知道了{{ guideCountdown > 0 ? ` (${guideCountdown}s)` : '' }}
      </van-button>
    </template>
  </van-dialog>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import { useAuthStore } from './stores/auth'
import { getOrderBadges } from './api/order'
import { getPostBadges } from './api/post'

const route = useRoute()
const authStore = useAuthStore()

// 需要缓存的页面
const cachedViews = ['Home']

// 是否显示底部导航栏
const showTabBar = computed(() => {
  const noTabBarRoutes = ['/login', '/post/create', '/order/submit', '/post/']
  return !noTabBarRoutes.some(path => route.path.startsWith(path))
})

// 订单红点（TabBar "我的"入口提示）
const orderRedDot = ref(false)

const refreshOrderBadge = async () => {
  if (!authStore.isLoggedIn) {
    orderRedDot.value = false
    return
  }
  try {
    const [postRes, orderRes] = await Promise.all([
      getPostBadges(),
      getOrderBadges()
    ])
    // 发单人侧：有未读提交/接单时显示红点
    const hasPostBadge = (postRes?.unreadSubmissions || 0) > 0
    // 接单人侧：有进行中/新完成订单时显示红点
    const hasOrderBadge = !!orderRes?.hasRedDot
    orderRedDot.value = hasPostBadge || hasOrderBadge
  } catch {
    orderRedDot.value = false
  }
}

// 首次登录用户引导弹窗
const showGuide = ref(false)
const guideCountdown = ref(5)
let guideTimer = null

const checkGuide = () => {
  if (!authStore.isLoggedIn || !authStore.userInfo) return
  const guideKey = `guide_shown_${authStore.userInfo.id}`
  if (!localStorage.getItem(guideKey)) {
    showGuide.value = true
    guideCountdown.value = 5
    guideTimer = setInterval(() => {
      guideCountdown.value--
      if (guideCountdown.value <= 0) {
        clearInterval(guideTimer)
        guideTimer = null
      }
    }, 1000)
  }
}

const onGuideClose = () => {
  if (authStore.userInfo) {
    const guideKey = `guide_shown_${authStore.userInfo.id}`
    localStorage.setItem(guideKey, '1')
  }
  showGuide.value = false
  if (guideTimer) {
    clearInterval(guideTimer)
    guideTimer = null
  }
}

// 监听登录状态变化，登录成功后检查是否需要显示引导 + 刷新红点
watch(() => authStore.isLoggedIn, (newVal) => {
  if (newVal && authStore.userInfo) {
    setTimeout(() => checkGuide(), 500)
    refreshOrderBadge()
  } else {
    orderRedDot.value = false
  }
})

// 路由变化时刷新红点（在有TabBar的页面才刷新）
watch(() => route.path, () => {
  if (showTabBar.value) {
    refreshOrderBadge()
  }
})

// 初始化认证状态
onMounted(() => {
  authStore.init()
  // 已登录用户也需要检查引导（刷新页面场景）
  if (authStore.isLoggedIn) {
    setTimeout(() => checkGuide(), 800)
    refreshOrderBadge()
  }
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

/* 用户引导弹窗 */
.guide-content {
  padding: 16px 20px 8px;
  font-size: 14px;
  line-height: 1.8;
  color: #666;
}
</style>