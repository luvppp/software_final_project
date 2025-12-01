<template>
  <div class="detail-page">
    <!-- 顶部导航栏 -->
    <div class="header-row">
      <el-button link @click="goBack" class="back-btn">
        <el-icon>
          <ArrowLeft />
        </el-icon> 返回岗位列表
      </el-button>
    </div>

    <!-- 岗位概要卡片 -->
    <el-card class="summary-card" shadow="hover">
      <div class="summary-content">
        <div class="info-section">
          <!-- 岗位标题 -->
          <h1 class="job-title">{{ job.title }}</h1>

          <!-- 岗位元数据：公司、地点、薪资 -->
          <div class="meta-row">
            <div class="meta-item">
              <el-icon>
                <OfficeBuilding />
              </el-icon>
              <span>{{ job.company }}</span>
            </div>
            <div class="meta-item">
              <el-icon>
                <Location />
              </el-icon>
              <span>{{ job.city || '—' }}</span>
            </div>
            <div class="meta-item salary">
              <el-icon>
                <Wallet />
              </el-icon>
              <span>{{ job.salary || '—' }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧操作区 -->
        <div class="action-section">
          <el-button type="success" class="view-btn" @click="viewOriginal">查看详情</el-button>
          <el-button type="primary" class="match-btn" @click="matchNow">立即匹配此岗位</el-button>
        </div>
      </div>
    </el-card>

    <!-- 主要内容区域：左侧详情 + 右侧分析 -->
    <div class="main-grid">
      <!-- 左侧：岗位详情 -->
      <div class="left-column">
        <!-- 岗位职责 -->
        <el-card class="detail-block" shadow="hover">
          <template #header>
            <div class="block-header">岗位职责</div>
          </template>
          <ul class="duty-list">
            <li v-for="(item, index) in duties" :key="'duty-' + index">{{ item }}</li>
          </ul>
        </el-card>

        <!-- 任职要求 -->
        <el-card class="detail-block" shadow="hover">
          <template #header>
            <div class="block-header">任职要求</div>
          </template>
          <ul class="req-list">
            <li v-for="(item, index) in requirements" :key="'req-' + index">{{ item }}</li>
          </ul>
        </el-card>

        <!-- 公司简介 -->
        <el-card class="detail-block" shadow="hover">
          <template #header>
            <div class="block-header">公司简介</div>
          </template>
          <div class="company-intro">
            {{ companyIntro || '暂无公司简介信息' }}
          </div>
        </el-card>
      </div>

      <!-- 右侧：技能匹配分析 -->
      <div class="right-column">
        <el-card class="analysis-card" shadow="hover">
          <div class="analysis-header">
            <h3>技能匹配分析</h3>
            <p>AI 智能分析结果</p>
          </div>

          <!-- 匹配度环形图 -->
          <div class="score-container">
            <el-progress type="circle" :percentage="Math.round(matchScore * 100)" :width="120" :stroke-width="10"
              color="#409eff" />
            <div class="score-label">综合匹配度</div>
          </div>

          <!-- 技能要求标签 -->
          <div class="skills-section">
            <div class="section-label">技能要求</div>
            <div class="tags-wrapper">
              <el-tag v-for="s in requiredSkills" :key="s" class="skill-tag" effect="light">
                {{ s }}
              </el-tag>
            </div>
          </div>

          <!-- 缺失技能标签 -->
          <div class="skills-section">
            <div class="section-label">缺失技能</div>
            <div class="tags-wrapper">
              <el-tag v-for="s in missingSkills" :key="s" class="skill-tag missing" effect="plain" type="warning">
                {{ s }}
              </el-tag>
            </div>
          </div>

          <!-- 生成学习计划按钮 -->
          <el-button type="primary" class="plan-btn" @click="gotoLearning">生成学习计划</el-button>
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
import { ArrowLeft, OfficeBuilding, Location, Wallet } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const store = useUserStore()

// 岗位数据状态：详情与核心字段
const job = ref<any>({ title: '', company: '', city: '', salary: '', skills: [] })
const duties = ref<string[]>([])
const requirements = ref<string[]>([])
const companyIntro = ref('')

// 计算属性：仅展示前8个核心技能
const requiredSkills = computed(() => (job.value.skills || []).slice(0, 8))

// 计算属性：技能匹配度
const matchScore = computed(() => {
  const userSkills = (store.userInfo?.skills || []).map((s) => String(s).toLowerCase())
  const jobSkills = (job.value.skills || []).map((s: any) => String(s).toLowerCase())

  if (!jobSkills.length) return 0

  const matched = jobSkills.filter((s: any) => userSkills.includes(s))
  return Number((matched.length / jobSkills.length).toFixed(2))
})

// 计算属性：缺失技能
const missingSkills = computed(() => {
  const userSkills = (store.userInfo?.skills || []).map((s) => String(s).toLowerCase())
  const jobSkills = (job.value.skills || []).map((s: any) => String(s)) // 保持原大小写展示

  return jobSkills.filter((s: any) => !userSkills.includes(String(s).toLowerCase()))
})

// 路由跳转方法
const goBack = () => router.push('/jobs')
const gotoLearning = () => router.push('/learning')
const matchNow = () => {
  // 预留功能：立即匹配
  console.log('Match now clicked')
}

const viewOriginal = () => {
  if (job.value.url) {
    window.open(job.value.url, '_blank')
  }
}

// 生命周期钩子：加载数据
onMounted(async () => {
  const id = String(route.params.id || '')
  if (!id) return

  try {
    const detail = await getJobDetail(id)
    job.value = detail

    // 处理岗位职责：优先使用数组，否则进行清洗提取
    if (Array.isArray(detail.duties) && detail.duties.length > 0) {
      duties.value = detail.duties.map(cleanTextLine).filter(Boolean)
    } else {
      duties.value = extractAndCleanBullets(detail.description, 'duty')
    }

    // 处理任职要求：同职责，优先数组回退解析
    if (Array.isArray(detail.requirements) && detail.requirements.length > 0) {
      requirements.value = detail.requirements.map(cleanTextLine).filter(Boolean)
    } else {
      requirements.value = extractAndCleanBullets(detail.description, 'req')
    }

    // 处理公司简介：保持原文展示
    companyIntro.value = String(detail.companyIntro || '')
  } catch (error) {
    console.error('Failed to fetch job detail:', error)
  }
})

/**
 * 清洗单行文本
 * 去除常见的序号前缀 (如 "1.", "1、", "•") 和无意义字符
 */
function cleanTextLine(text: string): string {
  if (!text) return ''
  // 1. 去除开头的数字序号、特殊符号、空格
  let cleaned = text.replace(/^[\s\d\.\、\-\•\·\*]+/, '').trim()

  // 2. 去除可能包含的"岗位职责"、"任职要求"等标题性文字（如果爬虫没分干净）
  cleaned = cleaned.replace(/^(岗位职责|任职要求|职位描述)[:：]?\s*/, '')

  return cleaned
}

/**
 * 从长文本中提取并清洗列表项
 * @param text 完整描述文本
 * @param type 类型：'duty' (职责) | 'req' (要求)
 */
function extractAndCleanBullets(text: string, type: 'duty' | 'req'): string[] {
  const raw = String(text || '')

  // 按常见分隔符拆分行
  const lines = raw
    .split(/\n|；|;|。|•|·|-/)
    .map(s => cleanTextLine(s))
    .filter(s => s.length >= 4) // 过滤过短的行

  // 关键词过滤
  const includeDuty = ['负责', '参与', '承担', '推进', '设计', '优化', '维护', '搭建', '实现', '编写', '调试', '测试', '管理', '沟通', '协作', '支持', '跟进', '分析']
  const includeReq = ['熟悉', '掌握', '精通', '具备', '具有', '持有', '善于', '能够', '了解', '至少', '优秀', '本科', '学历', '经验', '能力', '英语', '团队', '沟通', '优先', '加分']

  const keywords = type === 'duty' ? includeDuty : includeReq

  // 筛选包含关键词的行，并去重
  const filtered = lines.filter(s => {
    // 基础关键词匹配
    if (!keywords.some(k => s.includes(k))) return false

    // 强力过滤：看起来像公司名或职位名的
    if (/(公司|集团|分行|中心|部)$/.test(s)) return false
    if (/有限公司|株式会社/.test(s)) return false
    if (/工程师|专家|架构师|专员|经理|主管|实习生/.test(s) && s.length < 20) return false

    // 🛑 停止词
    if (/推荐|相似|看过/.test(s) && s.length < 10) return false
    // 🚫 强力过滤
    if (/招聘/.test(s)) return false

    return true
  })

  return Array.from(new Set(filtered)).slice(0, 8) // 最多显示8条
}
</script>

<style scoped lang="scss">
// 引入设计变量（假设 tokens 文件存在）
// 如果没有 tokens 文件，这里使用硬编码颜色作为回退
$color-primary: #409eff;
$color-text-main: #303133;
$color-text-regular: #606266;
$color-text-secondary: #909399;
$bg-color-page: #f5f7fa;

.detail-page {
  padding: 24px;
  background-color: $bg-color-page;
  min-height: 100vh;
}

.header-row {
  margin-bottom: 20px;

  .back-btn {
    font-size: 14px;
    color: $color-text-regular;

    &:hover {
      color: $color-primary;
    }
  }
}

/* 概要卡片样式 */
.summary-card {
  border-radius: 12px;
  margin-bottom: 24px;
  border: none;

  .summary-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
  }

  .job-title {
    font-size: 24px;
    font-weight: 600;
    color: $color-primary;
    margin: 0 0 16px 0;
  }

  .meta-row {
    display: flex;
    gap: 32px;

    .meta-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: $color-text-regular;
      font-size: 14px;

      .el-icon {
        font-size: 16px;
        color: $color-text-secondary;
      }

      &.salary {
        color: #ff6d3d;
        font-weight: 600;
        font-size: 16px;

        .el-icon {
          color: #ff6d3d;
        }
      }
    }
  }

  .action-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .match-btn {
    padding: 12px 24px;
    font-size: 16px;
    border-radius: 8px;
    width: 100%;
    margin: 0;
  }

  .view-btn {
    padding: 12px 24px;
    font-size: 16px;
    border-radius: 8px;
    width: 100%;
    margin: 0;
  }
}

/* 主网格布局 */
.main-grid {
  display: grid;
  grid-template-columns: 1fr 360px;
  gap: 24px;
}

/* 左侧详情块样式 */
.left-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-block {
  border-radius: 12px;
  border: none;

  .block-header {
    font-size: 16px;
    font-weight: 600;
    color: $color-text-main;
    padding-left: 12px;
    border-left: 4px solid $color-primary;
    line-height: 1;
  }

  ul {
    padding-left: 20px;
    margin: 0;

    li {
      margin-bottom: 12px;
      line-height: 1.6;
      color: $color-text-regular;
      font-size: 14px;

      &::marker {
        color: $color-primary;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .company-intro {
    line-height: 1.8;
    color: $color-text-regular;
    font-size: 14px;
    white-space: pre-wrap;
    text-align: justify;
  }
}

/* 右侧分析卡片样式 */
.analysis-card {
  border-radius: 12px;
  border: none;
  position: sticky;
  top: 24px;

  .analysis-header {
    margin-bottom: 24px;

    h3 {
      font-size: 16px;
      font-weight: 600;
      margin: 0 0 4px 0;
      color: $color-text-main;
    }

    p {
      font-size: 12px;
      color: $color-text-secondary;
      margin: 0;
    }
  }

  .score-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 32px;

    .score-label {
      margin-top: 12px;
      font-size: 14px;
      color: $color-text-regular;
    }
  }

  .skills-section {
    margin-bottom: 24px;

    .section-label {
      font-size: 14px;
      color: $color-text-main;
      margin-bottom: 12px;
      font-weight: 500;
    }

    .tags-wrapper {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .skill-tag {
      border-radius: 4px;

      &.missing {
        background-color: #fff3e6;
        border-color: #ffdbc2;
        color: #ff8f1f;
      }
    }
  }

  .plan-btn {
    width: 100%;
    padding: 12px;
    font-size: 16px;
    border-radius: 8px;
    margin-top: 12px;
  }
}
</style>
