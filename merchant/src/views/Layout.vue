<template>
  <el-container class="layout-container">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="layout-aside">
      <div class="logo" @click="router.push('/dashboard')">
        <el-icon :size="28"><Shop /></el-icon>
        <span v-show="!isCollapse" class="logo-text">商家后台</span>
      </div>
      <el-menu
        :default-active="currentRoute"
        :collapse="isCollapse"
        router
        background-color="#001529"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#1890ff"
      >
        <el-menu-item index="/dashboard">
          <el-icon><DataLine /></el-icon>
          <template #title>数据概览</template>
        </el-menu-item>
        <el-menu-item index="/vouchers">
          <el-icon><Ticket /></el-icon>
          <template #title>代金券管理</template>
        </el-menu-item>
        <el-menu-item index="/redeem">
          <el-icon><Stamp /></el-icon>
          <template #title>核销管理</template>
        </el-menu-item>
        <el-menu-item index="/posts">
          <el-icon><Document /></el-icon>
          <template #title>帖子管理</template>
        </el-menu-item>
        <el-menu-item index="/profile">
          <el-icon><User /></el-icon>
          <template #title>商家信息</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- 主内容区 -->
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <Expand v-if="isCollapse" /><Fold v-else />
          </el-icon>
          <span class="page-title">{{ currentTitle }}</span>
        </div>
        <div class="header-right">
          <span class="merchant-name">{{ merchantStore.merchantName || '商家' }}</span>
          <el-dropdown @command="onCommand">
            <el-avatar :size="32" icon="UserFilled" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">商家信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMerchantStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const merchantStore = useMerchantStore()
const isCollapse = ref(false)

const currentRoute = computed(() => route.path)
const currentTitle = computed(() => route.meta.title || '')

const onCommand = (cmd) => {
  if (cmd === 'profile') {
    router.push('/profile')
  } else if (cmd === 'logout') {
    merchantStore.logout()
    router.replace('/login')
  }
}

onMounted(() => {
  merchantStore.fetchProfile()
})
</script>

<style scoped>
.layout-container { min-height: 100vh; }
.layout-aside {
  background: #001529;
  transition: width 0.3s;
  overflow: hidden;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: white;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.logo-text { font-size: 16px; font-weight: 600; white-space: nowrap; }
.layout-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: white;
  box-shadow: 0 1px 4px rgba(0,0,0,0.08);
  padding: 0 20px;
}
.header-left { display: flex; align-items: center; gap: 12px; }
.collapse-btn { font-size: 20px; cursor: pointer; color: #666; }
.page-title { font-size: 16px; font-weight: 500; color: #333; }
.header-right { display: flex; align-items: center; gap: 12px; }
.merchant-name { font-size: 14px; color: #666; }
.layout-main { background: #f0f2f5; padding: 20px; }
</style>
