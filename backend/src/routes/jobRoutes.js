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
    // page/limit：分页控制；keyword/city：基础过滤
    // prefer：用户意向岗位关键词，用于优先排序；isInternRaw：是否实习（字符串 'true'/'false'）
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
    // keyword 同时匹配 title/company/skills；city 兼容“xx市”后缀；isIntern 精确布尔过滤
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
      // preferRegex 以字符串形式传入 $regexMatch，options: 'i' 实现不区分大小写
      // 流程：$match 过滤 → $addFields 计算 preferScore → $sort 优先度与时间 → $facet 同时分页与计数
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
      // 普通查询：计数与分页查询并行，减少往返等待
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
      // 仅清理标题中薪资/补充标识，保留岗位本身名称，提升列表可读性
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
    // skillSet：参与匹配的用户技能来源，优先取请求体，其次回退到用户库
    let skillSet = Array.isArray(skills) ? skills : [];

    if (userId && (!req.user || req.user.userId !== userId)) {
      return sendError(res, 403, '无权限');
    }

    if (!skillSet.length && userId) {
      const user = await User.findById(userId);
      if (user) {
        // 回退到用户库技能，保证有匹配输入
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
    // preferRegex：意向岗位关键字过滤，匹配岗位关键词或标题
    const preferRegex = prefer ? new RegExp(prefer, 'i') : null;

    if (userId) {
      // 优先使用登录时或技能更新后生成的匹配度缓存，减少实时计算成本
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
            // 至少包含 3 个技能，避免噪声岗位；prefer 过滤优先用户意向
            const skillCountOk = Array.isArray(item.skills) && item.skills.length >= 3;
            const preferOk = preferRegex ? (preferRegex.test(item.keyword || '') || preferRegex.test(item.jobTitle || '')) : true;
            return skillCountOk && preferOk;
          })
          .slice(0, 500);
        return sendSuccess(res, out);
      }
    }

    // 实时计算匹配度：选取最多 200 条岗位进行计算
    const jobList = await Job.find({}).limit(200);
    // 标准化技能为小写，做大小写无关匹配
    const userSkillsLower = skillSet.map((s) => String(s).toLowerCase());
    const matches = jobList
      .map((job) => {
        const jobSkillsLower = (job.skills || []).map((s) => String(s).toLowerCase());
        // matchedCount：岗位技能与用户技能交集数量
        const matchedCount = jobSkillsLower.filter((s) => userSkillsLower.includes(s)).length;
        // missingSkills：岗位需要但用户尚未具备的技能
        const missingSkills = (job.skills || []).filter((s) => !userSkillsLower.includes(String(s).toLowerCase()));
        // matchScore：匹配度 = 交集/岗位技能总数（保留两位小数）
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
        // 过滤掉技能过少的岗位，并按用户意向进行匹配
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
    // 返回匹配度 Top3 的岗位摘要，需用户本人鉴权
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
    // 返回岗位覆盖的城市列表（去重、清洗、按中文排序）
    const fromCity = await Job.distinct('city');
    const list = (fromCity || [])
      .map((v) => String(v || '').trim())
      .filter(Boolean)
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .sort((a, b) => a.localeCompare(b, 'zh-CN'));
    return sendSuccess(res, list);
  })
);

router.post(
  '/ai/reason',
  authMiddleware,
  asyncHandler(async (req, res) => {
    // AI 推荐理由/建议生成：
    // - 输入岗位与用户技能信息，调用 DeepSeek 生成中文简洁可执行输出
    // - 通过技能指纹 fp 做缓存命中，减少重复调用成本
    const apiKey = req.headers['x-deepseek-key'] || process.env.DEEPSEEK_API_KEY;
    const baseURL = (req.headers['x-deepseek-base']) || process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = (req.headers['x-deepseek-model']) || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!apiKey) return sendError(res, 500, 'AI 服务未配置');
    const {
      type,
      jobId,
      jobTitle,
      company,
      requiredSkills = [],
      missingSkills = [],
      matchScore = 0,
      userSkills = [],
    } = req.body || {};
    const t = String(type || 'reason').toLowerCase();
    const uid = req.user?.userId || '';
    const validJobId = jobId && mongoose.Types.ObjectId.isValid(jobId) ? String(jobId) : '';
    let skillsSource = Array.isArray(userSkills) ? userSkills : [];
    if (!skillsSource.length && uid) {
      const u = await User.findById(uid).select('skills');
      skillsSource = u?.skills || [];
    }
    // fp：技能指纹（小写去空格去重排序拼接），用于判断缓存是否可复用
    const fp = (skillsSource || []).map((s) => String(s).toLowerCase().trim()).filter(Boolean).sort().join('|');
    // prompt 内容拼装：岗位/已具备技能/缺失技能/匹配度
    const reqSkills = (Array.isArray(requiredSkills) ? requiredSkills : []).slice(0, 8).join('、');
    const missSkills = (Array.isArray(missingSkills) ? missingSkills : []).slice(0, 4).join('、');
    const usrSkills = (Array.isArray(userSkills) ? userSkills : []).slice(0, 8).join('、');
    const title = String(jobTitle || '').trim();
    const comp = String(company || '').trim();
    const pct = Math.round(Number(matchScore || 0) * 100);
    const basePrompt =
      `候选人技能：${usrSkills || '未提供'}。\n岗位：${title || '未知'}（${comp || '未知'}）。\n岗位技能：${reqSkills || '未知'}。\n缺失技能：${missSkills || '无'}。\n匹配度：${isFinite(pct) ? pct + '%' : '未知'}。\n`;
    const prompt =
      t === 'advice'
        ? `角色：资深职业顾问。\n要求：中文输出2-4句，避免列点，具体可执行。\n必须包含：已具备的优势、关键缺口、提升建议（包含学习方向或时间节奏）。\n${basePrompt}目标：给出当前岗位的建议。`
        : `角色：资深职业顾问。\n要求：中文输出2-4句，避免列点，具体可执行。\n必须包含：匹配优势、为何推荐的理由、需要补充的技能与实践路径。\n${basePrompt}目标：给出推荐岗位的推荐理由。`;
    const body = {
      model,
      messages: [
        { role: 'system', content: '你是职业发展顾问，回答中文、简洁具体。' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 320,
    };
    if (uid && validJobId) {
      let jm = await JobMatch.findOne({ userId: uid, jobId: validJobId });
      if (jm) {
        // 缓存命中：相同技能指纹 fp 时直接返回历史 AI 输出
        if (t === 'advice' && jm.aiAdvice && jm.aiAdviceFp === fp) {
          return sendSuccess(res, { text: jm.aiAdvice });
        }
        if (t === 'reason' && jm.aiReason && jm.aiReasonFp === fp) {
          return sendSuccess(res, { text: jm.aiReason });
        }
      }
    }
    const r = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      return sendError(res, r.status, text || 'AI 服务错误');
    }
    const out = await r.json();
    const content = out?.choices?.[0]?.message?.content?.trim() || out?.choices?.[0]?.text?.trim() || '';
    if (!content) return sendError(res, 500, 'AI 未生成内容');
    if (uid && validJobId) {
      const now = new Date();
      await JobMatch.updateOne(
        { userId: uid, jobId: validJobId },
        t === 'advice'
          ? { $set: { aiAdvice: content, aiAdviceFp: fp, aiAdviceUpdatedAt: now }, $setOnInsert: { userId: uid, jobId: validJobId } }
          : { $set: { aiReason: content, aiReasonFp: fp, aiReasonUpdatedAt: now }, $setOnInsert: { userId: uid, jobId: validJobId } },
        { upsert: true }
      );
    }
    return sendSuccess(res, { text: content });
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
      // 读取当前用户在该岗位的匹配度与缺失技能（若有缓存）
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
