<template>
  <div class="assistant-page">
    <div class="header">
      <div class="title">AI 职业助手</div>
      <div class="sub">与AI助手交流，获取职业发展建议和个性化指导</div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="newChat">新建对话</el-button>
        <el-button type="danger" plain :icon="Delete" @click="clearAll">清空所有对话</el-button>
      </div>
    </div>

    <div class="layout">
      <el-card class="list-card" shadow="hover">
        <div class="list-header">对话列表</div>
        <div class="list">
          <div
            v-for="c in convos"
            :key="c.id"
            class="list-item"
            :class="{ active: c.id === activeId }"
            @click="selectChat(c.id)"
          >
            <div class="list-meta">
              <span class="list-name"><el-icon class="msg-icon"><ChatLineRound /></el-icon> 对话 {{ c.name }}</span>
              <span class="list-count">{{ c.messages.length }} 条消息</span>
            </div>
            <button class="del" title="删除" @click.stop="deleteChat(c.id)">×</button>
          </div>
        </div>
      </el-card>

      <el-card class="chat-card" shadow="hover">
        <div class="chat-header">
          <div class="chat-title">对话 {{ currentName }}</div>
          <div class="chat-sub">{{ currentCount }}/15 条消息</div>
        </div>

        <div v-if="!currentCount" class="empty">
          <div class="robot">🤖</div>
          <div class="empty-title">开始与AI助手对话</div>
          <div class="empty-sub">我可以帮助您进行职业规划、技能提升建议等</div>
        </div>

        <div v-else ref="chatRef" class="chat-window">
          <div v-for="(m, idx) in currentMessages" :key="idx" class="msg" :class="m.role">
            <div v-if="m.role==='assistant'" class="bubble" v-html="mdToHtml(m.content)"></div>
            <div v-else class="bubble">{{ m.content }}</div>
          </div>
          <div v-if="loading" class="msg assistant">
            <div class="bubble">正在思考…</div>
          </div>
        </div>

        <div class="input-row">
          <el-input
            v-model="input"
            placeholder="输入您的问题…"
            type="textarea"
            :autosize="{ minRows: 1, maxRows: 4 }"
            @keydown.enter.prevent="onEnter"
          />
          <el-button type="primary" :disabled="!input.trim()" :loading="loading" @click="send">发送</el-button>
        </div>
        <div class="input-hint">按 Enter 发送，Shift + Enter 换行</div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
  import { ref, computed, nextTick, onMounted } from 'vue'
  import { aiChat, aiChatStream } from '@/api/user'
  import { ChatLineRound, Plus, Delete } from '@element-plus/icons-vue'
  import { ElMessageBox } from 'element-plus'

  // 会话与消息模型：
  // - 本地持久化按 userId 隔离，键名：assistant:convos:<userId>
  // - 每个会话最多保留 15 条消息（新增或流式追加时进行裁剪）
  type Msg = { role: 'user' | 'assistant'; content: string }
  type Convo = { id: string; name: string; messages: Msg[] }
  const key = (() => {
    const uid = localStorage.getItem('userId') || ''
    return uid ? `assistant:convos:${uid}` : 'assistant:convos'
  })()
  const convos = ref<Convo[]>([])
  const activeId = ref<string>('')
  // 初始化：读取本地存储，无则创建一个空会话
  const load = () => {
    try {
      const raw = localStorage.getItem(key)
      const arr = raw ? JSON.parse(raw) as Convo[] : []
      convos.value = Array.isArray(arr) ? arr : []
    } catch { convos.value = [] }
    if (!convos.value.length) {
      const id = String(Date.now())
      convos.value = [{ id, name: '1', messages: [] }]
      activeId.value = id
      save()
    } else {
      activeId.value = convos.value[0].id
    }
  }
  // 持久化到 localStorage
  const save = () => {
    try { localStorage.setItem(key, JSON.stringify(convos.value)) } catch {}
  }
  const selectChat = (id: string) => { activeId.value = id }
  // 新建会话：插到列表顶部并切换
  const newChat = () => {
    const id = String(Date.now())
    const name = String(convos.value.length + 1)
    convos.value.unshift({ id, name, messages: [] })
    activeId.value = id
    save()
  }
  // 删除会话：带确认框，删除后若为空则创建一个空会话
  const deleteChat = async (id: string) => {
    try {
      await ElMessageBox.confirm('确认删除该对话吗？删除后不可恢复', '提示', {
        type: 'warning',
        confirmButtonText: '删除',
        cancelButtonText: '取消',
      })
      const idx = convos.value.findIndex(c => c.id === id)
      if (idx >= 0) {
        convos.value.splice(idx, 1)
        if (!convos.value.length) {
          const nid = String(Date.now())
          convos.value = [{ id: nid, name: '1', messages: [] }]
          activeId.value = nid
        } else if (activeId.value === id) {
          activeId.value = convos.value[0].id
        }
        save()
      }
    } catch {}
  }
  // 清空所有会话：重置为一个空会话
  const clearAll = () => {
    const id = String(Date.now())
    convos.value = [{ id, name: '1', messages: [] }]
    activeId.value = id
    save()
  }
  onMounted(load)
  // 派生当前会话、消息与统计
  const current = computed(() => convos.value.find(c => c.id === activeId.value) || convos.value[0])
  const currentMessages = computed(() => current.value?.messages || [])
  const currentName = computed(() => current.value?.name || '1')
  const currentCount = computed(() => currentMessages.value.length)
  const input = ref('')
  const loading = ref(false)
  // 输入处理：Enter 发送，Shift+Enter 换行
  const onEnter = (e: KeyboardEvent) => {
    if (e.shiftKey) return
    send()
  }
  // 文本安全 Markdown 渲染：支持标题、加粗、列表；并转义 HTML
  const mdToHtml = (md: string) => {
    let s = String(md || '')
    s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    s = s.replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
    s = s.replace(/^##\s+(.*)$/gm, '<h3>$1</h3>')
    s = s.replace(/^#\s+(.*)$/gm, '<h3>$1</h3>')
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    const lines = s.split('\n')
    let out = ''
    let inUl = false
    for (const line of lines) {
      const m = /^[-*]\s+(.+)$/.exec(line)
      if (m) {
        if (!inUl) { out += '<ul>'; inUl = true }
        out += `<li>${m[1]}</li>`
      } else {
        if (inUl) { out += '</ul>'; inUl = false }
        if (line.trim()) out += `${line}<br/>`
      }
    }
    if (inUl) out += '</ul>'
    return out
  }

  const chatRef = ref<HTMLDivElement | null>(null)
  const scrollToBottom = () => {
    const el = chatRef.value
    if (el) el.scrollTop = el.scrollHeight
  }
  // 发送消息：
  // - 写入当前会话并裁剪到 15 条
  // - 调用流式接口，按 SSE 分块增量追加；尾包补齐
  // - 自动滚动到底部并持久化
  const send = async () => {
    const text = input.value.trim()
    if (!text || loading.value) return
    const target = current.value
    if (!target) return
    target.messages.push({ role: 'user', content: text })
    if (target.messages.length > 15) target.messages.splice(0, target.messages.length - 15)
    save()
    input.value = ''
    loading.value = true
    try {
      const payload = {
        messages: target.messages.slice(-15).map(m => ({ role: m.role, content: m.content })),
      }
      const idx = target.messages.push({ role: 'assistant', content: '' }) - 1
      const resp = await aiChatStream(payload)
      const reader = resp.body!.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        for (const line of lines) {
          const t = line.trim()
          if (!t) continue
          if (t.startsWith('data:')) {
            const payload = t.slice(5).trim()
            if (payload === '[DONE]') { continue }
            try {
              const j = JSON.parse(payload)
              const delta = j?.choices?.[0]?.delta?.content || ''
              if (delta) target.messages[idx].content += delta
            } catch {
              target.messages[idx].content += ''
            }
          } else {
            target.messages[idx].content += t
          }
          await nextTick()
          scrollToBottom()
          if (target.messages.length > 15) target.messages.splice(0, target.messages.length - 15)
          save()
        }
      }
      if (buffer.trim()) {
        try {
          const j = JSON.parse(buffer.trim().replace(/^data:\s*/, ''))
          const delta = j?.choices?.[0]?.delta?.content || ''
          if (delta) target.messages[idx].content += delta
        } catch {
          target.messages[idx].content += buffer.trim()
        }
      }
      await nextTick()
      scrollToBottom()
      if (!target.messages[idx].content) {
        const r = await aiChat(payload)
        const reply = (r && (r as any).reply) || (r as any)?.data?.reply || ''
        target.messages[idx].content = reply || '抱歉，暂时没有获得有效回复。'
      }
      if (target.messages.length > 15) target.messages.splice(0, target.messages.length - 15)
      save()
    } catch (e: any) {
      const msg = (e && e.message) ? String(e.message) : '网络错误'
      const target = current.value
      if (target) {
        target.messages.push({ role: 'assistant', content: `抱歉：${msg}` })
        if (target.messages.length > 15) target.messages.splice(0, target.messages.length - 15)
        save()
      }
    }
    loading.value = false
  }
  </script>
  
  <style scoped lang="scss">
  @use '@/styles/tokens' as *;

  .assistant-page { padding: $spacing-xl; background: $color-background; min-height: 100vh; }
  .header { margin-bottom: $spacing-lg; position: relative; }
  .header-actions { position: absolute; right: 0; top: 0; display: flex; gap: 10px; }
  .title { font-size: 22px; font-weight: 700; color: $color-title; }
  .sub { color: $color-subtle; margin-top: 4px; }
  .layout { display: grid; grid-template-columns: 220px 1fr; gap: $spacing-lg; }
  .list-card { border-radius: $border-radius-card; padding: $spacing-md; }
  .list-header { font-weight: 600; color: $color-title; margin-bottom: $spacing-sm; }
  .list { display: grid; gap: 8px; }
  .list-item { position: relative; padding: 10px 12px; border-radius: 10px; background: #f5f7fa; cursor: pointer; display: flex; align-items: center; justify-content: space-between; border: 1px solid transparent; }
  .list-item.active { background: #eef6ff; border-color: #a6c8ff; box-shadow: 0 0 0 2px #cfe2ff inset; }
  .list-name { color: #2b2f36; }
  .list-count { color: $color-subtle; margin-left: 8px; }
  .del { opacity: 0; transition: opacity .2s; background: transparent; border: none; color: #ff4d4f; font-size: 18px; line-height: 1; cursor: pointer; }
  .list-item:hover .del { opacity: 1; }

  .chat-card { border-radius: $border-radius-card; padding: $spacing-md; }
  .chat-header { display: flex; align-items: baseline; gap: 12px; margin-bottom: $spacing-sm; }
  .chat-title { font-weight: 600; color: $color-title; }
  .chat-sub { color: $color-subtle; }
  .empty { height: 360px; display: grid; place-items: center; color: $color-subtle; }
  .robot { font-size: 42px; }
  .empty-title { color: $color-title; font-weight: 600; }
  .empty-sub { margin-top: 4px; }
  .chat-window { height: 460px; overflow-y: auto; padding: $spacing-md; background: #fff; border: 1px solid $color-border; border-radius: $border-radius-card; }
  .msg { display: flex; margin-bottom: 10px; }
  .msg.user { justify-content: flex-end; }
  .msg.assistant { justify-content: flex-start; }
  .bubble { max-width: 80%; padding: 10px 12px; border-radius: 12px; line-height: 1.6; }
  .msg.user .bubble { background: #409eff; color: #fff; }
  .msg.assistant .bubble { background: #f5f7fa; color: #333; }
  .bubble h3 { margin: 8px 0; font-weight: 600; color: $color-title; }
  .bubble ul { padding-left: 18px; margin: 6px 0; }
  .bubble li { margin: 2px 0; }
  .input-row { margin-top: $spacing-md; display: grid; grid-template-columns: 1fr auto; gap: $spacing-md; }
  .input-hint { margin-top: 6px; color: $color-subtle; font-size: 12px; }
  </style>
