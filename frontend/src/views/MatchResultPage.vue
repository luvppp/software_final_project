<template>
  <div class="match-page">
    <el-alert type="success" :closable="false" class="top-alert">
      <template #title>
        <strong>AI 匹配完成</strong>
        <span class="sub">已为你完成岗位智能分析，找到 {{ results.length }} 个合适的岗位</span>
      </template>
    </el-alert>

    <el-card v-if="currentJob" class="top-job" shadow="hover">
      <div class="section-title">当前岗位分析</div>
      <div class="top-grid">
        <div>
          <div class="top-title">{{ currentJob.title }}</div>
          <div class="top-company">{{ currentJob.company }} · {{ currentJob.city || '—' }}</div>
          <div class="top-tags">
            <el-tag v-for="s in (currentJob.skills || []).slice(0,8)" :key="s" class="skill" type="info">{{ s }}</el-tag>
          </div>
        </div>
        <div>
          <el-progress :percentage="Math.round(currentMatch.percent * 100)" status="success" />
          <div class="top-suggest">{{ aiAdvice || defaultAdvice }}</div>
        </div>
      </div>
    </el-card>

    <div class="section-title">为你推荐的岗位</div>
    <!-- 推荐区域：三列网格布局，卡片固定高度，主体滚动 -->
    <el-row :gutter="16" class="result-grid">
      <el-col v-for="item in results.slice(0,3)" :key="item.jobId" :xs="24" :sm="12" :md="8">
        <!-- 推荐岗位卡片：固定高度 + 主体滚动，保证三卡等高 -->
        <el-card class="result-card" shadow="hover">
          <div class="card-header">
            <div class="title-area">
              <div class="job-title">{{ item.jobTitle }}</div>
              <el-tag type="success" effect="plain" class="score-chip">匹配度 {{ Math.round(((item.matchScore) || 0) * 100) }}%</el-tag>
              <div class="company">{{ item.company }}</div>
            </div>
          </div>

          <!-- 主体内容：超过固定高度出现滚动条（不影响底部按钮位置） -->
          <div class="card-body">
            <div class="reason">
              <div class="reason-title">AI 推荐理由</div>
              <div class="reason-text">{{ buildReason(item) }}</div>
            </div>

            <div class="skills">
              <div class="skills-title">匹配技能</div>
              <div class="tags">
                <el-tag v-for="s in (item.skills || []).slice(0, 8)" :key="s" type="info" class="skill">{{ s }}</el-tag>
              </div>
            </div>

            <div class="skills">
              <div class="skills-title">缺失技能</div>
              <div class="tags">
                <el-tag v-for="s in (item.missingSkills || []).slice(0, 8)" :key="s" type="warning" effect="plain" class="skill">{{ s }}</el-tag>
              </div>
            </div>
          </div>

          <div class="actions">
            <el-button size="small" @click="openDetail(item.jobId)">查看岗位详情</el-button>
            <el-button size="small" type="primary" @click="generatePlan(item)">生成学习计划</el-button>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="cta-card" shadow="never">
      <div class="cta-row">
        <div class="cta-text">
          <div class="cta-title">进一步提升匹配度</div>
          <div class="cta-sub">完善个人资料和技能信息，让 AI 为你找到更匹配的岗位</div>
        </div>
        <div class="cta-actions">
          <el-button @click="gotoProfile">完善个人资料</el-button>
          <el-button type="primary" @click="gotoLearning">查看学习计划</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
// 匹配结果页面职责：
// - 展示当前岗位分析（可选：从详情页传入from）
// - 展示Top3推荐岗位卡片、AI推荐理由与建议
// - 支持生成学习计划、查看详情、跳转资料/学习页面
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { matchJobs, getJobDetail, type MatchItem, generateAiReason } from '@/api/job'
import { createLearningPlan } from '@/api/learning'

const router = useRouter()
const route = useRoute()
const store = useUserStore()

type RichMatchItem = MatchItem & { skills?: string[]; salary?: string; city?: string }
const results = ref<RichMatchItem[]>([])
const aiAdvice = ref('')
const aiReasons = ref<Record<string, string>>({})

const currentJob = ref<any>(null)
const currentMatch = computed(() => {
  if (!currentJob.value) return { percent: 0, missing: [] as string[] }
  const userSkills = (store.userInfo?.skills || []).map(s => String(s).toLowerCase())
  const jobSkills = (currentJob.value.skills || []).map((s: any) => String(s).toLowerCase())
  const matched = jobSkills.filter((s: any) => userSkills.includes(s))
  const percent = jobSkills.length ? Number((matched.length / jobSkills.length).toFixed(2)) : 0
  const missing = (currentJob.value.skills || []).filter((s: any) => !userSkills.includes(String(s).toLowerCase()))
  return { percent, missing }
})

const openDetail = (id: string) => router.push({ name: 'JobDetail', params: { id } })
const gotoLearning = () => router.push({ name: 'Learning' })
const generatePlan = async (m: RichMatchItem) => {
  const userId = localStorage.getItem('userId') || store.userInfo?._id || ''
  const missing = Array.isArray(m?.missingSkills) ? m.missingSkills : []
  if (!userId) return router.push({ name: 'Learning' })
  try {
    await createLearningPlan({ userId, missingSkills: missing })
  } catch {}
  router.push({ name: 'Learning' })
}
const gotoProfile = () => router.push({ name: 'Profile' })

// 构建AI推荐理由：若缓存命中优先返回，否则基于匹配/缺失技能生成简洁说明
const buildReason = (m: RichMatchItem) => {
  if (aiReasons.value[m.jobId]) return aiReasons.value[m.jobId]
  const matched = (m.skills || []).filter(s => (store.userInfo?.skills || []).includes(s))
  const missing = (m.missingSkills || [])
  const head = matched.length ? `你的 ${matched.slice(0,3).join('、')} 能力与岗位要求高度匹配` : '你的技能与岗位有一定匹配度'
  const tail = missing.length ? `，建议补充 ${missing.slice(0,2).join('、')} 以提升竞争力。` : '。继续保持与加深实践经验。'
  return head + tail
}
const defaultAdvice = computed(() => {
  const m = currentMatch.value
  const miss = m.missing.slice(0, 2).join('、')
  const tail = miss ? `建议补充 ${miss} 以提升竞争力。` : '建议在关键技能上加深项目实践。'
  return `AI 建议：你的能力与该岗位总体匹配，${tail}`
})

onMounted(async () => {
  // 数据流程：
  // 1) 若从详情页带入 from=jobId，拉取该岗位用于当前分析区
  // 2) 拉取匹配结果并过滤到 Top3
  // 3) 对 Top3 进行详情补充（技能/薪资/城市/匹配度）以丰富展示
  // 4) 并行调用 AI：为当前岗位生成建议、为 Top3 逐条生成推荐理由（命中缓存则直接返回）
  const userId = localStorage.getItem('userId') || store.userInfo?._id || ''
  try {
    const fromId = String(route.query.from || '')
    if (fromId) {
      try {
        currentJob.value = await getJobDetail(fromId)
      } catch {}
    }
    const list = await matchJobs({ userId })
    const target = String(store.userInfo?.targetJob || '').trim()
    const listFiltered = (list || [])
      .filter((x: any) => Array.isArray(x.skills) && x.skills.length >= 3)
      .filter((x: any) => !target || new RegExp(target, 'i').test(String(x.jobTitle || '')) || new RegExp(target, 'i').test(String((x as any).keyword || '')))
    const top3 = listFiltered.slice(0, 3)
    const enriched: RichMatchItem[] = []
    for (const item of top3) {
      try {
        const detail = await getJobDetail(item.jobId)
        const ms = typeof (detail as any).matchScore === 'number' ? (detail as any).matchScore : item.matchScore
        const miss = Array.isArray((detail as any).missingSkills) ? (detail as any).missingSkills : item.missingSkills
        enriched.push({ ...item, skills: detail.skills, salary: detail.salary, city: detail.city, matchScore: ms, missingSkills: miss })
      } catch {
        enriched.push(item)
      }
    }
    results.value = enriched
    const advicePromise = (async () => {
      if (!currentJob.value) return
      const userSkills = (store.userInfo?.skills || [])
      const jobSkills = (currentJob.value.skills || [])
      const userLower = userSkills.map(s => String(s).toLowerCase())
      const jobLower = jobSkills.map((s: any) => String(s).toLowerCase())
      const matched = jobLower.filter((s: any) => userLower.includes(s))
      const percent = jobLower.length ? Number((matched.length / jobLower.length).toFixed(2)) : 0
      const missing = jobSkills.filter((s: any) => !userLower.includes(String(s).toLowerCase()))
      try {
        const r = await generateAiReason({
          type: 'advice',
          jobId: currentJob.value.jobId || String(route.query.from || ''),
          jobTitle: currentJob.value.title,
          company: currentJob.value.company,
          requiredSkills: jobSkills,
          missingSkills: missing,
          matchScore: percent,
          userSkills,
        })
        aiAdvice.value = r.text || ''
      } catch {}
    })()
    const reasonPromises = results.value.slice(0, 3).map(async (item) => {
      try {
        const r = await generateAiReason({
          type: 'reason',
          jobId: item.jobId,
          jobTitle: item.jobTitle,
          company: item.company,
          requiredSkills: item.skills || [],
          missingSkills: item.missingSkills || [],
          matchScore: item.matchScore || 0,
          userSkills: (store.userInfo?.skills || []),
        })
        if (r && r.text) {
          aiReasons.value[item.jobId] = r.text
        }
      } catch {}
    })
    await Promise.all([advicePromise, ...reasonPromises])
  } catch (e) {
    console.error(e)
  }
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.match-page { padding: $spacing-xl; background: $color-background; min-height: 100vh; }
.top-alert { margin-bottom: $spacing-lg; }
.section-title { font-size: 16px; font-weight: 600; color: $color-title; margin-bottom: 12px; }

.result-grid { margin-top: $spacing-md; }
/* 推荐卡片：固定高度，内部使用 flex 布局，将主体设为滚动区域 */
.result-card {
  border-radius: $border-radius-card;
  height: 420px; /* 固定卡片高度，三张卡保持等高 */
  display: flex;
  flex-direction: column;
}
/* 将 Element Plus 的 el-card__body 设置为 flex 容器，以便内部卡头/主体/按钮分区 */
.result-card :deep(.el-card__body) {
  height: 100%;
  display: flex;
  flex-direction: column;
}
/* 卡头（标题与匹配度）固定高度，不参与滚动 */
.card-header { flex: 0 0 auto; }
/* 主体内容：当内容超出时出现滚动条，避免撑高卡片 */
.card-body { flex: 1 1 auto; overflow-y: auto; padding-top: 6px; }
/* 底部操作区固定在卡片底部 */
.actions { flex: 0 0 auto; margin-top: $spacing-md; display: flex; gap: $spacing-md; }

.card-header { display: flex; align-items: center; justify-content: space-between; }
.title-area { display: grid; grid-template-columns: auto auto; grid-template-rows: auto auto; column-gap: $spacing-md; row-gap: 6px; align-items: baseline; }
.job-title { font-size: 18px; font-weight: 600; color: $color-title; }
.score-chip { margin-left: 4px; }
.company { grid-column: 1 / -1; color: $color-subtle; }

.reason { margin-top: $spacing-md; }
.reason-title { font-weight: 600; color: $color-title; margin-bottom: 6px; }
.reason-text { color: $color-body; line-height: 1.6; }

.skills { margin-top: $spacing-md; }
.skills-title { font-weight: 600; color: $color-title; margin-bottom: 6px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.skill { border-radius: $border-radius; }

.actions { margin-top: $spacing-md; display: flex; gap: $spacing-md; }

.cta-card { margin-top: $spacing-lg; border-radius: $border-radius-card; }
.cta-row { display: flex; align-items: center; justify-content: space-between; }
.cta-title { font-weight: 600; color: $color-title; }
.cta-sub { color: $color-subtle; margin-top: 4px; }
.cta-actions { display: flex; gap: $spacing-md; }
.top-job { margin-bottom: $spacing-lg; border-radius: $border-radius-card; }
.top-grid { display: grid; grid-template-columns: 220px 1fr; gap: $spacing-lg; align-items: center; }
.top-title { font-weight: 600; color: $color-title; }
.top-company { color: $color-subtle; margin-top: 6px; }
.top-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px; }
.top-suggest { color: $color-body; line-height: 1.6; }
</style>
