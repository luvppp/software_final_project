<template>
  <div class="profile-page">
    <h2 class="page-title">个人资料</h2>
  <div class="grid">
      <el-card class="info-card">
        <div class="section-title">个人基础信息</div>
        <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" class="form">
          <el-form-item label="姓名" prop="username">
            <el-input v-model="form.username" />
          </el-form-item>
          <el-form-item label="邮箱" prop="email">
            <el-input v-model="form.email" />
          </el-form-item>
          <el-form-item label="手机号" prop="phone">
            <el-input v-model="form.phone" />
          </el-form-item>
          <el-form-item label="意向岗位" prop="targetJob">
            <el-input v-model="form.targetJob" />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" class="save-btn" :loading="saving" @click="saveProfile">保存资料</el-button>
          </el-form-item>
        </el-form>
      </el-card>

      <el-card class="skills-card">
        <div class="skills-header">
          <div class="title-group">
            <div class="title">技能管理</div>
            <div class="sub">管理你的专业技能</div>
          </div>
          <div>
            <el-button type="primary" plain @click="openAdd">添加</el-button>
            <el-button type="warning" plain @click="clearSkills">清空</el-button>
          </div>
        </div>

        <div class="skills-list">
          <div v-for="s in skills" :key="s" class="skill-tag" :class="tagClass(s)" @click="openAdd(true,s,ratingMap[s] || 3)">
            <span class="name">{{ s }}</span>
            <span class="stars">{{ starText(ratingMap[s] || 3) }}</span>
            <el-button link type="success" class="remove" @click.stop="removeSkill(s)">x</el-button>
          </div>
        </div>
      </el-card>

      <el-card class="resume-card">
        <div class="section-title">简历管理</div>
        <div class="resume-tip">上传你的简历文件（支持 PDF、DOC、DOCX 格式，最大 5MB）</div>
        <div class="resume-info" v-if="resumeMeta">
          <span class="line">文件：{{ resumeMeta.filename }}</span>
          <el-tag type="info" effect="light">{{ resumeMeta.mimeType }}</el-tag>
          <el-tag type="success" effect="light">{{ (resumeMeta.size/1024).toFixed(1) }} KB</el-tag>
          <span class="line" v-if="resumeMeta.uploadedAt">时间：{{ formatTime(resumeMeta.uploadedAt) }}</span>
          <el-button link type="primary" @click="downloadResumeFile">下载</el-button>
          <el-button link type="danger" @click="deleteResumeFile">删除</el-button>
          <el-button link type="success" :loading="parsing" @click="parseResumeSkillsAction">解析技能</el-button>
        </div>

        <div class="resume-zone">
          <el-upload class="uploader full" drag :show-file-list="false" :auto-upload="false" :on-change="onResumeUploadChange" accept=".pdf,.doc,.docx" :action="'/'">
            <div class="drop-big">
              <el-icon class="upload-icon"><Upload /></el-icon>
              <div class="drop-text">点击或拖拽文件到这里上传</div>
              <div class="drop-sub">支持 PDF、DOC、DOCX 格式，最大 5MB</div>
            </div>
          </el-upload>
          <div v-if="uploading" class="upload-progress">
            <el-progress :percentage="uploadPercent" :stroke-width="6" status="success" />
            <div class="upload-overlay">正在上传 {{ uploadPercent }}%</div>
          </div>
        </div>

        <div v-if="inlinePreviewSrc && isPdfPreview" class="inline-preview">
          <iframe :src="inlinePreviewSrc" class="pdf-frame"></iframe>
        </div>
      </el-card>

      
    </div>

    <el-dialog v-model="dialog.visible" title="添加新技能" width="480px">
      <div class="dialog-body">
        <div class="field">
          <div class="label">技能名称</div>
          <el-input v-model="dialog.name" placeholder="例如：Python" />
        </div>
        <div class="field">
          <div class="label">熟练度</div>
          <el-rate v-model="dialog.rate" :max="5" />
        </div>
      </div>
      <template #footer>
        <el-button type="primary" class="dialog-save" :loading="adding" @click="confirmAdd">添加技能</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { updateSkills, updateProfile, UserAPI, getResume, deleteResume, parseResumeSkills } from '@/api/user'
import request from '@/api/request'
import { Upload } from '@element-plus/icons-vue'
/*
  组件职责说明：
  - 本页面用于管理用户基础资料、技能列表，以及简历的上传、预览与技能解析。
  - 布局采用两列栅格：左侧“个人信息”与右侧“技能管理”卡片固定高度显示；
    当技能过多时，通过卡片内部滚动展示，卡片本身尺寸不变化。
  - 下方“简历管理”卡片横跨整行宽度，支持 PDF 内联预览，并可触发服务端解析技能。
*/

const store = useUserStore()
const userId = ref<string | null>(localStorage.getItem('userId'))
const formRef = ref<FormInstance>()

// 表单模型：个人基础资料（与后端字段保持一致）
const form = reactive({
  username: '',
  email: '',
  phone: '',
  targetJob: '',
})

const skills = ref<string[]>([])
const ratingMap = reactive<Record<string, number>>({})
// 表单校验规则：基础必填与格式校验
const rules: FormRules = {
  username: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, message: '姓名长度不能少于2位', trigger: 'change' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'change' },
  ],
  phone: [
    { required: true, message: '请输入手机号', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入合法手机号', trigger: 'change' },
  ],
  targetJob: [
    { required: true, message: '请输入意向岗位', trigger: 'blur' },
  ],
}

// 本地存储评分的 Key（按用户维度隔离）
const ratingsKey = computed(() => (userId.value ? `skillRatings:${userId.value}` : 'skillRatings'))

// 加载本地技能评分
const loadRatings = () => {
  try {
    const raw = localStorage.getItem(ratingsKey.value)
    // 从本地读取评分字典（按用户维度隔离），并合入响应式对象
    if (raw) {
      Object.assign(ratingMap, JSON.parse(raw))
    }
  } catch {}
}

// 保存本地技能评分
const saveRatings = () => {
  try {
    // 将评分字典持久化到本地存储，避免刷新丢失
    localStorage.setItem(ratingsKey.value, JSON.stringify(ratingMap))
  } catch {}
}

// 将评分转换为星级文本（左侧填充星，右侧空星）
const starText = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n)
// 根据评分返回标签颜色：低(黄)、中(蓝)、高(绿)
const tagClass = (name: string) => {
  const r = ratingMap[name] ?? 3
  if (r <= 2) return 'tag-yellow'
  if (r <= 4) return 'tag-blue'
  return 'tag-green'
}

// 从 Store 同步用户信息到表单与技能列表，并处理简历元信息与内联预览
const syncFromStore = () => {
  if (store.userInfo) {
    // 同步基础资料与技能列表
    form.username = store.userInfo.username
    form.email = store.userInfo.email
    form.targetJob = store.userInfo.targetJob || ''
    form.phone = store.userInfo.phone || ''
    skills.value = Array.isArray(store.userInfo.skills) ? store.userInfo.skills : []
    const r = store.userInfo.resume
    // 判断简历是否有效（有文件名或 MIME 且 size>0）
    const validResume = r && r.size > 0 && ((r.filename && r.filename.trim()) || (r.mimeType && r.mimeType.trim()))
    resumeMeta.value = validResume ? {
      filename: r!.filename,
      mimeType: r!.mimeType,
      size: r!.size,
      uploadedAt: r!.uploadedAt as any,
    } : null
    if (resumeMeta.value) {
      // 有简历时刷新内联预览
      refreshInlinePreview()
    } else {
      inlinePreviewSrc.value = ''
    }
  }
}

onMounted(async () => {
  // 初始化加载本地评分，必要时拉取用户信息
  loadRatings()
  if (!store.userInfo && userId.value) {
    await store.fetchUserInfo(userId.value)
  }
  syncFromStore()
  await nextTick()
})

watch(
  () => store.userInfo,
  () => syncFromStore()
)

const saving = ref(false)
// 保存用户资料：提交基础信息与技能到后端，并刷新 Store
const saveProfile = async () => {
  if (!userId.value) return
  saving.value = true
  try {
    // 先进行表单校验；失败则中止
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) {
      saving.value = false
      return
    }
    // 更新基础资料
    await updateProfile({
      userId: userId.value,
      username: form.username,
      email: form.email,
      phone: form.phone,
      targetJob: form.targetJob,
    })
    // 同步技能列表与意向岗位
    await updateSkills({ userId: userId.value, skills: skills.value, targetJob: form.targetJob })
    // 刷新 Store
    await store.fetchUserInfo(userId.value)
    ElMessage.success('资料已保存')
  } catch (e: any) {
    console.error(e)
  } finally {
    saving.value = false
  }
}

const dialog = reactive({ visible: false, name: '', rate: 3 })
const adding = ref(false)
// 打开添加技能对话框：支持预填名称与评分（用于点击已有标签时编辑）
const openAdd = (visible?: boolean, name?: string, rate?: number) => {
  // 预填名称与评分（点击现有标签进入编辑）
  dialog.visible = visible || false; dialog.name = name || ''; dialog.rate = rate || 3
}
// 确认添加技能：去重合并评分，写入后端并同步到本地评分
const confirmAdd = async () => {
  if (!userId.value) return
  const name = dialog.name.trim()
  if (!name) return
  if (skills.value.includes(name)) {
    // 已存在则仅更新评分并保存本地
    ratingMap[name] = dialog.rate
    saveRatings()
    dialog.visible = false
    return
  }
  adding.value = true
  try {
    // 追加技能并写后端
    const next = [...skills.value, name]
    await updateSkills({ userId: userId.value, skills: next, targetJob: form.targetJob })
    skills.value = next
    // 记录评分并持久化
    ratingMap[name] = dialog.rate
    saveRatings()
    // 刷新 Store 并提示
    await store.fetchUserInfo(userId.value)
    ElMessage.success('已添加技能')
    dialog.visible = false
  } catch (e: any) {
    console.error(e)
  } finally {
    adding.value = false
  }
}

const remove = ref<string | null>(null)
// 移除技能：更新后端，再同步本地评分并刷新 Store
const removeSkill = async (name: string) => {
  if (!userId.value) return
  remove.value = name
  try {
    // 过滤掉目标技能并写后端
    const next = skills.value.filter((s) => s !== name)
    await updateSkills({ userId: userId.value, skills: next, targetJob: form.targetJob })
    skills.value = next
    // 删除本地评分并持久化
    delete ratingMap[name]
    saveRatings()
    await store.fetchUserInfo(userId.value)
    ElMessage.success('已移除技能')
  } catch (e: any) {
    console.error(e)
  } finally {
    remove.value = null
  }
}

// 清空技能：二次确认后清空技能列表与本地评分
const clearSkills = async () => {
  if (!userId.value) return
  try {
    // 二次确认后清空技能并写后端
    await ElMessageBox.confirm('清空后无法恢复，是否继续？', '确认操作', { type: 'warning' })
    await updateSkills({ userId: userId.value, skills: [], targetJob: form.targetJob })
    skills.value = []
    // 清空本地评分并持久化
    Object.keys(ratingMap).forEach((k) => { delete ratingMap[k] })
    saveRatings()
    await store.fetchUserInfo(userId.value)
    ElMessage.success('已清空技能')
  } catch {}
}

const resumeMeta = ref<{ filename: string; mimeType: string; size: number; uploadedAt?: string } | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
// 简历上传处理：读取为 Base64 后发往后端，限制 5MB，并更新内联预览
const onResumeUploadChange = async (file: any) => {
  const raw = (file && file.raw) ? (file.raw as File) : null
  selectedFile.value = raw
  if (!userId.value || !raw) return
  // 大小限制：5MB
  if (raw.size > 5 * 1024 * 1024) { ElMessage.error('文件不能超过 5MB'); return }
  uploading.value = true
  uploadPercent.value = 0
  try {
    const reader = new FileReader()
    // 将文件读为 DataURL，读取进度占总进度前 50%
    const dataUrl: string = await new Promise((resolve, reject) => {
      reader.onprogress = (e: ProgressEvent<FileReader>) => {
        const total = (e.total || raw.size)
        if (total) {
          uploadPercent.value = Math.min(50, Math.round((e.loaded / total) * 50))
        }
      }
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error('文件读取失败'))
      reader.readAsDataURL(raw)
    })
    // 发送上传请求；HTTP 上传进度占后 50%
    const meta = await request.put(UserAPI.UPLOAD_RESUME, { userId: userId.value, fileName: raw.name, mimeType: raw.type || 'application/octet-stream', base64: dataUrl }, {
      onUploadProgress: (e) => {
        const total = e.total || 1
        const ratio = total ? e.loaded / total : 0
        uploadPercent.value = 50 + Math.round(ratio * 50)
      },
    }) as any
    resumeMeta.value = meta
    await store.fetchUserInfo(userId.value)
    ElMessage.success('简历已上传')
    selectedFile.value = null
    await refreshInlinePreview()
  } catch (e) {
    console.error(e)
  } finally {
    uploading.value = false
    uploadPercent.value = 0
  }
}
const formatTime = (t: string | Date | undefined) => {
  if (!t) return ''
  const d = typeof t === 'string' ? new Date(t) : t
  return d.toLocaleString()
}
const uploadPercent = ref(0)
const inlinePreviewSrc = ref('')
const isPdfPreview = computed(() => Boolean(inlinePreviewSrc.value) && Boolean(resumeMeta.value) && (resumeMeta.value!.mimeType || '').toLowerCase() === 'application/pdf')
// 刷新内联预览：仅当服务器返回的简历为 PDF 时设置 iframe 预览
const refreshInlinePreview = async () => {
  if (!userId.value || !resumeMeta.value) return
  try {
    const data = await getResume(userId.value)
    // 仅当 MIME 为 PDF 时设置内联预览地址
    if ( (data.mimeType || '').toLowerCase() === 'application/pdf') {
      inlinePreviewSrc.value = data.base64
    } else {
      inlinePreviewSrc.value = ''
    }
  } catch {}
}
const downloadResumeFile = async () => {
  if (!userId.value) return
  try {
    const data = await getResume(userId.value)
    // 通过 a 标签触发浏览器下载
    const a = document.createElement('a')
    a.href = data.base64
    a.download = data.filename || 'resume'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  } catch (e) {
    console.error(e)
  }
}
const deleteResumeFile = async () => {
  if (!userId.value) return
  try {
    // 删除服务器上的简历并清空本地预览
    await deleteResume(userId.value)
    resumeMeta.value = null
    inlinePreviewSrc.value = ''
    await store.fetchUserInfo(userId.value)
    ElMessage.success('已删除简历')
  } catch (e) {
    console.error(e)
  }
}

const parsing = ref(false)
// 解析简历技能：调用后端解析文本并聚合技能，进行大小写与变体归一化后合并到本地
const parseResumeSkillsAction = async () => {
  if (!userId.value) return
  if (!resumeMeta.value) { ElMessage.info('请先上传简历'); return }
  parsing.value = true
  try {
    // 调用后端解析技能
    const r = await parseResumeSkills(userId.value)
    const canon = (s: string) => {
      const t = s.toLowerCase()
      // 对常见技能变体做归一化处理，避免重复
      if (['js','javascript'].includes(t)) return 'JavaScript'
      if (['ts','typescript'].includes(t)) return 'TypeScript'
      if (['node','nodejs','node.js'].includes(t)) return 'Node.js'
      if (['vue','vue.js'].includes(t)) return 'Vue'
      if (['react','react.js'].includes(t)) return 'React'
      if (['angular'].includes(t)) return 'Angular'
      if (['mysql'].includes(t)) return 'MySQL'
      if (['postgresql','postgres'].includes(t)) return 'PostgreSQL'
      if (['mongodb'].includes(t)) return 'MongoDB'
      if (['redis'].includes(t)) return 'Redis'
      if (['docker'].includes(t)) return 'Docker'
      if (['kubernetes','k8s'].includes(t)) return 'Kubernetes'
      if (['html'].includes(t)) return 'HTML'
      if (['css'].includes(t)) return 'CSS'
      if (['sass'].includes(t)) return 'Sass'
      if (['less'].includes(t)) return 'Less'
      if (['webpack'].includes(t)) return 'Webpack'
      if (['vite'].includes(t)) return 'Vite'
      if (['jest'].includes(t)) return 'Jest'
      if (['mocha'].includes(t)) return 'Mocha'
      if (['junit'].includes(t)) return 'JUnit'
      if (['tensorflow'].includes(t)) return 'TensorFlow'
      if (['pytorch'].includes(t)) return 'PyTorch'
      if (['aws'].includes(t)) return 'AWS'
      if (['azure'].includes(t)) return 'Azure'
      if (['gcp','google cloud'].includes(t)) return 'GCP'
      if (['nginx'].includes(t)) return 'Nginx'
      if (['apache'].includes(t)) return 'Apache'
      if (['go','golang'].includes(t)) return 'Go'
      if (['rust'].includes(t)) return 'Rust'
      if (['scala'].includes(t)) return 'Scala'
      if (['kotlin'].includes(t)) return 'Kotlin'
      if (['swift'].includes(t)) return 'Swift'
      if (['php'].includes(t)) return 'PHP'
      if (['laravel'].includes(t)) return 'Laravel'
      if (['django'].includes(t)) return 'Django'
      if (['flask'].includes(t)) return 'Flask'
      if (['.net','dotnet','asp.net'].includes(t)) return '.NET'
      if (['oracle'].includes(t)) return 'Oracle'
      if (['sqlite'].includes(t)) return 'SQLite'
      if (['hive'].includes(t)) return 'Hive'
      if (['spark'].includes(t)) return 'Spark'
      if (['hadoop'].includes(t)) return 'Hadoop'
      if (['kafka'].includes(t)) return 'Kafka'
      if (['rabbitmq'].includes(t)) return 'RabbitMQ'
      if (['elasticsearch'].includes(t)) return 'Elasticsearch'
      if (['graphql'].includes(t)) return 'GraphQL'
      if (['rest','restful','restful api'].includes(t)) return 'REST'
      if (['grpc'].includes(t)) return 'gRPC'
      if (['protobuf','protocol buffers'].includes(t)) return 'Protocol Buffers'
      if (['websocket','websockets'].includes(t)) return 'WebSocket'
      if (['sap'].includes(t)) return 'SAP'
      if (['seo'].includes(t)) return 'SEO'
      if (['data analysis','数据分析'].includes(t)) return '数据分析'
      if (['machine learning','机器学习'].includes(t)) return '机器学习'
      if (['deep learning','深度学习'].includes(t)) return '深度学习'
      if (['algorithms','algorithm','算法'].includes(t)) return '算法'
      if (['data structures','数据结构'].includes(t)) return '数据结构'
      if (['设计模式'].includes(t)) return '设计模式'
      if (['微服务'].includes(t)) return '微服务'
      if (['分布式'].includes(t)) return '分布式'
      if (['高并发'].includes(t)) return '高并发'
      return s
    }
    // 合并当前与新增技能并去重
    const currentCanon = (skills.value || []).map(canon)
    const incomingCanon = (Array.isArray(r.addedSkills) ? r.addedSkills : []).map(canon)
    const next = Array.from(new Set([...currentCanon, ...incomingCanon]))
    const newRatings: Record<string, number> = {}
    // 评分映射按归一化后的键合并，取较大值
    Object.keys(ratingMap).forEach((k) => { newRatings[canon(k)] = Math.max(ratingMap[k] || 0, newRatings[canon(k)] || 0) })
    skills.value = next
    // 重建评分映射，确保键一致
    Object.keys(ratingMap).forEach((k) => { delete ratingMap[k] })
    Object.entries(newRatings).forEach(([k, v]) => { ratingMap[k] = v })
    saveRatings()
    // 写回后端并刷新 Store
    await updateSkills({ userId: userId.value, skills: next, targetJob: form.targetJob })
    await store.fetchUserInfo(userId.value)
    if (incomingCanon.length) {
      ElMessage.success(`已添加 ${incomingCanon.length} 项技能`)
    } else if (Array.isArray(r.totalFound) && r.totalFound.length) {
      ElMessage.info('解析完成，无新增技能')
    } else {
      ElMessage.info('未识别到技能')
    }
  } catch (e) {
    console.error(e)
  } finally {
    parsing.value = false
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

/* 页面布局说明：
   - 顶部为两列网格：左“个人信息”卡与右“技能管理”卡，均使用固定高度 360px；
   - 技能列表区域通过 overflow-y: auto 实现内部滚动，避免卡片整体高度变化；
   - 下方“简历管理”卡通过 grid-column: 1 / -1 横跨整行宽度。
*/
.profile-page { padding: $spacing-xl; }
.page-title { margin-bottom: $spacing-lg; color: $color-title; font-weight: 600; }
.grid { display: grid; grid-template-columns: 1fr 380px; gap: $spacing-xl; }
.info-card, .skills-card, .resume-card { border-radius: $border-radius-card; }
.resume-card { grid-column: 1 / -1; }
.info-card, .skills-card { height: 360px; }
.section-title { color: $color-primary; font-weight: 600; margin-bottom: $spacing-md; }
.form .el-form-item { margin-bottom: $spacing-md; }
.save-btn { width: 100%; }
.skills-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-md; }
.title-group .title { color: $color-primary; font-weight: 600; }
.title-group .sub { color: $color-subtle; font-size: 13px; }
.info-card :deep(.el-card__body) { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.skills-card { display: flex; flex-direction: column; }
.skills-card :deep(.el-card__body) { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
/* 技能列表容器：允许内部滚动，保持卡片固定尺寸 */
.skills-list { display: flex; flex-wrap: wrap; gap: $spacing-sm; overflow-y: auto; padding-right: 6px; flex: 1; min-height: 0; }
.skill-tag { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(0,0,0,0.06); }
.tag-yellow { background: #fff4d6; }
.tag-blue { background: #eaf2ff; }
.tag-green { background: #e9f7ef; }
.skill-tag { color: inherit; }
.tag-yellow .name, .tag-yellow .stars { color: #8a5a00; }
.tag-blue .name, .tag-blue .stars { color: #1f67ff; }
.tag-green .name, .tag-green .stars { color: #0a7a36; }
.name { font-weight: 500; }
.stars { font-size: 14px; letter-spacing: 2px; }
.remove { margin-left: 4px; }
.dialog-body { display: grid; gap: $spacing-md; }
.dialog-save { width: 100%; }

.resume-info { display: flex; align-items: center; gap: 10px; margin-bottom: $spacing-sm; }
.resume-info .line { font-size: 13px; color: $color-body; }
.resume-zone { position: relative; }
.uploader.full :deep(.el-upload--drag) { width: 100%; }
.drop-big { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; border: 2px dashed #95b5ff; border-radius: 16px; background: #f7fbff; }
.upload-progress { position: absolute; left: 16px; right: 16px; bottom: 16px; }
.upload-overlay { position: absolute; right: 20px; bottom: 24px; font-size: 12px; color: $color-primary; background: rgba(255,255,255,0.8); padding: 2px 8px; border-radius: 10px; }
.inline-preview { margin-top: $spacing-md; }
.file-input { border: 1px solid #e3e8f0; padding: 6px 10px; border-radius: 8px; }
.resume-tip { color: $color-subtle; margin-bottom: $spacing-sm; }
.uploader { flex: 1; }
.uploader :deep(.el-upload) { width: 100%; }
.uploader :deep(.el-upload--drag) { width: 100%; }
.drop-inner { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 28px; border: 1px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; }
.upload-icon { font-size: 28px; color: #9aa4b2; margin-bottom: 8px; }
.drop-text { color: $color-title; font-weight: 500; }
.drop-sub { color: $color-subtle; font-size: 12px; margin-top: 4px; }
.pdf-frame { width: 100%; height: 70vh; border: none; border-radius: 12px; }

/* 输入框背景浅灰 */
.form :deep(.el-input__wrapper) {
  background: #f3f5f9;
  box-shadow: inset 0 0 0 1px #e3e8f0;
  border-radius: 10px;
}
.form :deep(.el-input__wrapper:hover) {
  box-shadow: inset 0 0 0 1px #cbd5e1;
}
</style>
