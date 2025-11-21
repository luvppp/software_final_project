<template>
  <div class="jobs-page">
    <div class="search-bar">
      <el-input v-model="form.keyword" placeholder="搜索职位名称" :prefix-icon="SearchIcon" clearable />
      <el-select v-model="form.city" placeholder="城市" filterable clearable class="city-select" @change="fetchJobs(1)">
        <el-option v-for="c in cities" :key="c" :label="c" :value="c" />
      </el-select>
      <el-button type="primary" class="search-btn" :loading="loading" @click="fetchJobs(1)">搜索岗位</el-button>
    </div>

    <div class="list">
      <el-empty v-if="!loading && jobs.length === 0" description="暂无岗位" />
      <el-skeleton v-else-if="loading" :rows="5" animated />
      <template v-else>
        <el-card v-for="item in jobs" :key="item.jobId" class="job-card" @click="openDetail(item.jobId)">
          <div class="left">
            <div class="title">{{ item.title }}</div>
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
            layout="prev, pager, next"
            :page-size="meta.limit"
            :total="meta.total"
            :current-page="meta.page"
            @current-change="fetchJobs"
          />
        </div>
      </template>
    </div>

    <el-drawer v-model="drawer.visible" title="岗位详情" size="40%">
      <div v-if="drawer.detail">
        <div class="drawer-title">{{ drawer.detail.title }}</div>
        <div class="drawer-sub">{{ drawer.detail.company }} · {{ drawer.detail.city || '—' }}</div>
        <div class="drawer-section">
          <div class="label">技能</div>
          <div class="drawer-skills">
            <el-tag v-for="s in drawer.detail.skills" :key="s" type="info" class="skill">{{ s }}</el-tag>
          </div>
        </div>
        <div class="drawer-section">
          <div class="label">薪资</div>
          <div>{{ drawer.detail.salary || '—' }}</div>
        </div>
        <div class="drawer-section">
          <div class="label">描述</div>
          <div class="desc">{{ drawer.detail.description || '—' }}</div>
        </div>
      </div>
      <el-empty v-else description="暂无数据" />
    </el-drawer>
  </div>
  
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useUserStore } from '@/stores/userStore'
import { Search } from '@element-plus/icons-vue'
import { listJobs, getJobDetail, listCities, type JobItem } from '@/api/job'

const SearchIcon = Search

const form = reactive({ keyword: '', city: '' })
const cities = ref<string[]>([])
const loading = ref(false)
const jobs = ref<JobItem[]>([])
const meta = reactive({ total: 0, page: 1, limit: 10 })

const store = useUserStore()
const fetchJobs = async (page?: number) => {
  loading.value = true
  try {
    const prefer = store.userInfo?.targetJob?.trim() || undefined
    const res = await listJobs({ page: page ?? meta.page, limit: 10, keyword: (form.keyword || '').trim(), city: (form.city || '').trim(), prefer })
    jobs.value = res.list
    meta.total = res.meta.total
    meta.page = res.meta.page
    meta.limit = res.meta.limit
  } finally {
    loading.value = false
  }
}

const drawer = reactive<{ visible: boolean; detail: any | null }>({ visible: false, detail: null })
const openDetail = async (id: string) => {
  drawer.visible = true
  drawer.detail = null
  try {
    drawer.detail = await getJobDetail(id)
  } catch {}
}

const fetchCities = async () => {
  try {
    cities.value = await listCities()
  } catch {}
}

onMounted(() => {
  fetchCities()
  fetchJobs(1)
})
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.jobs-page { padding: $spacing-xl; }
.search-bar { display: grid; grid-template-columns: 1fr 220px 160px; gap: $spacing-md; margin-bottom: $spacing-lg; }
.city-select { width: 100%; }
.search-btn { border-radius: $border-radius-button; }
.list { display: grid; gap: $spacing-md; }
.job-card { border-radius: $border-radius-card; border: 1px solid $color-border; }
.job-card:hover { box-shadow: 0px 3px 0px rgba(0,0,0,0.15); }
.job-card :deep(.el-card__body) { display: grid; grid-template-columns: 1fr 240px; align-items: center; padding: 10px 18px; min-height: 112px; }
.left { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.title { font-weight: 400; color: $color-title; }
.sub { color: $color-subtle; margin-bottom: 12px; }
.skills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
.skill { background: #eef3ff; color: #1f67ff; border-radius: 999px; border: 1px solid #d6e4ff; padding: 1px 8px; font-size: 11px; }
.right { height: 100%; display: flex; flex-direction: column; justify-content: center; align-items: flex-end; gap: 6px; justify-self: end; text-align: right; }
.salary { color: #ff6d3d; font-weight: 600; }
.detail { width: auto; height: 26px; padding: 0 10px; border-radius: 18px; font-size: 13px; }
.pager { display: flex; justify-content: center; margin-top: $spacing-md; }

.drawer-title { font-weight: 600; color: $color-title; margin-bottom: 4px; }
.drawer-sub { color: $color-subtle; margin-bottom: 12px; }
.drawer-section { margin-bottom: 12px; }
.drawer-skills { display: flex; flex-wrap: wrap; gap: 8px; }
.label { color: $color-primary; font-weight: 600; margin-bottom: 6px; }
.desc { white-space: pre-wrap; }
</style>