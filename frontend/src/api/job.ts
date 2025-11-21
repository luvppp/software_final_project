import request from './request'

export interface JobItem {
  jobId: string
  title: string
  company: string
  salary: string
  skills: string[]
  city?: string
  keyword?: string
}

export interface JobListResponse {
  list: JobItem[]
  meta: { total: number; page: number; limit: number }
}

export const listJobs = (params: { page?: number; limit?: number; keyword?: string; city?: string; prefer?: string }): Promise<JobListResponse> => {
  return request.get('/api/job/list', { params })
}

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
}> => {
  return request.get(`/api/job/${id}`)
}

export const listCities = (): Promise<string[]> => {
  return request.get('/api/job/cities')
}