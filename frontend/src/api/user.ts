import http from './request'

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
  /** 获取用户详情 */
  GET_INFO = '/api/user',
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
  return http.post(UserAPI.LOGIN, params)
}

// 用户注册
export interface RegisterParams {
  username: string
  email: string
  password: string
}

export const register = (params: RegisterParams): Promise<{ userId: string }> => {
  return http.post(UserAPI.REGISTER, params)
}

// 用户信息接口
export interface UserInfo {
  _id?: string
  userId?: string
  username: string
  email: string
  skills?: string[]
  targetJob?: string
}

// 获取用户信息
export const getUserInfo = (userId: string): Promise<UserInfo> => {
  return http.get(`${UserAPI.GET_INFO}/${userId}`)
}

// 更新用户技能/目标岗位
export interface UpdateSkillsParams {
  userId: string
  skills?: string[]
  targetJob?: string
}

export const updateSkills = (params: UpdateSkillsParams) => {
  return http.put(UserAPI.UPDATE_SKILLS, params)
}
