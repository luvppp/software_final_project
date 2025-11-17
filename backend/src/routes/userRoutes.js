import { Router } from 'express';
import User from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';

const router = Router();

// 用户注册：写入 users 集合
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return sendError(res, 400, 'username/email/password 不能为空');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existed = await User.findOne({ email: normalizedEmail });
    if (existed) {
      return sendError(res, 400, '邮箱已注册');
    }

    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password,
    });

    return sendSuccess(res, { userId: user.id }, '注册成功');
  })
);

// 用户登录：简单校验邮箱+明文密码
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return sendError(res, 400, 'email/password 不能为空');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || user.password !== password) {
      return sendError(res, 401, '邮箱或密码错误');
    }

    return sendSuccess(
      res,
      {
        token: `mock-token-${user.id}`,
        userId: user.id,
      },
      '登录成功'
    );
  })
);

// 更新用户技能/目标岗位
router.put(
  '/skills',
  asyncHandler(async (req, res) => {
    const { userId, skills = [], targetJob } = req.body || {};
    if (!userId || !Array.isArray(skills)) {
      return sendError(res, 400, 'userId 或 skills 不合法');
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }

    user.skills = skills;
    if (typeof targetJob === 'string') {
      user.targetJob = targetJob;
    }
    await user.save();

    return sendSuccess(res, null, '技能更新成功');
  })
);

// 获取用户详情（隐藏密码字段）
router.get(
  '/:userId',
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const user = await User.findById(userId).select('-password');

    if (!user) {
      return sendError(res, 404, '用户不存在');
    }

    return sendSuccess(res, user);
  })
);

export default router;

