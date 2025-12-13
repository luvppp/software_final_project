# AI 职业规划与学习成长系统

一个智能识别简历技能、推荐岗位与学习计划的全栈项目。前端基于 Vue 3 + Element Plus，后端基于 Express + MongoDB；支持 PDF 简历解析、用户技能管理、岗位匹配、学习计划生成，以及邮件验证码找回密码与 AI 聊天辅助。

## 功能特性

- 用户资料与技能管理：编辑基础资料、维护技能标签与熟练度（本地评分持久化）
- 简历上传与解析：支持 PDF 上传，服务端解析文本并识别技能（`pdfjs-dist`，回退 `pdftotext`）
- 岗位列表与匹配：分页检索岗位，按用户技能计算匹配度与缺失技能
- 学习计划：根据缺失技能生成课程计划，支持进度更新与技能同步
- 忘记密码：发送邮箱验证码，校验后重置密码（QQ 邮箱 SMTP）
- AI 聊天/流式聊天：结合用户技能与简历为求职提供建议（DeepSeek）
- 系统状态：返回运行状态、Mongo 连接信息与主机信息
- JWT 鉴权：所有用户相关接口均需有效 `Bearer token`

## 技术栈

- 前端：`Vue 3`、`Pinia`、`Vue Router`、`Element Plus`、`TypeScript`、`Vite`
- 后端：`Express`、`Mongoose`、`jsonwebtoken`、`bcryptjs`、`nodemailer`
- 简历解析：`pdfjs-dist`（Node 兼容模式）+ 可选系统工具 `pdftotext`
- 依赖管理：`npm`（推荐 Node 20+）

## 目录结构

```
software_final_project/
├── backend/                       # 后端服务
│   ├── .env                       # 后端环境变量（已被 .gitignore 忽略）
│   └── src/
│       ├── app.js                 # Express 应用与中间件
│       ├── server.js              # 启动入口（加载 .env，连接 Mongo 并监听端口）
│       ├── config/mongoose.js     # Mongo 连接配置（优先使用 MONGO_URI）
│       ├── middleware/authMiddleware.js  # JWT 鉴权
│       ├── models/                # Mongoose 模型
│       │   ├── userModel.js
│       │   ├── jobModel.js
│       │   ├── learningPlanModel.js
│       │   └── skillStatModel.js
│       ├── routes/                # 路由模块
│       │   ├── userRoutes.js      # 注册/登录/忘记密码/资料/技能/简历解析/AI
│       │   ├── jobRoutes.js       # 岗位列表/匹配/详情/城市/AI 推荐理由
│       │   ├── learningRoutes.js  # 学习计划生成/进度更新/查询
│       │   └── systemRoutes.js    # 系统状态接口
│       └── utils/                 # 工具
│           ├── response.js        # 统一响应结构
│           └── asyncHandler.js    # 异步路由统一捕获
├── frontend/                      # 前端工程（Vite）
│   └── src/
│       ├── api/                   # API 封装（含统一拦截器 & SSE）
│       ├── views/                 # 页面（登录/注册/资料/岗位/学习）
│       ├── layouts/               # 布局（主布局与认证布局）
│       ├── stores/                # Pinia Store（用户状态）
│       ├── router/                # 路由与守卫
│       └── styles/                # 全局样式与设计令牌
└── README.md
```

## 环境变量

后端会自动从当前目录或上级目录加载 `.env`（`backend/src/server.js` 已内置），推荐在 `backend/.env` 设置以下变量：

- 基础
  - `PORT=3000` 后端监听端口
  - `MONGO_URI=mongodb://<user>:<pass>@<host>:27017/<db>?authSource=admin` 优先使用此地址连接数据库
  - `JWT_SECRET` 或 `JWT_ACCESS_SECRET/JWT_REFRESH_SECRET` 自定义 JWT 密钥与有效期
- 邮件（QQ 邮箱）
  - `QQ_MAIL_USER=你的QQ邮箱` 例如 `chenyb0614@qq.com`
  - `QQ_MAIL_PASS=你的QQ邮箱授权码` 非登录密码，是 SMTP 授权码
- AI 服务（DeepSeek）
  - `DEEPSEEK_API_KEY=你的API密钥`
  - `DEEPSEEK_BASE_URL=https://api.deepseek.com`
  - `DEEPSEEK_MODEL=deepseek-chat`
  - `DEEPSEEK_MAX_TOKENS=1500`

前端通过环境变量控制后端地址：

- `VITE_API_BASE_URL=http://localhost:3000`

## 安装与运行

### 后端

1. 安装依赖
   - `cd backend`
   - `npm install`
2. 配置环境变量
   - 在 `backend/.env` 设置上文变量（端口/数据库/邮箱/AI）
3. 启动
   - 开发：`npm run dev`（`nodemon` 热重载）
   - 生产：`npm start` 或用 PM2 常驻

### 前端

1. 安装依赖
   - `cd frontend`
   - `npm install`
2. 配置环境变量（可选）
   - `.env` 或 `.env.local`：`VITE_API_BASE_URL=http://localhost:3000`
3. 启动与构建
   - 开发：`npm run dev`
   - 类型检查：`npm run type-check`
   - 构建：`npm run build`
   - 预览：`npm run preview`

## 接口说明

统一响应结构：`{ code: number, msg: string, data?: any }`；成功 `code=200`。

### 用户模块（`/api/user`）

- `POST /register` 注册（邮箱唯一、密码哈希存储）  
- `POST /login` 登录，返回 `accessToken`、`refreshToken`、`userId`
- `POST /token/refresh` 刷新 `accessToken`
- `PUT /skills` 更新技能与意向岗位（需鉴权）
- `PUT /profile` 更新资料（需鉴权，邮箱唯一性校验）
- `GET /:userId` 获取用户详情（需鉴权）
- `PUT /resume` 上传简历（Base64 DataURL，大小限制 5MB）
- `GET /:userId/resume` 获取简历（返回 DataURL 以支持预览/下载）
- `DELETE /resume` 删除简历（需鉴权）
- `POST /resume/parse` 解析简历技能（PDF）：返回 `addedSkills` 与 `totalFound`
- 忘记密码：
  - `POST /send-reset-code` 发送邮箱验证码（QQ SMTP），验证码有效期 15 分钟  
    参考实现：`backend/src/routes/userRoutes.js:56`
  - `POST /verify-reset-code` 校验验证码  
    参考实现：`backend/src/routes/userRoutes.js:94`
  - `POST /reset-password` 校验验证码并重置密码  
    参考实现：`backend/src/routes/userRoutes.js:116`
- AI 聊天：
  - `POST /ai/chat` 普通模式
  - `POST /ai/chat/stream` 流式模式（SSE）

### 岗位模块（`/api/job`）

- `GET /list` 支持分页、关键字、城市、偏好、是否实习过滤
- `POST /match` 根据用户技能返回匹配度与缺失技能
- `GET /cities` 返回岗位城市列表（去重排序）
- `GET /:id` 岗位详情
- `POST /ai/reason` 生成 AI 推荐理由或建议（缓存指纹）

### 学习计划模块（`/api/learning`）

- `POST /plan` 生成/覆盖学习计划（根据缺失技能）
- `PUT /progress` 更新学习进度（0-100；全部完成自动同步技能）
- `GET /:userId` 获取用户学习计划

### 系统模块（`/api/system`）

- `GET /status` 系统健康检查（运行状态、Mongo 状态、内存、主机名）
- `GET /ai-check` AI 模块状态（示例）

## 简历解析说明

- 仅支持 PDF：后端会校验 `mimeType` 是否为 `application/pdf`
- 主解析：`pdfjs-dist` 在 Node 环境下禁用 worker 并逐页提取文本
- 回退解析：若文本过少，尝试系统命令 `pdftotext`（需服务器安装）
- 技能词典：聚合岗位库技能 + 内置词典，进行大小写与分隔符归一化匹配；含变体规范化（如 `js`→`JavaScript`、`k8s`→`Kubernetes`）

## 部署指南

- 使用 PM2 常驻：
  - `npm i -g pm2`
  - `cd backend && pm2 start src/server.js --name ai-career-backend`
  - `pm2 save && pm2 startup`（开机自启）
- Nginx 反向代理示例：
  ```
  server {
    listen 443 ssl;
    server_name your.domain;
    ssl_certificate     /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    location / {
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_pass http://127.0.0.1:3000;
    }
  }
  ```
- 前端构建后（`frontend/dist`）可由 Nginx 静态托管：
  ```
  server {
    listen 443 ssl;
    server_name your.domain;
    root /var/www/ai-career-frontend/dist;
    try_files $uri /index.html;
  }
  ```

## 数据库迁移

- 本地导出：`mongodump --uri="mongodb://127.0.0.1:27017/software" --out ./dump`
- 上传服务器：`scp -r ./dump user@server:~/dump`
- 服务器恢复：`mongorestore --uri="mongodb://<user>:<pass>@<host>:27017/<db>?authSource=admin" ~/dump/software`
- 在后端服务器 `.env` 设置 `MONGO_URI` 指向新库

## 鉴权与安全

- 前端请求拦截器自动附带 `Authorization: Bearer <token>`
- 后端对用户相关接口进行鉴权，解析 JWT 载荷至 `req.user`
- 密码哈希储存（`bcryptjs`），验证码仅存储哈希与过期时间（`resetCodeHash/resetCodeExpires`，见 `backend/src/models/userModel.js:18-19`）
- 不在代码库中提交任何密钥与授权码（`.env` 已被忽略）

## 开发者命令

- 前端
  - `npm run dev` 开发服务器
  - `npm run type-check` TypeScript 类型检查
  - `npm run build` 构建产物
  - `npm run preview` 本地预览
- 后端
  - `npm run dev` Nodemon 热重载
  - `npm start` 直接启动服务

## 常见问题

- 端口占用（EADDRINUSE）
  - 用 `netstat -ano | findstr :3000` 找占用进程，`taskkill /PID <pid> /F` 释放或修改 `PORT`
- 邮件发送失败
  - `QQ_MAIL_PASS` 必须是 QQ 的“授权码”，服务器需允许访问 `smtp.qq.com:465`
- Mongo 连接失败
  - 配置正确的 `MONGO_URI` 与 `authSource`；确保实例开放访问与账号权限
- AI 未配置
  - 设置 `DEEPSEEK_API_KEY` 等变量；否则相关接口会返回错误

## 许可

本项目用于课程与学习目的，若用于生产请完善安全、监控、审计与高可用方案。
