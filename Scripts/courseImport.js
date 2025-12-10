import puppeteer from 'puppeteer'
import mongoose from 'mongoose'

const MONGO_URI = process.env.MONGO_URI || 'mongodb://10.161.106.62:27017/software'
mongoose.set('bufferTimeoutMS', Number(process.env.MONGO_BUFFER_TIMEOUT_MS || 60000))
let mongoReadyPromise = mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message))

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return
  try { await mongoReadyPromise } catch {}
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 30000 })
}

const skillStatSchema = new mongoose.Schema({
  keyword: String,
  skill: String,
  count: Number,
  totalJobs: Number,
  frequency: Number,
  priority: Number,
  percentage: Number,
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'skillStatistics' })
const SkillStat = mongoose.model('SkillStat', skillStatSchema)

const courseSchema = new mongoose.Schema({
  skill: { type: String, index: true },
  courses: [{ title: String, url: String }],
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'skillCourses' })
const SkillCourse = mongoose.model('SkillCourse', courseSchema)

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0'
]
const randUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

async function setupInterception(page) {
  try {
    await page.setRequestInterception(true)
    page.on('request', req => {
      const t = req.resourceType()
      const url = req.url()
      if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') return req.abort()
      if (/captcha|track|hm\.baidu|analytics|sdk|fp/.test(url)) return req.abort()
      req.continue()
    })
  } catch {}
}

function isRelevant(title, skill, snippet = '') {
  const t = String(title || '')
  const sn = String(snippet || '')
  const ctx = `${t} ${sn}`.toLowerCase()
  const s0 = String(skill || '').trim().toLowerCase()
  if (!s0) return false
  const courseKeys = ['教程','课程','培训','讲解','教学','入门','基础','精讲','实战','项目','速成','进阶','训练营','课堂','备考','考证','资格','操作','软件','工具','规范','课','讲义','题库','习题','考点','tutorial','course','lesson','bootcamp']
  const hasCourse = courseKeys.some(k => ctx.includes(k))
  if (!hasCourse) return false
  const buildVariants = (s) => {
    const set = new Set([s])
    set.add(s.replace(/[\.\-_/]+/g, ' '))
    set.add(s.replace(/[\.\-_/\s]+/g, ''))
    set.add(s.replace(/\s+/g, ''))
    return Array.from(set).filter(Boolean)
  }
  const matchToken = (tok, text) => {
    const esc = String(tok).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    if (/[a-z0-9]/i.test(tok)) return new RegExp(`\\b${esc}\\b`, 'i').test(String(text))
    return String(text).includes(tok)
  }
  const variants = buildVariants(s0)
  const hasTitle = variants.some(v => matchToken(v, t))
  const hasCtx = variants.some(v => matchToken(v, ctx))
  if (!hasCtx) return false
  if (s0 === 'java' && /javascript/i.test(ctx)) return false
  if (s0 === 'go' && !/(golang|go\s*语言)/i.test(ctx)) return false
  if (s0 === 'spring' && !/(spring\s*boot|springboot)/i.test(ctx)) return false
  if (s0 === '.net' && !/(\.net|dotnet|asp\.?net)/i.test(ctx)) return false
  const ambiguous = (s0.length <= 2) || /^(go|ai|c|r|ps|pr|ae|xd|ui)$/i.test(s0)
  if (ambiguous) {
    const techContext = ['框架','库','语言','编程','开发','源码','部署','架构','工程','设计','实现']
    const hasTechContext = techContext.some(k => ctx.includes(k))
    return hasTitle && hasTechContext
  }
  return hasTitle || hasCtx
}

async function fetchCoursesForSkill(skill, browser, limit = 5) {
  const page = await browser.newPage()
  await setupInterception(page)
  await page.setUserAgent(randUA())
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' })
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    window.chrome = { runtime: {} }
    Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
  })

  // 使用按点击量排序的视频搜索页，提升获取高浏览量条目的精准度
  const url = `https://search.bilibili.com/video?keyword=${encodeURIComponent(skill)}&order=click`
  const out = []
  try {
    const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (resp && resp.status() === 403) throw new Error('BLOCKED')
    await page.waitForSelector('.bili-video-card, a', { timeout: 15000 }).catch(() => {})
    await new Promise(r => setTimeout(r, 2000))
    const items = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a'))
      const isCourseLink = (href) => /\/video\//.test(href) || /\/cheese\//.test(href)
      const norm = (href) => href.startsWith('http') ? href : `https:${href}`
      const seen = new Set()
      const parseViews = (txt) => {
        const s = String(txt || '').replace(/[,，]/g, '')
        // 匹配 "播放"、"观看"、"在学"、"学员" 等常见统计
        const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(万|亿)?\s*(?:次)?\s*(?:播放|观看|在学|学员|人)/)
        if (!m) return 0
        let n = parseFloat(m[1] || '0')
        const unit = m[2] || ''
        if (unit === '万') n *= 10000
        else if (unit === '亿') n *= 100000000
        return Math.floor(n)
      }
      const pickTitle = (el) => {
        const t = el.querySelector('.bili-video-card__info--tit, .title, .video-title')
        const txt = (t?.textContent || el.getAttribute('title') || el.textContent || '').replace(/\s+/g, ' ').trim()
        return txt
      }
      const results = []
      for (const a of anchors) {
        const href = a.getAttribute('href') || ''
        if (!href || !isCourseLink(href)) continue
        const url = norm(href).replace(/\s+/g, '')
        const key = url.replace(/[?#].*$/, '')
        if (seen.has(key)) continue
        const card = a.closest('.bili-video-card') || a.closest('li') || a.parentElement
        const blockText = (card?.innerText || a.innerText || '').replace(/\s+/g, ' ')
        const views = parseViews(blockText)
        const title = pickTitle(card || a)
        if (!title) continue
        seen.add(key)
        results.push({ title, url, views, snippet: blockText })
        if (results.length >= 50) break
      }
      // 按浏览量降序
      results.sort((a, b) => (b.views - a.views))
      return results
    })
    const filtered = items.filter(it => isRelevant(it.title, skill, it.snippet))
    for (const it of filtered) {
      if (out.length >= limit) break
      out.push({ title: it.title, url: it.url })
    }
  } catch (err) {
    console.error(`⚠️ ${skill} 抓取失败:`, err.message)
  } finally {
    try { await page.close() } catch {}
  }
  return out
}

async function main() {
  try {
    await ensureDbConnected()
    console.log('📊 读取技能列表...')
    const docs = await SkillStat.find({}, { skill: 1 }).sort({ _id: 1 }).lean()
    const skillsOrdered = docs.map(d => String(d.skill || '').trim()).filter(Boolean)
    const seen = new Set()
    const deduped = []
    for (const s of skillsOrdered) {
      const norm = s.toLowerCase().replace(/[\s\.\-_/]+/g, '')
      if (seen.has(norm)) continue
      seen.add(norm)
      deduped.push(s)
    }
    const limit = Number(process.env.SKILL_LIMIT || deduped.length)
    const targetSkills = deduped.slice(0, limit)
    console.log(`🔎 共 ${targetSkills.length} 个技能待抓取（去重后，保序）`)

    const browser = await puppeteer.launch({ headless: false, defaultViewport: null, args: ['--no-sandbox', '--disable-setuid-sandbox'] })
    let done = 0
    for (const skill of targetSkills) {
      console.log(`
🔍 抓取 ${skill} 的课程...`)
      const courses = await fetchCoursesForSkill(skill, browser, 5)
      await SkillCourse.updateOne(
        { skill },
        { $set: { skill, courses, updatedAt: new Date() } },
        { upsert: true }
      )
      done++
      console.log(`✅ ${skill} 完成，记录 ${courses.length} 条`)
      await new Promise(r => setTimeout(r, 1200))
    }
    console.log(`
🎉 全部完成：${done} 个技能已写入 skillCourses 集合`)
    await browser.close()
  } catch (err) {
    console.error('❌ 进程错误:', err?.message || err)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 MongoDB 连接已关闭')
  }
}

main()
