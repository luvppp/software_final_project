import puppeteer from 'puppeteer'
import mongoose from 'mongoose'

// 连接 MongoDB
mongoose.connect('mongodb://10.161.106.62:27017/software')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// 定义岗位 Schema
const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  salary: String,
  location: String,
  experience: String,
  education: String,
  description: String,
  skills: [String],
  duties: [String],
  requirements: [String],
  companyIntro: String,
  keyword: String,
  city: String,
  createdAt: { type: Date, default: Date.now }
})

const Job = mongoose.model('Job', jobSchema, 'jobCollection')

// 目标关键词数组（支持多个职位关键词）
const KEYWORDS = [
  // 计算机/IT 领域
  '前端开发',
  'Java开发',
  'Python开发',
  '测试工程师',
  'AI工程师',
  '算法工程师',
  '后端开发',
  '全栈开发',
  '移动开发',
  '运维工程师',
  '数据分析师',
  
  // 金融/会计领域
  '财务',
  '会计',
  '审计',
  '金融分析师',
  '投资顾问',
  '银行',
  
  // 市场营销/运营领域
  '市场营销',
  '市场推广',
  '运营',
  '产品经理',
  '新媒体运营',
  '电商运营',
  '内容运营',
  
  // 人力资源领域
  '人力资源',
  'HR',
  '招聘',
  '人事',
  
  // 销售/商务领域
  '销售',
  '商务',
  '客户经理',
  '业务员',
  
  // 设计领域
  'UI设计',
  '平面设计',
  '产品设计',
  '视觉设计',
  '交互设计',
  
  // 教育领域
  '教师',
  '培训',
  '教育',
  '讲师',
  
  // 医疗领域
  '医生',
  '护士',
  '药师',
  '医疗',
  
  // 工程领域
  '机械工程师',
  '电气工程师',
  '土木工程师',
  '结构工程师',
  
  // 法律领域
  '律师',
  '法务',
  '法律顾问',
  
  // 媒体/编辑领域
  '编辑',
  '记者',
  '文案',
  '新媒体',
  
  // 其他专业领域
  '翻译',
  '咨询',
  '项目管理',
  '行政'
]

// 技能映射表：将各种变体映射到标准名称
const skillMapping = {
  // JavaScript 相关
  'js': 'JavaScript',
  'JS': 'JavaScript',
  'javascript': 'JavaScript',
  'JAVASCRIPT': 'JavaScript',
  'Js': 'JavaScript',
  
  // TypeScript 相关
  'ts': 'TypeScript',
  'TS': 'TypeScript',
  'typescript': 'TypeScript',
  
  // Node.js 相关
  'node': 'Node.js',
  'Node': 'Node.js',
  'NODE': 'Node.js',
  'nodejs': 'Node.js',
  'NodeJS': 'Node.js',
  
  // Vue 相关
  'vue.js': 'Vue',
  'vuejs': 'Vue',
  'VueJS': 'Vue',
  
  // React 相关
  'react.js': 'React',
  'reactjs': 'React',
  'ReactJS': 'React',
  
  // HTML/CSS 相关
  'html5': 'HTML',
  'HTML5': 'HTML',
  'css3': 'CSS',
  'CSS3': 'CSS',
  
  // Go/Golang 相关
  'go': 'Go',
  'GO': 'Go',
  'golang': 'Go',
  'Golang': 'Go',
  'GOLANG': 'Go',
  
  // Spring 相关
  'springboot': 'SpringBoot',
  'spring boot': 'SpringBoot',
  'Spring Boot': 'SpringBoot',
  
  // Kubernetes 相关
  'k8s': 'Kubernetes',
  'K8s': 'Kubernetes',
  'K8S': 'Kubernetes',
  
  // uni-app 相关
  'uniapp': 'uni-app',
  'uniApp': 'uni-app',
  'UniApp': 'uni-app',
  
  // 其他常见变体
  'mysql': 'MySQL',
  'MYSQL': 'MySQL',
  'mongodb': 'MongoDB',
  'MONGODB': 'MongoDB',
  'redis': 'Redis',
  'REDIS': 'Redis',
  'docker': 'Docker',
  'DOCKER': 'Docker',
  'git': 'Git',
  'GIT': 'Git',
  'linux': 'Linux',
  'LINUX': 'Linux',
  'nginx': 'Nginx',
  'NGINX': 'Nginx',
  'python': 'Python',
  'PYTHON': 'Python',
  'java': 'Java',
  'JAVA': 'Java',
  'php': 'PHP',
  'react native': 'React Native',
  'reactnative': 'React Native',
  'ReactNative': 'React Native',
  
  // 设计软件相关
  'ps': 'Photoshop',
  'PS': 'Photoshop',
  'photoshop': 'Photoshop',
  'PHOTOSHOP': 'Photoshop',
  'illustrator': 'Illustrator',
  'ILLUSTRATOR': 'Illustrator',
  'ai软件': 'Illustrator',
  'adobe illustrator': 'Illustrator',
  'premiere': 'Premiere',
  'PREMIERE': 'Premiere',
  'pr软件': 'Premiere',
  'adobe premiere': 'Premiere',
  'after effects': 'After Effects',
  'AFTER EFFECTS': 'After Effects',
  'ae软件': 'After Effects',
  'adobe after effects': 'After Effects',
  'cad': 'AutoCAD',
  'CAD': 'AutoCAD',
  'autocad': 'AutoCAD',
  'AUTOCAD': 'AutoCAD',
  'solidworks': 'SolidWorks',
  'SOLIDWORKS': 'SolidWorks',
  'sw': 'SolidWorks',
  'sketch': 'Sketch',
  'SKETCH': 'Sketch',
  'figma': 'Figma',
  'FIGMA': 'Figma',
  'axure': 'Axure',
  'AXURE': 'Axure',
  'axure rp': 'Axure',
  'xd': 'XD',
  'adobe xd': 'XD',
  'revit': 'Revit',
  'REVIT': 'Revit',
  'bim': 'BIM',
  'BIM': 'BIM',
  'c4d': 'C4D',
  'cinema 4d': 'C4D',
  'cinema4d': 'C4D',
  
  // Office软件相关
  'office': 'Office',
  'OFFICE': 'Office',
  'microsoft office': 'Office',
  'word': 'Word',
  'WORD': 'Word',
  'microsoft word': 'Word',
  'excel': 'Excel',
  'EXCEL': 'Excel',
  'microsoft excel': 'Excel',
  'powerpoint': 'PowerPoint',
  'POWERPOINT': 'PowerPoint',
  'ppt': 'PowerPoint',
  'PPT': 'PowerPoint',
  'microsoft powerpoint': 'PowerPoint',
  
  // 财务软件相关
  'sap': 'SAP',
  'SAP': 'SAP',
  '用友': '用友',
  '金蝶': '金蝶',
  '财务软件': '财务软件',
  
  // 证书相关
  'cpa': 'CPA',
  'CPA': 'CPA',
  'cfa': 'CFA',
  'CFA': 'CFA',
  'acca': 'ACCA',
  'ACCA': 'ACCA',
  'cma': 'CMA',
  'CMA': 'CMA',
  'catti': 'CATTI',
  'CATTI': 'CATTI',
  'cet-4': 'CET-4',
  'CET-4': 'CET-4',
  'cet4': 'CET-4',
  '英语四级': 'CET-4',
  'cet-6': 'CET-6',
  'CET-6': 'CET-6',
  'cet6': 'CET-6',
  '英语六级': 'CET-6',
  
  // 其他常见变体
  'seo': 'SEO',
  'SEO': 'SEO',
  'sem': 'SEM',
  'SEM': 'SEM',
  'crm': 'CRM',
  'CRM': 'CRM',
  '客户关系管理': 'CRM',
  'mooc': 'MOOC',
  'MOOC': 'MOOC',
  '在线教育': 'MOOC'
}

// 标准技能名称列表（使用规范化的名称）
const standardSkills = [
  // 前端技术
  'Vue', 'Angular', 'React', 'React Native',
  'JavaScript', 'TypeScript',
  'HTML', 'CSS', 'Sass', 'SCSS', 'Less',
  'Webpack', 'Vite', 'Rollup', 'Gulp',
  'jQuery',
  '小程序', 'uni-app',
  '移动端', 'H5', '响应式',
  
  // 后端技术
  'Java', 'Python',
  'C++', 'Go',
  'Node.js', 'Express', 'Koa',
  'Spring', 'SpringBoot', 'MyBatis',
  'PHP', '.NET', 'ASP.NET',
  
  // 数据库
  'MySQL', 'PostgreSQL', 'MongoDB',
  'Redis', 'Oracle',
  'Elasticsearch',
  
  // 工具和框架
  'Docker', 'Kubernetes',
  'Git', 'SVN', 'Linux',
  'Nginx', 'Apache',
  
  // AI和机器学习
  'AI', '机器学习', '深度学习', 'TensorFlow',
  'PyTorch', '神经网络', 'NLP', '计算机视觉',
  
  // 其他IT技能
  'RESTful', 'GraphQL', 'gRPC', '微服务',
  '分布式', '高并发', '性能优化',
  '自动化测试', 'TDD', 'BDD', '单元测试',
  
  // 更多前端框架和工具
  'Ant Design', 'Element UI', 'Vuex', 'Redux',
  'Flutter',
  'WebSocket', 'HTTP/HTTPS',
  
  // 金融/会计技能
  '财务分析', '财务报表', '成本核算', '预算管理',
  '会计', '审计', '税务', '财务管理',
  'Excel', '财务软件', 'SAP', '用友', '金蝶',
  'CPA', 'CFA', 'ACCA', 'CMA',
  '银行', '证券', '保险', '投资',
  
  // 市场营销/运营技能
  '市场营销', '市场分析', '市场调研', '品牌管理',
  'SEO', 'SEM', '信息流', '社交媒体',
  '微信', '微博', '抖音', '小红书', 'B站',
  '数据分析', '用户运营', '活动策划', '内容创作',
  '电商', '淘宝', '京东', '拼多多', '直播',
  'PR', '媒体', '广告', '推广',
  
  // 人力资源技能
  '招聘', '面试', '培训', '绩效管理',
  '薪酬', '福利', '劳动关系', '员工关系',
  'HR', '人力资源', '人事', '组织发展',
  
  // 销售/商务技能
  '销售', '商务谈判', '客户管理', '渠道管理',
  'CRM', '客户关系', '商务拓展', '业务开发',
  '沟通', '谈判', '演讲', '演示',
  
  // 设计技能
  'Photoshop', 'PS', 'Illustrator', 'AI',
  'Figma', 'Sketch', 'XD', 'Axure',
  'UI设计', 'UX设计', '交互设计', '视觉设计',
  '平面设计', '品牌设计', '包装设计', '网页设计',
  '手绘', '插画', '3D', 'C4D',
  
  // 教育技能
  '教学', '课程设计', '培训', '教育',
  'PPT', '课件制作', '在线教育', 'MOOC',
  '教师资格证', '普通话', '英语', '学科知识',
  
  // 医疗技能
  '医学', '临床', '诊断', '治疗',
  '护理', '药学', '医疗器械', '医疗管理',
  '执业医师', '护士资格', '药师资格',
  
  // 工程技能
  'AutoCAD', 'CAD', 'SolidWorks', 'Pro/E',
  '机械设计', '电气设计', '结构设计', '工程管理',
  'BIM', 'Revit', '项目管理', '施工管理',
  
  // 法律技能
  '法律', '法务', '合同', '诉讼',
  '律师', '法律顾问', '合规', '风险控制',
  '司法考试', '法律职业资格',
  
  // 媒体/编辑技能
  '编辑', '写作', '文案', '内容创作',
  '新闻', '采访', '摄影', '视频剪辑',
  'Premiere', 'PR', 'After Effects', 'AE',
  'Final Cut Pro', '达芬奇', '剪映',
  
  // 翻译技能
  '英语', '翻译', '口译', '笔译',
  '日语', '韩语', '法语', '德语',
  'CATTI', '翻译资格',
  
  // 通用技能
  'Office', 'Word', 'Excel', 'PowerPoint',
  '沟通能力', '团队合作', '项目管理', '时间管理',
  '领导力', '执行力', '学习能力', '创新能力',
  '英语', '英语四级', '英语六级', 'CET-4', 'CET-6',
  '驾驶', '驾照', 'C1', 'C2'
]

// 技能关键词提取函数 - 支持中英文，自动规范化技能名称
function extractSkills(desc) {
  if (!desc) return []
  
  const foundSkills = new Set()
  
  // 首先检查映射表中的变体（优先级更高，避免误匹配）
  Object.entries(skillMapping).forEach(([variant, standardName]) => {
    // 使用单词边界匹配，避免部分匹配（如 "javascript" 匹配到 "java"）
    const variantLower = variant.toLowerCase()
    const regex = new RegExp(`\\b${variantLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (regex.test(desc)) {
      foundSkills.add(standardName)
    }
  })
  
  // 然后检查标准技能名称
  standardSkills.forEach(skill => {
    const skillLower = skill.toLowerCase()
    // 对于多词技能，使用更精确的匹配
    if (skill.includes(' ')) {
      // 多词技能使用单词边界匹配
      const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(desc)) {
        foundSkills.add(skill)
      }
    } else {
      // 单词技能也使用单词边界匹配，避免部分匹配
      const regex = new RegExp(`\\b${skillLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      if (regex.test(desc)) {
        foundSkills.add(skill)
      }
    }
  })
  
  // 返回去重后的技能数组
  return Array.from(foundSkills)
}

// 从职位描述中拆分“岗位职责”“任职要求”“公司简介”，并做分点
function splitDescSections(fullText, dutiesText = '', requirementsText = '') {
  const clean = (fullText || '').replace(/\r/g, '').trim()
  const normalizeLines = (text) => {
    const rawLines = text
      .split(/\n|；|;|。|\u2022|·|•|\-|—/)
      .map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').trim())
      .filter(Boolean)
    return Array.from(new Set(rawLines.map(s => s.replace(/\s+/g, ' ')).filter(s => /[\u4e00-\u9fa5A-Za-z]/.test(s) && s.length >= 4)))
  }

  const cityNames = ['北京','上海','广州','深圳','杭州','成都','重庆','武汉','西安','长沙','郑州','南京','厦门','苏州','合肥']
  const excludeTokens = ['举报','扫码','二维码','查看全部','工商信息','工作地址','更多职位','点击查看地图','公司介绍','公司简介','职位描述']
  const salaryRegex = /(\d+\s*(K|k|千|万)|[0-9]+元\/?天|薪)/

  const filterLines = (lines, type) => {
    const includeDuty = ['负责','参与','承担','推进','设计','开发','优化','维护','搭建','实现','编写','调试','测试','管理','沟通','协作','支持','跟进','分析']
    const includeReq = ['熟悉','掌握','精通','具备','有','善于','能够','了解','至少','优秀','本科','学历','经验','能力','英语','团队','沟通','优先','加分']
    const include = type === 'duty' ? includeDuty : includeReq

    const res = []
    for (let s of lines) {
      const trimmed = s.trim()
      if (!trimmed) continue
      if (trimmed.length < 4) continue
      if (salaryRegex.test(trimmed)) continue
      if (cityNames.some(c => trimmed === c || trimmed.startsWith(c))) continue
      if (excludeTokens.some(k => trimmed.includes(k))) continue
      if (!include.some(k => trimmed.includes(k))) continue
      res.push(trimmed)
      if (res.length >= 7) break
    }
    return res
  }

  const sections = {
    duties: [],
    requirements: [],
    companyIntro: ''
  }

  // 基于常见中文标题切分
  const dutiesMatch = clean.match(/(岗位职责|职位职责|工作职责|工作内容|岗位内容)[\s\S]*?(?=(任职要求|职位要求|资格要求|公司(简介|介绍)|$))/)
  const reqsMatch = clean.match(/(任职要求|职位要求|资格要求)[\s\S]*?(?=(公司(简介|介绍)|$))/)
  const companyMatch = clean.match(/公司(简介|介绍)[\s\S]*/)

  if (dutiesText) sections.duties = filterLines(normalizeLines(dutiesText), 'duty')
  if (requirementsText) sections.requirements = filterLines(normalizeLines(requirementsText), 'req')
  if (!dutiesText && dutiesMatch) sections.duties = filterLines(normalizeLines(dutiesMatch[0].replace(/^(岗位职责|职位职责|工作职责|工作内容|岗位内容)/, '')), 'duty')
  if (!requirementsText && reqsMatch) sections.requirements = filterLines(normalizeLines(reqsMatch[0].replace(/^(任职要求|职位要求|资格要求)/, '')), 'req')
  if (companyMatch) sections.companyIntro = companyMatch[0].replace(/^公司(简介|介绍)/, '').trim()

  // 兜底：如果无法识别标题，按整体粗分
  if (sections.duties.length === 0 || sections.requirements.length === 0) {
    const lines = normalizeLines(clean)
    if (sections.duties.length === 0) sections.duties = filterLines(lines, 'duty')
    if (sections.requirements.length === 0) sections.requirements = filterLines(lines, 'req')
  }

  return sections
}

// 清洗公司简介文本，移除噪声与不相关模块
function cleanCompanyIntro(text) {
  let t = (text || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\r/g, '')
  // 截断在这些模块之前
  const cutPoints = ['查看全部', '工商信息', '工作地址', '更多职位', '看过该职位的人还看了', '点击查看地图']
  for (const marker of cutPoints) {
    const idx = t.indexOf(marker)
    if (idx > 0) {
      t = t.slice(0, idx)
      break
    }
  }
  // 删除工商信息键值行
  const removeKeys = ['公司名称', '法定代表人', '成立日期', '企业类型', '经营状态', '注册资金']
  t = t
    .split(/\n|\s{2,}/)
    .map(s => s.trim())
    .filter(s => s && !removeKeys.some(k => s.includes(k)))
    .join('\n')

  // 合并多余空白与标点
  t = t.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n').replace(/\*+/g, '')
  // 去尾多余标注
  t = t.replace(/\s*(更多职位.*)$/s, '').trim()
  // 控制最大长度
  if (t.length > 1200) t = t.slice(0, 1200)
  return t
}

// 城市列表（Boss 直聘城市代码）- 分布尽量广
const CITIES = [
  { name: '北京', code: '101010100' },
  { name: '上海', code: '101020100' },
  { name: '广州', code: '101280100' },
  { name: '深圳', code: '101280600' },
  { name: '杭州', code: '101210100' },
  { name: '成都', code: '101270100' },
  { name: '重庆', code: '101040100' },
  { name: '武汉', code: '101200100' },
  { name: '西安', code: '101110100' },
  { name: '长沙', code: '101250100' },
  { name: '郑州', code: '101180100' },
  { name: '南京', code: '101190100' },
  { name: '厦门', code: '101230200' },
  { name: '苏州', code: '101190400' },
  { name: '合肥', code: '101220100' }
]
const TARGET_COUNT = 30

// 爬取单个关键词的函数
async function fetchBossJobsByKeywordInCity(keyword, city, browser, limit = 15) {
  try {
    const BASE_URL = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}&city=${city.code}`
    
    const page = await browser.newPage()
    
    // 设置浏览器视口
    await page.setViewport({ width: 1920, height: 1080 })
    
    console.log(`\n📡 [${keyword}/${city.name}] 正在访问: ${BASE_URL}`)
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
    
    // 等待岗位列表加载
    console.log(`⏳ [${keyword}/${city.name}] 等待岗位列表加载...`)
    await page.waitForSelector('.job-list-box', { timeout: 10000 }).catch(() => {
      console.log(`⚠️ [${keyword}] 未找到 .job-list-box，尝试等待其他元素...`)
    })
    
    // 等待一下确保内容加载完成
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 先获取所有岗位链接
    console.log(`🔍 [${keyword}/${city.name}] 获取岗位链接...`)
    const jobLinks = await page.evaluate(() => {
      const links = []
      
      // 尝试多种方式查找岗位卡片
      const jobCards = document.querySelectorAll('.job-card-wrapper, .job-card-box, .job-list-box a, a[href*="/job_detail/"]')
      
      jobCards.forEach(card => {
        let link, titleEl
        
        // 如果是链接本身
        if (card.tagName === 'A' && card.href) {
          link = card
          titleEl = card.querySelector('.job-name, .job-title')
        } else {
          // 查找链接
          link = card.querySelector('a[href*="/job_detail/"], a[href*="/job/"]')
          titleEl = card.querySelector('.job-name, .job-info .job-name, .job-title')
        }
        
        if (link && (titleEl || card.textContent)) {
          const title = titleEl?.textContent?.trim() || card.textContent?.trim() || ''
          const href = link.href || link.getAttribute('href')
          if (title && href && href.includes('/job')) {
            links.push({
              title,
              url: href.startsWith('http') ? href : `https://www.zhipin.com${href}`,
              index: links.length
            })
          }
        }
      })
      
      // 去重
      const uniqueLinks = []
      const seenUrls = new Set()
      links.forEach(link => {
        if (!seenUrls.has(link.url)) {
          seenUrls.add(link.url)
          uniqueLinks.push(link)
        }
      })
      
      return uniqueLinks
    })
    
    console.log(`📊 [${keyword}/${city.name}] 找到 ${jobLinks.length} 个岗位链接`)
    
    // 关闭列表页
    await page.close()
    
    const jobs = []
    
    // 遍历每个岗位链接，获取详细信息（每个关键词最多爬取10个岗位）
    const maxJobs = Math.min(jobLinks.length, limit)
    console.log(`🚀 [${keyword}/${city.name}] 开始爬取 ${maxJobs} 个岗位详情...`)
    
    for (let i = 0; i < maxJobs; i++) {
      const jobLink = jobLinks[i]
      console.log(`[${keyword}/${city.name}] [${i + 1}/${maxJobs}] 正在爬取: ${jobLink.title}`)
      
      try {
        // 打开新标签页
        const newPage = await browser.newPage()
        await newPage.setViewport({ width: 1920, height: 1080 })
        
        // 访问岗位详情页
        await newPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36')
        await newPage.goto(jobLink.url, { waitUntil: 'networkidle2', timeout: 30000 })
        
        // 等待内容加载
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        
        // 提取岗位详细信息
        const jobInfo = await newPage.evaluate(() => {
          // 岗位标题
          const titleEl = document.querySelector('.job-name, .job-primary .name, h1')
          const title = titleEl?.textContent?.trim() || ''
          
          // 公司名称
          const companyEl = document.querySelector('.company-name, .job-primary .company .name')
          const company = companyEl?.textContent?.trim() || ''
          
          // 薪资
          const salaryEl = document.querySelector('.job-primary .salary, .salary')
          const salary = salaryEl?.textContent?.trim() || ''
          
          // 地点
          const locationEl = document.querySelector('.job-primary .area, .job-area')
          const location = locationEl?.textContent?.trim() || ''
          
          // 经验要求
          const expEl = document.querySelector('.job-primary .tag-list, .tag-list .tag')
          const experience = expEl?.textContent?.trim() || ''
          
          // 教育要求（通常在同一个tag-list中）
          const eduEl = document.querySelector('.job-primary .tag-list .tag:nth-child(2)')
          const education = eduEl?.textContent?.trim() || ''
          
          // 岗位描述和要求（这是最重要的）
          const descEl = document.querySelector('.job-segment-text, .job-detail, .job-sec .text')
          let description = ''
          
          if (descEl) {
            // 获取所有文本内容
            description = descEl.textContent?.trim() || ''
          } else {
            // 尝试其他选择器
            const altDescEl = document.querySelector('.job-primary .job-detail, .detail')
            description = altDescEl?.textContent?.trim() || ''
          }

          // 页面上的技能标签
          const tagNodes = Array.from(document.querySelectorAll('.tag, .job-tags .tag, .tag-list .tag'))
          const tagTexts = tagNodes.map(n => n.textContent?.trim()).filter(Boolean)

          // 公司简介可能在公司模块的文本区域
          const companyInfoEl = document.querySelector('.company-detail .text, .job-company .text, .job-sec .company-info .text, .side-company .text')
          const companyText = companyInfoEl?.textContent?.trim() || ''

          // 精确提取“职位描述/岗位职责/任职要求”分块
          const secs = Array.from(document.querySelectorAll('.job-sec'))
          let dutiesRaw = ''
          let requirementsRaw = ''
          let descFull = description
          secs.forEach(sec => {
            const titleTxt = (sec.querySelector('h3, .title')?.textContent || '').trim()
            const bodyTxt = (sec.querySelector('.text')?.innerText || sec.innerText || '').trim()
            if (/职位描述|岗位职责|工作职责|工作内容|岗位内容/i.test(titleTxt)) {
              descFull = bodyTxt
              const dutyMatch = bodyTxt.match(/(岗位职责|职位职责|工作职责|工作内容|岗位内容)[\s\S]*?(?=(任职要求|职位要求|资格要求|公司|$))/)
              if (dutyMatch) dutiesRaw = dutyMatch[0].replace(/^(岗位职责|职位职责|工作职责|工作内容|岗位内容)/, '')
            }
            if (/任职要求|职位要求|资格要求/i.test(titleTxt)) {
              requirementsRaw = bodyTxt.replace(/^(任职要求|职位要求|资格要求)/, '')
            }
          })

          return {
            title,
            company,
            salary,
            location,
            experience,
            education,
            description,
            descFull,
            dutiesRaw,
            requirementsRaw,
            pageTags: tagTexts,
            companyRaw: companyText
          }
        })
        
        await newPage.close()
        
        // 从描述中提取技能
        const sections = splitDescSections(jobInfo.descFull || jobInfo.description, jobInfo.dutiesRaw || '', jobInfo.requirementsRaw || '')
        jobInfo.duties = sections.duties
        jobInfo.requirements = sections.requirements
        jobInfo.companyIntro = cleanCompanyIntro(jobInfo.companyRaw || sections.companyIntro || '')
        jobInfo.skills = Array.from(new Set([
          ...extractSkills(jobInfo.description || jobInfo.title),
          ...extractSkills((jobInfo.pageTags || []).join(' '))
        ]))
        
        // 添加关键词字段，方便后续分析
        jobInfo.keyword = keyword
        jobInfo.city = city.name
        jobs.push(jobInfo)
        console.log(`  ✅ [${keyword}/${city.name}] 成功爬取，提取到技能: ${jobInfo.skills.slice(0, 3).join(', ')}...`)
        console.log(`  🏢 公司简介: ${jobInfo.companyIntro.slice(0, 80)}...`)
        
        // 避免请求过快，添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        console.log(`  ⚠️ [${keyword}/${city.name}] 爬取失败: ${err.message}`)
        // 如果详情页无法访问，至少保存基本信息
        jobs.push({
          title: jobLink.title,
          company: '',
          salary: '',
          location: '',
          experience: '',
          education: '',
          description: '',
          skills: [],
          keyword: keyword
        })
      }
    }
    
    console.log(`\n📝 [${keyword}/${city.name}] 总共成功爬取 ${jobs.length} 个岗位`)
    
    if (jobs.length > 0) {
      // 显示提取到的技能统计
      const allSkills = jobs.flatMap(j => j.skills)
      const skillCount = {}
      allSkills.forEach(skill => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
      
      console.log(`\n📊 [${keyword}/${city.name}] 技能统计（前10）:`)
      const topSkills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      topSkills.forEach(([skill, count]) => {
        console.log(`  - ${skill}: ${count}次`)
      })
      
      await Job.insertMany(jobs)
      console.log(`\n✅ [${keyword}/${city.name}] 已写入 ${jobs.length} 条岗位数据到 jobCollection`)
    }
    
    return jobs
    
  } catch (err) {
    console.error(`❌ [${keyword}/${city.name}] 爬取出错:`, err.message)
    return []
  }
}

// 主函数：批量爬取多个关键词
async function fetchBossJobs() {
  let browser
  const allJobs = []
  
  try {
    console.log('🚀 启动浏览器...')
    browser = await puppeteer.launch({
      headless: false, // 设置为 false 可以看到浏览器运行
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    console.log(`\n📋 开始批量爬取 ${KEYWORDS.length} 个关键词的岗位信息...`)
    console.log(`关键词列表: ${KEYWORDS.join(', ')}\n`)
    
    // 循环处理每个关键词
    for (let i = 0; i < KEYWORDS.length; i++) {
      const keyword = KEYWORDS[i]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📌 [${i + 1}/${KEYWORDS.length}] 正在处理关键词: ${keyword}`)
      console.log(`${'='.repeat(60)}`)
      
      let collected = 0
      for (let c = 0; c < CITIES.length && collected < TARGET_COUNT; c++) {
        const city = CITIES[c]
        const remain = TARGET_COUNT - collected
        const perCityLimit = Math.min(8, Math.max(5, remain))
        const jobs = await fetchBossJobsByKeywordInCity(keyword, city, browser, perCityLimit)
        allJobs.push(...jobs)
        collected += jobs.length
        if (c < CITIES.length - 1 && collected < TARGET_COUNT) {
          console.log(`\n⏸️  切换城市，等待 2 秒...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // 每个关键词之间添加延迟，避免请求过快
      if (i < KEYWORDS.length - 1) {
        console.log(`\n⏸️  等待 3 秒后处理下一个关键词...`)
        await new Promise(resolve => setTimeout(resolve, 3000))
      }
    }
    
    // 显示总体统计
    console.log(`\n${'='.repeat(60)}`)
    console.log(`\n🎉 批量爬取完成！`)
    console.log(`📊 总共爬取 ${allJobs.length} 个岗位`)
    
    if (allJobs.length > 0) {
      // 显示所有岗位的技能统计
      const allSkills = allJobs.flatMap(j => j.skills)
      const skillCount = {}
      allSkills.forEach(skill => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
      
      console.log(`\n📊 所有岗位技能统计（前20）:`)
      const topSkills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
      topSkills.forEach(([skill, count]) => {
        console.log(`  - ${skill}: ${count}次`)
      })
      
      // 按关键词统计
      console.log(`\n📊 按关键词统计:`)
      const keywordCount = {}
      allJobs.forEach(job => {
        const kw = job.keyword || '未知'
        keywordCount[kw] = (keywordCount[kw] || 0) + 1
      })
      Object.entries(keywordCount).forEach(([kw, count]) => {
        console.log(`  - ${kw}: ${count}个岗位`)
      })
    }
    
  } catch (err) {
    console.error('❌ 批量爬取出错:', err.message)
  } finally {
    if (browser) {
      await browser.close()
      console.log('\n🔒 浏览器已关闭')
    }
    mongoose.connection.close()
    console.log('🔌 MongoDB 连接已关闭')
  }
}

fetchBossJobs()
