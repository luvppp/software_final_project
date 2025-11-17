import mongoose from 'mongoose';

// 岗位信息 Schema，对应 bossImport/skillStatistics 中的 jobCollection
const jobSchema = new mongoose.Schema(
  {
    title: String,
    company: String,
    salary: String,
    location: String,
    experience: String,
    education: String,
    description: String,
    skills: { type: [String], default: [] },
    keyword: String,
    createdAt: { type: Date, default: Date.now },
  },
  {
    collection: 'jobCollection',
  }
);

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema);

export default Job;

