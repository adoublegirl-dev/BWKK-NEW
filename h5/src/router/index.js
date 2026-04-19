import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/index.vue'),
    meta: { title: '帮我看看', keepAlive: true }
  },
  {
    path: '/post/:id',
    name: 'PostDetail',
    component: () => import('@/views/post-detail.vue'),
    meta: { title: '帖子详情' }
  },
  {
    path: '/post/create',
    name: 'PostCreate',
    component: () => import('@/views/post-create.vue'),
    meta: { title: '发布需求', auth: true }
  },
  {
    path: '/order/submit/:postId',
    name: 'OrderSubmit',
    component: () => import('@/views/order-submit.vue'),
    meta: { title: '提交任务', auth: true }
  },
  {
    path: '/my/posts',
    name: 'MyPosts',
    component: () => import('@/views/my-posts.vue'),
    meta: { title: '我的帖子', auth: true }
  },
  {
    path: '/my/orders',
    name: 'MyOrders',
    component: () => import('@/views/my-orders.vue'),
    meta: { title: '我的接单', auth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/profile.vue'),
    meta: { title: '个人中心', auth: true }
  },
  {
    path: '/profile/edit',
    name: 'ProfileEdit',
    component: () => import('@/views/profile-edit.vue'),
    meta: { title: '编辑资料', auth: true }
  },
  {
    path: '/points',
    name: 'Points',
    component: () => import('@/views/points.vue'),
    meta: { title: '积分明细', auth: true }
  },
  {
    path: '/credit',
    name: 'Credit',
    component: () => import('@/views/credit.vue'),
    meta: { title: '信用分', auth: true }
  },
  {
    path: '/shop',
    name: 'Shop',
    component: () => import('@/views/shop.vue'),
    meta: { title: '积分商城' }
  },
  {
    path: '/shop/:id',
    name: 'ShopDetail',
    component: () => import('@/views/shop-detail.vue'),
    meta: { title: '商品详情' }
  },
  {
    path: '/my/exchanges',
    name: 'MyExchanges',
    component: () => import('@/views/my-exchanges.vue'),
    meta: { title: '已兑换', auth: true }
  },
  {
    path: '/merchant/home',
    name: 'MerchantHome',
    component: () => import('@/views/merchant-home.vue'),
    meta: { title: '商家中心', auth: true }
  },
  {
    path: '/merchant/redeem',
    name: 'MerchantRedeem',
    component: () => import('@/views/merchant-redeem.vue'),
    meta: { title: '核销代金券', auth: true }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login.vue'),
    meta: { title: '登录' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
router.beforeEach((to, from, next) => {
  // 设置页面标题
  if (to.meta.title) {
    document.title = to.meta.title
  }

  // 检查是否需要登录
  const authStore = useAuthStore()
  if (to.meta.auth && !authStore.isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath }
    })
  } else {
    next()
  }
})

export default router
