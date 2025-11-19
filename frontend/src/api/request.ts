import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// 后端 API 基础地址
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 创建 axios 实例
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data

    if (payload && typeof payload === 'object' && 'code' in payload) {
      if (payload.code !== 200) {
        const message = payload.msg || '请求失败'
        ElMessage.error(message)
        return Promise.reject(new Error(message))
      }
      return payload.data ?? payload
    }

    return payload
  },
  (error) => {
    // 处理 HTTP 错误
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.msg || `请求失败: ${status}`
      ElMessage.error(message)
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error(error.message || '请求失败')
    }
    return Promise.reject(error)
  }
)

export default request
