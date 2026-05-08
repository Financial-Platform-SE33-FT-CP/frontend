# Accounting Platform — Frontend

Next.js 15 frontend for the multi-tenant accounting platform.

## Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: React 19 + Tailwind CSS v4 + shadcn/ui
- **Language**: TypeScript (strict)

## Getting Started

```bash
npm install
npm run dev        # http://localhost:3000
```

## Project Structure

```
src/
├── app/                         # Next.js App Router
│   ├── layout.tsx               # Root layout (Inter font, metadata)
│   ├── page.tsx                  # Landing page
│   ├── (auth)/                   # Auth route group
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (dashboard)/              # Dashboard route group
│       ├── layout.tsx            # Sidebar + header layout
│       ├── tenants/page.tsx      # Tenant management
│       └── coa/page.tsx          # Chart of Accounts
├── components/ui/                # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   └── input.tsx
└── lib/
    ├── api.ts                    # Fetch client (JWT + tenant headers)
    ├── auth.ts                   # Token management (localStorage)
    └── utils.ts                  # cn() classname helper
```

## Build

```bash
npm run build
npm start
```

Standalone output for Docker (`next.config.ts`: `output: "standalone"`).
