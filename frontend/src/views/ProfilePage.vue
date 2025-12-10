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
          <el-button type="primary" plain @click="openAdd">添加</el-button>
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
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { type FormInstance, type FormRules } from 'element-plus'
import { useUserStore } from '@/stores/userStore'
import { updateSkills, updateProfile, UserAPI, getResume, deleteResume } from '@/api/user'
import request from '@/api/request'
import { Upload } from '@element-plus/icons-vue'

const store = useUserStore()
const userId = ref<string | null>(localStorage.getItem('userId'))
const formRef = ref<FormInstance>()

// 个人基础资料表单
const form = reactive({
  username: '',
  email: '',
  phone: '',
  targetJob: '',
})

const skills = ref<string[]>([])
const ratingMap = reactive<Record<string, number>>({})
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
    if (raw) {
      Object.assign(ratingMap, JSON.parse(raw))
    }
  } catch {}
}

// 保存本地技能评分
const saveRatings = () => {
  try {
    localStorage.setItem(ratingsKey.value, JSON.stringify(ratingMap))
  } catch {}
}

const starText = (n: number) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n)
const tagClass = (name: string) => {
  const r = ratingMap[name] ?? 3
  if (r <= 2) return 'tag-yellow'
  if (r <= 4) return 'tag-blue'
  return 'tag-green'
}

// 从 Store 同步用户信息到表单与技能列表
const syncFromStore = () => {
  if (store.userInfo) {
    form.username = store.userInfo.username
    form.email = store.userInfo.email
    form.targetJob = store.userInfo.targetJob || ''
    form.phone = store.userInfo.phone || ''
    skills.value = Array.isArray(store.userInfo.skills) ? store.userInfo.skills : []
    const r = store.userInfo.resume
    const validResume = r && r.size > 0 && ((r.filename && r.filename.trim()) || (r.mimeType && r.mimeType.trim()))
    resumeMeta.value = validResume ? {
      filename: r!.filename,
      mimeType: r!.mimeType,
      size: r!.size,
      uploadedAt: r!.uploadedAt as any,
    } : null
    if (resumeMeta.value) {
      refreshInlinePreview()
    } else {
      inlinePreviewSrc.value = ''
    }
  }
}

onMounted(async () => {
  loadRatings()
  if (!store.userInfo && userId.value) {
    await store.fetchUserInfo(userId.value)
  }
  syncFromStore()
})

watch(
  () => store.userInfo,
  () => syncFromStore()
)

const saving = ref(false)
// 保存用户资料
const saveProfile = async () => {
  if (!userId.value) return
  saving.value = true
  try {
    const valid = await formRef.value?.validate().catch(() => false)
    if (!valid) {
      saving.value = false
      return
    }
    await updateProfile({
      userId: userId.value,
      username: form.username,
      email: form.email,
      phone: form.phone,
      targetJob: form.targetJob,
    })
    await updateSkills({ userId: userId.value, skills: skills.value, targetJob: form.targetJob })
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
const openAdd = (visible?: boolean, name?: string, rate?: number) => { dialog.visible = visible || false; dialog.name = name || ''; dialog.rate = rate || 3 }
const confirmAdd = async () => {
  if (!userId.value) return
  const name = dialog.name.trim()
  if (!name) return
  if (skills.value.includes(name)) {
    ratingMap[name] = dialog.rate
    saveRatings()
    dialog.visible = false
    return
  }
  adding.value = true
  try {
    const next = [...skills.value, name]
    await updateSkills({ userId: userId.value, skills: next, targetJob: form.targetJob })
    skills.value = next
    ratingMap[name] = dialog.rate
    saveRatings()
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
const removeSkill = async (name: string) => {
  if (!userId.value) return
  remove.value = name
  try {
    const next = skills.value.filter((s) => s !== name)
    await updateSkills({ userId: userId.value, skills: next, targetJob: form.targetJob })
    skills.value = next
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

const resumeMeta = ref<{ filename: string; mimeType: string; size: number; uploadedAt?: string } | null>(null)
const selectedFile = ref<File | null>(null)
const uploading = ref(false)
const onResumeUploadChange = async (file: any) => {
  const raw = (file && file.raw) ? (file.raw as File) : null
  selectedFile.value = raw
  if (!userId.value || !raw) return
  if (raw.size > 5 * 1024 * 1024) { ElMessage.error('文件不能超过 5MB'); return }
  uploading.value = true
  uploadPercent.value = 0
  try {
    const reader = new FileReader()
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
const refreshInlinePreview = async () => {
  if (!userId.value || !resumeMeta.value) return
  try {
    const data = await getResume(userId.value)
    if ((data.mimeType || '').toLowerCase() === 'application/pdf') {
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
    await deleteResume(userId.value)
    resumeMeta.value = null
    inlinePreviewSrc.value = ''
    await store.fetchUserInfo(userId.value)
    ElMessage.success('已删除简历')
  } catch (e) {
    console.error(e)
  }
}
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.profile-page { padding: $spacing-xl; }
.page-title { margin-bottom: $spacing-lg; color: $color-title; font-weight: 600; }
.grid { display: grid; grid-template-columns: 1fr 380px; gap: $spacing-xl; }
.info-card, .skills-card, .resume-card { border-radius: $border-radius-card; }
.section-title { color: $color-primary; font-weight: 600; margin-bottom: $spacing-md; }
.form .el-form-item { margin-bottom: $spacing-md; }
.save-btn { width: 100%; }
.skills-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: $spacing-md; }
.title-group .title { color: $color-primary; font-weight: 600; }
.title-group .sub { color: $color-subtle; font-size: 13px; }
.skills-list { display: flex; flex-wrap: wrap; gap: $spacing-sm; }
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
