import { Router } from 'express';
import User from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authMiddleware from '../middleware/authMiddleware.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-career-secret';

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

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.trim(),
      email: normalizedEmail,
      password: hashed,
    });

    return sendSuccess(res, { userId: user.id }, '注册成功');
  })
);

// 用户登录：简单校验邮箱+hashed密码
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return sendError(res, 400, 'email/password 不能为空');
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 401, '邮箱或密码错误');
    }
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return sendError(res, 401, '邮箱或密码错误');
    }

    return sendSuccess(
      res,
      {
        token: jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' }),
        userId: user.id,
      },
      '登录成功'
    );
  })
);

// 更新用户技能/目标岗位
router.put(
  '/skills',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, skills = [], targetJob } = req.body || {};
    if (!userId || !Array.isArray(skills)) {
      return sendError(res, 400, 'userId 或 skills 不合法');
    }
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
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

// 更新用户基础资料：用户名、邮箱、手机号、意向岗位
router.put(
  '/profile',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, username, email, phone, targetJob } = req.body || {};
    if (!userId) {
      return sendError(res, 400, 'userId 不能为空');
    }
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }

    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }

    if (typeof username === 'string' && username.trim()) {
      user.username = username.trim();
    }

    if (typeof email === 'string' && email.trim()) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== user.email) {
        const exists = await User.findOne({ email: normalizedEmail });
        if (exists) {
          return sendError(res, 400, '邮箱已被使用');
        }
        user.email = normalizedEmail;
      }
    }

    if (typeof phone === 'string') {
      user.phone = phone.trim();
    }

    if (typeof targetJob === 'string') {
      user.targetJob = targetJob.trim();
    }

    await user.save();
    return sendSuccess(res, null, '资料已更新');
  })
);

// 获取用户详情（隐藏密码字段）
router.get(
  '/:userId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await User.findById(userId).select('-password -resume.data');

    if (!user) {
      return sendError(res, 404, '用户不存在');
    }

    return sendSuccess(res, user);
  })
);

router.put(
  '/resume',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, fileName, mimeType, base64 } = req.body || {};
    if (!userId || !fileName || !mimeType || !base64) {
      return sendError(res, 400, '参数不完整');
    }
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }
    const raw = String(base64);
    const cleaned = raw.replace(/^data:[^;]+;base64,/, '');
    const buf = Buffer.from(cleaned, 'base64');
    const maxSize = 5 * 1024 * 1024;
    if (!buf.length || buf.length > maxSize) {
      return sendError(res, 400, '文件过大或内容无效');
    }
    user.resume = {
      filename: String(fileName),
      mimeType: String(mimeType),
      size: buf.length,
      data: buf,
      uploadedAt: new Date(),
    };
    await user.save();
    return sendSuccess(res, {
      filename: user.resume.filename,
      mimeType: user.resume.mimeType,
      size: user.resume.size,
      uploadedAt: user.resume.uploadedAt,
    }, '简历已上传');
  })
);

router.get(
  '/:userId/resume',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await User.findById(userId).select('resume');
    if (!user || !user.resume || !user.resume.data) {
      return sendError(res, 404, '未上传简历');
    }
    const b64 = user.resume.data.toString('base64');
    return sendSuccess(res, {
      filename: user.resume.filename,
      mimeType: user.resume.mimeType,
      size: user.resume.size,
      uploadedAt: user.resume.uploadedAt,
      base64: `data:${user.resume.mimeType};base64,${b64}`,
    });
  })
);

router.delete(
  '/resume',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) {
      return sendError(res, 400, 'userId 不能为空');
    }
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }
    user.resume = undefined;
    await user.save();
    return sendSuccess(res, null, '简历已删除');
  })
);

export default router;
