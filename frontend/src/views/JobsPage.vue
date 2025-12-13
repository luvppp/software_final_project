<template>
  <div class="jobs-page">
    <div class="search-bar">
      <!-- 关键字搜索输入框 -->
      <el-input v-model="form.keyword" placeholder="搜索职位名称" :prefix-icon="SearchIcon" clearable />
      <!-- 城市筛选（可过滤与清空） -->
      <el-select v-model="form.city" placeholder="城市" filterable clearable class="city-select" @change="fetchJobs(1)">
        <el-option v-for="c in cities" :key="c" :label="c" :value="c" />
      </el-select>
      <!-- 是否为实习岗位筛选（全部/实习/非实习） -->
      <el-select v-model="form.isIntern" placeholder="岗位类型" clearable class="type-select" @change="fetchJobs(1)">
        <el-option label="全部" :value="''" />
        <el-option label="实习" :value="'true'" />
        <el-option label="非实习" :value="'false'" />
      </el-select>
      <el-button type="primary" class="search-btn" :loading="loading" @click="fetchJobs(1)">搜索岗位</el-button>
    </div>

    <div class="list">
      <el-empty v-if="!loading && jobs.length === 0" description="暂无岗位" />
      <el-skeleton v-else-if="loading" :rows="5" animated />
      <template v-else>
        <el-card v-for="item in jobs" :key="item.jobId" class="job-card" @click="openDetail(item.jobId)">
          <div class="left">
            <!-- 标题与“实习”标签 -->
            <div class="title-row">
              <div class="title">{{ item.title }}</div>
              <el-tag v-if="item.isIntern" size="small" type="warning" class="intern">实习</el-tag>
            </div>
            <div class="sub">{{ item.company }} · {{ item.city || '—' }}</div>
            <div class="skills">
              <el-tag v-for="s in (item.skills || []).slice(0, 8)" :key="s" type="info" class="skill">{{ s }}</el-tag>
            </div>
          </div>
          <div class="right">
            <div class="salary">{{ item.salary || '—' }}</div>
            <el-button class="detail" size="small" @click="openDetail(item.jobId)">查看详情</el-button>
          </div>
        </el-card>

        <div class="pager">
          <el-pagination
            background
            layout="prev, pager, next, jumper"
            :page-size="meta.limit"
            :total="meta.total"
            :current-page="meta.page"
            @current-change="fetchJobs"
          />
        </div>
      </template>
    </div>

    
  </div>
  
</template>

<script setup lang="ts">
// 岗位列表页面职责：
// - 提供关键字/城市/岗位类型筛选与分页
// - 展示岗位卡片并可进入详情页
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { Search } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import { listJobs, listCities, type JobItem } from '@/api/job'

// Icon：搜索图标
const SearchIcon = Search

// 查询条件与状态
// - form：keyword/city/isIntern 三项筛选（isIntern：''|'true'|'false'）
// - cities：城市备选列表；loading/jobs/meta：加载态、数据与分页元数据
const form = reactive<{ keyword: string; city: string; isIntern: string }>({ keyword: '', city: '', isIntern: '' })
const cities = ref<string[]>([])
const loading = ref(false)
const jobs = ref<JobItem[]>([])
const meta = reactive({ total: 0, page: 1, limit: 10 })

const store = useUserStore()
const router = useRouter()
// 拉取岗位列表：支持分页与多条件筛选
const fetchJobs = async (page?: number) => {
  loading.value = true
  try {
    // prefer：从用户 Store 的 targetJob 注入，提升与意向岗位相关的排序优先级
    // isInternParam：将下拉值映射为后端需要的布尔/undefined
    const prefer = store.userInfo?.targetJob?.trim() || undefined
    const isInternParam = form.isIntern === '' ? undefined : form.isIntern === 'true'
    const res = await listJobs({ page: page ?? meta.page, limit: 10, keyword: (form.keyword || '').trim(), city: (form.city || '').trim(), prefer, isIntern: isInternParam })
    jobs.value = res.list
    meta.total = res.meta.total
    meta.page = res.meta.page
    meta.limit = res.meta.limit
  } finally {
    loading.value = false
  }
}

// 打开详情页
const openDetail = (id: string) => {
  router.push(`/jobs/${id}`)
}

// 拉取城市列表
const fetchCities = async () => {
  try {
    cities.value = await listCities()
  } catch {}
}

// 页面挂载：并行拉取城市与首屏列表
onMounted(() => {
  fetchCities()
  fetchJobs(1)
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.jobs-page { padding: $spacing-xl; }
.search-bar { display: grid; grid-template-columns: 1fr 220px 160px 160px; gap: $spacing-md; margin-bottom: $spacing-lg; }
.type-select { width: 100%; }
.city-select { width: 100%; }
.search-btn { border-radius: $border-radius-button; }
.list { display: grid; gap: $spacing-md; }
.job-card { border-radius: $border-radius-card; border: 1px solid $color-border; }
.job-card:hover { box-shadow: 0px 3px 0px rgba(0,0,0,0.15);cursor:pointer; }
.job-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr 240px; align-items: center; padding: 10px 18px; min-height: 112px; }
.left { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.title-row { display: flex; align-items: center; gap: 8px; }
.title { font-weight: 400; color: $color-title; }
.intern { height: 20px; line-height: 18px; }
.sub { color: $color-subtle; margin-bottom: 12px; }
.skills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.skill { background: #eef3ff; color: #1f67ff; border-radius: 999px; border: 1px solid #d6e4ff; padding: 1px 8px; font-size: 11px; }
.right { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; gap: 6px; justify-self: end; text-align: right; }
.salary { color: #ff6d3d; font-weight: 600; }
.detail { width: auto; height: 26px; padding: 0 10px; border-radius: 18px; font-size: 13px; }
.pager { display: flex; justify-content: center; margin-top: $spacing-md; }


</style>
