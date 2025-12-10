import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { useUserStore } from '@/stores/userStore'


// 路由配置：主应用与认证页面，支持登录校验
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/HomePage.vue'),
        meta: { title: '首页', requiresAuth: true },
      },
      {
        path: 'jobs',
        name: 'Jobs',
        component: () => import('@/views/JobsPage.vue'),
        meta: { title: '岗位推荐', requiresAuth: true },
      },
      {
        path: 'jobs/:id',
        name: 'JobDetail',
        component: () => import('@/views/JobDetailPage.vue'),
        meta: { title: '岗位详情', requiresAuth: true },
      },
      {
        path: 'profile',
        name: 'Profile',
        component: () => import('@/views/ProfilePage.vue'),
        meta: { title: '个人资料', requiresAuth: true },
      },
      {
        path: 'learning',
        name: 'Learning',
        component: () => import('@/views/LearningPage.vue'),
        meta: { title: '学习计划', requiresAuth: true },
      },
    ],
  },
  {
    path: '/login',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'Login',
        component: () => import('@/views/auth/LoginPage.vue'),
        meta: {
          title: '登录',
        },
      },
    ],
  },
  {
    path: '/register',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      {
        path: '',
        name: 'Register',
        component: () => import('@/views/auth/RegisterPage.vue'),
        meta: {
          title: '注册',
        },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// 全局前置守卫：
// 1) 设置页面标题；2) 检查需要登录的路由并进行跳转
router.beforeEach((to, _from, next) => {
  const title = to.meta && (to.meta as any).title
  if (typeof title === 'string') {
    document.title = title
  }
  const requiresAuth = to.meta && (to.meta as any).requiresAuth
  if (requiresAuth) {
    const store = useUserStore()
    if (!store.isLoggedIn()) {
      return next({ path: '/login' })
    }
  }
  next()
})

export default router
