import jwt from 'jsonwebtoken';
import { sendError } from '../utils/response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ai-career-secret';

const authMiddleware = (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const token = authorization.startsWith('Bearer ')
    ? authorization.replace('Bearer ', '')
    : authorization;

  if (!token) {
    return sendError(res, 401, '未提供 token');
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return sendError(res, 401, 'token 无效或已过期');
  }
};

export default authMiddleware;

