import { defineStore } from 'pinia'
// 用户状态管理：处理登录、退出、初始化与用户信息获取
import { ref } from 'vue'
import { login as loginApi, getUserInfo } from '@/api/user'
import type { LoginParams, UserInfo } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  // 状态
  const accessToken = ref<string | null>(localStorage.getItem('accessToken'))
  const refreshToken = ref<string | null>(localStorage.getItem('refreshToken'))
  const userInfo = ref<UserInfo | null>(null)

  // 初始化：从 localStorage 恢复状态
  const init = async () => {
    const savedToken = localStorage.getItem('accessToken')
    const savedRefresh = localStorage.getItem('refreshToken')
    const savedUserId = localStorage.getItem('userId')

    if (savedToken && savedUserId) {
      accessToken.value = savedToken
      refreshToken.value = savedRefresh
      // 尝试获取用户信息
      try {
        await fetchUserInfo(savedUserId)
      } catch (error) {
        console.error('初始化用户信息失败:', error)
        logout()
      }
    }
  }

  // 登录
  const login = async (params: LoginParams) => {
    try {
      const response = await loginApi(params)
      
      accessToken.value = response.accessToken
      refreshToken.value = response.refreshToken
      localStorage.setItem('accessToken', response.accessToken)
      localStorage.setItem('refreshToken', response.refreshToken)
      localStorage.setItem('userId', response.userId)

      // 获取用户信息并返回登录响应
      await fetchUserInfo(response.userId)
      
      return response
    } catch (error) {
      accessToken.value = null
      refreshToken.value = null
      userInfo.value = null
      throw error
    }
  }

  // 获取用户信息
  const fetchUserInfo = async (userId: string) => {
    try {
      const data = await getUserInfo(userId)
      // 更新用户信息状态
      userInfo.value = data
      return data
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  // 退出登录
  const logout = () => {
    accessToken.value = null
    refreshToken.value = null
    userInfo.value = null
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userId')
  }

  // 检查是否已登录
  const isLoggedIn = () => {
    return !!accessToken.value
  }

  return {
    accessToken,
    refreshToken,
    userInfo,
    init,
    login,
    logout,
    fetchUserInfo,
    isLoggedIn,
  }
})
