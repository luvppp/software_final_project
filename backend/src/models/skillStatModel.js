import mongoose from 'mongoose'

const skillStatSchema = new mongoose.Schema(
  {
    keyword: String,
    skill: String,
    count: Number,
    totalJobs: Number,
    frequency: Number,
    priority: Number,
    percentage: Number,
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'skillStatistics' }
)

const SkillStat = mongoose.models.SkillStat || mongoose.model('SkillStat', skillStatSchema)

export default SkillStat
