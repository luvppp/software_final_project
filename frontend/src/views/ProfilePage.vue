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
import { updateSkills, updateProfile } from '@/api/user'

const store = useUserStore()
const userId = ref<string | null>(localStorage.getItem('userId'))
const formRef = ref<FormInstance>()

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

const ratingsKey = computed(() => (userId.value ? `skillRatings:${userId.value}` : 'skillRatings'))

const loadRatings = () => {
  try {
    const raw = localStorage.getItem(ratingsKey.value)
    if (raw) {
      Object.assign(ratingMap, JSON.parse(raw))
    }
  } catch {}
}

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

const syncFromStore = () => {
  if (store.userInfo) {
    form.username = store.userInfo.username
    form.email = store.userInfo.email
    form.targetJob = store.userInfo.targetJob || ''
    form.phone = store.userInfo.phone || ''
    skills.value = Array.isArray(store.userInfo.skills) ? store.userInfo.skills : []
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
</script>

<style scoped lang="scss">
@use '@/styles/tokens' as *;

.profile-page { padding: $spacing-xl; }
.page-title { margin-bottom: $spacing-lg; color: $color-title; font-weight: 600; }
.grid { display: grid; grid-template-columns: 1fr 380px; gap: $spacing-xl; }
.info-card, .skills-card { border-radius: $border-radius-card; }
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