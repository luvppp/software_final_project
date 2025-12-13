<template>
  <AuthCard
    title="登录账号"
    submit-text="登录"
    footer-text="没有账号?"
    :footer-link="{ to: '/register', text: '立即注册' }"
    :show-remember-me="true"
    :show-forgot="true"
    :loading="loading"
    @submit="handleLogin"
    @forgot="openResetDialog"
  />
  <el-dialog v-model="reset.visible" title="重置密码" width="420px">
    <el-form :model="reset" label-width="0">
      <el-form-item>
        <el-input v-model="reset.email" placeholder="邮箱地址" />
      </el-form-item>
      <el-form-item>
        <div class="row">
          <el-input v-model="reset.code" placeholder="验证码" />
          <el-button :disabled="reset.sending || reset.countdown>0" :loading="reset.sending" @click="sendCode">
            {{ reset.countdown>0 ? `${reset.countdown}s后重试` : '获取验证码' }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item>
        <el-input v-model="reset.newPassword" type="password" placeholder="新密码" show-password />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="reset.visible=false">取消</el-button>
      <el-button type="primary" :loading="reset.resetting" @click="doReset">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
// 登录页面职责：
// - 使用通用 AuthCard 组件渲染登录表单
// - 调用用户 Store 执行登录，成功后跳转首页
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import AuthCard from '@/components/auth/AuthCard.vue'
import { useUserStore } from '@/stores/userStore'
import type { LoginParams } from '@/api/user'
import { sendResetCode, resetPassword } from '@/api/user'

// 路由
const router = useRouter()

// 用户 store
const userStore = useUserStore()

// 加载状态
const loading = ref(false)

// 处理登录：验证并调用 Store 登录，成功后跳转首页
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

const reset = ref({ visible: false, email: '', code: '', newPassword: '', sending: false, resetting: false, countdown: 0 })
const openResetDialog = () => {
  reset.value.visible = true
}
const sendCode = async () => {
  if (!reset.value.email.trim()) {
    ElMessage.error('请输入邮箱地址')
    return
  }
  reset.value.sending = true
  try {
    await sendResetCode(reset.value.email.trim())
    ElMessage.success('验证码已发送')
    reset.value.countdown = 60
    const timer = setInterval(() => {
      reset.value.countdown--
      if (reset.value.countdown <= 0) {
        clearInterval(timer)
      }
    }, 1000)
  } catch (e:any) {
    console.error(e)
  } finally {
    reset.value.sending = false
  }
}
const doReset = async () => {
  const email = reset.value.email.trim()
  const code = reset.value.code.trim()
  const pwd = reset.value.newPassword
  if (!email || !code || !pwd) {
    ElMessage.error('请填写完整信息')
    return
  }
  if (pwd.length < 6) {
    ElMessage.error('密码长度不能少于6位')
    return
  }
  reset.value.resetting = true
  try {
    await resetPassword({ email, code, newPassword: pwd })
    ElMessage.success('密码已重置')
    reset.value.visible = false
  } catch (e:any) {
    console.error(e)
  } finally {
    reset.value.resetting = false
  }
}
</script>

<style lang="scss" scoped>
// 样式已在 AuthCard 组件中定义，这里不需要额外样式
.row { display:flex; gap:12px; align-items:center }
</style>
