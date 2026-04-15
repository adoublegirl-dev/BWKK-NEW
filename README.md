# BWKK-NEW - 帮我看看 众包互助平台

基于地理位置的众包互助社区，支持用户发布任务、接单完成任务、积分奖励与信用体系。

## 项目结构

```
├── server/          # 后端服务 (Express + Prisma + SQLite)
├── h5/              # 用户端 H5 前端 (Vue3 + Vant4 + Pinia)
├── admin/           # 管理后台前端 (Vue3 + Element Plus + Pinia)
└── miniprogram/     # 微信小程序端（预留）
```

## 技术栈

| 模块 | 技术 | 端口 |
|------|------|------|
| 后端 API | Express + Prisma + SQLite + Resend | 5090 |
| 用户端 H5 | Vue3 + Vant4 + Pinia + Vite | 5173 |
| 管理后台 | Vue3 + Element Plus + Pinia + Vite | 5172 |
| 微信小程序 | 原生开发 | - |

## 快速开始

### 后端

```bash
cd server
cp .env.example .env   # 配置环境变量
npm install
npx prisma migrate dev
npm run dev            # 开发模式，端口 5090
```

### 用户端 H5

```bash
cd h5
npm install
npm run dev            # 开发模式，端口 5173
```

### 管理后台

```bash
cd admin
npm install
npm run dev            # 开发模式，端口 5172
# 默认账号：admin / admin123
```

## 部署

部署架构：Express 托管 H5 + Admin 静态文件 + API，共用端口 5090。

```bash
# 构建 H5
cd h5 && npm run build
# 构建 Admin
cd admin && npm run build

# 将构建产物上传到服务器
# H5 → /root/BWKK/h5/
# Admin → /root/BWKK/admin/
```

## 功能模块

- **用户系统**：微信/邮箱注册登录，积分体系，信用评分
- **任务发布**：发布悬赏任务，设置截止时间和奖励
- **接单系统**：接单、提交完成、选稿、信用变动
- **积分支付**：冻结/解冻/赚取/消费/退款/补偿
- **管理后台**：用户管理、帖子管理、订单管理、交易记录、信用记录、操作日志
