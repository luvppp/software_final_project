import puppeteer from 'puppeteer'
import mongoose from 'mongoose'

// 连接 MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://10.161.106.62:27017/software'
mongoose.set('bufferTimeoutMS', Number(process.env.MONGO_BUFFER_TIMEOUT_MS || 60000))
let mongoReadyPromise = mongoose.connect(MONGO_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err.message))

async function ensureDbConnected() {
  if (mongoose.connection.readyState === 1) return
  try { await mongoReadyPromise } catch {}
  if (mongoose.connection.readyState === 1) return
  try {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000, socketTimeoutMS: 30000 })
    console.log('✅ MongoDB reconnected')
  } catch (err) {
    console.error('❌ MongoDB reconnect failed:', err?.message || err)
    throw err
  }
}

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
  url: String,
  isIntern: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
})

const Job = mongoose.model('Job', jobSchema, 'jobCollection')

// 目标关键词数组（支持多个职位关键词）
const KEYWORDS = [
  // 计算机/IT 领域（11）
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

  // 金融/会计领域（5）
  '财务',
  '会计',
  '审计',
  '金融分析师',
  '银行',

  // 市场营销/运营领域（6）
  '市场营销',
  '市场推广',
  '运营',
  '产品经理',
  '新媒体运营',
  '电商运营',

  // 人力资源领域（3）
  '人力资源',
  '招聘',
  '人事',

  // 销售/商务领域（3）
  '销售',
  '商务',
  '客户经理',

  // 设计领域（4）
  'UI设计',
  '平面设计',
  '产品设计',
  '交互设计',

  // 教育领域（3）
  '教师',
  '培训',
  '教育',

  // 医疗领域（3）
  '医生',
  '护士',
  '医疗',

  // 工程领域（4）
  '机械工程师',
  '电气工程师',
  '土木工程师',
  '结构工程师',

  // 法律领域（3）
  '律师',
  '法务',
  '法律顾问',

  // 媒体/编辑领域（3）
  '编辑',
  '记者',
  '新媒体',

  // 其他专业领域（2）
  '翻译',
  '项目管理'
]

// 限制处理的职位关键词数量（默认30，可用环境变量 KEYWORD_LIMIT 设置为25-30）
const KEYWORD_LIMIT = Math.max(1, Math.min(Number(process.env.KEYWORD_LIMIT || 30), KEYWORDS.length))
const EFFECTIVE_KEYWORDS = KEYWORDS.slice(0, KEYWORD_LIMIT)

// 继续爬取起始关键词（可用环境变量 RESUME_KEYWORD 覆盖）
const RESUME_KEYWORD = process.env.RESUME_KEYWORD || ''
// 岗位类型过滤：intern | fulltime | all
const JOB_TYPE = (process.env.JOB_TYPE || 'all').toLowerCase()

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

function cleanTitle(t) {
  return String(t)
    .replace(/\s*(\d+(?:-\d+)?\s*(?:K|k|千|万|元)(?:\/[月年天])?)/gi, '')
    .replace(/\s*[\-|·|]\s*\d.*$/g, '')
    .replace(/\s*(薪资|工资|薪酬|待遇)[^，。]*$/g, '')
    .trim()
}

// 从职位描述中拆分“岗位职责”“任职要求”“公司简介”，并做分点
function splitDescSections(fullText, dutiesText = '', requirementsText = '') {
  const clean = (fullText || '').replace(/\r/g, '').trim()
  const normalizeLines = (text) => {
    return String(text || '')
      .split(/\n|；|;|。|\u2022|·|•|\-|—/)
      .map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').replace(/[，,;；。\.\s]+$/, '').trim())
      .filter(Boolean)
  }
  const cityNames = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '长沙', '郑州', '南京', '厦门', '苏州', '合肥']
  const noise = ['举报', '扫码', '二维码', '查看全部', '工商信息', '工作地址', '更多职位', '点击查看地图', '公司介绍', '公司简介', '职位描述', '联系方式', '电话', '邮箱', '微信', 'QQ', 'vx', 'vx号', '福利', '待遇', '五险一金', '招聘', '应聘', '求职']
  const extraNoise = ['竞争力分析', '查看完整个人竞争力', '个人综合排名', '你在', '位置', 'BOSS', '安全提示', '严禁', '立即举报', '请勿', '举报入口', '请勿举报', '公司名称', '企业类型', '上市公司', '官网', '网站', '统一社会信用代码', '注册地址', '注册资本', '法定代表人', '经营范围', '成立日期', '经营状态', '协会', '研究院', '研究所', '学院', '大学']
  const salaryRegex = /(\d+\s*(K|k|千|万|元)(?:\/[月年天])?|薪资|工资|薪酬)/
  const letterRatioValid = (s) => {
    const letters = (s.match(/[\u4e00-\u9fa5A-Za-z0-9]/g) || []).length
    return letters / s.length >= 0.5
  }
  const includeDuty = ['负责', '参与', '承担', '推进', '设计', '开发', '优化', '维护', '搭建', '实现', '编写', '调试', '测试', '管理', '沟通', '协作', '支持', '跟进', '分析', '落地', '保障', '统筹', '制定', '完善', '改进', '梳理', '对标']
  const includeReq = ['要求', '需要', '需', '熟悉', '掌握', '精通', '具备', '具有', '持有', '善于', '能够', '了解', '至少', '优秀', '本科', '学历', '经验', '能力', '英语', '团队', '沟通', '优先', '加分', '逻辑', '抗压', '主动', '具备良好', '具备较强', '具备优秀', '具备出色']
  const titleTokens = ['工程师','专家','架构师','专员','经理','主管','顾问','分析师','前端','后端','测试','算法','产品','运营','实习生','Java','Python','Go','C++','Web','React','Vue','uniapp','Android','iOS']
  const startsWithVerb = (s) => /^(负责|参与|推进|搭建|开发|优化|维护|实现|落地|管理|沟通|协作|编写|测试|调试|设计|保障|配合|对接|与|统筹|制定|完善|改进|梳理|对标)/.test(s)
  const startsWithReq = (s) => /^(要求|需要|需|熟悉|掌握|精通|具备良好|具备较强|具备优秀|具备出色|具备|具有|持有|善于|能够|了解|至少|拥有|本科|硕士|博士|学历|经验|英语|团队|沟通|优先|加分|逻辑|抗压|主动)/.test(s)
  const isJobTitle = (s) => {
    if (startsWithVerb(s)) return false
    const short = s.replace(/[，,;；。]/g,'')
    if (short.length <= 26 && titleTokens.some(t => short.includes(t))) return true
    if (/(工程师|专家|架构师|专员|经理|主管|顾问|分析师)$/.test(short)) return true
    return false
  }
  const filterLines = (lines, type, mode = STRICTNESS_MODE) => {
    const include = type === 'duty' ? includeDuty : includeReq
    const set = new Set()
    for (const s0 of lines) {
      const s = s0.trim()
      if (s.length < 6 || s.length > 200) continue
      if (!/[\u4e00-\u9fa5A-Za-z]/.test(s)) continue
      if (!letterRatioValid(s)) continue
      if (salaryRegex.test(s)) continue
      if (cityNames.some(c => s === c || s.startsWith(c))) continue
      if (noise.some(k => s.includes(k)) || extraNoise.some(k => s.includes(k))) continue
      if (isJobTitle(s)) continue

      // 🛑 停止词
      if (/推荐|相似|看过/.test(s) && s.length < 10) break
      // 🚫 强力过滤
      if (/招聘|应聘|投递|简历|岗位|职位(介绍)?$/.test(s)) continue
      if (/(公司|集团|分行|中心|部)$/.test(s)) continue
      if (/有限公司|股份有限公司|株式会社|公司$/.test(s)) continue
      if (/工程师|专家|架构师|专员|经理|主管|实习生/.test(s) && s.length < 20) continue

      if (/^公司|^企业|^官网|^网站/.test(s)) continue
      if (/公司|有限公司|股份有限公司|集团/.test(s) && !include.some(k => s.includes(k))) continue
      if (!include.some(k => s.includes(k))) continue
      const normalized = s.replace(/\s+/g, ' ')
      if (mode === 'strict') {
        if (type === 'duty' && !startsWithVerb(normalized)) continue
        if (type === 'req' && !startsWithReq(normalized)) continue
      }
      if (!set.has(normalized)) set.add(normalized)
      if (set.size >= 12) break
    }
    return Array.from(set)
  }
  const classifyLines = (lines, mode = STRICTNESS_MODE) => {
    const duties = []
    const reqs = []
    const add = (arr, s) => { if (!arr.includes(s)) arr.push(s); if (arr.length > 12) arr.length = 12 }
    for (const s0 of lines) {
      const s = s0.trim()
      if (s.length < 6 || s.length > 200) continue
      if (!/[\u4e00-\u9fa5A-Za-z]/.test(s)) continue
      if (!letterRatioValid(s)) continue
      if (salaryRegex.test(s)) continue
      if (cityNames.some(c => s === c || s.startsWith(c))) continue
      if (noise.some(k => s.includes(k)) || extraNoise.some(k => s.includes(k))) continue
      if (isJobTitle(s)) continue
      if (!includeDuty.some(k => s.includes(k)) && !includeReq.some(k => s.includes(k))) continue
      if (/招聘|应聘|投递|简历|岗位|职位(介绍)?$/.test(s)) continue
      if (/(公司|集团|分行|中心|部)$/.test(s)) continue
      if (/有限公司|股份有限公司|株式会社|公司$/.test(s)) continue
      const normalized = s.replace(/\s+/g, ' ')
      let dutyScore = 0
      let reqScore = 0
      includeDuty.forEach(k => { if (normalized.includes(k)) dutyScore++ })
      includeReq.forEach(k => { if (normalized.includes(k)) reqScore++ })
      if (/^负责/.test(normalized)) dutyScore += 3
      if (/(至少|\d\s*年|[一二三四五六七八九十]\s*年|本科|硕士|博士|学历|证书|资格|优先|能力)/.test(normalized)) reqScore += 2
      if (dutyScore > reqScore) {
        if (mode === 'strict' && !startsWithVerb(normalized)) continue
        add(duties, normalized)
      } else if (reqScore > dutyScore) {
        if (mode === 'strict' && !startsWithReq(normalized)) continue
        add(reqs, normalized)
      }
      else {
        if (/^负责|参与|推进|搭建|开发|优化|维护|实现|落地/.test(normalized)) {
          if (mode === 'strict' && !startsWithVerb(normalized)) continue
          add(duties, normalized)
        } else {
          if (mode === 'strict' && !startsWithReq(normalized)) continue
          add(reqs, normalized)
        }
      }
      if (duties.length >= 12 && reqs.length >= 12) break
    }
    return { duties, requirements: reqs }
  }
  const sections = { duties: [], requirements: [], companyIntro: '' }
  const dutiesMatch = clean.match(/(岗位职责|职位职责|职责|工作职责|工作内容|岗位内容|职位描述)[\s\S]*?(?=(任职要求|职位要求|资格要求|技能要求|公司(简介|介绍)|$))/)
  const reqsMatch = clean.match(/(任职要求|职位要求|资格要求|技能要求)[\s\S]*?(?=(公司(简介|介绍)|$))/)
  const companyMatch = clean.match(/公司(简介|介绍)[\s\S]*/)
  if (dutiesText) sections.duties = filterLines(normalizeLines(dutiesText), 'duty')
  if (requirementsText) sections.requirements = filterLines(normalizeLines(requirementsText), 'req')
  if (!dutiesText && dutiesMatch) {
    const base = normalizeLines(dutiesMatch[0].replace(/^(岗位职责|职位职责|职责|工作职责|工作内容|岗位内容|职位描述)/, ''))
    let arr = filterLines(base, 'duty', 'strict')
    if (arr.length === 0) arr = filterLines(base, 'duty', 'balanced')
    sections.duties = arr
  }
  if (!requirementsText && reqsMatch) {
    const base = normalizeLines(reqsMatch[0].replace(/^(任职要求|职位要求|资格要求|技能要求)/, ''))
    let arr = filterLines(base, 'req', 'strict')
    if (arr.length === 0) arr = filterLines(base, 'req', 'balanced')
    sections.requirements = arr
  }
  if (companyMatch) sections.companyIntro = companyMatch[0].replace(/^公司(简介|介绍)/, '').trim()
  if (sections.duties.length === 0 || sections.requirements.length === 0) {
    const lines = normalizeLines(clean)
    const cStrict = classifyLines(lines, 'strict')
    if (sections.duties.length === 0) sections.duties = cStrict.duties
    if (sections.requirements.length === 0) sections.requirements = cStrict.requirements

    if (sections.duties.length === 0 || sections.requirements.length === 0) {
      const cBalanced = classifyLines(lines, 'balanced')
      if (sections.duties.length === 0) sections.duties = cBalanced.duties
      if (sections.requirements.length === 0) sections.requirements = cBalanced.requirements
    }

    if (sections.duties.length === 0) {
      const looseDuty = lines
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length >= 6 && /[\u4e00-\u9fa5A-Za-z]/.test(s) && startsWithVerb(s))
        .slice(0, 8)
      sections.duties = looseDuty
    }
    if (sections.requirements.length === 0) {
      const looseReq = lines
        .map(s => s.replace(/\s+/g, ' ').trim())
        .filter(s => s.length >= 6 && /[\u4e00-\u9fa5A-Za-z]/.test(s) && startsWithReq(s))
        .slice(0, 8)
      sections.requirements = looseReq
    }
  }
  return sections
}

// 清洗公司简介文本，移除噪声与不相关模块
function cleanCompanyIntro(text) {
  let t = (text || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\r/g, '')
  const cutPoints = ['查看全部', '工商信息', '工作地址', '更多职位', '看过该职位的人还看了', '点击查看地图', '公司地址', '地址', '地图', '联系方式']
  for (const marker of cutPoints) {
    const idx = t.indexOf(marker)
    if (idx > 0) { t = t.slice(0, idx); break }
  }
  const removeKeys = ['公司名称', '法定代表人', '成立日期', '企业类型', '经营状态', '注册资金', '统一社会信用代码', '注册地址', '注册资本', '官网', '网站']
  const dropWords = ['电话', '邮箱', '微信', 'QQ', 'vx', '福利', '待遇', '招聘', '应聘', '投递', '简历', '职位', '岗位', '薪资', '工资', '薪酬']
  t = t
    .split(/\n|\s{2,}/)
    .map(s => s.trim())
    .filter(s => s && s.length >= 6)
    .filter(s => !removeKeys.some(k => s.includes(k)))
    .filter(s => !dropWords.some(k => s.includes(k)))
    .join('\n')
  t = t.replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n').replace(/\*+/g, '')
  t = t.replace(/\s*(更多职位.*)$/s, '').trim()
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
  { name: '合肥', code: '101220100' },
  { name: '天津', code: '101030100' },
  { name: '青岛', code: '101120200' },
  { name: '宁波', code: '101210400' },
  { name: '无锡', code: '101190200' },
  { name: '佛山', code: '101280800' },
  { name: '东莞', code: '101281000' },
  { name: '沈阳', code: '101070100' },
  { name: '大连', code: '101070200' },
  { name: '济南', code: '101120100' },
  { name: '福州', code: '101230100' },
  { name: '昆明', code: '101290100' },
  { name: '南昌', code: '101240100' },
  { name: '石家庄', code: '101090100' },
  { name: '哈尔滨', code: '101050100' }
]
const TARGET_COUNT = 30
const INTERN_LIMIT = Number(process.env.INTERN_LIMIT || 4)
const FULLTIME_LIMIT = Number(process.env.FULLTIME_LIMIT || 8)
const CONCURRENCY_LIMIT = Number(process.env.CONCURRENCY_LIMIT || 10)
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 3)
const BATCH_DELAY_MIN_MS = Number(process.env.BATCH_DELAY_MIN_MS || 3000)
const BATCH_DELAY_MAX_MS = Number(process.env.BATCH_DELAY_MAX_MS || 6000)
const STRICTNESS_MODE = (process.env.STRICTNESS_MODE || 'balanced').toLowerCase()
const CITY_TARGET = Number(process.env.CITY_TARGET || 6)

function hashString(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
function shuffleWithSeed(arr, seed) {
  const rand = mulberry32(seed)
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = a[i]
    a[i] = a[j]
    a[j] = tmp
  }
  return a
}
function getCityOrderForKeyword(keyword) {
  const seed = hashString(String(keyword || ''))
  return shuffleWithSeed(CITIES, seed)
}

const FIXED_CITIES = ['北京','上海','广州','深圳','杭州','成都']
function buildCityPlanForKeyword(keyword) {
  return CITIES.filter(c => FIXED_CITIES.includes(c.name))
}

// 代理配置（按需填写）
const PROXIES = ((process.env.PROXIES || process.env.BOSS_PROXIES || '')
  .split(/[;,|\s]+/)
  .map(s => s.trim())
  .filter(Boolean))
let CURRENT_PROXY = null
let CURRENT_PROXY_AUTH = null
const parseProxy = (proxy) => {
  if (!proxy) return { server: null, auth: null }
  try {
    const u = new URL(proxy)
    const server = `${u.protocol}//${u.hostname}:${u.port}`
    const auth = (u.username || u.password) ? { username: decodeURIComponent(u.username), password: decodeURIComponent(u.password) } : null
    return { server, auth }
  } catch {
    return { server: proxy, auth: null }
  }
}
const randDelay = (min, max) => new Promise(r => setTimeout(r, Math.floor(min + Math.random() * (max - min))))
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:118.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edg/125.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
]
const randUA = () => USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]
async function setupInterception(page) {
  try {
    await page.setRequestInterception(true)
    page.on('request', req => {
      const t = req.resourceType()
      const url = req.url()
      if (t === 'image' || t === 'media' || t === 'font' || t === 'stylesheet') return req.abort()
      if (/geetest|captcha|track|beacon|hm\.baidu|analytics|sdk|fp/.test(url)) return req.abort()
      req.continue()
    })
  } catch { }
}
async function applyAuth(page) { if (CURRENT_PROXY_AUTH) { try { await page.authenticate(CURRENT_PROXY_AUTH) } catch { } } }
async function isBlocked(page) {
  try {
    return await page.evaluate(() => {
      const txt = document.body?.innerText || ''
      const keys = ['访问过于频繁', '安全验证', '请完成验证', '滑块验证', '验证码', '异常访问', '请稍后再试']
      if (keys.some(k => txt.includes(k))) return true
      if (document.querySelector('.geetest, .nc-container, .captcha')) return true
      return false
    })
  } catch { return false }
}
async function launchBrowserWithProxy(proxy) {
  const { server, auth } = parseProxy(proxy)
  CURRENT_PROXY = server
  CURRENT_PROXY_AUTH = auth
  const args = ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  if (server) args.push(`--proxy-server=${server}`)
  return puppeteer.launch({ headless: false, defaultViewport: null, args })
}

// 爬取单个关键词的函数
async function fetchBossJobsByKeywordInCity(keyword, city, browser, limit = 8) {
  try {
    const BASE_URL = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}&city=${city.code}`

    const page = await browser.newPage()
    await applyAuth(page)
    await setupInterception(page)
    await page.setUserAgent(randUA())
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'zh-CN,zh;q=0.9' })
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
      window.chrome = { runtime: {} }
      Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh'] })
      Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] })
    })

    console.log(`\n📡 [${keyword}/${city.name}] 正在访问: ${BASE_URL}`)
    const navResp = await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 })
    if (navResp && navResp.status() === 403) { await page.close(); const e = new Error('IP_BLOCKED'); e.code = 'IP_BLOCKED'; throw e }
    if (await isBlocked(page)) { await page.close(); const e = new Error('IP_BLOCKED'); e.code = 'IP_BLOCKED'; throw e }

    console.log(`⏳ [${keyword}/${city.name}] 等待岗位列表加载...`)
    await page.waitForSelector('.job-list-box, .job-card-wrapper, a[href*="/job_detail/"]', { timeout: 12000 }).catch(() => { })
    await randDelay(2000, 3200)

    console.log(`🔍 [${keyword}/${city.name}] 获取岗位链接...`)
    let jobLinks = await page.evaluate(() => {
      const out = []
      const pushLink = (title, href) => {
        if (!title || !href) return
        const url = href.startsWith('http') ? href : `https://www.zhipin.com${href}`
        out.push({ title: title.trim(), url })
      }
      const anchors = Array.from(document.querySelectorAll('a'))
      anchors.forEach(a => {
        const href = a.getAttribute('href') || ''
        if (!href) return
        if (/(\/job_detail\/|\/web\/geek\/job-detail\/)/.test(href)) {
          const titleEl = a.querySelector('.job-name, .job-title')
          const title = titleEl ? titleEl.textContent.trim() : (a.textContent || '').trim()
          pushLink(title, href)
        }
      })
      const cardLinks = Array.from(document.querySelectorAll('.job-card-wrapper a, .job-card-box a, .job-title a'))
      cardLinks.forEach(a => {
        const href = a.getAttribute('href') || ''
        const title = a.textContent || ''
        if (/(\/job_detail\/|\/web\/geek\/job-detail\/)/.test(href)) pushLink(title, href)
      })
      const seen = new Set()
      return out.filter(l => {
        if (seen.has(l.url)) return false
        seen.add(l.url)
        return true
      })
    })
    if (!jobLinks || jobLinks.length === 0) {
      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => { window.scrollBy(0, document.body.scrollHeight) })
        await new Promise(r => setTimeout(r, 1000))
        jobLinks = await page.evaluate(() => {
          const out = []
          const anchors = Array.from(document.querySelectorAll('a'))
          const pushLink = (title, href) => {
            if (!title || !href) return
            const url = href.startsWith('http') ? href : `https://www.zhipin.com${href}`
            out.push({ title: title.trim(), url })
          }
          anchors.forEach(a => {
            const href = a.getAttribute('href') || ''
            if (!href) return
            if (/(\/job_detail\/|\/web\/geek\/job-detail\/)/.test(href)) {
              const titleEl = a.querySelector('.job-name, .job-title')
              const title = titleEl ? titleEl.textContent.trim() : (a.textContent || '').trim()
              pushLink(title, href)
            }
          })
          const cardLinks = Array.from(document.querySelectorAll('.job-card-wrapper a, .job-card-box a, .job-title a'))
          cardLinks.forEach(a => {
            const href = a.getAttribute('href') || ''
            const title = a.textContent || ''
            if (/(\/job_detail\/|\/web\/geek\/job-detail\/)/.test(href)) pushLink(title, href)
          })
          const seen = new Set()
          return out.filter(l => {
            if (seen.has(l.url)) return false
            seen.add(l.url)
            return true
          })
        })
        if (jobLinks.length > 0) break
      }
    }

    console.log(`📊 [${keyword}/${city.name}] 找到 ${jobLinks.length} 个岗位链接`)

    // 关闭列表页（后续可能打开新的列表页分页补充）
    await page.close()

    const jobs = []
    let blockedDetected = false
    const processed = new Set()
    const initialNeed = (FULLTIME_LIMIT + INTERN_LIMIT) * 2
    const maxJobs = Math.min(jobLinks.length, initialNeed)
    console.log(`🚀 [${keyword}/${city.name}] 开始爬取 ${maxJobs} 个岗位详情...`)

    const runWithConcurrency = async (items, limit, worker) => {
      const results = []
      let idx = 0
      const runners = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (idx < items.length) {
          const cur = idx++
          const r = await worker(items[cur])
          results.push(r)
        }
      })
      await Promise.all(runners)
      return results
    }

    const detailWorker = async (jobLink) => {
      try {
        const newPage = await browser.newPage()
        await applyAuth(newPage)
        await setupInterception(newPage)
        await newPage.setUserAgent(randUA())
        const dResp = await newPage.goto(jobLink.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
        if (dResp && dResp.status() === 403) { await newPage.close(); const e = new Error('IP_BLOCKED'); e.code = 'IP_BLOCKED'; throw e }
        if (await isBlocked(newPage)) { await newPage.close(); const e = new Error('IP_BLOCKED'); e.code = 'IP_BLOCKED'; throw e }
        await randDelay(1500, 2500)
        const jobInfo = await newPage.evaluate(() => {
          // 岗位标题
          const titleEl = document.querySelector('.job-name, .job-primary .name, h1')
          const title = titleEl?.textContent?.trim() || ''

          // 公司名称
          let company = ''
          const selsCompany = [
            '.company-name .name',
            '.company-name',
            '.job-primary .company .name',
            '.job-company .name',
            '.info-company .company-name',
            'a[href*="/gongsi/"]'
          ]
          for (const sel of selsCompany) {
            const el = document.querySelector(sel)
            if (el && el.textContent && el.textContent.trim()) { company = el.textContent.trim(); break }
          }
          if (company) {
            company = company.replace(/公司名称[:：]?\s*/, '').replace(/[（(][^）)]*[）)]/g, '').replace(/\s+/g, ' ').trim()
          }

          // 薪资
          const salaryEl = document.querySelector('.job-primary .salary, .salary')
          let salary = salaryEl?.textContent?.trim() || ''
          if (!salary) {
            const ctx = document.querySelector('.job-primary')?.innerText || document.body.innerText || ''
            const m = ctx.match(/\b\d{1,3}\s*(?:-|~)\s*\d{1,3}\s*(?:K|k|千|万)(?:\/[月年天])?|\b\d{2,}\s*(?:元|K|万)(?:\/[月年天])?/)
            if (m) salary = m[0]
          }

          // 地点
          let location = ''
          const selsLoc = [
            '.job-primary .area',
            '.job-area .text',
            '.job-area .name',
            '.job-address .text',
            '.job-address .name',
            '.location',
            '.job-sec .text-address',
            '.job-sec .address'
          ]
          for (const sel of selsLoc) {
            const el = document.querySelector(sel)
            if (el && el.textContent && el.textContent.trim()) { location = el.textContent.trim(); break }
          }

          // 经验要求
          const expEl = document.querySelector('.job-primary .tag-list, .tag-list .tag')
          const experience = expEl?.textContent?.trim() || ''

          // 教育要求（通常在同一个tag-list中）
          const eduEl = document.querySelector('.job-primary .tag-list .tag:nth-child(2)')
          const education = eduEl?.textContent?.trim() || ''

          const descEl = document.querySelector('.job-segment-text, .job-detail, .job-sec .text, .detail-content .text')
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
          let companyText = ''
          const companyInfoEl = document.querySelector('.company-detail .text, .company-detail .detail-content, .company-desc, .job-company .text, .job-company .detail-content, .job-sec .company-info .text, .side-company .text, .company-info-box .text, .info-company .text, .about-company .text')
          if (companyInfoEl) {
            companyText = companyInfoEl.textContent?.trim() || ''
          }

          // 精确提取“职位描述/岗位职责/任职要求”分块（快速路径：直接在页面内分点）
          const secs = Array.from(document.querySelectorAll('.job-sec, .detail-content .section'))
          let dutiesRaw = ''
          let requirementsRaw = ''
          let dutiesArr = []
          let requirementsArr = []
          let descFull = description
          secs.forEach(sec => {
            const titleTxt = (sec.querySelector('h3, .title')?.textContent || '').trim()
            const bodyTxt = (sec.querySelector('.text, .content')?.innerText || sec.innerText || '').trim()
            if (/职位描述|岗位职责|工作职责|工作内容|岗位内容/i.test(titleTxt)) {
              descFull = bodyTxt
              const dutyMatch = bodyTxt.match(/(岗位职责|职位职责|工作职责|工作内容|岗位内容)[\s\S]*?(?=(任职要求|职位要求|资格要求|公司|$))/)
              if (dutyMatch) dutiesRaw = dutyMatch[0].replace(/^(岗位职责|职位职责|工作职责|工作内容|岗位内容)/, '')
              const splitLines = (bodyTxt || '').split(/\n|；|;|。|\u2022|·|•|\-|—/).map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').replace(/[，,;；。\.\s]+$/, '').trim()).filter(Boolean)
              dutiesArr = splitLines.filter(s => /^(负责|参与|推进|搭建|开发|优化|维护|实现|落地|管理|沟通|协作|编写|测试|调试|设计|保障)/.test(s)).slice(0, 12)
            }
            if (/任职要求|职位要求|资格要求/i.test(titleTxt)) {
              requirementsRaw = bodyTxt.replace(/^(任职要求|职位要求|资格要求)/, '')
              const splitLines = (bodyTxt || '').split(/\n|；|;|。|\u2022|·|•|\-|—/).map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').replace(/[，,;；。\.\s]+$/, '').trim()).filter(Boolean)
              requirementsArr = splitLines.filter(s => /^(熟悉|掌握|精通|具备|具有|持有|善于|能够|了解|至少|拥有|本科|硕士|博士|学历|经验|英语|团队|沟通|优先|加分|逻辑|抗压|主动)/.test(s)).slice(0, 12)
            }
            // 补充：如果上面没找到公司简介，尝试从这里找
            if (!companyText && /公司(介绍|简介)/i.test(titleTxt)) {
              companyText = bodyTxt.replace(/^(公司介绍|公司简介)/, '').trim()
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
            dutiesArr,
            requirementsArr,
            pageTags: tagTexts,
            companyRaw: companyText
          }
        })
        jobInfo.title = cleanTitle(jobInfo.title || jobLink.title || '')
        jobInfo.url = jobLink.url
        await newPage.close()
        // 判断是否为实习岗位
        const internWords = [/实习/i, /Intern/i, /见习/i, /校招/i, /校园/i]
        const textForIntern = `${jobInfo.title} ${jobInfo.experience} ${jobInfo.education} ${(jobInfo.pageTags || []).join(' ')} ${jobInfo.descFull || ''}`
        jobInfo.isIntern = internWords.some(r => r.test(textForIntern))
        let duties = Array.isArray(jobInfo.dutiesArr) ? jobInfo.dutiesArr : []
        let requirements = Array.isArray(jobInfo.requirementsArr) ? jobInfo.requirementsArr : []
        if (duties.length === 0 && jobInfo.dutiesRaw) {
          const splitLines = (jobInfo.dutiesRaw || '').split(/\n|；|;|。|\u2022|·|•|\-|—/).map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').replace(/[，,;；。\.\s]+$/, '').trim()).filter(Boolean)
          duties = splitLines.slice(0, 12)
        }
        if (requirements.length === 0 && jobInfo.requirementsRaw) {
          const splitLines = (jobInfo.requirementsRaw || '').split(/\n|；|;|。|\u2022|·|•|\-|—/).map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').replace(/[，,;；。\.\s]+$/, '').trim()).filter(Boolean)
          requirements = splitLines.slice(0, 12)
        }
        if (duties.length === 0 || requirements.length === 0) {
          const sections = splitDescSections(jobInfo.descFull || jobInfo.description, jobInfo.dutiesRaw || '', jobInfo.requirementsRaw || '')
          if (duties.length === 0) duties = sections.duties
          if (requirements.length === 0) requirements = sections.requirements
          jobInfo.companyIntro = cleanCompanyIntro(jobInfo.companyRaw || sections.companyIntro || '')
        } else {
          jobInfo.companyIntro = cleanCompanyIntro(jobInfo.companyRaw || '')
        }
        jobInfo.duties = duties
        jobInfo.requirements = requirements
        jobInfo.skills = Array.from(new Set([
          ...extractSkills(jobInfo.title || ''),
          ...extractSkills((jobInfo.pageTags || []).join(' ')),
          ...extractSkills(jobInfo.descFull || jobInfo.description || ''),
          ...extractSkills([...(duties || []), ...(requirements || [])].join(' '))
        ]))
        jobInfo.keyword = keyword
        jobInfo.city = city.name
        if (!jobInfo.company && jobLink.title) {
          const m = (jobLink.title || '').match(/@(.*)$/)
          if (m) jobInfo.company = m[1].trim()
        }
        if (!jobInfo.location) jobInfo.location = city.name
        if (!jobInfo.salary) jobInfo.salary = ''
        jobs.push(jobInfo)
        processed.add(jobLink.url)
      } catch (err) {
        if (err && err.code === 'IP_BLOCKED') blockedDetected = true
        processed.add(jobLink.url)
      }
    }

    const targetLinks = jobLinks.slice(0, maxJobs)
    for (let start = 0; start < targetLinks.length; start += BATCH_SIZE) {
      const slice = targetLinks.slice(start, start + BATCH_SIZE)
      await runWithConcurrency(slice, CONCURRENCY_LIMIT, detailWorker)
      // 每批次后评估是否已满足配额，满足则提前结束
      let curValid = jobs.filter(j => (j.company && j.company.trim()))
      const curIntern = curValid.filter(j => j.isIntern)
      const curFull = curValid.filter(j => !j.isIntern)
      if (curIntern.length >= INTERN_LIMIT && curFull.length >= FULLTIME_LIMIT) break
      if (start + BATCH_SIZE < targetLinks.length) {
        await randDelay(BATCH_DELAY_MIN_MS, BATCH_DELAY_MAX_MS)
      }
    }

    const isValidJob = (j) => (j.company && j.company.trim())
    const isMediumValid = (j) => (j.company && j.company.trim()) && ((Array.isArray(j.duties) && j.duties.length > 0) || (Array.isArray(j.requirements) && j.requirements.length > 0))
    let validJobs = jobs.filter(isValidJob)
    if (blockedDetected && validJobs.length < (INTERN_LIMIT + FULLTIME_LIMIT)) { const e = new Error('IP_BLOCKED'); e.code = 'IP_BLOCKED'; throw e }
    let validIntern = validJobs.filter(j => j.isIntern)
    let validFulltime = validJobs.filter(j => !j.isIntern)

    // 不足则翻页补充，最多翻到第5页
    let pageIndex = 2
    while ((validIntern.length < INTERN_LIMIT || validFulltime.length < FULLTIME_LIMIT) && pageIndex <= 3) {
      const listPage = await browser.newPage()
      const pageUrl = `${BASE_URL}&page=${pageIndex}`
      console.log(`↪️  [${keyword}/${city.name}] 翻到第 ${pageIndex} 页: ${pageUrl}`)
      await listPage.goto(pageUrl, { waitUntil: 'domcontentloaded', timeout: 60000 })
      await listPage.waitForSelector('.job-list-box, .job-card-wrapper, a[href*="/job_detail/"]', { timeout: 12000 }).catch(() => { })
      await randDelay(1500, 2500)
      let moreLinks = await listPage.evaluate(() => {
        const out = []
        const anchors = Array.from(document.querySelectorAll('a'))
        anchors.forEach(a => {
          const href = a.getAttribute('href') || ''
          if (!href) return
          if (/(\/job_detail\/|\/web\/geek\/job-detail\/)/.test(href)) {
            const titleEl = a.querySelector('.job-name, .job-title')
            const title = titleEl ? titleEl.textContent.trim() : (a.textContent || '').trim()
            const url = href.startsWith('http') ? href : `https://www.zhipin.com${href}`
            if (title && url) out.push({ title, url })
          }
        })
        return out
      })
      await listPage.close()
      moreLinks = moreLinks.filter(l => !processed.has(l.url))
      const deficit = Math.max(0, (INTERN_LIMIT - validIntern.length)) + Math.max(0, (FULLTIME_LIMIT - validFulltime.length))
      const toFetch = Math.min(moreLinks.length, Math.max(6, deficit * 2))
      await runWithConcurrency(moreLinks.slice(0, toFetch), CONCURRENCY_LIMIT, detailWorker)
      validJobs = jobs.filter(isValidJob)
      validIntern = validJobs.filter(j => j.isIntern)
      validFulltime = validJobs.filter(j => !j.isIntern)
      pageIndex++
    }

    let selectedIntern = validIntern.slice(0, INTERN_LIMIT)
    let selectedFulltime = validFulltime.slice(0, FULLTIME_LIMIT)
    if (selectedIntern.length < INTERN_LIMIT || selectedFulltime.length < FULLTIME_LIMIT) {
      const mediumJobs = jobs.filter(isMediumValid)
      const mediumIntern = mediumJobs.filter(j => j.isIntern)
      const mediumFulltime = mediumJobs.filter(j => !j.isIntern)
      while (selectedIntern.length < INTERN_LIMIT && mediumIntern.length > 0) {
        const j = mediumIntern.shift()
        if (!selectedIntern.find(x => x.url === j.url)) selectedIntern.push(j)
      }
      while (selectedFulltime.length < FULLTIME_LIMIT && mediumFulltime.length > 0) {
        const j = mediumFulltime.shift()
        if (!selectedFulltime.find(x => x.url === j.url)) selectedFulltime.push(j)
      }
    }
    const validSelected = [...selectedIntern, ...selectedFulltime]
    console.log(`\n📝 [${keyword}/${city.name}] 总共成功爬取 ${jobs.length} 个岗位，其中有效 ${validSelected.length} 个 (实习 ${validIntern.length} / 非实习 ${validFulltime.length})`)

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

      await ensureDbConnected()
      await Job.insertMany(validSelected, { ordered: false })
      console.log(`\n✅ [${keyword}/${city.name}] 已写入 ${validSelected.length} 条有效岗位数据到 jobCollection（实习 ${Math.min(validIntern.length, INTERN_LIMIT)} / 非实习 ${Math.min(validFulltime.length, FULLTIME_LIMIT)}）`)
    }

    return validSelected

  } catch (err) {
    if (err && err.code === 'IP_BLOCKED') { throw err }
    console.error(`❌ [${keyword}/${city.name}] 爬取出错:`, err.message)
    return []
  }
}

// 主函数：批量爬取多个关键词
async function fetchBossJobs() {
  await ensureDbConnected()
  let browser
  const allJobs = []
  const proxies = PROXIES.length ? PROXIES : [null]
  let proxyIndex = 0

  try {
    console.log('🚀 启动浏览器...')
    browser = await launchBrowserWithProxy(proxies[proxyIndex])

    console.log(`\n📋 开始批量爬取 ${EFFECTIVE_KEYWORDS.length} 个关键词的岗位信息...`)
    console.log(`关键词列表: ${EFFECTIVE_KEYWORDS.join(', ')}\n`)

    // 循环处理每个关键词（支持从指定关键词继续）
    const startIndexRaw = RESUME_KEYWORD ? EFFECTIVE_KEYWORDS.findIndex(k => k === RESUME_KEYWORD) : -1
    const startIndex = startIndexRaw >= 0 ? startIndexRaw : 0
    const RESUME_CITY = process.env.RESUME_CITY || ''
    console.log(`从关键词: ${EFFECTIVE_KEYWORDS[startIndex]} 开始（索引 ${startIndex}）`)
    for (let i = startIndex; i < EFFECTIVE_KEYWORDS.length; i++) {
      const keyword = EFFECTIVE_KEYWORDS[i]
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📌 [${i + 1}/${EFFECTIVE_KEYWORDS.length}] 正在处理关键词: ${keyword}`)
      console.log(`${'='.repeat(60)}`)

      let collected = 0
      const coveredCities = new Set()
      const cityPlan = buildCityPlanForKeyword(keyword)
      const cityStartIndex = (i === startIndex && RESUME_CITY) ? Math.max(cityPlan.findIndex(x => x.name === RESUME_CITY), 0) : 0
      for (let c = cityStartIndex; c < cityPlan.length; c++) {
        const city = cityPlan[c]
        const perCityLimit = 8
        try {
          const jobs = await fetchBossJobsByKeywordInCity(keyword, city, browser, perCityLimit)
          allJobs.push(...jobs)
          collected += jobs.length
          if (jobs.length > 0) { coveredCities.add(city.name) }
        } catch (err) {
          if (err && err.code === 'IP_BLOCKED') {
            console.log(`🛡️ 检测到封禁，切换代理...`)
            if (browser) { try { await browser.close() } catch { } }
            proxyIndex = (proxyIndex + 1) % proxies.length
            browser = await launchBrowserWithProxy(proxies[proxyIndex])
            c -= 1
            await randDelay(3000, 6000)
            continue
          } else {
            console.log(`⚠️ 城市 ${city.name} 处理失败: ${err?.message || err}`)
          }
        }
        if (c < cityPlan.length - 1) {
          await randDelay(1800, 3200)
        }
      }

      // 每个关键词之间添加延迟，避免请求过快
      if (i < EFFECTIVE_KEYWORDS.length - 1) { await randDelay(2000, 4000) }
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
