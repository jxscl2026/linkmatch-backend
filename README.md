# LinkMatch 后端服务

LinkMatch 是一个连接企业需求与专业服务的智能匹配平台。本项目是 LinkMatch 的后端服务，基于 Node.js、Express、TypeScript 和 Prisma 构建，提供完整的 RESTful API 和 WebSocket 实时通信功能。

## 核心特性

- 🔐 **认证系统**：支持邮箱密码、手机验证码（阿里云 SMS）登录，JWT 鉴权
- 📝 **需求/服务广场**：完整的 CRUD 接口，支持分页、分类、状态筛选和全文搜索
- 🧠 **智能匹配引擎**：基于标签重合度、预算区间和多维度加权评分的推荐算法
- 💬 **实时聊天**：基于 Socket.io 的实时双向通信，支持消息持久化、未读计数和已读回执
- 🤝 **合作确认**：完整的业务流转状态机（发布 -> 匹配 -> 沟通 -> 确认合作）
- 🔗 **分享模块**：支持生成和解析有时效性的分享链接

## 技术栈

- **框架**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL + Prisma ORM
- **实时通信**: Socket.io
- **数据校验**: Zod
- **认证**: JWT + bcryptjs

## 本地开发

### 1. 环境准备

- Node.js (v18+)
- PostgreSQL 数据库

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

复制 `.env.example` 为 `.env` 并填入实际配置：

```bash
cp .env.example .env
```

核心配置项：
- `DATABASE_URL`: PostgreSQL 连接字符串
- `JWT_SECRET`: JWT 签名密钥
- `ALIYUN_ACCESS_KEY_ID`: 阿里云 AccessKey（可选，不填则短信验证码固定为 123456）

### 4. 数据库初始化

```bash
# 生成 Prisma Client
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name init

# 注入测试数据（包含6个用户、8个需求、8个服务和部分匹配记录）
npx prisma db seed
```

### 5. 启动服务

```bash
# 开发模式（热重载）
pnpm dev

# 生产模式编译
pnpm build
pnpm start
```

## 部署指南 (推荐 Render.com)

本项目已配置好完整的部署文件，推荐使用 Render.com 进行一键部署，每月可享受免费额度。

### 步骤 1：准备数据库

1. 推荐在 [Neon.tech](https://neon.tech/) 或 [Supabase](https://supabase.com/) 注册免费的 PostgreSQL 数据库
2. 获取数据库连接字符串（形如 `postgresql://user:password@host/dbname`）

### 步骤 2：连接 GitHub

1. 将本项目推送到您自己的 GitHub 仓库
2. 注册并登录 [Render.com](https://render.com/)

### 步骤 3：一键部署

1. 在 Render Dashboard 中点击 **New -> Blueprint**
2. 连接您的 GitHub 仓库
3. Render 会自动读取仓库中的 `render.yaml` 配置文件并创建 Web Service 和关联的 Database
4. 在 Render 控制台的环境变量设置中，填入您的真实 `DATABASE_URL` 和 `JWT_SECRET`
5. 等待构建完成，您的服务即上线成功！

> 提示：如果使用 Render 自动创建的数据库，它会在 90 天后过期（免费版限制），建议使用外部的 Neon 数据库并在环境变量中指定。

### 备选方案：Railway 部署

本项目同样包含 `railway.toml`，您也可以在 [Railway.app](https://railway.app/) 连接 GitHub 仓库进行一键部署。

## 目录结构

```
src/
├── config/         # 环境变量与配置
├── middleware/     # Express 中间件 (Auth, ErrorHandler)
├── routes/         # API 路由
│   ├── auth.ts     # 登录注册
│   ├── projects.ts # 需求(Project)管理
│   ├── skills.ts   # 服务(Skill)管理
│   ├── chat.ts     # 聊天会话
│   ├── share.ts    # 分享链接
│   └── users.ts    # 个人中心
├── services/       # 核心业务逻辑
│   ├── match.ts    # 匹配引擎
│   ├── sms.ts      # 短信服务
│   └── socket.ts   # WebSocket
├── utils/          # 工具函数
│   ├── jwt.ts
│   └── prisma.ts
└── index.ts        # 应用入口
```

## API 接口规范

所有接口返回格式统一为：

```json
{
  "success": true,
  "data": { ... }, // 成功时返回
  "message": "错误信息" // 失败时返回
}
```

详细接口文档请参考代码中的路由定义或使用 Postman/Apifox 进行调试。
