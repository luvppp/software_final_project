import mongoose from 'mongoose';

/**
 * 数据库连接配置
 * - 优先使用环境变量 `MONGO_URI`
 * - 若未设置，则按候选列表顺序尝试连接（远程IP -> 本机127.0.0.1 -> 本机localhost）
 * - 每个候选地址失败后继续下一个，避免因单点不可达而阻塞开发
 */
const CANDIDATE_URIS = (() => {
  const envUri = process.env.MONGO_URI && String(process.env.MONGO_URI).trim();
  if (envUri) return [envUri];
  return [
    'mongodb://10.161.96.67:27017/software',
    'mongodb://127.0.0.1:27017/software',
    'mongodb://localhost:27017/software',
  ];
})();

/**
 * 建立 Mongo 连接（带候选地址与快速失败）
 * - 复用已有连接（readyState>=1）
 * - 为每次尝试设置较短的 `serverSelectionTimeoutMS`，快速切换到下一个地址
 */
export const connectMongo = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  let lastError = null;
  for (const uri of CANDIDATE_URIS) {
    try {
      await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 10000,
        connectTimeoutMS: 5000,
      });
      console.log(`✅ MongoDB connected: ${uri}`);
      return mongoose.connection;
    } catch (error) {
      lastError = error;
      console.error(`⚠️  MongoDB connect failed: ${uri} -> ${error?.message || error}`);
      // 继续尝试下一个候选地址
    }
  }

  // 所有候选地址均失败：输出最后一次错误并退出
  console.error('❌ MongoDB connection error: all candidates failed');
  if (lastError) console.error(String(lastError?.stack || lastError));
  process.exit(1);
};

export default mongoose;

