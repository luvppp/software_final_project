import request from './request'

// 学习计划相关 API 封装：统一管理请求，避免在页面里直接写 URL
// PlanItem 与后端 learningPlans 集合中的项保持一致

export interface PlanItem { skill: string; course: string; platform: string; url: string; progress: number }

// 生成学习计划：提交用户ID与缺失技能，后端按目标岗位优先级挑选前3个技能，并为每个技能匹配2-3门课程
export const createLearningPlan = (params: { userId: string; missingSkills: string[] }): Promise<{ userId: string; plan: PlanItem[] }> => {
  return request.post('/api/learning/plan', params)
}

// 获取学习计划：根据用户ID返回计划列表（已按技能分配课程）
export const getLearningPlan = (userId: string): Promise<{ userId: string; plan: PlanItem[] }> => {
  return request.get(`/api/learning/${userId}`)
}

// 更新课程进度：支持课程级别（按 skill + course），当某技能下所有课程进度均为100时，后端会把该技能加入用户技能列表；否则移除
export const updateCourseProgress = (params: { userId: string; skill: string; course?: string; progress: number }): Promise<null> => {
  return request.put('/api/learning/progress', params)
}

// 清空某技能的课程计划：当技能下所有课程均完成后，可调用此接口移除该技能的计划项
export const clearSkillPlan = (params: { userId: string; skill: string }): Promise<{ removed: number; userId: string; plan: PlanItem[] }> => {
  // 使用 DELETE 并在请求体中传递 userId 与 skill
  return request.delete('/api/learning/plan/skill', { data: params })
}
