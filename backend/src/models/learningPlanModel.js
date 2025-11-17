import mongoose from 'mongoose';

// 单个技能学习计划项，记录课程/平台/进度等信息
const planItemSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    course: { type: String, required: true },
    platform: { type: String, default: 'Bilibili' },
    url: { type: String, required: true },
    progress: { type: Number, default: 0 },
  },
  { _id: false }
);

// 用户学习计划 Schema，userId 关联 users 集合
const learningPlanSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
      unique: true,
    },
    plan: { type: [planItemSchema], default: [] },
  },
  {
    timestamps: true,
    collection: 'learningPlans',
  }
);

const LearningPlan =
  mongoose.models.LearningPlan ||
  mongoose.model('LearningPlan', learningPlanSchema);

export default LearningPlan;

