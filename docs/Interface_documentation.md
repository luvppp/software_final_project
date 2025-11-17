# **AI 智能职业规划与学习成长系统 — 后端接口文档**

**Version:** 1.0
 **Backend:** Node.js + Express
 **DB:** MongoDB
 **Auth:** JWT Token
 **Base URL:** `http://localhost:3000/api`

------

# **1. 用户模块（/api/user）**

------

## **1.1 用户注册**

**URL:** `/api/user/register`
 **Method:** `POST`
 **描述：** 创建新用户账号

### **请求参数（JSON Body）**

| 字段     | 类型   | 必填 | 描述   |
| -------- | ------ | ---- | ------ |
| username | String | 是   | 用户名 |
| email    | String | 是   | 邮箱   |
| password | String | 是   | 密码   |

### **请求示例**

```
{
  "username": "chenyb",
  "email": "chen@example.com",
  "password": "123456"
}
```

### **返回示例**

```
{
  "code": 200,
  "msg": "注册成功",
  "userId": "66fabca231..."
}
```

------

## **1.2 用户登录**

**URL:** `/api/user/login`
 **Method:** `POST`

### **请求示例**

```
{
  "email": "chen@example.com",
  "password": "123456"
}
```

### **返回示例**

```
{
  "code": 200,
  "msg": "登录成功",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

------

## **1.3 更新用户技能**

**URL:** `/api/user/skills`
 **Method:** `PUT`

### **请求示例**

```
{
  "userId": "66fabca231...",
  "skills": ["C++", "Python", "MySQL"]
}
```

### **返回示例**

```
{
  "code": 200,
  "msg": "技能更新成功"
}
```

------

## **1.4 获取用户信息**

**URL:** `/api/user/:userId`
 **Method:** `GET`

### **返回示例**

```
{
  "code": 200,
  "data": {
    "username": "chenyb",
    "skills": ["C++", "Python"],
    "targetJob": "后端开发"
  }
}
```

------

# **2. 岗位模块（/api/job）**

------

## **2.1 获取岗位列表**

**URL:** `/api/job/list`
 **Method:** `GET`

### **Query 参数**

| 参数    | 描述       | 默认值 |
| ------- | ---------- | ------ |
| page    | 页码       | 1      |
| limit   | 每页数量   | 10     |
| keyword | 搜索关键字 | 空     |

### **返回示例**

```
{
  "code": 200,
  "data": [
    {
      "jobId": "j101",
      "title": "前端开发工程师",
      "company": "阿里巴巴",
      "skills": ["Vue3", "JavaScript"],
      "salary": "15k-25k"
    }
  ]
}
```

------

## **2.2 获取岗位详情**

**URL:** `/api/job/:id`
 **Method:** `GET`

### **返回示例**

```
{
  "code": 200,
  "data": {
    "jobId": "j101",
    "title": "前端开发",
    "company": "阿里巴巴",
    "description": "负责前端业务开发",
    "skills": ["Vue3", "JavaScript"],
    "salary": "15k-25k",
    "location": "杭州"
  }
}
```

------

## **2.3 AI 岗位匹配（核心接口）**

**URL:** `/api/job/match`
 **Method:** `POST`
 **描述：** 根据用户技能进行 AI 岗位匹配

### **请求示例**

```
{
  "userId": "66fabca231...",
  "skills": ["C++", "Python"]
}
```

### **返回示例**

```
{
  "code": 200,
  "data": [
    {
      "jobTitle": "后端开发工程师",
      "company": "腾讯",
      "matchScore": 0.82,
      "missingSkills": ["MySQL", "Linux"]
    }
  ]
}
```

------

# **3. 学习计划模块（/api/learning）**

------

## **3.1 生成学习计划**

**URL:** `/api/learning/plan`
 **Method:** `POST`

### **请求示例**

```
{
  "userId": "66fabca231...",
  "missingSkills": ["MySQL", "Linux"]
}
```

### **返回示例**

```
{
  "code": 200,
  "data": [
    {
      "skill": "MySQL",
      "course": "MySQL数据库基础",
      "platform": "Bilibili",
      "url": "https://www.bilibili.com/... "
    }
  ]
}
```

------

## **3.2 更新学习进度**

**URL:** `/api/learning/progress`
 **Method:** `PUT`

### **请求示例**

```
{
  "userId": "66fabca231...",
  "skill": "MySQL",
  "progress": 80
}
```

### **返回示例**

```
{
  "code": 200,
  "msg": "学习进度已更新"
}
```

------

## **3.3 获取用户学习计划**

**URL:** `/api/learning/:userId`
 **Method:** `GET`

### **返回示例**

```
{
  "code": 200,
  "data": {
    "userId": "66fabca231...",
    "plan": [
      { "skill": "MySQL", "progress": 80 },
      { "skill": "Linux", "progress": 20 }
    ]
  }
}
```

------

# **4. 系统模块（/api/system）**

------

## **4.1 系统状态检测**

**URL:** `/api/system/status`
 **Method:** `GET`

### **返回示例**

```
{
  "code": 200,
  "status": "running",
  "mongo": "connected",
  "uptime": "2h 31m"
}
```

------

## **4.2 AI 模块状态检测**

**URL:** `/api/system/ai-check`
 **Method:** `GET`

### **返回示例**

```
{
  "code": 200,
  "msg": "AI 模块正常运行"
}
```

------

# **5. 错误码说明**

| code | 说明             |
| ---- | ---------------- |
| 200  | 成功             |
| 400  | 参数错误         |
| 401  | 未登录/Token无效 |
| 404  | 数据不存在       |
| 500  | 服务器错误       |

------

# **6. 通用返回格式**

```
{
  "code": 200,
  "msg": "success",
  "data": { }
}
```