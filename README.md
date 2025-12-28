# AI 职业规划与学习成长系统 (AI Career Path & Learning System)

## 1. 项目总体介绍

本项目是一个基于 AI 驱动的全栈职业规划与学习成长平台，旨在帮助求职者智能识别技能差距、推荐合适岗位并生成个性化的学习计划。系统结合了传统招聘平台的功能与现代 AI 技术，提供从简历解析到职位匹配再到技能提升的一站式解决方案。

### 核心功能
- **智能简历解析**：支持 PDF 简历上传，利用后端解析引擎自动提取关键技能与个人信息。
- **AI 职位匹配**：基于用户技能画像与岗位要求，计算匹配度并分析缺失技能。
- **个性化学习计划**：针对缺失技能，自动生成包含课程推荐与时间规划的学习路径。
- **AI 职业顾问**：集成 DeepSeek 大模型，提供实时的职业咨询、模拟面试与简历优化建议。
- **安全与隐私**：完善的 JWT 鉴权机制、敏感数据加密存储及防注入攻击设计。

---

## 2. 项目配置管理

本项目采用标准的开发配置流程，前后端配置分离，并通过环境变量进行敏感信息管理。

### 2.1 环境依赖
- **Node.js**: v18.0.0+ (推荐 v20+)
- **MongoDB**: v5.0+ (需开启 Auth 认证)
- **NPM**: v8.0+

### 2.2 后端配置 (`backend/.env`)
后端服务启动时会自动加载 `.env` 文件。请在 `backend/` 目录下创建该文件：

```ini
# --- 基础配置 ---
PORT=3000                           # 服务监听端口
MONGO_URI=mongodb://user:pass@localhost:27017/software?authSource=admin  # 数据库连接串
JWT_SECRET=your_jwt_secret_key      # JWT 签名密钥 (生产环境请使用复杂随机串)

# --- 邮件服务 (用于找回密码) ---
QQ_MAIL_USER=your_email@qq.com      # 发件人邮箱
QQ_MAIL_PASS=your_smtp_auth_code    # SMTP 授权码 (非邮箱密码)

# --- AI 服务 (DeepSeek) ---
DEEPSEEK_API_KEY=sk-xxxxxxxx        # DeepSeek API Key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_MAX_TOKENS=1500
```

### 2.3 前端配置 (`frontend/.env`)
前端构建时读取环境变量。请在 `frontend/` 目录下创建：

```ini
VITE_API_BASE_URL=http://localhost:3000  # 后端 API 地址
```

---

## 3. 项目架构设计

系统采用前后端分离架构，前端负责交互与展示，后端负责业务逻辑与数据处理。

### 3.1 技术栈
| 层级 | 技术选型 | 说明 |
| --- | --- | --- |
| **前端** | Vue 3 + Vite | 高性能组件化开发 |
| | Element Plus | 现代化 UI 组件库 |
| | Pinia | 状态管理 |
| | Vue Router | 路由管理 |
| **后端** | Node.js + Express | 轻量级 Web 框架 |
| | MongoDB + Mongoose | 灵活的文档型数据库与 ODM |
| | JSON Web Token (JWT) | 无状态身份认证 |
| **工具** | PDF.js | 简历解析引擎 |
| | Nodemailer | 邮件发送服务 |

### 3.2 目录结构
```
software_final_project/
├── backend/                 # 后端服务
│   ├── src/
│   │   ├── config/          # 数据库与全局配置
│   │   ├── middleware/      # 中间件 (Auth, ErrorHandler)
│   │   ├── models/          # Mongoose 数据模型 (User, Job, Plan)
│   │   ├── routes/          # API 路由定义
│   │   ├── utils/           # 工具函数 (Response, AsyncHandler)
│   │   ├── app.js           # Express 应用入口
│   │   └── server.js        # 服务启动脚本
│   └── tests/               # 自动化测试脚本
├── frontend/                # 前端工程
│   ├── src/
│   │   ├── api/             # Axios 接口封装
│   │   ├── stores/          # Pinia 全局状态
│   │   ├── views/           # 页面视图 (Login, Profile, Job, Learning)
│   │   └── layouts/         # 页面布局
└── README.md                # 项目文档
```

### 3.3 数据流向
1.  **用户请求**: 前端发起 Axios 请求 (携带 Bearer Token)。
2.  **网关/路由**: Express Router 分发请求至对应 Controller。
3.  **鉴权中间件**: 校验 JWT 有效性，解析 User ID。
4.  **业务逻辑**: Controller 调用 Service 或 Model 处理业务 (如计算匹配度)。
5.  **数据持久化**: Mongoose 与 MongoDB 交互。
6.  **响应返回**: 统一响应格式 `{ code, msg, data }` 返回前端。

---

## 4. 项目测试

为保证系统稳定性，项目建立了分层的自动化测试体系，覆盖功能、安全、性能与集成测试。

### 4.1 测试策略
我们采用 **脚本化自动化测试**，测试脚本位于 `backend/tests/` 目录下。

*   **冒烟测试 (Smoke Test)**: 快速验证核心路径（注册 -> 登录 -> 获取个人信息），确保系统基本可用。
*   **综合测试 (Comprehensive Test)**: 全量回归测试，覆盖所有 API 接口、异常处理与安全边界。

### 4.2 测试覆盖范围

| 测试类型 | 覆盖内容 | 关键用例示例 |
| --- | --- | --- |
| **功能测试** | 业务逻辑正确性 | 简历解析、岗位筛选、学习计划生成、进度更新 |
| **安全测试** | 漏洞防御能力 | SQL/NoSQL 注入、XSS 攻击、越权访问 (IDOR)、敏感路径扫描 |
| **性能测试** | 响应与并发 | 单接口延迟 (<800ms)、高并发负载 (30+并发稳定) |
| **集成测试** | 业务闭环 | "注册-完善资料-投递" 全流程、"生成计划-学习-完成" 全流程 |

### 4.3 如何运行测试

确保后端服务已启动 (`npm start` 或 `npm run dev`)，然后在项目根目录执行：

1.  **执行冒烟测试** (快速检查):
    ```bash
    node backend/tests/api.smoke.mjs
    ```
    *输出: 控制台日志及 `api_smoke_report.md`*

2.  **执行综合测试** (全量验证):
    ```bash
    node backend/tests/api.comprehensive.mjs
    ```
    *输出: 详细测试报告 `api_comprehensive_report.md`，包含 Pass/Fail 状态及性能指标。*

### 4.4 测试报告示例
测试脚本会自动生成 Markdown 格式的测试报告，包含每个用例的执行结果、耗时及优先级。

```markdown
| TC-001 | 环境准备 | 服务健康检查 | ... | <span style="color:green">Pass</span> |
| TC-031 | 安全测试 | IDOR-修改他人资料 | ... | <span style="color:green">Pass</span> |
| TC-049 | 性能测试 | 并发负载-岗位列表 | ... | <span style="color:green">Pass</span> |
```

---

## 5. 快速开始

### 后端启动
```bash
cd backend
npm install
# 配置 .env 文件
npm run dev
```

### 前端启动
```bash
cd frontend
npm install
npm run dev
```
