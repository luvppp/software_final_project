import request from './request'
// 用户模块：封装用户注册、登录、资料与技能相关接口

/**
 * 用户相关 API 接口枚举
 */
export enum UserAPI {
  /** 用户注册 */
  REGISTER = '/api/user/register',
  /** 用户登录 */
  LOGIN = '/api/user/login',
  /** 刷新 access token */
  REFRESH_TOKEN = '/api/user/token/refresh',
  /** 更新用户技能/目标岗位 */
  UPDATE_SKILLS = '/api/user/skills',
  /** 更新用户基础资料 */
  UPDATE_PROFILE = '/api/user/profile',
  /** 获取用户详情 */
  GET_INFO = '/api/user',
  /** 上传用户简历 */
  UPLOAD_RESUME = '/api/user/resume',
  /** 获取用户简历 */
  GET_RESUME = '/api/user',
  /** 解析用户简历技能 */
  PARSE_RESUME = '/api/user/resume/parse',
  /** AI 聊天 */
  AI_CHAT = '/api/user/ai/chat',
}

// 登录接口
/**
 * 登录请求参数
 * - email: 登录邮箱
 * - password: 明文密码（后端负责加盐校验）
 */
export interface LoginParams {
  email: string
  password: string
}

/** 登录响应：返回 JWT 与用户标识 */
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  userId: string
}

// 用户登录
/** 用户登录 */
export const login = (params: LoginParams): Promise<LoginResponse> => {
  // POST 登录请求，携带邮箱与密码，后端返回 token 与 userId
  return request.post(UserAPI.LOGIN, params)
}

export const refreshAccessToken = (refreshToken: string): Promise<{ accessToken: string }> => {
  return request.post(UserAPI.REFRESH_TOKEN, { refreshToken })
}

// 用户注册
/**
 * 注册请求参数
 * - username: 用户名
 * - email: 邮箱
 * - password: 密码
 */
export interface RegisterParams {
  username: string
  email: string
  password: string
}

/** 用户注册：成功后返回后端生成的 userId */
export const register = (params: RegisterParams): Promise<{ userId: string }> => {
  // POST 注册请求，后端创建用户并返回 userId
  return request.post(UserAPI.REGISTER, params)
}

// 用户信息接口
/**
 * 用户信息结构（与后端返回对齐）
 * - username/email/phone/targetJob：基础资料
 * - skills：技能列表
 * - resume：简历元信息（不包含二进制数据）
 */
export interface UserInfo {
  _id?: string
  userId?: string
  username: string
  email: string
  skills?: string[]
  targetJob?: string,
  phone:string
  resume?: { filename: string; mimeType: string; size: number; uploadedAt?: string }
}

// 获取用户信息
/** 获取用户信息（需要用户鉴权） */
export const getUserInfo = (userId: string): Promise<UserInfo> => {
  // GET 用户详情（需鉴权），隐藏密码与简历二进制
  return request.get(`${UserAPI.GET_INFO}/${userId}`)
}

// 更新用户技能/目标岗位
/** 更新技能请求参数：技能列表与意向岗位可选 */
export interface UpdateSkillsParams {
  userId: string
  skills?: string[]
  targetJob?: string
}

/** 更新用户技能/目标岗位 */
export const updateSkills = (params: UpdateSkillsParams) => {
  // PUT 更新技能列表与意向岗位（需鉴权）
  return request.put(UserAPI.UPDATE_SKILLS, params)
}

// 更新用户基础资料
/** 更新基础资料请求参数：均为可选字段 */
export interface UpdateProfileParams {
  userId: string
  username?: string
  email?: string
  phone?: string
  targetJob?: string
}

/** 更新用户基础资料 */
export const updateProfile = (params: UpdateProfileParams) => {
  // PUT 更新基础资料（需鉴权），邮箱更新需后端唯一性校验
  return request.put(UserAPI.UPDATE_PROFILE, params)
}

/**
 * 上传简历参数
 * - base64: DataURL（包含 mimeType）或纯 base64（后端会清洗）
 */
export interface UploadResumeParams {
  userId: string
  fileName: string
  mimeType: string
  base64: string
}

/** 简历元信息（不包含文件内容） */
export interface ResumeMeta {
  filename: string
  mimeType: string
  size: number
  uploadedAt?: string
}

/** 上传用户简历（限制大小由后端校验） */
export const uploadResume = (params: UploadResumeParams): Promise<ResumeMeta> => {
  // PUT 上传简历（base64 + mimeType），后端校验大小并存储
  return request.put(UserAPI.UPLOAD_RESUME, params)
}

/** 获取用户简历（返回 base64 DataURL 以支持前端预览与下载） */
export const getResume = (userId: string): Promise<{ base64: string } & ResumeMeta> => {
  // GET 获取简历（返回 DataURL，支持预览与下载）
  return request.get(`${UserAPI.GET_RESUME}/${userId}/resume`)
}

/** 删除用户简历 */
export const deleteResume = (userId: string): Promise<null> => {
  // DELETE 删除简历（需鉴权）
  return request.delete(UserAPI.UPLOAD_RESUME, { data: { userId } })
}

/**
 * 解析简历技能
 * - addedSkills：与当前技能相比新增的技能（已做归一化）
 * - totalFound：全文匹配到的技能集合（去重）
 */
export const parseResumeSkills = (userId: string): Promise<{ addedSkills: string[]; totalFound: string[] }> => {
  // POST 解析简历技能（需鉴权），返回新增技能与全文匹配集合
  return request.post(UserAPI.PARSE_RESUME, { userId })
}

export const aiChat = (payload: { messages: { role: 'user' | 'assistant'; content: string }[] }): Promise<{ reply: string }> => {
  return request.post(UserAPI.AI_CHAT, payload)
}

const BASE_URL = (import.meta as any).env.VITE_API_BASE_URL || 'http://localhost:3000'
export const aiChatStream = async (payload: { messages: { role: 'user' | 'assistant'; content: string }[] }): Promise<Response> => {
  const doFetch = async () => {
    const token = localStorage.getItem('accessToken') || ''
    return fetch(`${BASE_URL}${UserAPI.AI_CHAT}/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    })
  }
  let resp = await doFetch()
  if (resp.status === 401) {
    const rt = localStorage.getItem('refreshToken') || ''
    if (rt) {
      try {
        const r = await fetch(`${BASE_URL}${UserAPI.REFRESH_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: rt }),
        })
        const data = await r.json()
        const ok = data && typeof data === 'object' && data.code === 200 && data.data && data.data.accessToken
        if (ok) {
          localStorage.setItem('accessToken', data.data.accessToken)
          resp = await doFetch()
        }
      } catch {}
    }
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}`)
  }
  return resp
}
