<template>
  <div class="page-content">
    <el-card class="overview-card" shadow="hover">
      <div class="overview-row">
        <div class="overview-left">
          <div class="overview-title">学习计划总览</div>
          <div class="overview-sub">已完成 {{ completedCount }} 项 / 共 {{ totalCount }} 项</div>
          <el-progress :percentage="overallPercent" :stroke-width="10" status="success" />
        </div>
        <div class="overview-right">
          <div class="metric">
            <div class="metric-label">完成度</div>
            <div class="metric-value">{{ overallPercent }}%</div>
          </div>
          <div class="metric">
            <div class="metric-label">进行中</div>
            <div class="metric-value">{{ inProgressCount }}</div>
          </div>
          <div class="metric">
            <div class="metric-label">未开始</div>
            <div class="metric-value">{{ notStartedCount }}</div>
          </div>
        </div>
      </div>
    </el-card>

    <div class="section-title">技能学习任务</div>
    <div class="skill-list">
      <el-card v-for="g in skillGroups" :key="g.skill" class="skill-card" shadow="never">
        <div class="skill-header">
          <div class="skill-name">{{ g.skill }}</div>
          <div class="skill-header-right">
            <el-progress :percentage="g.percent" :stroke-width="8" />
            <el-button
              v-if="g.courses.length && g.courses.every((x) => x.progress >= 100)"
              size="small"
              type="danger"
              class="clear-btn"
              @click="onClearSkill(g.skill)"
            >清空该技能课程</el-button>
          </div>
        </div>
        <div class="course-list">
          <div v-for="(c, idx) in g.courses" :key="idx" class="course-item-card" :class="{ done: c.progress >= 100 }">
            <!-- 顶部：复选框 + 课程标题 + 状态标签（右侧） -->
            <div class="course-top">
              <div class="course-top-left">
                <el-checkbox :model-value="c.progress >= 100" @change="onToggleDone(g.skill, c, $event)" />
                <div class="course-title">{{ c.course }}</div>
              </div>
              <el-tag v-if="c.progress >= 100" type="success" effect="light">已完成</el-tag>
              <el-tag v-else-if="c.progress > 0" type="warning" effect="plain">进行中</el-tag>
              <el-tag v-else type="info" effect="plain">未开始</el-tag>
            </div>

            <!-- 进度：宽滑块占卡片约70%，右侧百分比文本 -->
            <div class="course-progress">
              <el-slider
                v-model="c.progress"
                :min="0"
                :max="100"
                :step="5"
                :show-tooltip="true"
                :format-tooltip="(v:number)=> v + '%'"
                @change="onSlideProgress(g.skill, c, c.progress)"
                class="course-slider"
              />
              <div class="course-percent">{{ c.progress }}%</div>
            </div>

            <!-- 元信息：时长与链接操作 -->
            <div class="course-meta">
              <div class="course-links">
                <el-link type="primary" :href="c.url" target="_blank">前往课程</el-link>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
  </template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getLearningPlan, updateCourseProgress, clearSkillPlan, type PlanItem } from '@/api/learning'
import { useUserStore } from '@/stores/userStore'
import { ElMessageBox, ElMessage } from 'element-plus'

/**
 * 学习计划页（Skill -> Courses）
 * - 数据来源：/api/learning/:userId 返回的 plan 列表
 * - 交互：每个课程提供“完成勾选”与“百分比滑块”的双向联动；持久化到后端
 * - 业务规则：当某技能下所有课程均为 100% 时，后端将该技能加入用户技能列表；否则移除
 */
const store = useUserStore()
const plan = ref<PlanItem[]>([])
// 课程预计时长展示（示意值）；如需真实值，可在后端计划项中添加字段并回传

// 顶部概览数据：总数/已完成/进行中/未开始/总体完成度
const totalCount = computed(() => plan.value.length)
const completedCount = computed(() => plan.value.filter(i => i.progress >= 100).length)
const inProgressCount = computed(() => plan.value.filter(i => i.progress > 0 && i.progress < 100).length)
const notStartedCount = computed(() => plan.value.filter(i => i.progress === 0).length)
const overallPercent = computed(() => {
  if (!totalCount.value) return 0
  return Math.round((completedCount.value / totalCount.value) * 100)
})

// 将扁平的计划项按技能分组：每个技能一张卡，内部包含课程列表与技能完成百分比
const skillGroups = computed(() => {
  const groups: Record<string, PlanItem[]> = {}
  for (const item of plan.value) {
    const k = item.skill
    if (!groups[k]) groups[k] = []
    groups[k].push(item)
  }
  return Object.entries(groups).map(([skill, courses]) => {
    const done = courses.filter(c => c.progress >= 100).length
    const percent = Math.round((done / courses.length) * 100)
    return { skill, percent, courses }
  })
})

// 初始化：拉取用户学习计划列表（若为空则显示空状态）
onMounted(async () => {
  const userId = localStorage.getItem('userId') || (store.userInfo as any)?._id || ''
  if (!userId) return
  try {
    const resp = await getLearningPlan(userId)
    plan.value = Array.isArray(resp?.plan) ? resp.plan : []
  } catch (e) {
    console.error(e)
  }
})

// 进度滑块变更：提交 0-100 的课程进度；v-model 保持本地状态，@change 持久化到后端；若达到 100%，勾选自动为“完成”
const onSlideProgress = async (skill: string, c: PlanItem, val: number) => {
  const userId = localStorage.getItem('userId') || (store.userInfo as any)?._id || ''
  if (!userId) return
  const progress = Math.max(0, Math.min(100, Math.round(val)))
  try {
    await updateCourseProgress({ userId, skill, course: c.course, progress })
    // 成功后保持本地 v-model 值（避免 UI 回退）；如果需要强制刷新，也可重新获取计划
    c.progress = progress
    const group = skillGroups.value.find((g) => g.skill === skill)
    const allDone = group ? group.courses.every((x) => x.progress >= 100) : false
    // 同步技能栏（后端可能新增或移除技能）
    if (userId) await store.fetchUserInfo(userId)
    if (allDone) {
      ElMessageBox.alert(`恭喜你，已完成「${skill}」技能的所有课程，该技能已加入你的技能列表。`, '学习完成', {
        confirmButtonText: '知道了'
      })
    }
  } catch (e) {
    console.error(e)
  }
}

// 完成勾选：与滑块联动，勾选=100，取消=0；提交并根据是否全部完成弹窗与同步技能栏
const onToggleDone = async (skill: string, c: PlanItem, checked: boolean) => {
  const userId = localStorage.getItem('userId') || (store.userInfo as any)?._id || ''
  if (!userId) return
  const progress = checked ? 100 : 0
  try {
    await updateCourseProgress({ userId, skill, course: c.course, progress })
    c.progress = progress
    const group = skillGroups.value.find((g) => g.skill === skill)
    const allDone = group ? group.courses.every((x) => x.progress >= 100) : false
    if (userId) await store.fetchUserInfo(userId)
    if (allDone) {
      ElMessageBox.alert(`恭喜你，已完成「${skill}」技能的所有课程，该技能已加入你的技能列表。`, '学习完成', {
        confirmButtonText: '知道了'
      })
    }
  } catch (e) {
    console.error(e)
  }
}

// 清空技能课程：当该技能的所有课程均完成后，允许一键移除该技能的计划项
const onClearSkill = async (skill: string) => {
  const userId = localStorage.getItem('userId') || (store.userInfo as any)?._id || ''
  if (!userId) return
  try {
    await ElMessageBox.confirm(`确定清空技能「${skill}」的所有课程吗？该操作仅移除学习计划，不影响你已获得的技能。`, '确认操作', {
      confirmButtonText: '清空',
      cancelButtonText: '取消',
      type: 'warning'
    })
  } catch {
    return
  }
  try {
    const resp = await clearSkillPlan({ userId, skill })
    // 本地移除对应技能的计划项，保持 UI 一致
    plan.value = plan.value.filter((p) => p.skill !== skill)
    ElMessage.success(`已清空「${skill}」技能的课程（${resp.removed} 项）`)
  } catch (e) {
    console.error(e)
  }
}

</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.page-content { padding: $spacing-xl; background: $color-background; min-height: 100vh; }
.section-title { font-size: 16px; font-weight: 600; color: $color-title; margin: 18px 0 10px; }

.overview-card { border-radius: $border-radius-card; margin-bottom: $spacing-lg; }
.overview-row { display: flex; align-items: center; justify-content: space-between; }
.overview-left { flex: 1 1 auto; }
.overview-title { font-size: 18px; font-weight: 600; color: $color-title; }
.overview-sub { color: $color-subtle; margin: 8px 0; }
.overview-right { flex: 0 0 auto; display: flex; gap: 24px; }
.metric { text-align: right; }
.metric-label { color: $color-subtle; }
.metric-value { font-size: 18px; font-weight: 600; color: $color-title; }

.skill-list { display: grid; grid-template-columns: 1fr; gap: $spacing-md; }
.skill-card { border-radius: $border-radius-card; box-shadow: 0 6px 18px rgba(0,0,0,0.06); transition: box-shadow .2s ease; }
.skill-card:hover { box-shadow: 0 12px 28px rgba(0,0,0,0.09); }
.skill-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.skill-name { font-weight: 600; color: $color-title; }
.skill-header-right { display: inline-flex; align-items: center; gap: 12px; }
.clear-btn { margin-left: 8px; }
.course-list { display: flex; flex-direction: column; gap: 12px; }
.course-item-card { background: #fff; border: 1px solid $color-border; border-radius: $border-radius-card; padding: 12px 16px; display: flex; flex-direction: column; gap: 10px; }
.course-item-card.done .course-title { color: $color-subtle; text-decoration: line-through; }
.course-top { display: flex; align-items: center; justify-content: space-between; }
.course-top-left { display: flex; align-items: center; gap: 10px; }
.course-title { color: $color-body; }
.course-progress { display: flex; align-items: center; gap: 12px; }
.course-slider { flex: 1 1 auto; min-width: 60%; }
.course-percent { width: 60px; text-align: right; color: $color-subtle; }
.course-meta { display: flex; align-items: center; justify-content: space-between; }
.course-time { display: inline-flex; align-items: center; gap: 6px; color: $color-subtle; }
.course-links { display: inline-flex; align-items: center; gap: 16px; }
</style>
