# AI 职业规划与学习成长系统

智能识别简历技能、推荐岗位与学习计划的全栈项目。前端基于 Vue 3 + Element Plus，后端基于 Express + MongoDB；支持 PDF 简历解析、用户技能管理、岗位推荐与学习计划生成。

## 功能特性

- 用户资料与技能管理：编辑基础资料、维护技能标签与熟练度（本地评分持久化）
- 简历上传与解析：支持 PDF 上传，服务端解析文本并识别技能（`pdfjs-dist`，回退 `pdftotext`）
- 岗位列表与匹配：分页检索岗位，按用户技能计算匹配度与缺失技能
- 学习计划：根据缺失技能生成课程计划，支持进度更新
- 系统状态：返回运行状态、Mongo 连接信息与主机信息
- JWT 鉴权：所有用户相关接口均需有效 `Bearer token`

## 技术栈

- 前端：`Vue 3`、`Pinia`、`Vue Router`、`Element Plus`、`TypeScript`、`Vite`
- 后端：`Express`、`Mongoose`、`jsonwebtoken`、`bcryptjs`
- 简历解析：`pdfjs-dist`（Node 兼容模式）+ 可选系统工具 `pdftotext`
- 依赖管理：`npm`（推荐 Node 20+）

## 目录结构

```
software_final_project/
├── backend/                       # 后端服务
│   └── src/
│       ├── app.js                 # Express 应用与中间件
│       ├── server.js              # 启动入口（连接 Mongo 并监听端口）
│       ├── config/mongoose.js     # Mongo 连接配置
│       ├── middleware/authMiddleware.js  # JWT 鉴权
│       ├── models/                # Mongoose 模型
│       │   ├── userModel.js
│       │   ├── jobModel.js
│       │   ├── learningPlanModel.js
│       │   └── skillStatModel.js
│       ├── routes/                # 路由模块
│       │   ├── userRoutes.js      # 用户注册/登录/资料/技能/简历解析
│       │   ├── jobRoutes.js       # 岗位列表/匹配/详情/城市
│       │   ├── learningRoutes.js  # 学习计划生成/进度更新/查询
│       │   └── systemRoutes.js    # 系统状态接口
│       └── utils/                 # 工具
│           ├── response.js        # 统一响应结构
│           └── asyncHandler.js    # 异步路由统一捕获
├── frontend/                      # 前端工程（Vite）
│   └── src/
│       ├── api/                   # API 封装（含统一拦截器）
│       ├── views/                 # 页面（含 Profile、Jobs、Learning 等）
│       ├── layouts/               # 布局（主布局与认证布局）
│       ├── stores/                # Pinia Store（用户状态）
│       ├── router/                # 路由与守卫
│       └── styles/                # 全局样式与设计令牌
└── README.md
```

## 安装与运行

### 后端

1. 安装依赖
   - 进入后端目录：`cd backend`
   - 安装：`npm install`
2. 配置环境变量（可选）
   - `MONGO_URI`：默认 `mongodb://10.161.106.62:27017/software`
   - `JWT_SECRET`：默认 `ai-career-secret`
   - `PORT`：默认 `3000`
3. 本地开发启动
   - `npm run dev`（使用 `nodemon` 热重载）
   - 或：`npm start`

### 前端

1. 安装依赖
   - 进入前端目录：`cd frontend`
   - 安装：`npm install`
2. 配置环境变量（可选）
   - 在 `.env` 或 `.env.local` 设置：`VITE_API_BASE_URL=http://localhost:3000`
3. 本地开发启动
   - `npm run dev`（Vite 开发服务器）
4. 构建与预览
   - 类型检查：`npm run type-check`
   - 构建：`npm run build`
   - 预览：`npm run preview`

## 核心接口约定

- 统一响应结构：`{ code: number, msg: string, data: any }`
- 成功时 `code=200`，失败时返回相应错误码并附带 `msg`

### 用户模块（`/api/user`）

- `POST /register` 注册
- `POST /login` 登录，返回 `token`, `userId`
- `PUT /skills` 更新技能与意向岗位（需鉴权）
- `PUT /profile` 更新资料（需鉴权，邮箱唯一性校验）
- `GET /:userId` 获取用户详情（需鉴权）
- `PUT /resume` 上传简历（Base64 DataURL，大小限制 5MB）
- `GET /:userId/resume` 获取简历（返回 DataURL 以支持预览/下载）
- `DELETE /resume` 删除简历（需鉴权）
- `POST /resume/parse` 解析简历技能（PDF）：返回 `addedSkills` 与 `totalFound`

### 岗位模块（`/api/job`）

- `GET /list` 支持分页、关键字、城市、偏好、是否实习过滤
- `POST /match` 根据用户技能返回匹配度与缺失技能
- `GET /cities` 返回岗位城市列表（去重排序）
- `GET /:id` 岗位详情

### 学习计划模块（`/api/learning`）

- `POST /plan` 生成/覆盖学习计划（根据缺失技能）
- `PUT /progress` 更新学习进度（0-100）
- `GET /:userId` 获取用户学习计划

### 系统模块（`/api/system`）

- `GET /status` 系统健康检查（运行状态、Mongo 状态、内存、主机名）
- `GET /ai-check` AI 模块状态（示例）

## 简历解析说明

- 仅支持 PDF：后端会校验 `mimeType` 是否为 `application/pdf`
- 主解析：`pdfjs-dist` 在 Node 环境下禁用 worker 并逐页提取文本
- 回退解析：若文本过少，尝试系统命令 `pdftotext`（需本机安装）
- 技能词典：聚合岗位库技能 + 内置词典，进行大小写与分隔符归一化匹配
- 规范化：常见变体（如 `js`→`JavaScript`、`k8s`→`Kubernetes`）统一处理

## 鉴权与安全

- 前端在请求拦截器中自动附带 `Authorization: Bearer <token>`
- 后端对用户相关接口进行鉴权，验证并解析 JWT 载荷至 `req.user`
- 敏感数据（如密码哈希与简历二进制）不会直接暴露给客户端

## 开发者提示

- 前端开发命令
  - `npm run dev` 开发服务器
  - `npm run type-check` TypeScript 类型检查
  - `npm run build` 构建产物
  - `npm run preview` 本地预览
- 后端开发命令
  - `npm run dev` Nodemon 热重载
  - `npm start` 直接启动服务

## 常见问题

- 无法解析 PDF 文本
  - 检查上传文件是否为 PDF；如文本过少，可安装 `pdftotext` 并确保系统可执行
- 401 未鉴权
  - 前端需存储并在请求头附带 `token`；后端校验失败会返回 401
- Mongo 连接失败
  - 配置正确的 `MONGO_URI`，并确认数据库服务可用

## 许可

本项目用于课程与学习目的，若需用于生产环境请自行完善安全与部署方案。
