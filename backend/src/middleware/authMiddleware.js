import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-career-secret';

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
    // 校验并解析 JWT，有效则将载荷挂到 req.user
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    // 无效或过期统一返回 401
    return sendError(res, 401, 'token 无效或已过期');
  }
};

export default authMiddleware;

