import { Router } from 'express';
import { Router } from 'express';
import mongoose from 'mongoose';
import User from '../models/userModel.js';
import LearningPlan from '../models/learningPlanModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import authMiddleware from '../middleware/authMiddleware.js';

// 学习计划路由：
// - 根据缺失技能生成学习计划（最多选取若干优先技能）
// - 支持更新学习进度，写回用户技能列表的包含/移除
// - 需要用户本人鉴权
const router = Router();

// skillCourses 集合：为每个技能存放候选课程列表（由脚本采集）
const courseSchema = new mongoose.Schema(
  {
    skill: { type: String, index: true },
    courses: [{ title: String, url: String }],
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'skillCourses' }
);

const SkillCourse =
  mongoose.models.SkillCourse || mongoose.model('SkillCourse', courseSchema);

// 正则转义与字符串清洗工具
const escapeRegExp = (s = '') => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const norm = (s = '') => String(s).trim();

// 按职位关键词的统计优先级对缺失技能排序（高优先级优先）
const rankMissingSkills = async (skills = [], keyword = '') => {
  const list = Array.isArray(skills) ? skills.filter(Boolean).map(norm) : [];
  if (!list.length || !keyword) return list;
  const stats = await SkillStat.find({ keyword }).lean();
  const priMap = new Map(
    stats.map((s) => [String(s.skill).toLowerCase(), Number(s.priority) || 0])
  );
  return list
    .map((s) => ({ s, p: priMap.get(s.toLowerCase()) ?? 0 }))
    .sort((a, b) => b.p - a.p)
    .map((x) => x.s);
};

// 构建计划项：每个技能返回2-3门课程；若 skillCourses 缺失则回退到B站搜索条目
const buildPlanItems = async (skills = []) => {
  const out = [];
  for (const skill of skills) {
    const doc = await SkillCourse.findOne({
      skill: new RegExp(`^${escapeRegExp(skill)}$`, 'i'),
    }).lean();
    const courses = Array.isArray(doc?.courses) ? doc.courses.slice(0, 3) : [];
    const picked = courses.length >= 2 ? courses : [
      { title: `${skill} 入门课程`, url: `https://www.bilibili.com/search?keyword=${encodeURIComponent(skill)}%20入门` },
      { title: `${skill} 核心课程`, url: `https://www.bilibili.com/search?keyword=${encodeURIComponent(skill)}%20核心` },
      { title: `${skill} 实战课程`, url: `https://www.bilibili.com/search?keyword=${encodeURIComponent(skill)}%20实战` },
    ].slice(0, 3);
    for (const c of picked) {
      out.push({
        skill,
        course: String(c.title || `${skill} 核心课程`),
        platform: 'Bilibili',
        url: String(c.url || `https://www.bilibili.com/search?keyword=${encodeURIComponent(skill)}`),
        progress: 0,
      });
    }
  }
  return out;
};

// 用户校验：ID合法且存在
const ensureUser = async (userId) => {
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    return null;
  }
  return User.findById(userId);
};

// 生成学习计划：按优先级选前3技能并组装课程项
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

    const skillsInput = Array.isArray(missingSkills) ? missingSkills : [];
    const keyword = String(user.targetJob || '').trim();
    const ranked = await rankMissingSkills(skillsInput, keyword);
    const top3 = ranked.length > 3 ? ranked.slice(0, 3) : ranked;
    const plan = await buildPlanItems(top3);

    // upsert 覆盖/创建学习计划记录
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
// 更新学习进度：支持课程级（skill+course），并同步用户技能列表的包含/移除
router.put(
  '/progress',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, skill, course, progress } = req.body || {};

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

    const item = record.plan.find((planItem) => planItem.skill === skill && (!course || planItem.course === course));
    if (!item) {
      return sendError(res, 404, '技能未在学习计划中');
    }

    // 进度限制在 0-100 范围
    item.progress = Math.max(0, Math.min(100, progress));
    await record.save();

    const sameSkill = record.plan.filter((p) => p.skill === skill);
    const allDone = sameSkill.length > 0 && sameSkill.every((p) => Number(p.progress || 0) >= 100);
    if (allDone) {
      await User.updateOne({ _id: userId }, { $addToSet: { skills: skill } });
    } else {
      await User.updateOne({ _id: userId }, { $pull: { skills: skill } });
    }

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

// 清空某技能的课程计划：当该技能所有课程学习完成后，可用此接口移除该技能对应的计划项
router.delete(
  '/plan/skill',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, skill } = req.body || {};

    if (!userId || !skill) {
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

    const before = record.plan.length;
    record.plan = record.plan.filter(
      (p) => String(p.skill).toLowerCase() !== String(skill).toLowerCase()
    );
    await record.save();

    // 注意：不移除用户技能（已完成的技能应保留在技能列表中）
    return sendSuccess(res, {
      removed: before - record.plan.length,
      userId: record.userId.toString(),
      plan: record.plan,
    });
  })
);

export default router;

