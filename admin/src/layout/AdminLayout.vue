<template>
  <el-container class="admin-layout">
    <!-- 侧边栏 -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="aside">
      <div class="logo">
        <span v-if="!isCollapse">📋 帮我看看</span>
        <span v-else>📋</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#001529"
        text-color="#ffffffa6"
        active-text-color="#fff"
        class="side-menu"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon><component :is="item.icon" /></el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <!-- 顶部栏 -->
      <el-header class="header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="isCollapse = !isCollapse">
            <component :is="isCollapse ? 'Expand' : 'Fold'" />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item v-if="$route.meta.title && $route.name !== 'Dashboard'">
              {{ $route.meta.title }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <span class="admin-name">{{ adminStore.adminInfo?.username }}</span>
          <el-dropdown @command="handleCommand">
            <el-avatar :size="32" class="admin-avatar">管</el-avatar>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 内容区 -->
      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminStore } from '../stores/admin'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()
const isCollapse = ref(false)

const activeMenu = computed(() => {
  const path = route.path
  // 详情页高亮对应列表页
  if (path.startsWith('/users')) return '/users'
  if (path.startsWith('/posts')) return '/posts'
  if (path.startsWith('/orders')) return '/orders'
  return path
})

const menuItems = [
  { path: '/dashboard', title: '数据概览', icon: 'Odometer' },
  { path: '/users', title: '用户管理', icon: 'User' },
  { path: '/posts', title: '帖子管理', icon: 'Document' },
  { path: '/orders', title: '订单管理', icon: 'List' },
  { path: '/categories', title: '分类管理', icon: 'Menu' },
  { path: '/products', title: '商品管理', icon: 'Goods' },
  { path: '/vouchers', title: '代金券管理', icon: 'Ticket' },
  { path: '/points-adjust', title: '积分调整', icon: 'Coin' },
  { path: '/merchants', title: '商家管理', icon: 'Shop' },
  { path: '/transactions', title: '交易记录', icon: 'Money' },
  { path: '/credit-records', title: '信用记录', icon: 'Trophy' },
  { path: '/logs', title: '操作日志', icon: 'Notebook' },
]

function handleCommand(cmd) {
  if (cmd === 'logout') {
    adminStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.aside {
  background: #001529;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #ffffff1a;
}

.side-menu {
  border-right: none;
}

.side-menu:not(.el-menu--collapse) {
  width: 220px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #eee;
  background: #fff;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: #333;
}

.collapse-btn:hover {
  color: #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.admin-name {
  font-size: 14px;
  color: #333;
}

.admin-avatar {
  cursor: pointer;
  background: #409eff;
}

.main-content {
  background: #f0f2f5;
  padding: 20px;
  overflow-y: auto;
}
</style>
