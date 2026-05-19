# LinkMatch API 接口文档

## 基础信息

| 项目 | 说明 |
|------|------|
| Base URL | `https://your-domain.com/api` |
| 认证方式 | Bearer Token (JWT) |
| 数据格式 | JSON |
| WebSocket | `wss://your-domain.com` |

## 通用响应格式

```json
{
  "success": true,
  "data": { ... },
  "message": "操作成功"
}
```

错误响应：

```json
{
  "success": false,
  "message": "错误描述"
}
```

---

## 1. 认证模块 `/api/auth`

### 1.1 邮箱注册

```
POST /api/auth/register/email
```

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "123456",
  "name": "用户名",
  "role": "demander"
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| email | string | 是 | 有效邮箱 |
| password | string | 是 | 至少6位 |
| name | string | 否 | 用户名，默认取邮箱前缀 |
| role | string | 否 | enterprise/provider/demander |

**响应：**

```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "name": "...", "avatar": "...", "role": "..." },
    "token": "jwt-token"
  }
}
```

### 1.2 邮箱登录

```
POST /api/auth/login/email
```

**请求体：**

```json
{
  "email": "user@example.com",
  "password": "123456"
}
```

### 1.3 发送短信验证码

```
POST /api/auth/sms/send
```

**请求体：**

```json
{
  "phone": "13800138000"
}
```

> 测试模式下验证码固定为 `123456`

### 1.4 手机验证码登录（自动注册）

```
POST /api/auth/login/sms
```

**请求体：**

```json
{
  "phone": "13800138000",
  "code": "123456"
}
```

### 1.5 获取当前用户信息

```
GET /api/auth/me
Authorization: Bearer <token>
```

### 1.6 更新用户信息

```
PUT /api/auth/me
Authorization: Bearer <token>
```

**请求体：**

```json
{
  "name": "新用户名",
  "avatar": "https://...",
  "company": "公司名",
  "title": "职位",
  "bio": "个人简介"
}
```

---

## 2. 需求模块 `/api/projects`

### 2.1 获取需求列表（广场）

```
GET /api/projects?page=1&limit=10&category=技术开发&keyword=AI&sort=latest
```

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码，默认1 |
| limit | number | 每页数量，默认10，最大50 |
| category | string | 分类筛选（全部/技术开发/设计创意/市场营销/咨询服务/运营支持） |
| keyword | string | 关键词搜索 |
| status | string | 状态筛选，默认published |
| sort | string | latest/budget_high/budget_low/popular |

**响应：**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "项目标题",
        "description": "描述",
        "budgetMin": 100000,
        "budgetMax": 200000,
        "category": "技术开发",
        "tags": ["AI", "NLP"],
        "status": "published",
        "viewCount": 123,
        "matchCount": 5,
        "createdAt": "2025-01-01T00:00:00Z",
        "publisher": {
          "id": "uuid",
          "name": "发布者",
          "avatar": "url",
          "company": "公司",
          "creditScore": 90
        }
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 50,
      "totalPages": 5
    }
  }
}
```

### 2.2 获取需求详情

```
GET /api/projects/:id
```

响应中额外包含 `recommendations` 字段（匹配推荐的服务列表）。

### 2.3 发布需求

```
POST /api/projects
Authorization: Bearer <token>
```

**请求体：**

```json
{
  "title": "项目标题",
  "description": "详细描述",
  "budgetMin": 100000,
  "budgetMax": 200000,
  "category": "技术开发",
  "tags": ["AI", "NLP"],
  "requirements": ["有AI开发经验"],
  "deadline": "2025-08-01",
  "background": "项目背景",
  "acceptance": "验收标准",
  "skillTypes": ["AI开发"],
  "location": "北京"
}
```

### 2.4 更新需求

```
PUT /api/projects/:id
Authorization: Bearer <token>
```

### 2.5 删除需求

```
DELETE /api/projects/:id
Authorization: Bearer <token>
```

### 2.6 表达兴趣

```
POST /api/projects/:id/interest
Authorization: Bearer <token>
```

> 自动创建聊天会话，返回 `conversationId`

---

## 3. 服务模块 `/api/skills`

### 3.1 获取服务列表

```
GET /api/skills?page=1&limit=10&category=技术开发&keyword=全栈&sort=latest
```

参数与需求列表类似。

### 3.2 获取服务详情

```
GET /api/skills/:id
```

### 3.3 发布服务

```
POST /api/skills
Authorization: Bearer <token>
```

**请求体：**

```json
{
  "name": "服务名称",
  "solution": "解决方案描述",
  "cases": [
    { "title": "案例标题", "description": "案例描述" }
  ],
  "priceType": "range",
  "priceMin": 50000,
  "priceMax": 200000,
  "category": "技术开发",
  "tags": ["全栈", "React"],
  "industries": ["电商", "SaaS"],
  "scenarios": ["Web开发"],
  "teamIntro": "团队介绍",
  "teamSize": 5,
  "location": "北京"
}
```

### 3.4 更新服务

```
PUT /api/skills/:id
Authorization: Bearer <token>
```

### 3.5 删除服务

```
DELETE /api/skills/:id
Authorization: Bearer <token>
```

### 3.6 表达兴趣

```
POST /api/skills/:id/interest
Authorization: Bearer <token>
```

---

## 4. 聊天模块 `/api/chat`

### 4.1 获取会话列表

```
GET /api/chat/conversations
Authorization: Bearer <token>
```

**响应：**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "active",
      "lastMessage": "最后一条消息",
      "lastMessageAt": "2025-01-01T12:00:00Z",
      "unreadCount": 3,
      "relatedTitle": "关联的需求/服务标题",
      "relatedType": "project",
      "relatedId": "uuid",
      "otherUser": {
        "id": "uuid",
        "name": "对方姓名",
        "avatar": "url",
        "company": "公司"
      }
    }
  ]
}
```

### 4.2 获取消息历史

```
GET /api/chat/conversations/:id/messages?page=1&limit=50
Authorization: Bearer <token>
```

### 4.3 发送消息 (HTTP)

```
POST /api/chat/conversations/:id/messages
Authorization: Bearer <token>
```

```json
{
  "content": "消息内容",
  "type": "text"
}
```

### 4.4 创建新会话

```
POST /api/chat/conversations
Authorization: Bearer <token>
```

```json
{
  "targetUserId": "uuid",
  "projectId": "uuid",
  "initialMessage": "你好，我对你的项目很感兴趣"
}
```

### 4.5 确认合作

```
POST /api/chat/conversations/:id/confirm
Authorization: Bearer <token>
```

---

## 5. 分享模块 `/api/share`

### 5.1 生成分享链接

```
POST /api/share/generate
Authorization: Bearer <token>
```

```json
{
  "type": "project",
  "id": "uuid"
}
```

**响应：**

```json
{
  "success": true,
  "data": {
    "token": "abc123xyz",
    "url": "https://your-frontend.com/s/abc123xyz"
  }
}
```

### 5.2 解析分享链接

```
GET /api/share/resolve/:token
```

---

## 6. 用户模块 `/api/users`

### 6.1 获取用户公开信息

```
GET /api/users/:id
```

### 6.2 获取我的需求

```
GET /api/users/me/projects
Authorization: Bearer <token>
```

### 6.3 获取我的服务

```
GET /api/users/me/skills
Authorization: Bearer <token>
```

### 6.4 获取我的匹配记录

```
GET /api/users/me/matches
Authorization: Bearer <token>
```

### 6.5 获取个人统计

```
GET /api/users/me/stats
Authorization: Bearer <token>
```

---

## 7. WebSocket 事件

### 连接方式

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://your-domain.com', {
  auth: { token: 'jwt-token' }
});
```

### 客户端发送事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `sendMessage` | `{ conversationId, content, type }` | 发送消息 |
| `typing` | `{ conversationId }` | 正在输入 |
| `stopTyping` | `{ conversationId }` | 停止输入 |
| `markRead` | `{ conversationId }` | 标记已读 |
| `joinConversation` | `{ conversationId }` | 加入会话房间 |
| `leaveConversation` | `{ conversationId }` | 离开会话房间 |
| `confirmCollaboration` | `{ conversationId }` | 确认合作 |

### 服务端推送事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `receiveMessage` | `{ id, content, type, sender, createdAt }` | 收到新消息 |
| `userTyping` | `{ userId, conversationId }` | 对方正在输入 |
| `userStopTyping` | `{ userId, conversationId }` | 对方停止输入 |
| `conversationUpdated` | `{ conversationId, lastMessage }` | 会话列表更新 |
| `collaborationConfirmed` | `{ conversationId }` | 合作已确认 |
| `error` | `{ message }` | 错误通知 |

---

## 8. 前端对接指南

### 8.1 安装依赖

```bash
pnpm add axios socket.io-client
```

### 8.2 创建 API 客户端

```typescript
// src/api/client.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.hash = '#/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export default api;
```

### 8.3 AuthContext 对接示例

```typescript
// 登录
const login = async (email: string, password: string) => {
  const { data } = await api.post('/auth/login/email', { email, password });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  setUser(data.user);
};

// 手机号登录
const loginWithSms = async (phone: string, code: string) => {
  const { data } = await api.post('/auth/login/sms', { phone, code });
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
  setUser(data.user);
};

// 退出登录
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setUser(null);
};
```
