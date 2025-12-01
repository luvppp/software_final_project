import mongoose from 'mongoose';

// MongoDB 连接配置
const DB_URI = process.env.MONGO_URI || 'mongodb://10.161.106.62:27017/software';

// 岗位信息 Schema
const jobSchema = new mongoose.Schema(
    {
        title: String,
        company: String,
        salary: String,
        city: String,
        location: String,
        experience: String,
        education: String,
        description: String,
        companyIntro: String,
        duties: { type: [String], default: [] },
        requirements: { type: [String], default: [] },
        isIntern: { type: Boolean, default: false },
        url: String,
        skills: { type: [String], default: [] },
        keyword: String,
        createdAt: { type: Date, default: Date.now },
    },
    {
        collection: 'jobCollection',
    }
);

const Job = mongoose.model('Job', jobSchema);

function cleanCompanyIntro(text) {
  let t = String(text || '').replace(/[\uE000-\uF8FF]/g, '').replace(/\r/g, '')
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

function cleanTitle(t) {
  return String(t)
    .replace(/\s*(\d+(?:-\d+)?\s*(?:K|k|千|万|元)(?:\/[月年天])?)/gi, '')
    .replace(/\s*[\-|·|]\s*\d.*$/g, '')
    .replace(/\s*(薪资|工资|薪酬|待遇)[^，。]*$/g, '')
    .trim()
}

const skillMapping = {
  js: 'JavaScript', JS: 'JavaScript', javascript: 'JavaScript', JAVASCRIPT: 'JavaScript', Js: 'JavaScript',
  ts: 'TypeScript', TS: 'TypeScript', typescript: 'TypeScript',
  node: 'Node.js', Node: 'Node.js', NODE: 'Node.js', nodejs: 'Node.js', NodeJS: 'Node.js',
  'vue.js': 'Vue', vuejs: 'Vue', VueJS: 'Vue',
  'react.js': 'React', reactjs: 'React', ReactJS: 'React',
  html5: 'HTML', HTML5: 'HTML', css3: 'CSS', CSS3: 'CSS',
  go: 'Go', GO: 'Go', golang: 'Go', Golang: 'Go', GOLANG: 'Go',
  springboot: 'SpringBoot', 'spring boot': 'SpringBoot', 'Spring Boot': 'SpringBoot',
  k8s: 'Kubernetes', K8s: 'Kubernetes', K8S: 'Kubernetes',
  uniapp: 'uni-app', uniApp: 'uni-app', UniApp: 'uni-app',
  mysql: 'MySQL', MYSQL: 'MySQL', mongodb: 'MongoDB', MONGODB: 'MongoDB', redis: 'Redis', REDIS: 'Redis',
  docker: 'Docker', DOCKER: 'Docker', git: 'Git', GIT: 'Git', linux: 'Linux', LINUX: 'Linux', nginx: 'Nginx', NGINX: 'Nginx',
  python: 'Python', PYTHON: 'Python', java: 'Java', JAVA: 'Java', php: 'PHP',
  'react native': 'React Native', reactnative: 'React Native', ReactNative: 'React Native',
  ps: 'Photoshop', PS: 'Photoshop', photoshop: 'Photoshop', PHOTOSHOP: 'Photoshop',
  illustrator: 'Illustrator', ILLUSTRATOR: 'Illustrator', 'ai软件': 'Illustrator', 'adobe illustrator': 'Illustrator',
  premiere: 'Premiere', PREMIERE: 'Premiere', 'pr软件': 'Premiere', 'adobe premiere': 'Premiere',
  'after effects': 'After Effects', 'AFTER EFFECTS': 'After Effects', 'ae软件': 'After Effects', 'adobe after effects': 'After Effects',
  cad: 'AutoCAD', CAD: 'AutoCAD', autocad: 'AutoCAD', AUTOCAD: 'AutoCAD',
  solidworks: 'SolidWorks', SOLIDWORKS: 'SolidWorks', sw: 'SolidWorks',
  sketch: 'Sketch', SKETCH: 'Sketch', figma: 'Figma', FIGMA: 'Figma', axure: 'Axure', AXURE: 'Axure', 'axure rp': 'Axure',
  xd: 'XD', 'adobe xd': 'XD', revit: 'Revit', REVIT: 'Revit', bim: 'BIM', BIM: 'BIM', c4d: 'C4D', 'cinema 4d': 'C4D', cinema4d: 'C4D',
  office: 'Office', OFFICE: 'Office', 'microsoft office': 'Office', word: 'Word', WORD: 'Word', 'microsoft word': 'Word',
  excel: 'Excel', EXCEL: 'Excel', 'microsoft excel': 'Excel', powerpoint: 'PowerPoint', POWERPOINT: 'PowerPoint', ppt: 'PowerPoint', PPT: 'PowerPoint', 'microsoft powerpoint': 'PowerPoint',
  sap: 'SAP', SAP: 'SAP', 用友: '用友', 金蝶: '金蝶', 财务软件: '财务软件',
  cpa: 'CPA', CPA: 'CPA', cfa: 'CFA', CFA: 'CFA', acca: 'ACCA', ACCA: 'ACCA', cma: 'CMA', CMA: 'CMA', catti: 'CATTI', CATTI: 'CATTI',
  'cet-4': 'CET-4', 'CET-4': 'CET-4', cet4: 'CET-4', 英语四级: 'CET-4', 'cet-6': 'CET-6', 'CET-6': 'CET-6', cet6: 'CET-6', 英语六级: 'CET-6',
  seo: 'SEO', SEO: 'SEO', sem: 'SEM', SEM: 'SEM', crm: 'CRM', CRM: 'CRM', 客户关系管理: 'CRM', mooc: 'MOOC', MOOC: 'MOOC', 在线教育: 'MOOC'
}

const standardSkills = [
  'Vue','Angular','React','React Native','JavaScript','TypeScript','HTML','CSS','Sass','SCSS','Less','Webpack','Vite','Rollup','Gulp','jQuery','小程序','uni-app','移动端','H5','响应式',
  'Java','Python','C++','Go','Node.js','Express','Koa','Spring','SpringBoot','MyBatis','PHP','.NET','ASP.NET',
  'MySQL','PostgreSQL','MongoDB','Redis','Oracle','Elasticsearch',
  'Docker','Kubernetes','Git','SVN','Linux','Nginx','Apache',
  'AI','机器学习','深度学习','TensorFlow','PyTorch','神经网络','NLP','计算机视觉',
  'RESTful','GraphQL','gRPC','微服务','分布式','高并发','性能优化','自动化测试','TDD','BDD','单元测试',
  'Ant Design','Element UI','Vuex','Redux','Flutter','WebSocket','HTTP/HTTPS',
  '财务分析','财务报表','成本核算','预算管理','会计','审计','税务','财务管理','Excel','财务软件','SAP','用友','金蝶','CPA','CFA','ACCA','CMA','银行','证券','保险','投资',
  '市场营销','市场分析','市场调研','品牌管理','SEO','SEM','信息流','社交媒体','微信','微博','抖音','小红书','B站','数据分析','用户运营','活动策划','内容创作','电商','淘宝','京东','拼多多','直播','PR','媒体','广告','推广',
  '招聘','面试','培训','绩效管理','薪酬','福利','劳动关系','员工关系','HR','人力资源','人事','组织发展',
  '销售','商务谈判','客户管理','渠道管理','CRM','客户关系','商务拓展','业务开发','沟通','谈判','演讲','演示',
  'Photoshop','PS','Illustrator','AI','Figma','Sketch','XD','Axure','UI设计','UX设计','交互设计','视觉设计','平面设计','品牌设计','包装设计','网页设计','手绘','插画','3D','C4D',
  '教学','课程设计','培训','教育','PPT','课件制作','在线教育','MOOC','教师资格证','普通话','英语','学科知识',
  '医学','临床','诊断','治疗','护理','药学','医疗器械','医疗管理','执业医师','护士资格','药师资格',
  'AutoCAD','CAD','SolidWorks','Pro/E','机械设计','电气设计','结构设计','工程管理','BIM','Revit','项目管理','施工管理',
  '法律','法务','合同','诉讼','律师','法律顾问','合规','风险控制','司法考试','法律职业资格',
  '编辑','写作','文案','内容创作','新闻','采访','摄影','视频剪辑','Premiere','PR','After Effects','AE','Final Cut Pro','达芬奇','剪映',
  '英语','翻译','口译','笔译','日语','韩语','法语','德语','CATTI','翻译资格',
  'Office','Word','Excel','PowerPoint','沟通能力','团队合作','项目管理','时间管理','领导力','执行力','学习能力','创新能力','英语','英语四级','英语六级','CET-4','CET-6','驾驶','驾照','C1','C2'
]

function extractSkills(desc) {
  if (!desc) return []
  const found = new Set()
  Object.entries(skillMapping).forEach(([variant, std]) => {
    const v = variant.toLowerCase()
    const re = new RegExp(`\\b${v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(desc)) found.add(std)
  })
  standardSkills.forEach(skill => {
    const s = skill.toLowerCase()
    const re = new RegExp(`\\b${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
    if (re.test(desc)) found.add(skill)
  })
  return Array.from(found)
}

// 核心清洗逻辑
function cleanJobData(job) {
    const fullText = job.description || '';
    if (!fullText) return null;

    const clean = fullText.replace(/\r/g, '').trim();

    // 1. 预处理：将 "1. xxx 2. yyy" 这种连在一起的拆分开
    let processedText = clean.replace(/([^0-9\n])\s*(\d+[\.、\s])/g, '$1\n$2');
    processedText = processedText.replace(/([^0-9\n])\s*(\d+、)/g, '$1\n$2');

    // 2. 拆分行
    const normalizeLines = (text) => {
        return String(text || '')
            .split(/\n|；|;|。|\u2022|·|•|\-|—/)
            .map(s => s.replace(/^\s*[\d一二三四五六七八九十\.、\-•\*\)]\s*/, '').replace(/[，,;；。\.\s]+$/, '').trim())
            .filter(s => s && s.length >= 4)
    }

    const lines = normalizeLines(processedText);

    // 3. 过滤逻辑
    const cityNames = ['北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '长沙', '郑州', '南京', '厦门', '苏州', '合肥'];
    const noise = ['举报', '扫码', '二维码', '查看全部', '工商信息', '工作地址', '更多职位', '点击查看地图', '公司介绍', '公司简介', '职位描述', '联系方式', '电话', '邮箱', '微信', 'QQ', 'vx', 'vx号', '福利', '待遇', '五险一金'];
    const extraNoise = ['竞争力分析', '查看完整个人竞争力', '个人综合排名', '你在', '位置', 'BOSS', '安全提示', '严禁', '立即举报', '请勿', '举报入口', '请勿举报', '公司名称', '企业类型', '上市公司', '官网', '网站'];
    const salaryRegex = /(\d+\s*(K|k|千|万|元)(?:\/[月年天])?|薪资|工资|薪酬)/;

    // 移除 "有", "开发" 等宽泛词，增加 "具有", "持有"
    const includeDuty = ['负责', '参与', '承担', '推进', '设计', '优化', '维护', '搭建', '实现', '编写', '调试', '测试', '管理', '沟通', '协作', '支持', '跟进', '分析'];
    const includeReq = ['熟悉', '掌握', '精通', '具备', '具有', '持有', '善于', '能够', '了解', '至少', '优秀', '本科', '学历', '经验', '能力', '英语', '团队', '沟通', '优先', '加分'];

    const filterLines = (lines, type) => {
        const include = type === 'duty' ? includeDuty : includeReq;
        const set = new Set();

        for (const s0 of lines) {
            const s = s0.trim();
            // 长度限制
            if (s.length < 6 || s.length > 200) continue;
            // 必须包含中文或英文
            if (!/[\u4e00-\u9fa5A-Za-z]/.test(s)) continue;
            // 字母比例检查
            const letters = (s.match(/[\u4e00-\u9fa5A-Za-z0-9]/g) || []).length;
            if (letters / s.length < 0.5) continue;

            // 过滤薪资、城市、噪声
            if (salaryRegex.test(s)) continue;
            if (cityNames.some(c => s === c || s.startsWith(c))) continue;
            if (noise.some(k => s.includes(k)) || extraNoise.some(k => s.includes(k))) continue;

            // 🛑 停止词：如果遇到这些词，说明已经读到了底部的推荐区，直接停止后续处理
            if (/推荐|相似|看过/.test(s) && s.length < 10) break;

            // 🚫 强力过滤：招聘相关
            if (/招聘/.test(s)) continue;

            // 🚫 强力过滤：看起来像公司名或职位名的
            // 匹配以 "公司", "集团", "分行", "中心", "部" 结尾的行
            if (/(公司|集团|分行|中心|部)$/.test(s)) continue;
            // 只要包含 "有限公司" 或 "株式会社" 就过滤
            if (/有限公司|株式会社/.test(s)) continue;

            // 匹配常见的职位名称
            if (/工程师|专家|架构师|专员|经理|主管|实习生/.test(s) && s.length < 20) continue;

            // 过滤公司相关但非职责要求的
            if (/^公司|^企业|^官网|^网站/.test(s)) continue;
            if (/公司|有限公司|股份有限公司|集团/.test(s) && !include.some(k => s.includes(k))) continue;

            // 必须包含相关关键词
            if (!include.some(k => s.includes(k))) continue;

            // 去重
            const normalized = s.replace(/\s+/g, ' ');
            if (!set.has(normalized)) set.add(normalized);

            // 数量限制
            if (set.size >= 12) break;
        }
        return Array.from(set);
    };

    // 4. 重新提取分块
    let dutiesRaw = '';
    let requirementsRaw = '';

    const dutiesMatch = processedText.match(/(岗位职责|职位职责|工作职责|工作内容|岗位内容)[\s\S]*?(?=(任职要求|职位要求|资格要求|公司(简介|介绍)|$))/);
    const reqsMatch = processedText.match(/(任职要求|职位要求|资格要求)[\s\S]*?(?=(公司(简介|介绍)|$))/);

    if (dutiesMatch) {
        dutiesRaw = dutiesMatch[0].replace(/^(岗位职责|职位职责|工作职责|工作内容|岗位内容)/, '');
    }
    if (reqsMatch) {
        requirementsRaw = reqsMatch[0].replace(/^(任职要求|职位要求|资格要求)/, '');
    }

    let newDuties = [];
    let newRequirements = [];

    if (dutiesRaw) {
        newDuties = filterLines(normalizeLines(dutiesRaw), 'duty');
    }
    if (requirementsRaw) {
        newRequirements = filterLines(normalizeLines(requirementsRaw), 'req');
    }

    // 如果没找到明确的分块，尝试对全文进行关键词分类
    if (newDuties.length === 0 || newRequirements.length === 0) {
        const allLines = normalizeLines(processedText);
        if (newDuties.length === 0) {
            newDuties = filterLines(allLines.filter(l => includeDuty.some(k => l.includes(k))), 'duty');
        }
        if (newRequirements.length === 0) {
            newRequirements = filterLines(allLines.filter(l => includeReq.some(k => l.includes(k))), 'req');
        }
    }

    // 如果还是空的，尝试用之前的逻辑兜底 (直接按行过滤)
    if (newDuties.length === 0) newDuties = filterLines(lines, 'duty');
    if (newRequirements.length === 0) newRequirements = filterLines(lines, 'req');

    const stripLeading = (s) => String(s).replace(/^\s*[^0-9A-Za-z\u4e00-\u9fa5]+/, '').trim()
    newDuties = (newDuties || []).map(stripLeading).filter(Boolean).slice(0, 12)
    newRequirements = (newRequirements || []).map(stripLeading).filter(Boolean).slice(0, 12)

    let companyIntro = ''
    if (job.companyIntro && job.companyIntro.trim()) {
      companyIntro = cleanCompanyIntro(job.companyIntro)
    } else if (job.description) {
      const m = job.description.match(/公司(简介|介绍)[\s\S]*/)
      if (m) companyIntro = cleanCompanyIntro(m[0].replace(/^公司(简介|介绍)/, ''))
    }
    return {
        duties: newDuties,
        requirements: newRequirements,
        companyIntro,
    };
}


async function main() {
    try {
        console.log('🔌 连接 MongoDB...');
        await mongoose.connect(DB_URI);
        console.log('✅ MongoDB 连接成功');

        const cleanedJobSchema = new mongoose.Schema({
          jobId: { type: String, index: true },
          duties: { type: [String], default: [] },
          requirements: { type: [String], default: [] }
        }, { collection: 'jobCollectionCleaned' })
        const CleanedJob = mongoose.model('CleanedJob', cleanedJobSchema)

        const cleanedDocs = await CleanedJob.find({}, { jobId: 1, duties: 1, requirements: 1 }).lean()
        let merged = 0
        for (const doc of cleanedDocs) {
          if (!doc.jobId) continue
          await Job.updateOne(
            { _id: doc.jobId },
            { $set: { duties: Array.isArray(doc.duties) ? doc.duties : [], requirements: Array.isArray(doc.requirements) ? doc.requirements : [] } }
          )
          merged++
          if (merged % 200 === 0) {
            console.log(`⏳ 已合并 ${merged} 条 duties/requirements 到 jobCollection...`)
          }
        }
        console.log(`✅ 合并完成：共合并 ${merged} 条到 jobCollection。`)

        const jobs = await Job.find({}, { duties: 1, requirements: 1 }).lean()
        let cleanedCount = 0
        const stripLeading = (s) => String(s).replace(/^\s*[^0-9A-Za-z\u4e00-\u9fa5]+/, '').trim()
        for (const job of jobs) {
          const newDuties = Array.isArray(job.duties) ? job.duties.map(stripLeading).filter(Boolean).slice(0, 12) : []
          const newRequirements = Array.isArray(job.requirements) ? job.requirements.map(stripLeading).filter(Boolean).slice(0, 12) : []
          await Job.updateOne({ _id: job._id }, { $set: { duties: newDuties, requirements: newRequirements } })
          cleanedCount++
          if (cleanedCount % 200 === 0) {
            console.log(`⏳ 已对 ${cleanedCount} 条进行首符号清洗...`)
          }
        }
        console.log(`🎉 清洗完成：共对 ${cleanedCount} 条岗位进行了首符号清洗。`)

    } catch (err) {
        console.error('❌ 出错:', err);
    } finally {
        await mongoose.connection.close();
        console.log('🔌 MongoDB 连接已关闭');
    }
}

main();
