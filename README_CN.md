# 会计平台 — 前端

基于 Next.js 15 的多租户会计平台前端应用。

## 技术栈

- **框架**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS v4 + shadcn/ui
- **语言**: TypeScript (strict 模式)

## 快速开始

```bash
npm install
npm run dev        # http://localhost:3000
```

## 目录结构

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # 根布局（Inter 字体、元数据）
│   ├── page.tsx                  # 首页
│   ├── (auth)/                   # 认证路由组
│   │   ├── login/page.tsx        # 登录页
│   │   └── register/page.tsx     # 注册页
│   └── (dashboard)/              # 控制台路由组
│       ├── layout.tsx            # 侧边栏 + 顶栏布局
│       ├── tenants/page.tsx      # 租户管理
│       └── coa/page.tsx          # 科目表管理
├── components/ui/                # shadcn/ui 基础组件
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
└── lib/
    ├── api.ts                    # 请求客户端（自动附带 JWT 和租户头）
    ├── auth.ts                   # Token 管理（localStorage）
    └── utils.ts                  # cn() 样式合并工具
```

## 构建

```bash
npm run build
npm start
```

Docker 部署采用 standalone 输出模式（`next.config.ts`: `output: "standalone"`）。
