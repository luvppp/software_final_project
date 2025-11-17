import mongoose from 'mongoose';

// 用户基础信息 Schema，用于保存注册、登录、技能等数据
const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    skills: { type: [String], default: [] },
    targetJob: { type: String, default: '' },
  },
  {
    timestamps: true,
    collection: 'users',
  }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);

export default User;

