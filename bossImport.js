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
  createdAt: { type: Date, default: Date.now }
})

const Job = mongoose.model('Job', jobSchema, 'jobCollection')

// 目标关键词（可以改成 "Java", "前端", "AI", "测试工程师" 等）
const KEYWORD = '前端开发'

// BOSS直聘搜索结果页
const BASE_URL = `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(KEYWORD)}&city=101010100`

// 技能关键词提取函数 - 支持中英文
function extractSkills(desc) {
  // 定义常见的技术关键词（使用规范化的名称）
  const skillKeywords = [
    // 前端技术
    'Vue', 'Angular', 'React',
    'JavaScript', 'TypeScript',
    'HTML', 'CSS', 'Sass', 'SCSS', 'Less',
    'Webpack', 'Vite', 'Rollup', 'Gulp',
    'jQuery',
    '小程序', 'uni-app', 'uniapp',
    '移动端', 'H5', '响应式',
    
    // 后端技术
    'Java', 'Python',
    'C++', 'Go', 'Golang',
    'Node.js', 'Express', 'Koa',
    'Spring', 'SpringBoot', 'MyBatis',
    'PHP', '.NET', 'ASP.NET',
    
    // 数据库
    'MySQL', 'PostgreSQL', 'MongoDB',
    'Redis', 'Oracle',
    'Elasticsearch',
    
    // 工具和框架
    'Docker', 'Kubernetes', 'K8s',
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
    'React Native', 'Flutter',
    'WebSocket', 'HTTP/HTTPS'
  ]
  
  const foundSkills = []
  const descLower = desc.toLowerCase()
  
  // 检查每个关键词（不区分大小写）
  skillKeywords.forEach(skill => {
    if (descLower.includes(skill.toLowerCase())) {
      foundSkills.push(skill)
    }
  })
  
  // 去重并返回
  return [...new Set(foundSkills)]
}

// 爬取函数
async function fetchBossJobs() {
  let browser
  try {
    console.log('🚀 启动浏览器...')
    browser = await puppeteer.launch({
      headless: false, // 设置为 false 可以看到浏览器运行
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // 设置浏览器视口
    await page.setViewport({ width: 1920, height: 1080 })
    
    console.log(`📡 正在访问: ${BASE_URL}`)
    await page.goto(BASE_URL, { waitUntil: 'networkidle2', timeout: 60000 })
    
    // 等待岗位列表加载
    console.log('⏳ 等待岗位列表加载...')
    await page.waitForSelector('.job-list-box', { timeout: 10000 }).catch(() => {
      console.log('⚠️ 未找到 .job-list-box，尝试等待其他元素...')
    })
    
    // 等待一下确保内容加载完成
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 先获取所有岗位链接
    console.log('🔍 获取岗位链接...')
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
    
    console.log(`📊 找到 ${jobLinks.length} 个岗位链接`)
    
    // 关闭列表页
    await page.close()
    
    const jobs = []
    
    // 遍历每个岗位链接，获取详细信息（最多10个作为演示）
    const maxJobs = Math.min(jobLinks.length, 10)
    console.log(`🚀 开始爬取 ${maxJobs} 个岗位详情...`)
    
    for (let i = 0; i < maxJobs; i++) {
      const jobLink = jobLinks[i]
      console.log(`[${i + 1}/${maxJobs}] 正在爬取: ${jobLink.title}`)
      
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
        
        jobs.push(jobInfo)
        console.log(`  ✅ 成功爬取，提取到技能: ${jobInfo.skills.slice(0, 3).join(', ')}...`)
        
        // 避免请求过快，添加延迟
        await new Promise(resolve => setTimeout(resolve, 1000))
        
      } catch (err) {
        console.log(`  ⚠️ 爬取失败: ${err.message}`)
        // 如果详情页无法访问，至少保存基本信息
        jobs.push({
          title: jobLink.title,
          company: '',
          salary: '',
          location: '',
          experience: '',
          education: '',
          description: '',
          skills: []
        })
      }
    }
    
    console.log(`\n📝 总共成功爬取 ${jobs.length} 个岗位`)
    
    if (jobs.length > 0) {
      // 显示提取到的技能统计
      const allSkills = jobs.flatMap(j => j.skills)
      const skillCount = {}
      allSkills.forEach(skill => {
        skillCount[skill] = (skillCount[skill] || 0) + 1
      })
      
      console.log('\n📊 技能统计（前10）:')
      const topSkills = Object.entries(skillCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
      topSkills.forEach(([skill, count]) => {
        console.log(`  - ${skill}: ${count}次`)
      })
      
      await Job.insertMany(jobs)
      console.log(`\n✅ 已写入 ${jobs.length} 条岗位数据到 jobCollection`)
    }
    
  } catch (err) {
    console.error('❌ 爬取出错:', err.message)
  } finally {
    if (browser) {
      await browser.close()
      console.log('🔒 浏览器已关闭')
    }
    mongoose.connection.close()
    console.log('🔌 MongoDB 连接已关闭')
  }
}

fetchBossJobs()
