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
}

// 登录接口
export interface LoginParams {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  userId: string
}

// 用户登录
export const login = (params: LoginParams): Promise<LoginResponse> => {
  return request.post(UserAPI.LOGIN, params)
}

// 用户注册
export interface RegisterParams {
  username: string
  email: string
  password: string
}

export const register = (params: RegisterParams): Promise<{ userId: string }> => {
  return request.post(UserAPI.REGISTER, params)
}

// 用户信息接口
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
export const getUserInfo = (userId: string): Promise<UserInfo> => {
  return request.get(`${UserAPI.GET_INFO}/${userId}`)
}

// 更新用户技能/目标岗位
export interface UpdateSkillsParams {
  userId: string
  skills?: string[]
  targetJob?: string
}

export const updateSkills = (params: UpdateSkillsParams) => {
  return request.put(UserAPI.UPDATE_SKILLS, params)
}

// 更新用户基础资料
export interface UpdateProfileParams {
  userId: string
  username?: string
  email?: string
  phone?: string
  targetJob?: string
}

export const updateProfile = (params: UpdateProfileParams) => {
  return request.put(UserAPI.UPDATE_PROFILE, params)
}

export interface UploadResumeParams {
  userId: string
  fileName: string
  mimeType: string
  base64: string
}

export interface ResumeMeta {
  filename: string
  mimeType: string
  size: number
  uploadedAt?: string
}

export const uploadResume = (params: UploadResumeParams): Promise<ResumeMeta> => {
  return request.put(UserAPI.UPLOAD_RESUME, params)
}

export const getResume = (userId: string): Promise<{ base64: string } & ResumeMeta> => {
  return request.get(`${UserAPI.GET_RESUME}/${userId}/resume`)
}

export const deleteResume = (userId: string): Promise<null> => {
  return request.delete(UserAPI.UPLOAD_RESUME, { data: { userId } })
}
