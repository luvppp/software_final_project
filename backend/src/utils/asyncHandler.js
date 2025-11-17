// 包装 async 路由处理函数，统一捕获 Promise 中的异常
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export default asyncHandler;

