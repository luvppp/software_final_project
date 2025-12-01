import { defineStore } from 'pinia'
// 用户状态管理：处理登录、退出、初始化与用户信息获取
import { ref } from 'vue'
import { login as loginApi, getUserInfo } from '@/api/user'
import type { LoginParams, UserInfo } from '@/api/user'

export const useUserStore = defineStore('user', () => {
  // 状态
  const token = ref<string | null>(localStorage.getItem('token'))
  const userInfo = ref<UserInfo | null>(null)

  // 初始化：从 localStorage 恢复状态
  const init = async () => {
    const savedToken = localStorage.getItem('token')
    const savedUserId = localStorage.getItem('userId')

    if (savedToken && savedUserId) {
      token.value = savedToken
      // 尝试获取用户信息
      try {
        await fetchUserInfo(savedUserId)
      } catch (error) {
        console.error('初始化用户信息失败:', error)
        // 如果获取失败，清除无效的 token
        logout()
      }
    }
  }

  // 登录
  const login = async (params: LoginParams) => {
    try {
      const response = await loginApi(params)
      
      // 保存 token
      token.value = response.token
      localStorage.setItem('token', response.token)
      localStorage.setItem('userId', response.userId)

      // 获取用户信息
      await fetchUserInfo(response.userId)
      
      return response
    } catch (error) {
      // 登录失败时清除状态
      token.value = null
      userInfo.value = null
      throw error
    }
  }

  // 获取用户信息
  const fetchUserInfo = async (userId: string) => {
    try {
      const data = await getUserInfo(userId)
      userInfo.value = data
      return data
    } catch (error) {
      console.error('获取用户信息失败:', error)
      throw error
    }
  }

  // 退出登录
  const logout = () => {
    token.value = null
    userInfo.value = null
    localStorage.removeItem('token')
    localStorage.removeItem('userId')
  }

  // 检查是否已登录
  const isLoggedIn = () => {
    return !!token.value
  }

  return {
    token,
    userInfo,
    init,
    login,
    logout,
    fetchUserInfo,
    isLoggedIn,
  }
})
