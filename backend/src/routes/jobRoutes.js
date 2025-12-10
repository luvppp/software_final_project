import { Router } from 'express';
import mongoose from 'mongoose';
import Job from '../models/jobModel.js';
import User from '../models/userModel.js';
import JobMatch from '../models/jobMatchModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = Router();

// 岗位列表：支持分页 + 关键字模糊搜索
router.get(
  '/list',
  authMiddleware,
  asyncHandler(async (req, res) => {
    // 读取分页与过滤参数
    const page = Number(req.query.page) > 0 ? Number(req.query.page) : 1;
    const limit = Number(req.query.limit) > 0 ? Number(req.query.limit) : 10;
    const keyword = (req.query.keyword || '').trim();
    const city = (req.query.city || '').trim();
    let prefer = (req.query.prefer || '').trim();
    const isInternRaw = (req.query.isIntern ?? '').toString().trim();
    // 若未传 prefer，则从用户意向岗位填充
    if (!prefer && req.user && req.user.userId) {
      const u = await User.findById(req.user.userId).select('targetJob');
      prefer = (u && u.targetJob) ? String(u.targetJob).trim() : '';
    }
    // 构建查询条件（关键词、城市、实习）
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
      // 城市匹配兼容“xx市”后缀
      const cityRegex = new RegExp(`(?:${city})(?:市)?`, 'i');
      conds.push({ city: cityRegex });
    }
    if (isInternRaw === 'true' || isInternRaw === 'false') {
      conds.push({ isIntern: isInternRaw === 'true' });
    }
    const query = conds.length ? (conds.length > 1 ? { $and: conds } : conds[0]) : {};

    let total;
    let data;
    if (prefer) {
      const preferRegex = prefer;
      // 使用聚合：根据 prefer 关键词计算 preferScore，优先排序
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
      // 普通查询：计数与分页查询并行
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
      isIntern: !!job.isIntern,
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

    // 读取用户意向岗位（prefer）
    let prefer = '';
    if (userId) {
      const u = await User.findById(userId).select('targetJob');
      prefer = (u && u.targetJob) ? String(u.targetJob).trim() : '';
    } else if (req.user && req.user.userId) {
      const u = await User.findById(req.user.userId).select('targetJob');
      prefer = (u && u.targetJob) ? String(u.targetJob).trim() : '';
    }
    const preferRegex = prefer ? new RegExp(prefer, 'i') : null;

    if (userId) {
      const stored = await JobMatch.find({ userId }).sort({ matchScore: -1 }).limit(1000);
      if (stored && stored.length) {
        const ids = stored.map((m) => m.jobId);
        const jobs = await Job.find({ _id: { $in: ids } }).select('_id title company skills keyword');
        const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
        const out = stored
          .map((m) => {
            const j = jobMap.get(String(m.jobId));
            return j
              ? {
                jobId: String(m.jobId),
                jobTitle: j.title,
                company: j.company,
                matchScore: m.matchScore || 0,
                missingSkills: m.missingSkills || [],
                skills: j.skills || [],
                keyword: j.keyword,
              }
              : null;
          })
          .filter(Boolean)
          .filter((item) => {
            const skillCountOk = Array.isArray(item.skills) && item.skills.length >= 3;
            const preferOk = preferRegex ? (preferRegex.test(item.keyword || '') || preferRegex.test(item.jobTitle || '')) : true;
            return skillCountOk && preferOk;
          })
          .slice(0, 500);
        return sendSuccess(res, out);
      }
    }

    const jobList = await Job.find({}).limit(200);
    const userSkillsLower = skillSet.map((s) => String(s).toLowerCase());
    const matches = jobList
      .map((job) => {
        const jobSkillsLower = (job.skills || []).map((s) => String(s).toLowerCase());
        const matchedCount = jobSkillsLower.filter((s) => userSkillsLower.includes(s)).length;
        const missingSkills = (job.skills || []).filter((s) => !userSkillsLower.includes(String(s).toLowerCase()));
        const matchScore = jobSkillsLower.length ? Number((matchedCount / jobSkillsLower.length).toFixed(2)) : 0;
        return {
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          matchScore,
          missingSkills,
          skills: job.skills || [],
          keyword: job.keyword,
        };
      })
      .filter((item) => {
        const skillCountOk = Array.isArray(item.skills) && item.skills.length >= 3;
        const preferOk = preferRegex ? (preferRegex.test(item.keyword || '') || preferRegex.test(item.jobTitle || '')) : true;
        return skillCountOk && preferOk;
      })
      .sort((a, b) => b.matchScore - a.matchScore);

    return sendSuccess(res, matches);
  })
);

router.get(
  '/match/top/:userId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return sendError(res, 400, 'userId 不合法');
    }
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const stored = await JobMatch.find({ userId }).sort({ matchScore: -1 }).limit(3);
    const ids = stored.map((m) => m.jobId);
    const jobs = await Job.find({ _id: { $in: ids } }).select('_id title company');
    const jobMap = new Map(jobs.map((j) => [String(j._id), j]));
    const out = stored.map((m) => {
      const j = jobMap.get(String(m.jobId));
      return {
        jobId: String(m.jobId),
        jobTitle: j ? j.title : '',
        company: j ? j.company : '',
        matchScore: m.matchScore || 0,
        missingSkills: m.missingSkills || [],
      };
    });
    return sendSuccess(res, out);
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
    // 校验 ObjectId，避免非法请求触发异常
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, '岗位 ID 不合法');
    }

    const job = await Job.findById(id);
    if (!job) {
      return sendError(res, 404, '岗位不存在');
    }

    let matchScore = null;
    let missingSkills = null;
    if (req.user && req.user.userId && mongoose.Types.ObjectId.isValid(req.user.userId)) {
      const m = await JobMatch.findOne({ userId: req.user.userId, jobId: id }).select('matchScore missingSkills');
      if (m) {
        matchScore = m.matchScore ?? null;
        missingSkills = m.missingSkills ?? null;
      }
    }

    return sendSuccess(res, {
      jobId: job.id,
      title: job.title,
      company: job.company,
      description: job.description,
      duties: job.duties,
      requirements: job.requirements,
      companyIntro: job.companyIntro,
      skills: job.skills,
      salary: job.salary,
      city: job.city,
      experience: job.experience,
      education: job.education,
      url: job.url,
      matchScore,
      missingSkills,
    });
  })
);

export default router;
