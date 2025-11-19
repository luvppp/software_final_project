import { Router } from 'express';
import mongoose from 'mongoose';
import LearningPlan from '../models/learningPlanModel.js';
import User from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// 根据缺失技能动态生成课程计划
const buildPlanItems = (skills = []) =>
  skills.map((skill) => ({
    skill,
    course: `${skill} 核心课程`,
    platform: 'Bilibili',
    url: `https://www.bilibili.com/search?keyword=${encodeURIComponent(skill)}`,
    progress: 0,
  }));

// 校验 userId 是否合法并返回用户
const ensureUser = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  return User.findById(userId);
};

// 生成/覆盖学习计划
router.post(
  '/plan',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, missingSkills } = req.body || {};

    if (!userId) {
      return sendError(res, 400, 'userId 不能为空');
    }

    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await ensureUser(userId);
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }

    const skills = Array.isArray(missingSkills) ? missingSkills : [];
    const plan = buildPlanItems(skills);

    const record = await LearningPlan.findOneAndUpdate(
      { userId: user.id },
      { plan },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return sendSuccess(res, {
      userId: record.userId.toString(),
      plan: record.plan,
      updatedAt: record.updatedAt,
    });
  })
);

// 更新学习进度
router.put(
  '/progress',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, skill, progress } = req.body || {};

    if (!userId || !skill || typeof progress !== 'number') {
      return sendError(res, 400, '参数不完整');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'userId 不合法');
    }

    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }

    const record = await LearningPlan.findOne({ userId });
    if (!record) {
      return sendError(res, 404, '学习计划不存在');
    }

    const item = record.plan.find((planItem) => planItem.skill === skill);
    if (!item) {
      return sendError(res, 404, '技能未在学习计划中');
    }

    item.progress = Math.max(0, Math.min(100, progress));
    await record.save();

    return sendSuccess(res, null, '学习进度已更新');
  })
);

// 查询学习计划
router.get(
  '/:userId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'userId 不合法');
    }

    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const plan = await LearningPlan.findOne({ userId });
    if (!plan) {
      return sendSuccess(res, {
        userId,
        plan: [],
        updatedAt: null,
      });
    }

    return sendSuccess(res, {
      userId: plan.userId.toString(),
      plan: plan.plan,
      updatedAt: plan.updatedAt,
    });
  })
);

export default router;

