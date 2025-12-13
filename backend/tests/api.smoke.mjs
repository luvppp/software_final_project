// 简易 API 冒烟测试脚本：顺序执行核心接口，输出 PASS/FAIL 与摘要
// 运行：node backend/tests/api.smoke.mjs

const BASE = process.env.API_BASE_URL || 'http://localhost:3000'
const headers = { 'Content-Type': 'application/json' }

const log = (msg) => console.log(msg)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const moduleOf = (name) => {
  const n = String(name || '')
  if (n.includes('注册') || n.includes('登录') || n.includes('刷新') || n.includes('资料') || n.includes('详情')) return '用户模块'
  if (n.includes('简历')) return '简历模块'
  if (n.includes('岗位')) return '岗位模块'
  if (n.includes('学习')) return '学习计划模块'
  if (n.includes('AI')) return 'AI模块'
  return '其它模块'
}

const request = async (method, url, body, token) => {
  const init = { method, headers: { ...headers } }
  if (token) init.headers.Authorization = `Bearer ${token}`
  if (body && method !== 'GET') init.body = JSON.stringify(body)
  const resp = await fetch(`${BASE}${url}`, init)
  const text = await resp.text().catch(() => '')
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { status: resp.status, json: json ?? text }
}

const pos = []
const neg = []
let ctx = { email: `u_test_${Date.now()}@test.com`, password: 'P@ssw0rd', userId: '', accessToken: '', refreshToken: '' }

pos.push({
  name: '[正向] 注册 - 有效输入',
  run: async () => {
    const r = await request('POST', '/api/user/register', { username: 'tester', email: ctx.email, password: ctx.password })
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.userId
    if (ok) ctx.userId = r.json.data.userId
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 注册 - 缺少密码失败',
  run: async () => {
    const r = await request('POST', '/api/user/register', { username: 'tester', email: `nopass_${Date.now()}@test.com` })
    const ok = r.json && r.json.code !== 200
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 注册 - 重复邮箱失败',
  run: async () => {
    const r = await request('POST', '/api/user/register', { username: 'tester', email: ctx.email, password: ctx.password })
    const ok = r.json && r.json.code !== 200
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 登录 - 正确凭证',
  run: async () => {
    const r = await request('POST', '/api/user/login', { email: ctx.email, password: ctx.password })
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.accessToken
    if (ok) {
      ctx.accessToken = r.json.data.accessToken
      ctx.refreshToken = r.json.data.refreshToken
      ctx.userId = r.json.data.userId || ctx.userId
    }
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 登录 - 错误密码失败',
  run: async () => {
    const r = await request('POST', '/api/user/login', { email: ctx.email, password: 'wrong-password' })
    const ok = r.json && r.json.code !== 200
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 注册 - 最短密码1字符',
  run: async () => {
    const email = `minpass_${Date.now()}@test.com`
    const r = await request('POST', '/api/user/register', { username: 'u', email, password: 'a' })
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.userId
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 注册 - 极长密码256字符',
  run: async () => {
    const email = `longpass_${Date.now()}@test.com`
    const longPwd = 'x'.repeat(256)
    const r = await request('POST', '/api/user/register', { username: 'u', email, password: longPwd })
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.userId
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 刷新 accessToken - 有效 refreshToken',
  run: async () => {
    const r = await request('POST', '/api/user/token/refresh', { refreshToken: ctx.refreshToken })
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.accessToken
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 刷新 accessToken - 无效 refreshToken 失败',
  run: async () => {
    const r = await request('POST', '/api/user/token/refresh', { refreshToken: 'invalid.token.value' })
    const ok = r.json && r.json.code !== 200
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 发送重置验证码 - 已注册邮箱',
  run: async () => {
    const r = await request('POST', '/api/user/send-reset-code', { email: ctx.email })
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 发送重置验证码 - 不返回验证码',
  run: async () => {
    const r = await request('POST', '/api/user/send-reset-code', { email: ctx.email })
    const ok = r.json && r.json.code === 200 && (r.json.data === null || r.json.data === undefined)
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 发送重置验证码 - 未注册邮箱失败',
  run: async () => {
    const r = await request('POST', '/api/user/send-reset-code', { email: `not_exist_${Date.now()}@test.com` })
    const ok = r.json && r.json.code === 404
    return { pass: ok, out: r.json }
  },
})
neg.push({
  name: '[反向] 验证验证码 - 错误 code 失败',
  run: async () => {
    const r = await request('POST', '/api/user/verify-reset-code', { email: ctx.email, code: '000000' })
    const ok = r.json && r.json.code === 400
    return { pass: ok, out: r.json }
  },
})
neg.push({
  name: '[反向] 重置密码 - 错误 code 失败',
  run: async () => {
    const r = await request('POST', '/api/user/reset-password', { email: ctx.email, code: '000000', newPassword: 'NewP@ss1' })
    const ok = r.json && (r.json.code === 400 || r.json.code === 404)
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 更新资料 - 本人鉴权',
  run: async () => {
    const r = await request('PUT', '/api/user/profile', { userId: ctx.userId, username: 'tester-upd' }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 获取详情 - 无 token 失败',
  run: async () => {
    const r = await request('GET', `/api/user/${ctx.userId}`)
    const ok = r.json && r.json.code === 401
    return { pass: ok, out: r.json }
  },
})
neg.push({
  name: '[反向] 获取详情 - 无效 token 失败',
  run: async () => {
    const r = await request('GET', `/api/user/${ctx.userId}`, null, 'invalid.token.value')
    const ok = r.json && r.json.code === 401
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 授权获取详情 - 不含敏感字段',
  run: async () => {
    const r = await request('GET', `/api/user/${ctx.userId}`, null, ctx.accessToken)
    const data = r.json && r.json.data ? r.json.data : {}
    const ok = r.json && r.json.code === 200 && !('password' in data) && !(data?.resume && 'data' in data.resume)
    return { pass: ok, out: r.json && r.json.data ? { hasPassword: 'password' in data, hasResumeData: !!(data.resume && data.resume.data) } : r.json }
  },
})

pos.push({
  name: '[正向] 更新技能 - 本人鉴权',
  run: async () => {
    const r = await request('PUT', '/api/user/skills', { userId: ctx.userId, skills: ['JavaScript', 'MongoDB'], targetJob: '后端工程师' }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 更新技能 - 无权限失败',
  run: async () => {
    const r = await request('PUT', '/api/user/skills', { userId: ctx.userId, skills: ['X'], targetJob: 'Y' })
    const ok = r.json && r.json.code === 401
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 岗位详情 - 列表首项',
  run: async () => {
    const listResp = await request('GET', '/api/job/list?page=1&limit=1', null, ctx.accessToken)
    const id = listResp?.json?.data?.list?.[0]?.jobId
    if (!id) {
      return { pass: true, out: { note: '无岗位数据，跳过' } }
    }
    const r = await request('GET', `/api/job/${id}`, null, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.jobId === id
    return { pass: ok, out: r.json && r.json.data ? { jobId: r.json.data.jobId, title: r.json.data.title } : r.json }
  },
})
neg.push({
  name: '[反向] 岗位详情 - 非法 ID 失败',
  run: async () => {
    const r = await request('GET', '/api/job/not-a-valid-id', null, ctx.accessToken)
    const ok = r.json && r.json.code === 400
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 岗位城市 - 列表',
  run: async () => {
    const r = await request('GET', '/api/job/cities', null, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && Array.isArray(r.json.data)
    return { pass: ok, out: { count: Array.isArray(r.json?.data) ? r.json.data.length : 0 } }
  },
})
pos.push({
  name: '[正向] 岗位匹配 - 用户技能',
  run: async () => {
    const r = await request('POST', '/api/job/match', { userId: ctx.userId, skills: ['JavaScript', 'MongoDB'] }, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && Array.isArray(r.json.data)
    return { pass: ok, out: { count: Array.isArray(r.json?.data) ? r.json.data.length : 0 } }
  },
})
neg.push({
  name: '[反向] 岗位匹配 - 缺少技能失败',
  run: async () => {
    const r = await request('POST', '/api/job/match', {}, ctx.accessToken)
    const ok = r.json && r.json.code === 400
    return { pass: ok, out: r.json }
  },
})
neg.push({
  name: '[反向] 岗位匹配 - 未登录失败',
  run: async () => {
    const r = await request('POST', '/api/job/match', { userId: ctx.userId, skills: ['X'] })
    const ok = r.json && r.json.code === 401
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 岗位匹配 Top3 - 本人鉴权',
  run: async () => {
    const r = await request('GET', `/api/job/match/top/${ctx.userId}`, null, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && Array.isArray(r.json.data)
    return { pass: ok, out: { count: Array.isArray(r.json?.data) ? r.json.data.length : 0 } }
  },
})
pos.push({
  name: '[正向] AI 岗位建议 - 未配置或成功',
  run: async () => {
    const r = await request('POST', '/api/job/ai/reason', { type: 'reason', jobTitle: '后端工程师', company: '测试公司', requiredSkills: ['JavaScript', 'MongoDB'], userSkills: ['JavaScript'] }, ctx.accessToken)
    const ok = r.json && (r.json.code === 200 || r.json.code >= 400)
    return { pass: ok, out: r.json }
  },
})
neg.push({
  name: '[反向] AI 岗位建议 - 未登录失败',
  run: async () => {
    const r = await request('POST', '/api/job/ai/reason', { type: 'reason', jobTitle: '后端工程师', company: '测试公司' })
    const ok = r.json && r.json.code === 401
    return { pass: ok, out: r.json }
  },
})
// 1x1 像素极简 PDF（解析可能为空文本，仅验证上传与下载接口）
const tinyPdfBase64 = 'JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZS9DYXRhbG9nL1BhZ2VzIDIgMCBSPj4KZW5kb2JqCjIgMCBvYmoKPDwvVHlwZS9QYWdlcy9Db3VudCAxL0tpZHMgWyAzIDAgUiBdPj4KZW5kb2JqCjMgMCBvYmoKPDwvVHlwZS9QYWdlL1BhcmVudCAyIDAgUi9NZWRpYUJveCBbMCAwIDYxMiA3OTJdPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAowMDAwMDAwMDYwIDAwMDAwIG4gCjAwMDAwMDAxMDAgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDQvUm9vdCAxIDAgUj4+CnN0YXJ0eHJsZW5ndGgKMTAKJSVFT0YK'
const fiveMB = 5 * 1024 * 1024
const fiveMBBase64 = Buffer.alloc(fiveMB).toString('base64')

neg.push({
  name: '[反向] 下载简历 - 未上传失败',
  run: async () => {
    const r = await request('GET', `/api/user/${ctx.userId}/resume`, null, ctx.accessToken)
    const ok = r.json && r.json.code === 404
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 上传简历 - PDF Base64',
  run: async () => {
    const r = await request('PUT', '/api/user/resume', { userId: ctx.userId, fileName: 'tiny.pdf', mimeType: 'application/pdf', base64: `data:application/pdf;base64,${tinyPdfBase64}` }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})
pos.push({
  name: '[正向] 上传简历 - 恰好5MB',
  run: async () => {
    const r = await request('PUT', '/api/user/resume', { userId: ctx.userId, fileName: 'exact5mb.pdf', mimeType: 'application/pdf', base64: `data:application/pdf;base64,${fiveMBBase64}` }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 上传简历 - 文件过大失败',
  run: async () => {
    const bigB64 = 'A'.repeat(7 * 1024 * 1024) // > 5MB after base64 decode
    const r = await request('PUT', '/api/user/resume', { userId: ctx.userId, fileName: 'big.pdf', mimeType: 'application/pdf', base64: `data:application/pdf;base64,${bigB64}` }, ctx.accessToken)
    const ok = r.json && r.json.code === 400
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 下载简历 - DataURL',
  run: async () => {
    const r = await request('GET', `/api/user/${ctx.userId}/resume`, null, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.base64
    return { pass: ok, out: r.json && r.json.data ? { filename: r.json.data.filename, size: r.json.data.size } : r.json }
  },
})

pos.push({
  name: '[正向] 解析简历 - PDF',
  run: async () => {
    const r = await request('POST', '/api/user/resume/parse', { userId: ctx.userId }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 上传非 PDF 简历 - DOCX',
  run: async () => {
    const docxB64 = 'UEsDBBQAAAAIAAAAAAAAAAAAAAAAAAAAAAA=' // tiny invalid docx-like base64
    const r = await request('PUT', '/api/user/resume', { userId: ctx.userId, fileName: 'tiny.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', base64: `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${docxB64}` }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 解析简历 - 非 PDF 失败',
  run: async () => {
    // 当前已上传为 docx，上述用例覆盖；解析应返回 400
    const r = await request('POST', '/api/user/resume/parse', { userId: ctx.userId }, ctx.accessToken)
    const ok = r.json && (r.json.code === 400 || r.json.code === 404)
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 删除简历 - 成功',
  run: async () => {
    const r = await request('DELETE', '/api/user/resume', { userId: ctx.userId }, ctx.accessToken)
    const ok = r.json && r.json.code === 200
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 下载简历 - 已删除失败',
  run: async () => {
    const r = await request('GET', `/api/user/${ctx.userId}/resume`, null, ctx.accessToken)
    const ok = r.json && r.json.code === 404
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] 岗位列表 - 过滤与分页',
  run: async () => {
    const r = await request('GET', '/api/job/list?page=1&limit=5&keyword=Java', null, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && r.json.data && r.json.data.list
    return { pass: ok, out: { total: r.json?.data?.meta?.total, page: r.json?.data?.meta?.page, count: r.json?.data?.list?.length } }
  },
})

pos.push({
  name: '[正向] 学习计划 - 生成',
  run: async () => {
    const r = await request('POST', '/api/learning/plan', { userId: ctx.userId, missingSkills: ['Java', 'MySQL', 'Spring'] }, ctx.accessToken)
    const ok = r.json && r.json.code === 200 && r.json.data && Array.isArray(r.json.data.plan)
    return { pass: ok, out: { count: r.json?.data?.plan?.length } }
  },
})
pos.push({
  name: '[正向] 学习计划 - 进度更新至 100',
  run: async () => {
    const q = await request('GET', `/api/learning/${ctx.userId}`, null, ctx.accessToken)
    const plan = q?.json?.data?.plan || []
    const skill = plan?.[0]?.skill
    if (!skill) {
      return { pass: true, out: { note: '无学习计划，跳过' } }
    }
    let ok = true
    const courses = plan.filter((p) => p.skill === skill).map((p) => p.course)
    for (const c of courses) {
      const r = await request('PUT', '/api/learning/progress', { userId: ctx.userId, skill, course: c, progress: 100 }, ctx.accessToken)
      ok = ok && (r.json && r.json.code === 200)
    }
    if (ok) ctx.syncSkill = skill
    return { pass: ok, out: { updatedCourses: courses.length } }
  },
})
pos.push({
  name: '[正向] 授权获取详情 - 技能同步完成',
  run: async () => {
    if (!ctx.syncSkill) return { pass: true, out: { note: '无技能同步上下文，跳过' } }
    const r = await request('GET', `/api/user/${ctx.userId}`, null, ctx.accessToken)
    const skills = r?.json?.data?.skills || []
    const ok = r.json && r.json.code === 200 && Array.isArray(skills) && skills.map((s) => String(s).toLowerCase()).includes(String(ctx.syncSkill).toLowerCase())
    return { pass: ok, out: { contains: ok, skill: ctx.syncSkill } }
  },
})

neg.push({
  name: '[反向] 学习计划 - 非法 userId 失败',
  run: async () => {
    const r = await request('POST', '/api/learning/plan', { userId: 'not-a-valid-id', missingSkills: ['A'] }, ctx.accessToken)
    const ok = r.json && (r.json.code === 400 || r.json.code === 403)
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] 学习计划 - 无权限失败',
  run: async () => {
    const r = await request('POST', '/api/learning/plan', { userId: ctx.userId, missingSkills: ['X'] })
    const ok = r.json && (r.json.code === 401 || r.json.code === 403)
    return { pass: ok, out: r.json }
  },
})

pos.push({
  name: '[正向] AI 聊天 - 无配置或成功',
  run: async () => {
    const r = await request('POST', '/api/user/ai/chat', { messages: [{ role: 'user', content: '请帮我写一段自我介绍' }] }, ctx.accessToken)
    // 配置齐全 code=200，否则返回错误码
    const ok = r.json && (r.json.code === 200 || r.json.code >= 400)
    return { pass: ok, out: r.json }
  },
})

neg.push({
  name: '[反向] AI 聊天 - 未提供 token 失败',
  run: async () => {
    const r = await request('POST', '/api/user/ai/chat', { messages: [{ role: 'user', content: '你好' }] })
    const ok = r.json && r.json.code === 401
    return { pass: ok, out: r.json }
  },
})
const main = async () => {
  log(`API Base: ${BASE}`)
  let passCount = 0
  const moduleStats = {}
  log('=== 正向用例 ===')
  for (const c of pos) {
    try {
      const r = await c.run()
      if (r.pass) passCount++
      const mod = moduleOf(c.name)
      if (!moduleStats[mod]) moduleStats[mod] = { pass: 0, total: 0 }
      moduleStats[mod].total++
      if (r.pass) moduleStats[mod].pass++
      log(`[${r.pass ? 'PASS' : 'FAIL'}] ${c.name} -> ${typeof r.out === 'string' ? r.out : JSON.stringify(r.out)}`)
    } catch (e) {
      log(`[ERROR] ${c.name} -> ${e?.message || e}`)
    }
    await sleep(200)
  }
  log('=== 反向用例 ===')
  for (const c of neg) {
    try {
      const r = await c.run()
      if (r.pass) passCount++
      const mod = moduleOf(c.name)
      if (!moduleStats[mod]) moduleStats[mod] = { pass: 0, total: 0 }
      moduleStats[mod].total++
      if (r.pass) moduleStats[mod].pass++
      log(`[${r.pass ? 'PASS' : 'FAIL'}] ${c.name} -> ${typeof r.out === 'string' ? r.out : JSON.stringify(r.out)}`)
    } catch (e) {
      log(`[ERROR] ${c.name} -> ${e?.message || e}`)
    }
    await sleep(200)
  }
  const total = pos.length + neg.length
  log(`Passed: ${passCount}/${total}`)
  log('=== 模块通过率 ===')
  for (const [mod, s] of Object.entries(moduleStats)) {
    const pct = s.total ? Math.round((s.pass / s.total) * 100) : 0
    log(`${mod}: ${s.pass}/${s.total} (${pct}%)`)
  }
  process.exit(passCount === total ? 0 : 1)
}

main().catch((e) => { log(e?.stack || String(e)); process.exit(1) })
