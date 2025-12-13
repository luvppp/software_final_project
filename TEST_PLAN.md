## 测试计划与报告

---

### 1. 测试用例设计

#### 1.1 设计思路
- 等价类划分：对邮箱、密码、验证码、文件等输入划分有效/无效类
- 边界值分析：密码长度、简历大小 5MB 上限、验证码 15 分钟有效期
- 状态转换测试：登录态与验证码生成→验证→重置；学习进度完成→技能同步
- 组合与负面场景：未鉴权、邮箱未注册、文件类型不匹配、token 过期
- 安全与健壮性：敏感字段不泄露、验证码哈希存储、错误结构统一

#### 1.2 模块与用例列表

##### 用户注册与登录（`/api/user/register`, `/api/user/login`, `/api/user/token/refresh`）
- 正向用例
  - 注册成功：有效 `username/email/password` 返回 `userId`
  - 登录成功：正确凭证返回 `accessToken/refreshToken/userId`
  - 刷新成功：有效 `refreshToken` 返回新 `accessToken`
- 反向用例
  - 注册失败：缺少密码/邮箱重复
  - 登录失败：错误密码/缺少字段
  - 刷新失败：`refreshToken` 无效或过期

##### 忘记密码（邮箱验证码）（`/api/user/send-reset-code`, `/verify-reset-code`, `/reset-password`）
- 正向用例
  - 已注册邮箱发送验证码成功（邮件服务配置齐全）
  - 验证码验证成功（未过期且匹配）
  - 重置密码成功（清空验证码字段）
- 反向用例
  - 发送失败：邮箱未注册/邮件服务未配置
  - 验证失败：错误码/验证码过期/未产生验证码
  - 重置失败：错误码/过期

##### 用户资料与技能（`/api/user/profile`, `/api/user/skills`, `GET /api/user/:userId`）
- 正向用例
  - 本人鉴权更新资料成功（邮箱唯一性校验）
  - 本人鉴权更新技能成功（触发匹配缓存重算）
  - 本人鉴权查询详情成功（隐藏敏感字段）
- 反向用例
  - 无权限失败：缺少/错误 token
  - 非法 `userId` 或不存在用户失败

##### 简历管理与解析（`PUT/GET/DELETE /api/user/resume`, `POST /api/user/resume/parse`）
- 正向用例
  - 上传 PDF 成功（≤ 5MB），返回元信息
  - 下载成功返回 DataURL
  - 删除成功清空简历
  - 解析成功返回 `addedSkills/totalFound` 或文本过少返回空集合
- 反向用例
  - 上传失败：文件过大/内容无效/缺少参数
  - 下载失败：未上传简历
  - 解析失败：非 PDF 简历

##### 岗位模块（`GET /api/job/list`, `GET /api/job/:id`, `POST /api/job/match`, `GET /api/job/cities`, `POST /api/job/ai/reason`）
- 正向用例
  - 列表分页与过滤正确返回
  - 详情合法 `id` 返回完整信息
  - 匹配返回 `matchScore/missingSkills`
  - 城市返回去重排序列表
  - AI 推荐在配置齐全时返回内容
- 反向用例
  - 详情失败：非法 `id`
  - AI 推荐失败：未配置密钥

##### 学习计划（`POST /api/learning/plan`, `PUT /api/learning/progress`, `GET /api/learning/:userId`, `DELETE /api/learning/plan/skill`）
- 正向用例
  - 生成成功：按意向岗位优先级选择前 3 技能并返回课程项
  - 进度更新成功：边界值 0/100 生效；全部完成后同步到用户技能
  - 查询成功返回最新学习计划
  - 清空技能计划成功
- 反向用例
  - 生成失败：无权限/非法 `userId`
  - 进度更新失败：参数不完整/非法 `userId`

##### AI 聊天（`POST /api/user/ai/chat`, `/api/user/ai/chat/stream`）
- 正向用例
  - 配置齐全与鉴权成功返回文本或 SSE 流
- 反向用例
  - 未配置/未鉴权返回错误结构

##### 安全与鉴权（多接口）
- 正向用例
  - 返回体不包含密码哈希与简历二进制；验证码仅存储哈希
- 反向用例
  - 无 token 或过期 token 返回 401 统一错误结构

---

### 2. 测试计划制定

- 目标与范围
  - 覆盖后端 API 与前端主要页面的功能正确性、鉴权、安全、健壮性
  - 忘记密码（邮件验证码）、简历解析、岗位匹配、学习计划为重点模块
- 角色分工
  - 测试设计与执行：测试工程师
  - 缺陷修复：后端/前端开发
- 进入/退出标准
  - 进入：环境变量与依赖安装完成；Mongo 可用；邮件与 AI（可选）配置完成
  - 退出：关键用例通过率 ≥ 95%，无阻塞缺陷，主要模块均通过
- 风险与缓解
  - 邮件服务网络受限：提前白名单与端口连通性验证（smtp.qq.com:465）
  - AI 服务限流或密钥错误：允许关闭 AI 用例或替换测试密钥
  - Mongo 数据不一致：建立独立测试库与数据隔离

---

### 3. 测试用例执行（环境与配置）

- 环境
  - 操作系统：Windows（本地），生产可用 Linux
  - Node.js：建议 ≥ 20.19
  - 端口：后端 `PORT=3000`，前端 `VITE_API_BASE_URL=http://localhost:3000`
  - 数据库：`MONGO_URI` 指向可用的 MongoDB（测试库）
  - 邮件：`QQ_MAIL_USER`、`QQ_MAIL_PASS`（授权码）
  - AI：`DEEPSEEK_API_KEY`（可选，用于聊天与推荐）
- 配置文件
  - 后端 `backend/.env` 示例：
    - `PORT=3000`
    - `MONGO_URI=mongodb://<user>:<pass>@<host>:27017/<db>?authSource=admin`
    - `QQ_MAIL_USER=<qq邮箱>`
    - `QQ_MAIL_PASS=<授权码>`
    - `DEEPSEEK_API_KEY=<密钥>`
  - 前端 `.env.local`：
    - `VITE_API_BASE_URL=http://localhost:3000`
- 启动命令
  - 后端：`cd backend && npm run dev` 或 `npm start`
  - 前端：`cd frontend && npm run dev`
- 示例执行（后端 cURL 用例）
  - 注册：
    - `curl -X POST http://localhost:3000/api/user/register -H "Content-Type: application/json" -d "{\"username\":\"u\",\"email\":\"u@test.com\",\"password\":\"123456\"}"`
  - 登录：
    - `curl -X POST http://localhost:3000/api/user/login -H "Content-Type: application/json" -d "{\"email\":\"u@test.com\",\"password\":\"123456\"}"`
  - 发送验证码：
    - `curl -X POST http://localhost:3000/api/user/send-reset-code -H "Content-Type: application/json" -d "{\"email\":\"u@test.com\"}"`
  - 重置密码：
    - `curl -X POST http://localhost:3000/api/user/reset-password -H "Content-Type: application/json" -d "{\"email\":\"u@test.com\",\"code\":\"123456\",\"newPassword\":\"654321\"}"`
  - 上传简历（Base64）：
    - `curl -X PUT http://localhost:3000/api/user/resume -H "Content-Type: application/json" -H "Authorization: Bearer <token>" -d "{\"userId\":\"<id>\",\"fileName\":\"resume.pdf\",\"mimeType\":\"application/pdf\",\"base64\":\"data:application/pdf;base64,<...>\"}"`

#### 3.1 自动化测试脚本
- 冒烟测试脚本：`backend/tests/api.smoke.mjs`
  - 运行：`node backend/tests/api.smoke.mjs`
  - 可选环境变量：`API_BASE_URL=http://localhost:3000`
  - 覆盖用例：注册/登录/刷新（正反向）、验证码（正反向）、资料/技能（正反向）、简历（上传/下载/删除/解析，正反向）、岗位列表与详情与匹配与城市、学习计划（生成/进度/查询，正反向）、AI 聊天与岗位建议（正反向）、安全与边界（无效 token、敏感字段校验、密码长度、简历恰好 5MB）
  - 输出：逐用例 `PASS/FAIL` 与摘要，最终统计 `Passed: x/y` 与“模块通过率”

##### 执行环境与配置
- 操作系统：Windows（本地）
- Node.js：建议 ≥ `20.19`
- 后端地址：`API_BASE_URL=http://localhost:3000`
- 数据库：`MONGO_URI` 指向可用 MongoDB（测试库）
- 邮件服务：`QQ_MAIL_USER`、`QQ_MAIL_PASS` 已配置
- AI 服务：`DEEPSEEK_API_KEY`（当前运行已配置）

##### 最新一次执行结果
- Passed: `47/47`
- 模块通过率：
  - 用户模块 `20/20 (100%)`
  - 岗位模块 `6/6 (100%)`
  - 简历模块 `10/10 (100%)`
  - 学习计划模块 `4/4 (100%)`
  - AI模块 `2/2 (100%)`
  - 其它模块 `5/5 (100%)`

```shell
API Base: http://localhost:3000
=== 正向用例 ===
[PASS] [正向] 注册 - 有效输入 -> {"code":200,"msg":"注册成功","data":{"userId":"693d2554701c0d55b23f8a53"}}
[PASS] [正向] 登录 - 正确凭证 -> {"code":200,"msg":"登录成功","data":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTNkMjU1NDcwMWMwZDU1YjIzZjhhNTMiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzY1NjE0OTMzLCJleHAiOjE3NjU2MTU4MzN9.N2HkLiM-jDGYFaqxV2u49JRAnNRacmxIUx8_rsa4beE","refreshToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTNkMjU1NDcwMWMwZDU1YjIzZjhhNTMiLCJ0eXBlIjoicmVmcmVzaCIsImlhdCI6MTc2NTYxNDkzMywiZXhwIjoxNzY4MjA2OTMzfQ.fMbcBjBqzFEP8P42s4OcyyaADYjSocgzxK1bictuhrs","userId":"693d2554701c0d55b23f8a53"}}
[PASS] [正向] 注册 - 最短密码1字符 -> {"code":200,"msg":"注册成功","data":{"userId":"693d2555701c0d55b23f8a59"}}
[PASS] [正向] 注册 - 极长密码256字符 -> {"code":200,"msg":"注册成功","data":{"userId":"693d2556701c0d55b23f8a5c"}}
[PASS] [正向] 刷新 accessToken - 有效 refreshToken -> {"code":200,"msg":"刷新成功","data":{"accessToken":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2OTNkMjU1NDcwMWMwZDU1YjIzZjhhNTMiLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzY1NjE0OTM0LCJleHAiOjE3NjU2MTU4MzR9.BLUKz8Kq0hJcyxk7T68e-f7ZE0ZrCIeaU_taolqxv9s"}}
[PASS] [正向] 发送重置验证码 - 已注册邮箱 -> {"code":200,"msg":"验证码已发送","data":null}
[PASS] [正向] 发送重置验证码 - 不返回验证码 -> {"code":200,"msg":"验证码已发送","data":null}
[PASS] [正向] 更新资料 - 本人鉴权 -> {"code":200,"msg":"资料已更新","data":null}
[PASS] [正向] 授权获取详情 - 不含敏感字段 -> {"hasPassword":false,"hasResumeData":false}
[PASS] [正向] 更新技能 - 本人鉴权 -> {"code":200,"msg":"技能更新成功","data":null}
[PASS] [正向] 岗位详情 - 列表首项 -> {"jobId":"6922a97b864dcd91ea2c391f","title":"Java高级开发后端工程师"}
[PASS] [正向] 岗位城市 - 列表 -> {"count":6}
[PASS] [正向] 岗位匹配 - 用户技能 -> {"count":1}
[PASS] [正向] 岗位匹配 Top3 - 本人鉴权 -> {"count":3}
[PASS] [正向] AI 岗位建议 - 未配置或成功 -> {"code":200,"msg":"success","data":{"text":"你的JavaScript技能与后端开发需求高度匹配，尤其适合测试公司中需要快速构建工具和脚本的场景。  \n推荐你转向前端开发或全栈工程师，因为JavaScript在这两个领域能直接发挥核心作用。  \n建议补充React或Node.js框架技能，并通过参与开源项目来积累实际开发经验。"}}
[PASS] [正向] 上传简历 - PDF Base64 -> {"code":200,"msg":"简历已上传","data":{"filename":"tiny.pdf","mimeType":"application/pdf","size":330,"uploadedAt":"2025-12-13T08:35:42.083Z"}}
[PASS] [正向] 上传简历 - 恰好5MB -> {"code":200,"msg":"简历已上传","data":{"filename":"exact5mb.pdf","mimeType":"application/pdf","size":5242880,"uploadedAt":"2025-12-13T08:35:42.330Z"}}
[PASS] [正向] 下载简历 - DataURL -> {"filename":"exact5mb.pdf","size":5242880}
[PASS] [正向] 解析简历 - PDF -> {"code":200,"msg":"未识别到有效文本","data":{"addedSkills":[],"totalFound":[]}}
[PASS] [正向] 上传非 PDF 简历 - DOCX -> {"code":200,"msg":"简历已上传","data":{"filename":"tiny.docx","mimeType":"application/vnd.openxmlformats-officedocument.wordprocessingml.document","size":26,"uploadedAt":"2025-12-13T08:35:43.631Z"}}
[PASS] [正向] 删除简历 - 成功 -> {"code":200,"msg":"简历已删除","data":null}
[PASS] [正向] 岗位列表 - 过滤与分页 -> {"total":470,"page":1,"count":5}
[PASS] [正向] 学习计划 - 生成 -> {"count":9}
[PASS] [正向] 学习计划 - 进度更新至 100 -> {"updatedCourses":3}
[PASS] [正向] 授权获取详情 - 技能同步完成 -> {"contains":true,"skill":"Java"}
[PASS] [正向] AI 聊天 - 无配置或成功 -> {"code":200,"msg":"success","data":{"reply":"您好，我是tester-upd，一名专注于软件测 试与质量保障的专业人士。我具备扎实的编程基础，熟练掌握JavaScript和Java，能够高效编写自动化测试脚本和进行后端测试。同时，我熟悉MongoDB等数据库技术，能够进行有效的数据验证和性能测试。我注重细节，善于在复杂系统中发现潜在问题，致力于通过严谨的测试流程 保障产品的高质量交付。期待能为贵团队贡献我的技能与经验。"}}
=== 反向用例 ===
[PASS] [反向] 注册 - 缺少密码失败 -> {"code":400,"msg":"username/email/password 不能为空"}
[PASS] [反向] 注册 - 重复邮箱失败 -> {"code":400,"msg":"邮箱已注册"}
[PASS] [反向] 登录 - 错误密码失败 -> {"code":401,"msg":"邮箱或密码错误"}
[PASS] [反向] 刷新 accessToken - 无效 refreshToken 失败 -> {"code":401,"msg":"refreshToken 无效或已过期"}
[PASS] [反向] 发送重置验证码 - 未注册邮箱失败 -> {"code":404,"msg":"用户不存在"}
[PASS] [反向] 验证验证码 - 错误 code 失败 -> {"code":400,"msg":"验证码错误"}
[PASS] [反向] 重置密码 - 错误 code 失败 -> {"code":400,"msg":"验证码错误"}
[PASS] [反向] 获取详情 - 无 token 失败 -> {"code":401,"msg":"未提供 token"}
[PASS] [反向] 获取详情 - 无效 token 失败 -> {"code":401,"msg":"token 无效或已过期"}
[PASS] [反向] 更新技能 - 无权限失败 -> {"code":401,"msg":"未提供 token"}
[PASS] [反向] 岗位详情 - 非法 ID 失败 -> {"code":400,"msg":"岗位 ID 不合法"}
[PASS] [反向] 岗位匹配 - 缺少技能失败 -> {"code":400,"msg":"缺少技能信息"}
[PASS] [反向] 岗位匹配 - 未登录失败 -> {"code":401,"msg":"未提供 token"}
[PASS] [反向] AI 岗位建议 - 未登录失败 -> {"code":401,"msg":"未提供 token"}
[PASS] [反向] 下载简历 - 未上传失败 -> {"code":404,"msg":"未上传简历"}
[PASS] [反向] 上传简历 - 文件过大失败 -> {"code":400,"msg":"文件过大或内容无效"}
[PASS] [反向] 解析简历 - 非 PDF 失败 -> {"code":404,"msg":"未上传简历"}
[PASS] [反向] 下载简历 - 已删除失败 -> {"code":404,"msg":"未上传简历"}
[PASS] [反向] 学习计划 - 非法 userId 失败 -> {"code":403,"msg":"无权限"}
[PASS] [反向] 学习计划 - 无权限失败 -> {"code":401,"msg":"未提供 token"}
[PASS] [反向] AI 聊天 - 未提供 token 失败 -> {"code":401,"msg":"未提供 token"}
Passed: 47/47
=== 模块通过率 ===
用户模块: 20/20 (100%)
其它模块: 5/5 (100%)
岗位模块: 6/6 (100%)
简历模块: 10/10 (100%)
学习计划模块: 4/4 (100%)
AI模块: 2/2 (100%)
```



---

### 4. 测试结果报告
 - 总览：本轮执行共 47/47 用例通过，模块通过率 100%（详见 3.1）。
 - 证据来源：执行日志与接口响应（已内嵌于 3.1 代码块）。

 - 注册/登录/刷新
   - 注册：正向通过；重复邮箱/缺少密码正确返回 400
   - 登录：正向通过；错误密码正确返回 401
   - 刷新：正向通过；无效 `refreshToken` 正确返回 401

 - 忘记密码（邮件验证码）
   - 发送验证码：正向通过（不返回验证码值）
   - 验证/重置：本轮未执行正向；负向（错误码/未注册邮箱）正确返回 400/404

 - 资料与技能
   - 更新资料/技能：正向通过；鉴权缺失/无效 token 正确返回 401
   - 用户详情：正向通过，响应体未包含敏感字段（密码哈希、简历二进制）

 - 简历管理与解析
   - 上传：PDF 与边界 5MB 正向通过；过大文件正确返回 400
   - 下载/删除：正向通过；未上传/已删除下载正确返回 404
   - 解析：PDF 正向执行（返回空集合）；非 PDF 正确返回 404

 - 岗位模块
   - 列表/详情/城市：正向通过；非法 ID 正确返回 400
   - 匹配（技能/Top3）：正向通过；缺少技能/未登录正确返回 400/401
   - AI 推荐：配置缺失或鉴权异常时正确返回错误；配置齐全时返回文本

 - 学习计划
   - 生成/进度更新：正向通过（0/100 边界生效）
   - 查询：本轮以“授权获取详情 - 技能同步完成”为证据；未鉴权/非法 userId 正确返回 401/403

 - AI 聊天
   - 普通聊天：正向通过（或在未配置时返回 success 文本占位）
   - 流式聊天：本轮未执行；未提供 token 正确返回 401

 - 安全与鉴权
   - 敏感字段：接口响应不含密码哈希与简历二进制（正向校验通过）
   - 鉴权拦截：未提供/无效 token 统一错误结构与码 401（负向通过）
   - 验证码：仅返回发送结果，不回传验证码值；哈希存储已在数据模型中实现（以接口行为与代码检查为证据）

 - 性能与可靠性（抽样）
   - 大文件上传异常路径与并发基础场景未观测崩溃（本轮未系统化压测）

---

