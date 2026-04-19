import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { title: '商家登录' }
  },
  {
    path: '/',
    component: () => import('../views/Layout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/Dashboard.vue'),
        meta: { title: '数据概览', icon: 'DataLine' }
      },
      {
        path: 'vouchers',
        name: 'VoucherManage',
        component: () => import('../views/VoucherManage.vue'),
        meta: { title: '代金券管理', icon: 'Ticket' }
      },
      {
        path: 'redeem',
        name: 'Redeem',
        component: () => import('../views/Redeem.vue'),
        meta: { title: '核销管理', icon: 'Stamp' }
      },
      {
        path: 'posts',
        name: 'Posts',
        component: () => import('../views/Posts.vue'),
        meta: { title: '帖子管理', icon: 'Document' }
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('../views/Profile.vue'),
        meta: { title: '商家信息', icon: 'User' }
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory('/merchant/'),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  document.title = to.meta.title ? `${to.meta.title} - 商家后台` : '商家管理后台'
  
  // 登录页不需要认证
  if (to.path === '/login') {
    next()
    return
  }
  
  // 检查token
  const token = localStorage.getItem('merchant_token')
  if (!token) {
    next('/login')
  } else {
    next()
  }
})

export default router
