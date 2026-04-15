import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/login/Login.vue'),
    meta: { title: '管理员登录' },
  },
  {
    path: '/',
    component: () => import('../layout/AdminLayout.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('../views/dashboard/Dashboard.vue'),
        meta: { title: '数据概览', icon: 'Odometer' },
      },
      {
        path: 'users',
        name: 'UserList',
        component: () => import('../views/user/UserList.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'users/:id',
        name: 'UserDetail',
        component: () => import('../views/user/UserDetail.vue'),
        meta: { title: '用户详情', hidden: true },
      },
      {
        path: 'posts',
        name: 'PostList',
        component: () => import('../views/post/PostList.vue'),
        meta: { title: '帖子管理', icon: 'Document' },
      },
      {
        path: 'posts/:id',
        name: 'PostDetail',
        component: () => import('../views/post/PostDetail.vue'),
        meta: { title: '帖子详情', hidden: true },
      },
      {
        path: 'orders',
        name: 'OrderList',
        component: () => import('../views/order/OrderList.vue'),
        meta: { title: '订单管理', icon: 'List' },
      },
      {
        path: 'orders/:id',
        name: 'OrderDetail',
        component: () => import('../views/order/OrderDetail.vue'),
        meta: { title: '订单详情', hidden: true },
      },
      {
        path: 'transactions',
        name: 'TransactionList',
        component: () => import('../views/transaction/TransactionList.vue'),
        meta: { title: '交易记录', icon: 'Money' },
      },
      {
        path: 'credit-records',
        name: 'CreditList',
        component: () => import('../views/credit/CreditList.vue'),
        meta: { title: '信用记录', icon: 'Trophy' },
      },
      {
        path: 'logs',
        name: 'LogList',
        component: () => import('../views/log/LogList.vue'),
        meta: { title: '操作日志', icon: 'Notebook' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

// 路由守卫
router.beforeEach((to, from, next) => {
  document.title = to.meta.title ? `${to.meta.title} - 帮我看看管理后台` : '帮我看看管理后台'
  const token = localStorage.getItem('admin_token')
  if (to.path !== '/login' && !token) {
    next('/login')
  } else if (to.path === '/login' && token) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router
