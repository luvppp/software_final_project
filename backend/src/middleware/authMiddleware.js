// 鉴权中间件：
// - 从 `Authorization` 头提取 Bearer token（或裸 token）
// - 使用 access token 的密钥进行校验
// - 校验通过将载荷挂载到 `req.user`，否则返回统一错误结构
import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';

// 使用 access token 的密钥进行鉴权
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'ai-career-access';

const authMiddleware = (req, res, next) => {
  // 解析 Authorization 头，兼容裸 token 与 Bearer 形式
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.replace('Bearer ', '')
    : authorization;

  if (!token) {
    return sendError(res, 401, '未提供 token');
  }

  try {
    // 校验并解析 access token，有效则将载荷挂到 req.user
    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    // 无效或过期统一返回 401
    return sendError(res, 401, 'token 无效或已过期');
  }
};

export default authMiddleware;
