import puppeteer from 'puppeteer'
import mongoose from 'mongoose'

// 连接 MongoDB
mongoose.connect('mongodb://localhost:27017/software')
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
  keyword: String, // 搜索关键词
  createdAt: { type: Date, default: Date.now }
})

const Job = mongoose.model('Job', jobSchema, 'jobCollection')

// 目标关键词数组（支持多个职位关键词）
const KEYWORDS = [
  '前端开发',
  'Java开发',
  'Python开发',
  '测试工程师',
  'AI工程师',
  '算法工程师'
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
  'ReactNative': 'React Native'
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
  
  // 其他
  'RESTful', 'GraphQL', 'gRPC', '微服务',
  '分布式', '高并发', '性能优化',
  '自动化测试', 'TDD', 'BDD', '单元测试',
  
  // 更多前端框架和工具
  'Ant Design', 'Element UI', 'Vuex', 'Redux',
  'Flutter',
  'WebSocket', 'HTTP/HTTPS'
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

// 爬取单个关键词的函数
async function fetchBossJobsByKeyword(keyword, browser) {
  try {
    const BASE_URL = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(keyword)}&city=101010100`
    
    const page = await browser.newPage()
    
    // 设置浏览器视口
    await page.setViewport({ width: 1920, height: 1080 })
    
    console.log(`\n📡 [${keyword}] 正在访问: ${BASE_URL}`)
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
    
    // 等待岗位列表加载
    console.log(`⏳ [${keyword}] 等待岗位列表加载...`)
    await page.waitForSelector('.job-list-box', { timeout: 10000 }).catch(() => {
      console.log(`⚠️ [${keyword}] 未找到 .job-list-box，尝试等待其他元素...`)
    })
    
    // 等待一下确保内容加载完成
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 先获取所有岗位链接
    console.log(`🔍 [${keyword}] 获取岗位链接...`)
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
    
    console.log(`📊 [${keyword}] 找到 ${jobLinks.length} 个岗位链接`)
    
    // 关闭列表页
    await page.close()
    
    const jobs = []
    
    // 遍历每个岗位链接，获取详细信息（每个关键词最多爬取10个岗位）
    const maxJobs = Math.min(jobLinks.length, 10)
    console.log(`🚀 [${keyword}] 开始爬取 ${maxJobs} 个岗位详情...`)
    
    for (let i = 0; i < maxJobs; i++) {
      const jobLink = jobLinks[i]
      console.log(`[${keyword}] [${i + 1}/${maxJobs}] 正在爬取: ${jobLink.title}`)
      
      try {
        // 打开新标签页
        const newPage = await browser.newPage()
        await newPage.setViewport({ width: 1920, height: 1080 })
        
        // 访问岗位详情页
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
          const descEl = document.querySelector('.job-segment-text, .job-detail')
          let description = ''
          
          if (descEl) {
            // 获取所有文本内容
            description = descEl.textContent?.trim() || ''
          } else {
            // 尝试其他选择器
            const altDescEl = document.querySelector('.job-primary .job-detail, .detail')
            description = altDescEl?.textContent?.trim() || ''
          }
          
          return {
            title,
            company,
            salary,
            location,
            experience,
            education,
            description
          }
        })
        
        await newPage.close()
        
        // 从描述中提取技能
        jobInfo.skills = extractSkills(jobInfo.description || jobInfo.title)
        
        // 添加关键词字段，方便后续分析
        jobInfo.keyword = keyword
        jobs.push(jobInfo)
        console.log(`  ✅ [${keyword}] 成功爬取，提取到技能: ${jobInfo.skills.slice(0, 3).join(', ')}...`)
        
        // 避免请求过快，添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        console.log(`  ⚠️ [${keyword}] 爬取失败: ${err.message}`)
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
    
    console.log(`\n📝 [${keyword}] 总共成功爬取 ${jobs.length} 个岗位`)
    
    if (jobs.length > 0) {
      // 显示提取到的技能统计
      const allSkills = jobs.flatMap(j => j.skills)
      const skillCount = {}
      allSkills.forEach(skill => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
      
      console.log(`\n📊 [${keyword}] 技能统计（前10）:`)
      const topSkills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      topSkills.forEach(([skill, count]) => {
        console.log(`  - ${skill}: ${count}次`)
      })
      
      await Job.insertMany(jobs)
      console.log(`\n✅ [${keyword}] 已写入 ${jobs.length} 条岗位数据到 jobCollection`)
    }
    
    return jobs
    
  } catch (err) {
    console.error(`❌ [${keyword}] 爬取出错:`, err.message)
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
      
      const jobs = await fetchBossJobsByKeyword(keyword, browser)
      allJobs.push(...jobs)
      
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
