import mongoose from 'mongoose';

const MONGO_URI =
  process.env.MONGO_URI || 'mongodb://10.161.106.62:27017/software';

// 统一建立 Mongo 连接，避免在多个文件中重复配置
export const connectMongo = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection;
  }

  try {
    // 配置 serverSelectionTimeoutMS，避免长时间等待网络超时
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB connected: ${MONGO_URI}`);
    return mongoose.connection;
  } catch (error) {
    // 出现连接异常时直接退出进程，方便在部署阶段及时发现问题
    console.error('❌ MongoDB connection error:', error.message);
    process.exit(1);
  }
};

export default mongoose;

