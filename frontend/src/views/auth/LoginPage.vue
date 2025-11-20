<template>
  <AuthCard
    title="登录账号"
    submit-text="登录"
    footer-text="没有账号?"
    :footer-link="{ to: '/register', text: '立即注册' }"
    :show-remember-me="true"
    :loading="loading"
    @submit="handleLogin"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AuthCard from '@/components/auth/AuthCard.vue'
import { useUserStore } from '@/stores/userStore'
import type { LoginParams } from '@/api/user'

// 路由
const router = useRouter()

// 用户 store
const userStore = useUserStore()

// 加载状态
const loading = ref(false)

// 处理登录
const handleLogin = async (data: LoginParams & { remember?: boolean }) => {
  loading.value = true

  try {
    // 调用登录接口
    await userStore.login({
      email: data.email,
      password: data.password,
    })

    ElMessage.success('登录成功')

    router.push('/')
  } catch (error: any) {
    // 错误信息已在 API 拦截器中显示，这里不需要再次显示
    console.error('登录失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
// 样式已在 AuthCard 组件中定义，这里不需要额外样式
</style>
