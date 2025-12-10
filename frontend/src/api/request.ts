import axios from 'axios'
import type { AxiosInstance, AxiosResponse } from 'axios'
import { ElMessage } from 'element-plus'

// 后端 API 基础地址：通过 Vite 环境变量控制，默认本地
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// 创建 axios 实例，用于全局统一的网络请求
const request: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

let isRefreshing = false
let refreshPromise: Promise<string> | null = null

// 请求拦截器：自动附加 Authorization 头
// 请求拦截：在发送前自动注入 JWT，用于后端鉴权
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器：统一处理后端通用响应结构 { code, msg, data }
// 响应拦截：统一处理后端返回的 { code, msg, data } 结构
request.interceptors.response.use(
  (response: AxiosResponse) => {
    const payload = response.data

    // 统一处理后端通用响应结构 { code, msg, data }
    if (payload && typeof payload === 'object' && 'code' in payload) {
      // 若后端以业务码返回 401（例如鉴权失败），执行无感刷新后重试原请求
      if (payload.code === 401 && !(response.config as any)._retry) {
        const rt = localStorage.getItem('refreshToken')
        if (!rt) {
          ElMessage.error(payload.msg || '登录已过期，请重新登录')
          return Promise.reject(new Error(payload.msg || 'unauthorized'))
        }
        ;(response.config as any)._retry = true
        if (!isRefreshing) {
          isRefreshing = true
          refreshPromise = axios
            .post(`${BASE_URL}/api/user/token/refresh`, { refreshToken: rt })
            .then((res) => {
              const p = res?.data
              const ok = p && typeof p === 'object' && p.code === 200 && p.data && p.data.accessToken
              if (!ok) throw new Error(p?.msg || '刷新失败')
              const at = p.data.accessToken
              localStorage.setItem('accessToken', at)
              return at
            })
            .finally(() => { isRefreshing = false })
        }
        return refreshPromise!.then((newToken) => {
          if (response.config.headers) {
            response.config.headers.Authorization = `Bearer ${newToken}`
          }
          // 使用原始配置重试
          return request(response.config)
        }).catch((e) => {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          ElMessage.error('登录已过期，请重新登录')
          return Promise.reject(e)
        })
      }

      // 非 200 的业务码统一提示错误
      if (payload.code !== 200) {
        const message = payload.msg || '请求失败'
        ElMessage.error(message)
        return Promise.reject(new Error(message))
      }

      // 成功返回 data 字段（或原 payload）
      return payload.data ?? payload
    }

    // 非通用结构直接返回
    return payload
  },
  async (error) => {
    const resp = error?.response
    const status = resp?.status
    const originalRequest = error?.config || {}
    if (status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      const rt = localStorage.getItem('refreshToken')
      if (!rt) {
        localStorage.removeItem('accessToken')
        return Promise.reject(error)
      }
      if (!isRefreshing) {
        isRefreshing = true
        refreshPromise = axios
          .post(`${BASE_URL}/api/user/token/refresh`, { refreshToken: rt })
          .then((res) => {
            const payload = res?.data
            const ok = payload && typeof payload === 'object' && payload.code === 200 && payload.data && payload.data.accessToken
            if (!ok) {
              throw new Error(payload?.msg || '刷新失败')
            }
            const at = payload.data.accessToken
            localStorage.setItem('accessToken', at)
            return at
          })
          .finally(() => {
            isRefreshing = false
          })
      }
      try {
        const newToken = await refreshPromise!
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
        }
        return await request(originalRequest)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        return await Promise.reject(error)
      }
    }
    if (error.response) {
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
