<template>
  <div class="detail-page">
    <div class="header-row">
      <el-button link @click="goBack">返回岗位列表</el-button>
    </div>

    <el-card class="summary-card">
      <div class="summary">
        <div class="info">
          <div class="title">{{ job.title }}</div>
          <div class="meta-row">
            <span>{{ job.company }}</span>
            <span>{{ job.city || '—' }}</span>
            <span class="salary-text">{{ job.salary || '—' }}</span>
          </div>
        </div>
        <div class="side">
          <el-button type="primary" class="action" @click="matchNow">立即匹配此岗位</el-button>
        </div>
      </div>
    </el-card>

    <div class="grid">
      <div class="left">
        <el-card class="block">
          <div class="block-title">岗位职责</div>
          <ul class="bullets">
            <li v-for="d in duties.slice(0, 8)" :key="d">{{ d }}</li>
          </ul>
        </el-card>
        <el-card class="block">
          <div class="block-title">任职要求</div>
          <ul class="bullets">
            <li v-for="r in requirements.slice(0, 8)" :key="r">{{ r }}</li>
          </ul>
        </el-card>
        <el-card class="block">
          <div class="block-title">公司简介</div>
          <div class="intro">{{ companyIntro || '—' }}</div>
        </el-card>
      </div>
      <div class="right">
        <el-card class="analysis">
          <div class="analysis-title">技能匹配分析</div>
          <div class="sub">AI 智能分析结果</div>
          <div class="score-box">
            <el-progress :percentage="Math.round(matchScore * 100)" type="circle" :stroke-width="8" />
            <div class="score-text">综合匹配度</div>
          </div>
          <div class="section">
            <div class="section-title">技能要求</div>
            <div class="tags">
              <el-tag v-for="s in requiredSkills" :key="s" class="tag info">{{ s }}</el-tag>
            </div>
          </div>
          <div class="section">
            <div class="section-title">缺失技能</div>
            <div class="tags">
              <el-tag v-for="s in missingSkills" :key="s" class="tag warn">{{ s }}</el-tag>
            </div>
          </div>
          <el-button type="primary" class="plan" @click="gotoLearning">生成学习计划</el-button>
        </el-card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getJobDetail } from '@/api/job'
import { useUserStore } from '@/stores/userStore'

const route = useRoute()
const router = useRouter()
const store = useUserStore()

const job = ref<any>({ title: '', company: '', city: '', salary: '', skills: [] })
const duties = ref<string[]>([])
const requirements = ref<string[]>([])
const companyIntro = ref('')
const requiredSkills = computed(() => (job.value.skills || []).slice(0, 8))

const matchScore = computed(() => {
  const userSkills = (store.userInfo?.skills || []).map((s) => String(s))
  const js = (job.value.skills || []).map((s: any) => String(s))
  if (!js.length) return 0
  const matched = js.filter((s: any) => userSkills.includes(s))
  return Number((matched.length / js.length).toFixed(2))
})

const missingSkills = computed(() => {
  const userSkills = (store.userInfo?.skills || []).map((s) => String(s))
  const js = (job.value.skills || []).map((s: any) => String(s))
  return js.filter((s: any) => !userSkills.includes(s))
})

const goBack = () => router.push('/jobs')
const gotoLearning = () => router.push('/learning')
const matchNow = () => {}

onMounted(async () => {
  const id = String(route.params.id || '')
  const detail = await getJobDetail(id)
  job.value = detail
  duties.value = Array.isArray(detail.duties) ? detail.duties : extractBullets(detail.description, 'duty')
  requirements.value = Array.isArray(detail.requirements) ? detail.requirements : extractBullets(detail.description, 'req')
  companyIntro.value = String(detail.companyIntro || '')
})

function extractBullets(text: string, type: 'duty' | 'req'): string[] {
  const raw = String(text || '')
  const lines = raw
    .split(/\n|；|;|。|•|·|-/)
    .map((s) => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').trim())
    .filter(Boolean)
  const includeDuty = ['负责','参与','承担','推进','设计','开发','优化','维护','搭建','实现','编写','调试','测试','管理','沟通','协作','支持','跟进','分析']
  const includeReq = ['熟悉','掌握','精通','具备','有','善于','能够','了解','至少','优秀','本科','学历','经验','能力','英语','团队','沟通','优先','加分']
  const include = type === 'duty' ? includeDuty : includeReq
  const filtered = lines.filter((s) => include.some((k) => s.includes(k)) && /[\u4e00-\u9fa5A-Za-z]/.test(s) && s.length >= 4)
  return Array.from(new Set(filtered)).slice(0, 8)
}
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.detail-page { padding: $spacing-xl; }
.header-row { margin-bottom: $spacing-md; }
.summary-card { border-radius: $border-radius-card; margin-bottom: $spacing-md; }
.summary { display: grid; grid-template-columns: 1fr 260px; align-items: center; }
.info { display: flex; flex-direction: column; gap: 6px; }
.title { font-size: 18px; color: $color-primary; font-weight: 600; }
.meta-row { display: flex; align-items: center; gap: 16px; color: $color-subtle; }
.salary-text { color: #ff6d3d; font-weight: 600; }
.side { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
.action { border-radius: 18px; height: 32px; padding: 0 16px; }

.grid { display: grid; grid-template-columns: 1fr 380px; gap: $spacing-md; }
.block { border-radius: $border-radius-card; }
.block + .block { margin-top: $spacing-md; }
.block-title { font-weight: 600; color: $color-title; margin-bottom: 10px; }
.bullets { list-style: none; display: grid; gap: 10px; }
.bullets li { display: flex; align-items: flex-start; }
.bullets li::before { content: ''; display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: $color-primary; margin-right: 10px; margin-top: 7px; }
.intro { white-space: pre-wrap; color: $color-body; }

.analysis { border-radius: $border-radius-card; }
.analysis-title { font-weight: 600; color: $color-title; }
.sub { color: $color-subtle; margin-bottom: 12px; }
.score-box { display: flex; flex-direction: column; align-items: center; gap: 8px; margin: 8px 0 $spacing-md; }
.score-text { color: $color-body; }
.section { margin-bottom: $spacing-md; }
.section-title { color: $color-body; margin-bottom: 6px; }
.tags { display: flex; flex-wrap: wrap; gap: 8px; }
.tag { font-size: 12px; border-radius: 999px; }
.tag.info { background: #eaf2ff; color: #1f67ff; border: 1px solid #d6e4ff; }
.tag.warn { background: #fff3e6; color: #ff8f1f; border: 1px solid #ffe0bf; }
.plan { width: 100%; border-radius: $border-radius-button; height: 36px; }
</style>