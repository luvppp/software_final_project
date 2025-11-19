import { Router } from 'express';
import os from 'os';
import mongoose from 'mongoose';
import { sendSuccess } from '../utils/response.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

const mongoStates = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

// 系统健康检查，返回进程与 Mongo 状态
router.get('/status', authMiddleware, (req, res) => {
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const minutes = Math.floor((uptimeSeconds % 3600) / 60);

  return sendSuccess(res, {
    status: 'running',
    mongo: mongoStates[mongoose.connection.readyState] || 'unknown',
    uptime: `${hours}h ${minutes}m`,
    memory: `${Math.round(process.memoryUsage().rss / 1024 / 1024)}MB`,
    hostname: os.hostname(),
  });
});

// AI 模块状态（示例接口，可扩展实际检测逻辑）
router.get('/ai-check', authMiddleware, (req, res) =>
  sendSuccess(res, { msg: 'AI 模块正常运行' })
);

export default router;

