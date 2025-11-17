// 统一的成功响应结构，保持 code/msg/data 三个字段
export const sendSuccess = (res, data = {}, msg = 'success') =>
  res.json({
    code: 200,
    msg,
    data,
  });

// 统一的失败响应结构，默认返回 400，可根据业务传入不同错误码
export const sendError = (
  res,
  code = 400,
  msg = '请求参数有误',
  extra = {}
) => {
  const status = code >= 500 ? 500 : 400;
  return res.status(status).json({
    code,
    msg,
    ...extra,
  });
};

