import express from 'express';
import cors from 'cors';
import userRoutes from './routes/userRoutes.js';
import jobRoutes from './routes/jobRoutes.js';
import learningRoutes from './routes/learningRoutes.js';
import systemRoutes from './routes/systemRoutes.js';
import { sendError } from './utils/response.js';

const app = express();

// 基础中间件：跨域 & JSON 解析（限制体积 10MB，支持表单）
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/', (req, res) =>
  res.json({ code: 200, msg: 'AI Career Backend Ready' })
);

// 路由挂载：按模块划分 API 前缀
app.use('/api/user', userRoutes);
app.use('/api/job', jobRoutes);
app.use('/api/learning', learningRoutes);
app.use('/api/system', systemRoutes);

// 捕获未命中路由的请求，统一返回 404
app.use((req, res) => sendError(res, 404, '接口不存在'));

// 兜底错误处理：避免异常堆栈泄漏，若已发送头则交由 Express 继续处理
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  if (res.headersSent) {
    return next(err);
  }
  const message = err.message || '服务器内部错误';
  return sendError(res, err.code || 500, message);
});

export default app;

