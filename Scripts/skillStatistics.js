import mongoose from 'mongoose'

// 连接 MongoDB
mongoose.connect('mongodb://10.161.106.62:27017/software')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB connection error:', err))

// 定义岗位 Schema（用于读取数据）
const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  salary: String,
  location: String,
  experience: String,
  education: String,
  description: String,
  skills: [String],
  keyword: String,
  createdAt: { type: Date, default: Date.now }
})

// 定义技能统计 Schema（用于存储统计结果）
const skillStatSchema = new mongoose.Schema({
  keyword: String,        // 职位关键词
  skill: String,          // 技能名称
  count: Number,          // 出现次数
  totalJobs: Number,      // 该职位总岗位数
  frequency: Number,      // 出现频率（count / totalJobs）
  priority: Number,       // 学习优先级（1-10，10为最高优先级）
  percentage: Number,     // 百分比（frequency * 100）
  updatedAt: { type: Date, default: Date.now }
})

const Job = mongoose.model('Job', jobSchema, 'jobCollection')
const SkillStat = mongoose.model('SkillStat', skillStatSchema, 'skillStatistics')

// 统计每个职位中不同技能的出现次数
async function calculateSkillStatistics() {
  try {
    console.log('📊 开始统计技能数据...\n')
    
    // 从数据库读取所有岗位数据
    const allJobs = await Job.find({})
    console.log(`📋 总共读取到 ${allJobs.length} 个岗位数据`)
    
    if (allJobs.length === 0) {
      console.log('⚠️  数据库中没有岗位数据，请先运行 bossImport.js 爬取数据')
      return
    }
    
    // 按关键词分组
    const jobsByKeyword = {}
    allJobs.forEach(job => {
      const keyword = job.keyword || '未知'
      if (!jobsByKeyword[keyword]) {
        jobsByKeyword[keyword] = []
      }
      jobsByKeyword[keyword].push(job)
    })
    
    console.log(`\n📌 找到 ${Object.keys(jobsByKeyword).length} 个职位类型:`)
    Object.keys(jobsByKeyword).forEach(keyword => {
      console.log(`  - ${keyword}: ${jobsByKeyword[keyword].length} 个岗位`)
    })
    
    // 清空旧的统计数据
    await SkillStat.deleteMany({})
    console.log('\n🗑️  已清空旧的统计数据')
    
    const allSkillStats = []
    
    // 对每个职位类型进行统计
    for (const [keyword, jobs] of Object.entries(jobsByKeyword)) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📊 正在统计职位: ${keyword}`)
      console.log(`${'='.repeat(60)}`)
      
      const totalJobs = jobs.length
      const skillCount = {}
      
      // 统计每个技能的出现次数
      jobs.forEach(job => {
        if (job.skills && Array.isArray(job.skills)) {
          job.skills.forEach(skill => {
            if (skill && skill.trim()) {
              skillCount[skill] = (skillCount[skill] || 0) + 1
            }
          })
        }
      })
      
      // 计算频率和优先级
      const skillStats = Object.entries(skillCount)
        .map(([skill, count]) => {
          const frequency = count / totalJobs  // 出现频率（0-1）
          const percentage = frequency * 100    // 百分比
          
          // 计算优先级（1-10）
          // 优先级基于出现频率：频率越高，优先级越高
          // 频率 >= 0.8: 优先级 10
          // 频率 >= 0.6: 优先级 9
          // 频率 >= 0.4: 优先级 8
          // 频率 >= 0.3: 优先级 7
          // 频率 >= 0.2: 优先级 6
          // 频率 >= 0.15: 优先级 5
          // 频率 >= 0.1: 优先级 4
          // 频率 >= 0.05: 优先级 3
          // 频率 >= 0.02: 优先级 2
          // 其他: 优先级 1
          let priority = 1
          if (frequency >= 0.8) priority = 10
          else if (frequency >= 0.6) priority = 9
          else if (frequency >= 0.4) priority = 8
          else if (frequency >= 0.3) priority = 7
          else if (frequency >= 0.2) priority = 6
          else if (frequency >= 0.15) priority = 5
          else if (frequency >= 0.1) priority = 4
          else if (frequency >= 0.05) priority = 3
          else if (frequency >= 0.02) priority = 2
          
          return {
            keyword,
            skill,
            count,
            totalJobs,
            frequency: Math.round(frequency * 10000) / 10000,  // 保留4位小数
            priority,
            percentage: Math.round(percentage * 100) / 100      // 保留2位小数
          }
        })
        .sort((a, b) => b.count - a.count)  // 按出现次数降序排序
      
      // 显示前10个技能
      console.log(`\n📈 ${keyword} 技能统计（前10）:`)
      skillStats.slice(0, 10).forEach((stat, index) => {
        console.log(`  ${index + 1}. ${stat.skill}: ${stat.count}次 (${stat.percentage}%, 优先级: ${stat.priority})`)
      })
      
      allSkillStats.push(...skillStats)
    }
    
    // 批量插入统计数据
    if (allSkillStats.length > 0) {
      await SkillStat.insertMany(allSkillStats)
      console.log(`\n✅ 成功写入 ${allSkillStats.length} 条技能统计数据到 skillStatistics 集合`)
    }
    
    // 显示总体统计
    console.log(`\n${'='.repeat(60)}`)
    console.log(`\n🎉 统计完成！`)
    console.log(`📊 总共统计了 ${allSkillStats.length} 条技能数据`)
    
    // 显示每个职位的技能数量
    console.log(`\n📊 各职位技能数量统计:`)
    const skillCountByKeyword = {}
    allSkillStats.forEach(stat => {
      skillCountByKeyword[stat.keyword] = (skillCountByKeyword[stat.keyword] || 0) + 1
    })
    Object.entries(skillCountByKeyword)
      .sort((a, b) => b[1] - a[1])
      .forEach(([keyword, count]) => {
        console.log(`  - ${keyword}: ${count} 个技能`)
      })
    
    // 显示所有职位中优先级最高的技能（优先级 >= 8）
    console.log(`\n⭐ 高优先级技能（优先级 >= 8）:`)
    const highPrioritySkills = allSkillStats
      .filter(stat => stat.priority >= 8)
      .sort((a, b) => b.priority - a.priority || b.count - a.count)
    
    highPrioritySkills.forEach(stat => {
      console.log(`  - [${stat.keyword}] ${stat.skill}: 优先级 ${stat.priority}, 出现 ${stat.count}次 (${stat.percentage}%)`)
    })
    
  } catch (err) {
    console.error('❌ 统计出错:', err.message)
    console.error(err.stack)
  } finally {
    mongoose.connection.close()
    console.log('\n🔌 MongoDB 连接已关闭')
  }
}

// 查询指定职位的技能统计（可选功能）
async function getSkillStatsByKeyword(keyword) {
  try {
    const stats = await SkillStat.find({ keyword })
      .sort({ priority: -1, count: -1 })
    
    console.log(`\n📊 ${keyword} 技能统计:`)
    stats.forEach((stat, index) => {
      console.log(`${index + 1}. ${stat.skill}: ${stat.count}次 (${stat.percentage}%, 优先级: ${stat.priority})`)
    })
    
    return stats
  } catch (err) {
    console.error('❌ 查询出错:', err.message)
    return []
  }
}

// 主函数
async function main() {
  await calculateSkillStatistics()
  
  // 如果需要查询特定职位的统计，可以取消下面的注释
  // await mongoose.connect('mongodb://10.161.106.62:27017/software')
  // await getSkillStatsByKeyword('前端开发')
  // mongoose.connection.close()
}

main()

