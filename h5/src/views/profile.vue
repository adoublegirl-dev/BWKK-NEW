<template>
  <div class="profile-page">
    <div class="profile-header">
      <van-image round width="80" height="80" :src="avatarDisplay" fit="cover" @error="onAvatarError" />
      <div class="user-name">{{ userInfo?.nickname || '未设置昵称' }}</div>
      <div class="user-id">ID: {{ userInfo?.id?.slice(-8) }}</div>
    </div>
    
    <van-cell-group inset class="stats-group">
      <van-grid :column-num="3" :border="false">
        <van-grid-item>
          <div class="stat-value">{{ availablePoints }}</div>
          <div class="stat-label">可用积分</div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-value">{{ userInfo?.posterCredit }}</div>
          <div class="stat-label">发单信用</div>
        </van-grid-item>
        <van-grid-item>
          <div class="stat-value">{{ userInfo?.doerCredit }}</div>
          <div class="stat-label">接单信用</div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>
    
    <van-cell-group inset class="menu-group">
      <van-cell title="编辑资料" icon="edit" is-link to="/profile/edit" />
      <van-cell title="我的帖子" icon="orders-o" is-link to="/my/posts">
        <template #right-icon>
          <van-badge v-if="unreadSubmissions > 0" :content="unreadSubmissions" />
          <van-icon v-else name="arrow" />
        </template>
      </van-cell>
      <van-cell title="我的接单" icon="records" is-link to="/my/orders">
        <template #right-icon>
          <van-badge v-if="hasOrderRedDot" is-dot />
          <van-icon v-else name="arrow" />
        </template>
      </van-cell>
      <van-cell title="积分明细" icon="gold-coin-o" is-link to="/points" />
      <van-cell title="信用分" icon="certificate" is-link to="/credit" />
      <van-cell title="积分商城" icon="shop-o" is-link to="/shop" />
      <van-cell title="已兑换" icon="exchange" is-link to="/my/exchanges" />
    </van-cell-group>
    
    <van-cell-group v-if="isMerchant" inset class="menu-group">
      <van-cell title="商家中心" icon="manager-o" is-link to="/merchant/home" />
      <van-cell title="核销代金券" icon="scan" is-link to="/merchant/redeem" />
    </van-cell-group>
    
    <van-cell-group inset class="menu-group">
      <van-cell title="绑定微信" icon="wechat" is-link @click="bindWechat">
        <template #right-icon>
          <span v-if="userInfo?.openid" class="bind-status">已绑定</span>
          <van-icon v-else name="arrow" />
        </template>
      </van-cell>
    </van-cell-group>
    
    <div class="logout-btn">
      <van-button round block type="danger" plain @click="logout">退出登录</van-button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { useAuthStore } from '@/stores/auth'
import { getProfile } from '@/api/user'
import { getPostBadges } from '@/api/post'
import { getOrderBadges } from '@/api/order'

const router = useRouter()
const authStore = useAuthStore()
const userInfo = computed(() => authStore.userInfo)
const availablePoints = computed(() => authStore.availablePoints)
const isMerchant = computed(() => authStore.userInfo?.role === 'merchant')

// 红点/未读数据
const unreadSubmissions = ref(0)
const hasOrderRedDot = ref(false)

// 头像显示：有URL显示URL，否则显示默认猫图
const avatarDisplay = ref('https://img.yzcdn.cn/vant/cat.jpeg')

// 监听用户信息变化更新头像
watch(() => authStore.userInfo, (val) => {
  avatarDisplay.value = val?.avatarUrl || 'https://img.yzcdn.cn/vant/cat.jpeg'
}, { immediate: true })

// 头像加载失败替换为默认
const onAvatarError = () => {
  avatarDisplay.value = 'https://img.yzcdn.cn/vant/cat.jpeg'
}

// 刷新 badge 数据
const loadBadges = async () => {
  try {
    const [postRes, orderRes] = await Promise.all([
      getPostBadges(),
      getOrderBadges(),
    ])
    unreadSubmissions.value = postRes?.unreadSubmissions || 0
    hasOrderRedDot.value = !!orderRes?.hasRedDot
  } catch {
    // 静默失败
  }
}

// 刷新用户资料
const refreshProfile = async () => {
  try {
    const res = await getProfile()
    authStore.updateUserInfo(res)
  } catch (error) {
    // 静默失败，使用缓存数据
  }
}

// 挂载时刷新
onMounted(() => {
  refreshProfile()
  loadBadges()
})

// keep-alive 激活时也刷新（从编辑页返回等场景）
onActivated(() => {
  refreshProfile()
  loadBadges()
})

const bindWechat = () => {
  if (userInfo.value?.openid) {
    showToast('已绑定微信')
    return
  }
  showToast('微信绑定功能即将上线')
}

const logout = () => {
  showConfirmDialog({
    title: '确认退出',
    message: '确定要退出登录吗？',
    confirmButtonText: '确定退出',
    cancelButtonText: '取消',
  }).then(() => {
    authStore.clearAuth()
    router.replace('/login')
  }).catch(() => {
    // 取消退出
  })
}
</script>

<style scoped>
.profile-page { min-height: 100vh; background: #f5f5f5; padding-bottom: 24px; }
.profile-header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 24px; text-align: center; color: white; }
.user-name { font-size: 20px; font-weight: 600; margin-top: 12px; }
.user-id { font-size: 12px; opacity: 0.8; margin-top: 4px; }
.stats-group { margin: -30px 16px 12px; border-radius: 12px; overflow: hidden; }
.stat-value { font-size: 20px; font-weight: 600; color: #333; }
.stat-label { font-size: 12px; color: #999; margin-top: 4px; }
.menu-group { margin: 12px 16px; border-radius: 12px; overflow: hidden; }
.bind-status { font-size: 12px; color: #07c160; }
.logout-btn { padding: 24px 16px; }
</style>
