<template>
  <AuthCard
    title="注册账号"
    submit-text="注册"
    footer-text="已有账号?"
    :footer-link="{ to: '/login', text: '立即登录' }"
    :show-username="true"
    :show-confirm-password="true"
    :loading="loading"
    @submit="handleRegister"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AuthCard from '@/components/auth/AuthCard.vue'
import { register } from '@/api/user'
import type { RegisterParams } from '@/api/user'
import { useUserStore } from '@/stores/userStore'

// 路由
const router = useRouter()

// 用户 store
const userStore = useUserStore()

// 加载状态
const loading = ref(false)

// 处理注册
const handleRegister = async (data: RegisterParams & { confirmPassword?: string }) => {
  loading.value = true

  try {
    // 调用注册接口
    await register({
      username: data.username,
      email: data.email,
      password: data.password,
    })

    ElMessage.success('注册成功')

    // 注册成功后自动登录
    try {
      await userStore.login({
        email: data.email,
        password: data.password,
      })

      ElMessage.success('登录成功')

      router.push('/')
    } catch (loginError) {
      // 如果自动登录失败，跳转到登录页面
      router.push('/login')
    }
  } catch (error: any) {
    // 错误信息已在 API 拦截器中显示
    console.error('注册失败:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
// 样式已在 AuthCard 组件中定义，这里不需要额外样式
</style>
