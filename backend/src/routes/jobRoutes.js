import { Router } from 'express';
import mongoose from 'mongoose';
import Job from '../models/jobModel.js';
import User from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// 岗位列表：支持分页 + 关键字模糊搜索
router.get(
  '/list',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const keyword = (req.query.keyword || '').trim();
    const city = (req.query.city || '').trim();
    let prefer = (req.query.prefer || '').trim();
    if (!prefer && req.user && req.user.userId) {
      const u = await User.findById(req.user.userId).select('targetJob');
      prefer = (u && u.targetJob) ? String(u.targetJob).trim() : '';
    }
    const conds = [];
    if (keyword) {
      conds.push({
        $or: [
          { title: new RegExp(keyword, 'i') },
          { company: new RegExp(keyword, 'i') },
          { skills: new RegExp(keyword, 'i') },
        ],
      });
    }
    if (city) {
      const cityRegex = new RegExp(`(?:${city})(?:市)?`, 'i');
      conds.push({ city: cityRegex });
    }
    const query = conds.length ? (conds.length > 1 ? { $and: conds } : conds[0]) : {};

    let total;
    let data;
    if (prefer) {
      const preferRegex = prefer;
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            preferScore: {
              $cond: [
                {
                  $or: [
                    { $regexMatch: { input: '$keyword', regex: preferRegex, options: 'i' } },
                    { $regexMatch: { input: '$title', regex: preferRegex, options: 'i' } },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
        { $sort: { preferScore: -1, createdAt: -1 } },
        {
          $facet: {
            data: [
              { $skip: (page - 1) * limit },
              { $limit: limit },
            ],
            total: [{ $count: 'count' }],
          },
        },
      ];
      const out = await Job.aggregate(pipeline);
      total = out[0]?.total?.[0]?.count || 0;
      data = out[0]?.data || [];
    } else {
      const resp = await Promise.all([
        Job.countDocuments(query),
        Job.find(query)
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit),
      ]);
      total = resp[0];
      data = resp[1];
    }

    const stripTitle = (t) => {
      let s = String(t || '');
      // 去除如 30-60K、30K-50K、10000-20000元/月、20-40万/年、月薪/年薪/•19薪 等片段
      s = s.replace(/\s*\d+[\d\-]*\s*(?:[kK]|万|W|元(?:\/[月年])?|(?:万|千)?(?:\/[月年])?)(?:\s*[•·]\s*\d+\s*薪)?/gi, '');
      s = s.replace(/\s*[•·]\s*$/g, '');
      return s.trim();
    };

    const list = data.map((job) => ({
      jobId: job._id ? String(job._id) : job.id,
      title: stripTitle(job.title),
      company: job.company,
      salary: job.salary,
      skills: job.skills,
      city: job.city,
      keyword: job.keyword,
    }));

    return sendSuccess(res, {
      list,
      meta: {
        total,
        page,
        limit,
      },
    });
  })
);

// 岗位详情：校验 ObjectId 并返回完整信息
// 注意：将 /:id 路由放在其它具名路由之后，避免吞掉 /cities 等路径

// AI 岗位匹配：根据用户技能计算匹配度并排序
router.post(
  '/match',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId, skills } = req.body || {};
    let skillSet = Array.isArray(skills) ? skills : [];

    if (userId && (!req.user || req.user.userId !== userId)) {
      return sendError(res, 403, '无权限');
    }

    if (!skillSet.length && userId) {
      const user = await User.findById(userId);
      if (user) {
        skillSet = user.skills;
      }
    }

    if (!skillSet.length) {
      return sendError(res, 400, '缺少技能信息');
    }

    const jobList = await Job.find({}).limit(200);
    const matches = jobList
      .map((job) => {
        const matched = job.skills.filter((skill) => skillSet.includes(skill));
        const missingSkills = job.skills.filter(
          (skill) => !skillSet.includes(skill)
        );
        const matchScore = job.skills.length
          ? Number((matched.length / job.skills.length).toFixed(2))
          : 0;

        return {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          matchScore,
          missingSkills,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return sendSuccess(res, matches);
  })
);

router.get(
  '/cities',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const fromCity = await Job.distinct('city');
    const list = (fromCity || [])
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return sendSuccess(res, list);
  })
);

router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, '岗位 ID 不合法');
    }

    const job = await Job.findById(id);
    if (!job) {
      return sendError(res, 404, '岗位不存在');
    }

    return sendSuccess(res, {
      jobId: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      skills: job.skills,
      salary: job.salary,
      city: job.city,
      experience: job.experience,
      education: job.education,
    });
  })
);

export default router;

