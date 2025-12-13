<template>
  <div class="assistant-page">
    <div class="header">
      <div class="title">AI 职业助手</div>
      <div class="sub">结合你的技能与简历，为你提供实时咨询</div>
    </div>
    <el-card class="chat-card" shadow="hover">
      <div class="chat-window">
        <div v-for="(m, idx) in messages" :key="idx" class="msg" :class="m.role">
          <div v-if="m.role==='assistant'" class="bubble" v-html="mdToHtml(m.content)"></div>
          <div v-else class="bubble">{{ m.content }}</div>
        </div>
        <div v-if="loading" class="msg assistant">
          <div class="bubble">正在思考…</div>
        </div>
      </div>
      <div class="input-row">
        <el-input v-model="input" placeholder="输入你的问题，如职业路径、技能提升、项目建议…" @keyup.enter="send" />
        <el-button type="primary" :disabled="!input.trim()" :loading="loading" @click="send">发送</el-button>
      </div>
    </el-card>
  </div>
  </template>
  
  <script setup lang="ts">
  import { ref, nextTick } from 'vue'
  import { aiChat, aiChatStream } from '@/api/user'
  
  const messages = ref<{ role: 'user' | 'assistant'; content: string }[]>([
    { role: 'assistant', content: '你好，我是你的职业发展助手。告诉我你的目标或问题吧。' },
  ])
  const input = ref('')
  const loading = ref(false)
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
  const send = async () => {
    const text = input.value.trim()
    if (!text || loading.value) return
    messages.value.push({ role: 'user', content: text })
    input.value = ''
    loading.value = true
    try {
      const payload = {
        messages: messages.value.slice(-10).map(m => ({ role: m.role, content: m.content })),
      }
      const idx = messages.value.push({ role: 'assistant', content: '' }) - 1
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
              if (delta) messages.value[idx].content += delta
            } catch {
              messages.value[idx].content += ''
            }
          } else {
            messages.value[idx].content += t
          }
          await nextTick()
          scrollToBottom()
        }
      }
      if (buffer.trim()) {
        try {
          const j = JSON.parse(buffer.trim().replace(/^data:\s*/, ''))
          const delta = j?.choices?.[0]?.delta?.content || ''
          if (delta) messages.value[idx].content += delta
        } catch {
          messages.value[idx].content += buffer.trim()
        }
      }
      await nextTick()
      scrollToBottom()
      if (!messages.value[idx].content) {
        const r = await aiChat(payload)
        const reply = (r && (r as any).reply) || (r as any)?.data?.reply || ''
        messages.value[idx].content = reply || '抱歉，暂时没有获得有效回复。'
      }
    } catch (e: any) {
      const msg = (e && e.message) ? String(e.message) : '网络错误'
      messages.value.push({ role: 'assistant', content: `抱歉：${msg}` })
    }
    loading.value = false
  }
  </script>
  
  <style scoped lang="scss">
  @use '@/styles/tokens' as *;
  
  .assistant-page { padding: $spacing-xl; background: $color-background; min-height: 100vh; }
  .header { margin-bottom: $spacing-lg; }
  .title { font-size: 20px; font-weight: 600; color: $color-title; }
  .sub { color: $color-subtle; margin-top: 4px; }
  .chat-card { border-radius: $border-radius-card; }
  .chat-window { height: 420px; overflow-y: auto; padding: $spacing-md; background: #fff; border: 1px solid $color-border; border-radius: $border-radius-card; }
  .msg { display: flex; margin-bottom: 10px; }
  .msg.user { justify-content: flex-end; }
  .msg.assistant { justify-content: flex-start; }
  .bubble { max-width: 70%; padding: 10px 12px; border-radius: 12px; line-height: 1.6; }
  .msg.user .bubble { background: #409eff; color: #fff; }
  .msg.assistant .bubble { background: #f5f7fa; color: #333; }
  .bubble h3 { margin: 8px 0; font-weight: 600; color: $color-title; }
  .bubble ul { padding-left: 18px; margin: 6px 0; }
  .bubble li { margin: 2px 0; }
  .input-row { margin-top: $spacing-md; display: grid; grid-template-columns: 1fr auto; gap: $spacing-md; }
  </style>
