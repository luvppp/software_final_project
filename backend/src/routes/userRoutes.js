import { Router } from 'express';
import User from '../models/userModel.js';
import { sendError, sendSuccess } from '../utils/response.js';
import asyncHandler from '../utils/asyncHandler.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import authMiddleware from '../middleware/authMiddleware.js';
import Job from '../models/jobModel.js';
import JobMatch from '../models/jobMatchModel.js';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import { spawn } from 'child_process';

// 令牌配置：短期 access + 长期 refresh
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'ai-career-access';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || 'ai-career-refresh';
const ACCESS_TOKEN_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_TOKEN_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '30d';

const router = Router();
// 路由模块职责：
// - 提供用户注册/登录、资料/技能更新、简历上传/下载/删除接口（需鉴权）。
// - 支持 PDF 简历文本提取与技能匹配，返回新增技能与全文匹配集合。

// 用户注册：写入 users 集合
router.post(
  '/register',
  asyncHandler(async (req, res) => {
    const { username, email, password } = req.body || {};

    if (!username || !email || !password) {
      return sendError(res, 400, 'username/email/password 不能为空');
    }

    // 统一邮箱大小写与空格，避免重复注册
    const normalizedEmail = email.toLowerCase().trim();
    const existed = await User.findOne({ email: normalizedEmail });
    if (existed) {
      return sendError(res, 400, '邮箱已注册');
    }

    // 对密码进行加盐哈希存储，避免明文
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      // 仅存储清洗后的字段
      username: username.trim(),
      email: normalizedEmail,
      password: hashed,
    });

    return sendSuccess(res, { userId: user.id }, '注册成功');
  })
);

// 用户登录：校验邮箱与密码（bcrypt 对比），返回 accessToken/refreshToken 与 userId
router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return sendError(res, 400, 'email/password 不能为空');
    }

    // 按标准化邮箱查询用户
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return sendError(res, 401, '邮箱或密码错误');
    }
    // 校验明文密码与哈希值
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return sendError(res, 401, '邮箱或密码错误');
    }

    const accessToken = jwt.sign({ userId: user.id, type: 'access' }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
    const refreshToken = jwt.sign({ userId: user.id, type: 'refresh' }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES });

    try {
      const userSkillsLower = (user.skills || []).map((s) => String(s).toLowerCase());
      const jobs = await Job.find({}).select('_id title company skills').limit(1000);
      const bulkOps = jobs.map((job) => {
        const jobSkillsLower = (job.skills || []).map((s) => String(s).toLowerCase());
        const matchedCount = jobSkillsLower.filter((s) => userSkillsLower.includes(s)).length;
        const score = jobSkillsLower.length ? Number((matchedCount / jobSkillsLower.length).toFixed(2)) : 0;
        const missing = (job.skills || []).filter((s) => !userSkillsLower.includes(String(s).toLowerCase()));
        return {
          updateOne: {
            filter: { userId: user._id, jobId: job._id },
            update: { $set: { matchScore: score, missingSkills: missing, updatedAt: new Date() } },
            upsert: true,
          },
        };
      });
      if (bulkOps.length) {
        await JobMatch.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (e) {
      console.error('登录后初始化匹配度失败:', e?.message || e);
    }

    return sendSuccess(res, { accessToken, refreshToken, userId: user.id }, '登录成功');
  })
);

// 刷新 access token：使用 refresh token 换取新的短期 access token
router.post(
  '/token/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body || {};
    if (!refreshToken) {
      return sendError(res, 400, '缺少 refreshToken');
    }
    try {
      const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      if (!payload || payload.type !== 'refresh' || !payload.userId) {
        return sendError(res, 401, 'refreshToken 无效');
      }
      const accessToken = jwt.sign({ userId: payload.userId, type: 'access' }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES });
      return sendSuccess(res, { accessToken }, '刷新成功');
    } catch (e) {
      return sendError(res, 401, 'refreshToken 无效或已过期');
    }
  })
);

// 更新用户技能/目标岗位：需用户本人鉴权
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

    // 仅允许本人更新技能
    const user = await User.findById(userId);
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }

    user.skills = skills;
    if (typeof targetJob === 'string') {
      user.targetJob = targetJob;
    }
    // 持久化变更
    await user.save();

    try {
      const userSkillsLower = (user.skills || []).map((s) => String(s).toLowerCase());
      const jobs = await Job.find({}).select('_id title company skills').limit(1000);
      const bulkOps = jobs.map((job) => {
        const jobSkillsLower = (job.skills || []).map((s) => String(s).toLowerCase());
        const matchedCount = jobSkillsLower.filter((s) => userSkillsLower.includes(s)).length;
        const score = jobSkillsLower.length ? Number((matchedCount / jobSkillsLower.length).toFixed(2)) : 0;
        const missing = (job.skills || []).filter((s) => !userSkillsLower.includes(String(s).toLowerCase()));
        return {
          updateOne: {
            filter: { userId: user._id, jobId: job._id },
            update: { $set: { matchScore: score, missingSkills: missing, updatedAt: new Date() } },
            upsert: true,
          },
        };
      });
      if (bulkOps.length) {
        await JobMatch.bulkWrite(bulkOps, { ordered: false });
      }
    } catch (e) {
      console.error('更新用户技能后计算匹配度失败:', e?.message || e);
    }

    return sendSuccess(res, null, '技能更新成功');
  })
);

// 更新用户基础资料：用户名、邮箱、手机号、意向岗位（邮箱更新需唯一性校验）
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
      // 邮箱变更需进行唯一性校验
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

    // 保存资料变更
    await user.save();
    return sendSuccess(res, null, '资料已更新');
  })
);

// 获取用户详情：隐藏密码与简历二进制数据，需用户本人鉴权
router.get(
  '/:userId',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    // 过滤敏感字段与简历二进制
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
    // 上传简历：接受 base64，限制大小 5MB，服务端存储二进制与元信息
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
    // 清除 DataURL 头，转为二进制缓冲
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
    // 持久化简历元信息与数据
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
    // 下载简历：返回 base64 DataURL 以便前端直接预览或下载
    const { userId } = req.params;
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await User.findById(userId).select('resume');
    if (!user || !user.resume || !user.resume.data) {
      return sendError(res, 404, '未上传简历');
    }
    // 将二进制转为 base64，并组装 DataURL 返回
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
    // 删除简历：清空用户简历字段
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
    // 直接置空 resume 字段
    user.resume = undefined;
    await user.save();
    return sendSuccess(res, null, '简历已删除');
  })
);

router.post(
  '/ai/chat',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!apiKey) return sendError(res, 500, 'AI 服务未配置');
    const uid = req.user?.userId || '';
    const { messages = [] } = req.body || {};
    if (!uid) return sendError(res, 401, '未登录');
    const user = await User.findById(uid).select('username skills resume');
    if (!user) return sendError(res, 404, '用户不存在');
    let resumeText = '';
    if (user.resume && user.resume.data && user.resume.size && String(user.resume.mimeType || '').toLowerCase().includes('pdf')) {
      resumeText = await extractPdfText(user.resume.data);
      if (!resumeText || resumeText.replace(/\s+/g, '').length < 10) {
        const alt = await extractTextPdftotext(user.resume.data);
        if (alt && alt.length > (resumeText || '').length) {
          resumeText = alt;
        }
      }
    }
    const skills = Array.isArray(user.skills) ? user.skills.slice(0, 20) : [];
    const sys = `你是职业发展与招聘领域的导师。请结合用户技能与简历文本，用中文进行简洁具体的回答。用户：${user.username || ''}。技能：${skills.join('、') || '未提供'}。简历文本（截断）：${(resumeText || '').slice(0, 3000)}`;
    const safeMessages = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m === 'object' && typeof m.role === 'string' && typeof m.content === 'string')
          .slice(-20)
      : [];
    const body = {
      model,
      messages: [{ role: 'system', content: sys }, ...safeMessages],
      temperature: 0.6,
      max_tokens: 512,
    };
    const r = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      return sendError(res, r.status, text || 'AI 服务错误');
    }
    const out = await r.json();
    const content = out?.choices?.[0]?.message?.content?.trim() || out?.choices?.[0]?.text?.trim() || '';
    if (!content) return sendError(res, 500, 'AI 未生成内容');
    return sendSuccess(res, { reply: content });
  })
);

router.post(
  '/ai/chat/stream',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    const baseURL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
    const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    if (!apiKey) return sendError(res, 500, 'AI 服务未配置');
    const uid = req.user?.userId || '';
    const { messages = [] } = req.body || {};
    if (!uid) return sendError(res, 401, '未登录');
    const user = await User.findById(uid).select('username skills resume');
    if (!user) return sendError(res, 404, '用户不存在');
    let resumeText = '';
    if (user.resume && user.resume.data && user.resume.size && String(user.resume.mimeType || '').toLowerCase().includes('pdf')) {
      resumeText = await extractPdfText(user.resume.data);
      if (!resumeText || resumeText.replace(/\s+/g, '').length < 10) {
        const alt = await extractTextPdftotext(user.resume.data);
        if (alt && alt.length > (resumeText || '').length) {
          resumeText = alt;
        }
      }
    }
    const skills = Array.isArray(user.skills) ? user.skills.slice(0, 20) : [];
    const sys = `你是职业发展与招聘领域的导师。请结合用户技能与简历文本，用中文进行简洁具体的回答。用户：${user.username || ''}。技能：${skills.join('、') || '未提供'}。简历文本（截断）：${(resumeText || '').slice(0, 3000)}`;
    const safeMessages = Array.isArray(messages)
      ? messages
          .filter((m) => m && typeof m === 'object' && typeof m.role === 'string' && typeof m.content === 'string')
          .slice(-20)
      : [];
    const body = {
      model,
      messages: [{ role: 'system', content: sys }, ...safeMessages],
      temperature: 0.6,
      max_tokens: 512,
      stream: true,
    };
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const r = await fetch(`${baseURL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text();
      res.status(400).write(text || 'AI 服务错误');
      return res.end();
    }
    const reader = r.body.getReader();
    const decoder = new TextDecoder('utf-8');
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value && value.length) {
        const chunk = decoder.decode(value, { stream: true });
        res.write(chunk);
      }
    }
    res.end();
  })
);

// PDF 文本提取（primary）：使用 pdfjs-dist 提取文本；禁用 worker 以兼容 Node 环境
// - 逐页拼接文本内容；若失败或文本过少，解析结果为空字符串
const extractPdfText = async (buf) => {
  try {
    // 适配 Node Buffer 与 Uint8Array
    const data = Buffer.isBuffer(buf)
      ? new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
      : (buf instanceof Uint8Array ? buf : new Uint8Array(buf));
    // 禁用 worker，加强 Node 环境兼容性
    const loadingTask = pdfjsLib.getDocument({ data, disableWorker: true, isEvalSupported: false, disableFontFace: true });
    const pdf = await loadingTask.promise;
    let out = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      // 提取每页文本项，去除空白并拼接
      out += tc.items.map((it) => String(it.str || '').trim()).join(' ') + '\n';
    }
    return out.trim();
  } catch (e) {
    console.error('PDF 解析失败:', e);
    return '';
  }
};

const extractTextPdftotext = async (buf) => {
  // PDF 文本提取（fallback）：通过系统命令 pdftotext 获取纯文本
  // - 当 pdfjs-dist 提取文本过少时尝试，以最大文本长度为准选择结果
  return await new Promise((resolve) => {
    try {
      // 通过管道向 pdftotext 写入 PDF 二进制，读取标准输出
      const p = spawn('pdftotext', ['-', '-']);
      const chunks = [];
      const errs = [];
      p.stdout.on('data', (d) => chunks.push(d));
      p.stderr.on('data', (d) => errs.push(d));
      p.on('error', () => resolve(''));
      p.on('close', (code) => {
        if (code === 0) {
          resolve(Buffer.concat(chunks).toString('utf8').trim());
        } else {
          console.error('pdftotext 失败:', Buffer.concat(errs).toString('utf8'));
          resolve('');
        }
      });
      p.stdin.write(buf);
      p.stdin.end();
    } catch {
      resolve('');
    }
  });
};

// 技能匹配：聚合岗位库技能与内置词典，进行大小写与分隔符归一化匹配
// - 先匹配原词与无分隔版本，再使用边界正则提高准确性；返回规范化后的技能集合
const detectSkills = async (text) => {
  const base = await Job.distinct('skills');
  const fallback = [
    'python','java','c++','c','javascript','typescript','js','ts','node','nodejs','node.js','vue','react','angular',
    'spring','springboot','mysql','mongodb','redis','postgresql','sql','docker','kubernetes','git','linux','html','css',
    'sass','less','webpack','vite','jest','mocha','junit','tensorflow','pytorch','aws','azure','gcp','nginx','apache',
    'go','rust','scala','kotlin','swift','php','laravel','django','flask','.net','dotnet','asp.net','oracle','sqlite',
    'hive','spark','hadoop','kafka','rabbitmq','elasticsearch','graphql','rest','grpc','protobuf','data analysis',
    'machine learning','deep learning','algorithm','algorithms','data structures','微服务','分布式','高并发','数据分析',
    '机器学习','深度学习','算法','数据结构','设计模式'
  ];
  // 聚合岗位库技能与内置词典并去重清洗
  const dict = [...(base || []), ...fallback]
    .map((s) => String(s || '').trim())
    .filter(Boolean)
    .filter((s, idx, arr) => arr.indexOf(s) === idx);

  // 文本标准化：小写与去分隔符版本
  const plainLower = String(text || '').toLowerCase();
  const plainNoSep = plainLower.replace(/[\s\-_.\/]+/g, '');
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const canon = (s) => s.toLowerCase().replace(/[\s\-_.\/]+/g, '');
  const toCanonical = (s) => {
    const t = s.toLowerCase();
    if (['js','javascript'].includes(t)) return 'JavaScript';
    if (['ts','typescript'].includes(t)) return 'TypeScript';
    if (['node','nodejs','node.js'].includes(t)) return 'Node.js';
    if (['vue','vue.js'].includes(t)) return 'Vue';
    if (['react','react.js'].includes(t)) return 'React';
    if (['angular'].includes(t)) return 'Angular';
    if (['mysql'].includes(t)) return 'MySQL';
    if (['postgresql','postgres'].includes(t)) return 'PostgreSQL';
    if (['mongodb'].includes(t)) return 'MongoDB';
    if (['redis'].includes(t)) return 'Redis';
    if (['docker'].includes(t)) return 'Docker';
    if (['kubernetes','k8s'].includes(t)) return 'Kubernetes';
    if (['html'].includes(t)) return 'HTML';
    if (['css'].includes(t)) return 'CSS';
    if (['sass'].includes(t)) return 'Sass';
    if (['less'].includes(t)) return 'Less';
    if (['webpack'].includes(t)) return 'Webpack';
    if (['vite'].includes(t)) return 'Vite';
    if (['jest'].includes(t)) return 'Jest';
    if (['mocha'].includes(t)) return 'Mocha';
    if (['junit'].includes(t)) return 'JUnit';
    if (['tensorflow'].includes(t)) return 'TensorFlow';
    if (['pytorch'].includes(t)) return 'PyTorch';
    if (['aws'].includes(t)) return 'AWS';
    if (['azure'].includes(t)) return 'Azure';
    if (['gcp','google cloud'].includes(t)) return 'GCP';
    if (['nginx'].includes(t)) return 'Nginx';
    if (['apache'].includes(t)) return 'Apache';
    if (['go','golang'].includes(t)) return 'Go';
    if (['rust'].includes(t)) return 'Rust';
    if (['scala'].includes(t)) return 'Scala';
    if (['kotlin'].includes(t)) return 'Kotlin';
    if (['swift'].includes(t)) return 'Swift';
    if (['php'].includes(t)) return 'PHP';
    if (['laravel'].includes(t)) return 'Laravel';
    if (['django'].includes(t)) return 'Django';
    if (['flask'].includes(t)) return 'Flask';
    if (['.net','dotnet','asp.net'].includes(t)) return '.NET';
    if (['oracle'].includes(t)) return 'Oracle';
    if (['sqlite'].includes(t)) return 'SQLite';
    if (['hive'].includes(t)) return 'Hive';
    if (['spark'].includes(t)) return 'Spark';
    if (['hadoop'].includes(t)) return 'Hadoop';
    if (['kafka'].includes(t)) return 'Kafka';
    if (['rabbitmq'].includes(t)) return 'RabbitMQ';
    if (['elasticsearch'].includes(t)) return 'Elasticsearch';
    if (['graphql'].includes(t)) return 'GraphQL';
    if (['rest','restful','restful api'].includes(t)) return 'REST';
    if (['grpc'].includes(t)) return 'gRPC';
    if (['protobuf','protocol buffers'].includes(t)) return 'Protocol Buffers';
    if (['websocket','websockets'].includes(t)) return 'WebSocket';
    if (['sap'].includes(t)) return 'SAP';
    if (['seo'].includes(t)) return 'SEO';
    if (['data analysis','数据分析'].includes(t)) return '数据分析';
    if (['machine learning','机器学习'].includes(t)) return '机器学习';
    if (['deep learning','深度学习'].includes(t)) return '深度学习';
    if (['algorithms','algorithm','算法'].includes(t)) return '算法';
    if (['data structures','数据结构'].includes(t)) return '数据结构';
    if (['设计模式'].includes(t)) return '设计模式';
    if (['微服务'].includes(t)) return '微服务';
    if (['分布式'].includes(t)) return '分布式';
    if (['高并发'].includes(t)) return '高并发';
    return s;
  };

  // 匹配策略：
  // 1) 直接包含原词；2) 去分隔符后包含；3) 使用边界正则匹配，避免误命中子串
  const foundRaw = dict.filter((term) => {
    const tLower = term.toLowerCase();
    const tCanon = canon(term);
    if (plainLower.includes(tLower)) return true;
    if (plainNoSep.includes(tCanon)) return true;
    const re = new RegExp(`(^|[^a-z0-9])${esc(tLower)}([^a-z0-9]|$)`, 'i');
    return re.test(plainLower);
  }).sort((a, b) => a.localeCompare(b, 'zh-CN'));

  // 规范化与去重
  const found = foundRaw.map(toCanonical).filter(Boolean).filter((s, i, a) => a.indexOf(s) === i);
  const dbSkills = (await Job.distinct('skills'))
    .map((s) => toCanonical(String(s || '').trim()))
    .filter(Boolean)
    .filter((s, i, a) => a.indexOf(s) === i);
  const dbSet = new Set(dbSkills.map((v) => v.toLowerCase()));
  // 优先返回与岗位库交集，提高实用性
  const intersect = found.filter((s) => dbSet.has(s.toLowerCase()));
  return intersect.length ? intersect : found;
};

// 简历解析：提取文本并匹配技能
// - 输入：userId（需鉴权，且用户必须已上传 PDF 简历）
// - 过程：pdfjs-dist 提取文本，文本过少时回退 pdftotext；使用 detectSkills 匹配
// - 输出：addedSkills（相对现有技能新增的集合）、totalFound（全文匹配集合）
router.post(
  '/resume/parse',
  authMiddleware,
  asyncHandler(async (req, res) => {
    const { userId } = req.body || {};
    if (!userId) {
      return sendError(res, 400, 'userId 不能为空');
    }
    if (!req.user || req.user.userId !== userId) {
      return sendError(res, 403, '无权限');
    }
    const user = await User.findById(userId).select('skills resume');
    if (!user) {
      return sendError(res, 404, '用户不存在');
    }
    if (!user.resume || !user.resume.data || !user.resume.size) {
      return sendError(res, 404, '未上传简历');
    }
    const mime = String(user.resume.mimeType || '').toLowerCase();
    if (!mime.includes('pdf')) {
      return sendError(res, 400, '目前仅支持 PDF 简历解析');
    }

    // 优先使用 pdfjs-dist 提取文本
    let text = await extractPdfText(user.resume.data);
    console.log('resume mime:', mime, 'size:', user.resume.size, 'textLen(pdfjs):', (text || '').length);
    if (!text || text.replace(/\s+/g, '').length < 10) {
      // 文本过少时尝试 pdftotext 作为备选
      const alt = await extractTextPdftotext(user.resume.data);
      console.log('textLen(pdftotext):', (alt || '').length);
      if (alt && alt.length > (text || '').length) {
        text = alt;
      }
    }
    if (!text || text.replace(/\s+/g, '').length < 10) {
      return sendSuccess(res, { addedSkills: [], totalFound: [] }, '未识别到有效文本');
    }
    // 进行技能匹配并与现有技能对比，得出新增集合
    const totalFound = await detectSkills(text);
    const existed = Array.isArray(user.skills) ? user.skills : [];
    const existCanon = existed.map((v) => v.toLowerCase());
    const addedSkills = totalFound.filter((s) => !existCanon.includes(s.toLowerCase()));
    return sendSuccess(res, { addedSkills, totalFound }, '解析完成');
  })
);

export default router;
