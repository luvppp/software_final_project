<template>
  <div class="home-page">
    <el-card class="hero-card" shadow="never">
      <div class="hero-row">
        <div class="avatar">{{ initials }}</div>
        <div class="hero-text">
          <div class="hero-title">欢迎回来，{{ username }}</div>
          <div class="hero-sub">当前求职意向：{{ targetJob || '未设置' }}</div>
        </div>
        <div class="hero-action">
          <el-button type="primary" size="large" @click="startMatch">开始智能匹配</el-button>
        </div>
      </div>
    </el-card>

    <div class="section">
      <div class="section-title">推荐岗位</div>
      <el-row :gutter="16">
        <template v-if="!loadingJobs">
          <el-col v-for="item in jobs" :key="item.jobId" :xs="24" :sm="12" :md="8">
            <el-card class="job-card" shadow="hover">
              <div class="job-title">{{ item.jobTitle }}</div>
              <div class="job-company">{{ item.company }}</div>
              <div class="job-match">
                <span class="percent">{{ Math.round(((item.matchScore) || 0) * 100) }}%</span>
                <span class="label">预计匹配度</span>
              </div>
              <div class="job-actions">
                <el-link type="primary" @click="openDetail(item.jobId)">查看详情</el-link>
              </div>
            </el-card>
          </el-col>
        </template>
        <template v-else>
          <el-col :xs="24" :sm="12" :md="8"><el-card class="job-card" shadow="never"><el-skeleton :rows="3" animated /></el-card></el-col>
          <el-col :xs="24" :sm="12" :md="8"><el-card class="job-card" shadow="never"><el-skeleton :rows="3" animated /></el-card></el-col>
          <el-col :xs="24" :sm="12" :md="8"><el-card class="job-card" shadow="never"><el-skeleton :rows="3" animated /></el-card></el-col>
        </template>
      </el-row>
    </div>

    <el-card class="progress-card" shadow="never">
      <div class="progress-row">
        <div class="progress-left">
          <div class="progress-title">学习进度</div>
          <div class="progress-sub">已完成 {{ completedCount }} 项 / 共 {{ totalCount }} 项</div>
          <el-progress :percentage="overallPercent" :stroke-width="12" />
        </div>
        <div class="progress-right">
          <div class="value">{{ overallPercent }}%</div>
          <el-link type="primary" @click="gotoLearning">查看学习计划</el-link>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/userStore'
import { matchJobs, type MatchItem } from '@/api/job'
import { getLearningPlan, type PlanItem } from '@/api/learning'

const router = useRouter()
const store = useUserStore()

const username = computed(() => store.userInfo?.username || '用户')
const initials = computed(() => (username.value || '').slice(0, 2))
const targetJob = computed(() => store.userInfo?.targetJob || '')

const jobs = ref<MatchItem[]>([])
const loadingJobs = ref(true)

const plan = ref<PlanItem[]>([])
const totalCount = computed(() => plan.value.length)
const completedCount = computed(() => plan.value.filter(i => i.progress >= 100).length)
const overallPercent = computed(() => totalCount.value ? Math.round((completedCount.value / totalCount.value) * 100) : 0)

const startMatch = () => router.push({ name: 'MatchResult' })
const openDetail = (id: string) => router.push({ name: 'JobDetail', params: { id } })
const gotoLearning = () => router.push({ name: 'Learning' })

onMounted(async () => {
  const userId = localStorage.getItem('userId') || store.userInfo?._id || ''
  try {
    const resp = await getLearningPlan(userId)
    plan.value = Array.isArray(resp?.plan) ? resp.plan : []
  } catch {}
  try {
    const list = await matchJobs({ userId })
    jobs.value = (list || []).slice(0, 3)
  } catch {}
  loadingJobs.value = false
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.home-page { padding: $spacing-xl; background: $color-background; min-height: 100vh; }
.hero-card { background: linear-gradient(90deg, #2f6fed, #3b82f6); color: #fff; border-radius: $border-radius-card; }
.hero-row { display: grid; grid-template-columns: 80px 1fr auto; gap: $spacing-lg; align-items: center; }
.avatar { width: 64px; height: 64px; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-weight: 600; }
.hero-title { font-size: 20px; font-weight: 600; }
.hero-sub { opacity: 0.9; margin-top: 6px; }
.hero-action { display: flex; align-items: center; }

.section { margin-top: $spacing-xl; }
.section-title { font-size: 16px; font-weight: 600; color: $color-title; margin-bottom: 12px; }
.job-card { border-radius: $border-radius-card; }
.job-title { font-size: 16px; font-weight: 600; color: $color-title; }
.job-company { color: $color-subtle; margin-top: 6px; }
.job-match { margin-top: 10px; display: flex; align-items: baseline; gap: 8px; }
.percent { color: #2f6fed; font-size: 22px; font-weight: 700; }
.label { color: $color-subtle; }
.job-actions { margin-top: 12px; }

.progress-card { margin-top: $spacing-xl; border-radius: $border-radius-card; }
.progress-row { display: flex; align-items: center; justify-content: space-between; }
.progress-title { font-weight: 600; color: $color-title; }
.progress-sub { color: $color-subtle; margin: 6px 0 12px; }
.progress-right { text-align: right; }
.value { font-size: 18px; font-weight: 600; color: $color-title; margin-bottom: 8px; }
</style>
