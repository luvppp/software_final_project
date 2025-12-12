import request from './request'

export interface JobItem {
  jobId: string
  title: string
  company: string
  salary: string
  skills: string[]
  city?: string
  isIntern?: boolean
  keyword?: string
}

export interface JobListResponse {
  list: JobItem[]
  meta: { total: number; page: number; limit: number }
}

// 列表查询：支持分页、关键字、城市、偏好、是否实习
export const listJobs = (params: { page?: number; limit?: number; keyword?: string; city?: string; prefer?: string; isIntern?: boolean }): Promise<JobListResponse> => {
  // 通过查询参数传递过滤条件，后端返回标准列表与分页元数据
  return request.get('/api/job/list', { params })
}

// 岗位详情查询：返回完整岗位信息（职责、要求、技能等）
export const getJobDetail = (id: string): Promise<{
  jobId: string
  title: string
  company: string
  description: string
  skills: string[]
  salary: string
  city?: string
  experience?: string
  education?: string
  duties?: string[]
  requirements?: string[]
  companyIntro?: string
  matchScore?: number
  missingSkills?: string[]
}> => {
  return request.get(`/api/job/${id}`)
}

// 城市列表查询：后端基于岗位库去重并按中文排序
export const listCities = (): Promise<string[]> => {
  return request.get('/api/job/cities')
}

export interface MatchItem {
  jobId: string
  jobTitle: string
  company: string
  matchScore: number
  missingSkills: string[]
}

export const matchJobs = (params: { userId?: string; skills?: string[] }): Promise<MatchItem[]> => {
  return request.post('/api/job/match', params)
}

export const generateAiReason = (payload: {
  type: 'advice' | 'reason'
  jobId?: string
  jobTitle: string
  company?: string
  requiredSkills?: string[]
  missingSkills?: string[]
  matchScore?: number
  userSkills?: string[]
}): Promise<{ text: string }> => {
  return request.post('/api/job/ai/reason', payload)
}
