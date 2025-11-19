<template>
  <div class="auth-page">
    <el-card class="auth-card">
      <template #header>
        <div class="auth-header">
          <h1 class="auth-title">{{ title }}</h1>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        label-width="0"
        class="auth-form"
      >
        <!-- 用户名输入框（仅在注册时显示） -->
        <el-form-item v-if="showUsername" prop="username">
          <el-input
            v-model="formData.username"
            placeholder="用户名"
            size="large"
            :prefix-icon="UserIcon"
            clearable
          />
        </el-form-item>

        <!-- 邮箱输入框 -->
        <el-form-item prop="email">
          <el-input
            v-model="formData.email"
            placeholder="邮箱地址"
            size="large"
            :prefix-icon="MessageIcon"
            clearable
          />
        </el-form-item>

        <!-- 密码输入框 -->
        <el-form-item prop="password">
          <el-input
            v-model="formData.password"
            type="password"
            placeholder="密码"
            size="large"
            :prefix-icon="LockIcon"
            show-password
            clearable
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <!-- 确认密码输入框（仅在注册时显示） -->
        <el-form-item v-if="showConfirmPassword" prop="confirmPassword">
          <el-input
            v-model="formData.confirmPassword"
            type="password"
            placeholder="确认密码"
            size="large"
            :prefix-icon="LockIcon"
            show-password
            clearable
            @keyup.enter="handleSubmit"
          />
        </el-form-item>

        <!-- 记住我（仅在登录时显示） -->
        <el-form-item v-if="showRememberMe">
          <el-checkbox v-model="formData.remember">记住我</el-checkbox>
        </el-form-item>

        <!-- 提交按钮 -->
        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="auth-button"
            @click="handleSubmit"
          >
            {{ submitText }}
          </el-button>
        </el-form-item>

        <!-- 底部链接 -->
        <div class="auth-footer">
          <span class="footer-text">{{ footerText }}</span>
          <router-link :to="footerLink.to" class="footer-link">
            {{ footerLink.text }}
          </router-link>
        </div>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { Message, Lock, User } from '@element-plus/icons-vue'

// Props
interface Props {
  title: string
  submitText: string
  footerText: string
  footerLink: {
    to: string
    text: string
  }
  showUsername?: boolean
  showConfirmPassword?: boolean
  showRememberMe?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showUsername: false,
  showConfirmPassword: false,
  showRememberMe: false,
  loading: false,
})

// Emits
interface Emits {
  (e: 'submit', data: any): void
}

const emit = defineEmits<Emits>()

// 图标组件
const MessageIcon = Message
const LockIcon = Lock
const UserIcon = User

// 表单引用
const formRef = ref<FormInstance>()

// 表单数据
const formData = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
  remember: false,
})

// 表单验证规则
const rules = computed<FormRules>(() => {
  const baseRules: FormRules = {
    email: [
      { required: true, message: '请输入邮箱地址', trigger: 'blur' },
      { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
    ],
    password: [
      { required: true, message: '请输入密码', trigger: 'blur' },
      { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
    ],
  }

  // 注册时需要用户名
  if (props.showUsername) {
    baseRules.username = [
      { required: true, message: '请输入用户名', trigger: 'blur' },
      { min: 2, message: '用户名长度不能少于2位', trigger: 'blur' },
    ]
  }

  // 注册时需要确认密码
  if (props.showConfirmPassword) {
    baseRules.confirmPassword = [
      { required: true, message: '请确认密码', trigger: 'blur' },
      {
        validator: (rule, value, callback) => {
          if (value !== formData.password) {
            callback(new Error('两次输入的密码不一致'))
          } else {
            callback()
          }
        },
        trigger: 'blur',
      },
    ]
  }

  return baseRules
})

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return

  // 表单验证
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) {
    return
  }

  // 准备提交数据
  const submitData: any = {
    email: formData.email.trim(),
    password: formData.password,
  }

  if (props.showUsername) {
    submitData.username = formData.username.trim()
  }

  if (props.showRememberMe) {
    submitData.remember = formData.remember
  }

  // 触发提交事件
  emit('submit', submitData)
}

// 暴露方法供父组件调用
defineExpose({
  resetForm: () => {
    formRef.value?.resetFields()
  },
  clearForm: () => {
    Object.assign(formData, {
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      remember: false,
    })
    formRef.value?.clearValidate()
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/tokens' as *;
@use 'sass:color';

.auth-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: $color-background;
  padding: $spacing-xl;
}

.auth-card {
  width: 100%;
  max-width: 420px;
  border-radius: $border-radius-card;
  box-shadow: $box-shadow;

  :deep(.el-card__header) {
    padding: $spacing-xl;
    border-bottom: 1px solid $color-border;
  }

  :deep(.el-card__body) {
    padding: $spacing-xl;
  }
}

.auth-header {
  text-align: center;
}

.auth-title {
  font-size: 24px;
  font-weight: 600;
  color: $color-title;
  margin: 0;
}

.auth-form {
  margin-top: $spacing-lg;

  .el-form-item {
    margin-bottom: $spacing-lg;
  }
}

.auth-button {
  width: 100%;
  border-radius: $border-radius-button;
  font-size: 16px;
  font-weight: 500;
}

.auth-footer {
  text-align: center;
  margin-top: $spacing-lg;
  font-size: 14px;
}

.footer-text {
  color: $color-subtle;
  margin-right: $spacing-xs;
}

.footer-link {
  color: $color-primary;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.3s;

  &:hover {
    color: color.adjust($color-primary, $lightness: 10%);
  }
}
</style>
