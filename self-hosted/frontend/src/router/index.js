import { createRouter, createWebHistory } from 'vue-router'
import store from '@/store'

const routes = [
  {
    path: '/',
    name: 'Home',
    redirect: '/domains'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresGuest: true }
  },
  {
    path: '/domains',
    name: 'Domains',
    component: () => import('@/views/Domains.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/Admin.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: () => import('@/views/Dashboard.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  }
]

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const isAuthenticated = store.getters['auth/isAuthenticated']
  const userRole = store.getters['auth/userRole']
  
  // 如果需要登录但未登录，跳转到登录页
  if (to.matched.some(record => record.meta.requiresAuth)) {
    if (!isAuthenticated) {
      // 尝试从localStorage恢复token
      const token = localStorage.getItem('token')
      if (token) {
        try {
          await store.dispatch('auth/verifyToken', token)
          // 验证成功，继续导航
          if (to.matched.some(record => record.meta.requiresAdmin)) {
            if (userRole !== 'admin') {
              next('/domains')
            } else {
              next()
            }
          } else {
            next()
          }
        } catch (error) {
          // token无效，跳转到登录页
          next('/login')
        }
      } else {
        next('/login')
      }
    } else {
      // 已登录，检查管理员权限
      if (to.matched.some(record => record.meta.requiresAdmin)) {
        if (userRole !== 'admin') {
          next('/domains')
        } else {
          next()
        }
      } else {
        next()
      }
    }
  } else if (to.matched.some(record => record.meta.requiresGuest)) {
    // 如果已登录但访问guest页面，跳转到首页
    if (isAuthenticated) {
      next('/domains')
    } else {
      next()
    }
  } else {
    next()
  }
})

export default router
