// jobImport.js
import axios from 'axios'
import mongoose from 'mongoose'

// 连接 MongoDB
mongoose.connect('mongodb://localhost:27017/software').then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// 定义集合 Schema
const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  description: String,
  salary_min: Number,
  salary_max: Number,
  skills: [String],
  createdAt: { type: Date, default: Date.now }
})

// 创建模型（会自动对应 jobCollection 集合）
const Job = mongoose.model('Job', jobSchema, 'jobCollection')

// Adzuna API 参数
const APP_ID = 'f6c83606'
const APP_KEY = '754fb06e1abb0219006c8cb0a86cd0e0'
const COUNTRY = 'gb' // 国家，可选 'gb', 'us', 'de', 'fr' 等
const QUERY = 'developer' // 搜索关键词

// 获取岗位数据并写入数据库
async function fetchAndStoreJobs() {
  try {
    const url = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&what=${QUERY}&content-type=application/json`
    const res = await axios.get(url)

    const jobs = res.data.results.map(job => ({
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      description: job.description,
      salary_min: job.salary_min,
      salary_max: job.salary_max,
      skills: extractSkills(job.description)
    }))

    await Job.insertMany(jobs)
    console.log(`✅ 成功写入 ${jobs.length} 条岗位数据到 jobCollection`)
  } catch (err) {
    console.error('❌ 获取或写入数据出错:', err)
  } finally {
    mongoose.connection.close()
  }
}

// 简单技能提取（关键词匹配，可自行优化）
function extractSkills(description) {
  const skillKeywords = ['Python', 'Java', 'Vue', 'React', 'SQL', 'C++', 'Node.js']
  return skillKeywords.filter(skill => description.toLowerCase().includes(skill.toLowerCase()))
}

// 执行
fetchAndStoreJobs()

console.log("第一次修改")
console.log("第二次修改")
