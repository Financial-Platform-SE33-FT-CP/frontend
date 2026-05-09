# Repository Guidelines

## Project Overview

Accounting Platform frontend — a Next.js 15 application (React 19, TypeScript strict) providing the web UI for the multi-tenant accounting platform. Features login/registration, tenant management dashboard, and chart of accounts views. Uses shadcn/ui components with Tailwind CSS v4 theming.

## Architecture & Data Flow

```
Browser
  → Next.js App Router (server components by default)
    → Client components ('use client') for interactive pages
      → lib/api.ts (fetch wrapper)
        → Authorization: Bearer <JWT>
        → X-Tenant-ID: <tenant_id>
      → Backend (via Nginx reverse proxy)
```

### Route Groups

```
src/app/
├── (auth)/              # Auth route group (unauthenticated)
│   ├── login/           # 'use client' — email + password form
│   └── register/        # 'use client' — name + email + password form
├── (dashboard)/         # Dashboard route group (authenticated)
│   ├── layout.tsx       # 'use client' — sidebar nav + header
│   ├── tenants/         # Server component — tenant list placeholder
│   └── coa/             # Server component — COA placeholder
├── layout.tsx           # Root layout (server component) — Inter font, metadata
└── page.tsx             # Landing page (server component) — hero + links
```

### Auth Flow

1. User credentials submitted via client component form
2. Auth handlers call `api.post('/auth/login', ...)` or `api.post('/auth/register', ...)`
3. On success, JWT stored via `setToken()` in localStorage
4. Tenant selection stored via `setTenantId()` in localStorage
5. `api.ts` reads both on every request, injecting `Authorization` and `X-Tenant-ID` headers
6. `isAuthenticated()` checks `typeof window !== 'undefined' && !!localStorage.getItem('auth_token')`

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `src/app/` | Next.js App Router pages and layouts |
| `src/app/(auth)/` | Login and registration pages (client components) |
| `src/app/(dashboard)/` | Authenticated dashboard pages |
| `src/components/ui/` | shadcn/ui primitives (Button, Card, Input) |
| `src/lib/` | API client, auth helpers, utility functions |

## Development Commands

```bash
npm install              # Install dependencies
npm run dev              # Dev server on http://localhost:3000
npm run build            # Production build
npm start                # Start production server
npm run lint             # ESLint
```

## Code Conventions & Common Patterns

### Client vs Server Components

- **Server components** (default): `layout.tsx`, `page.tsx` for static content (landing page, dashboard placeholders)
- **Client components** (explicit `'use client'` directive): login, register forms, dashboard layout (needs `usePathname`)

### Component Patterns (shadcn/ui)

```tsx
// Button — cva for variants
import { cva, type VariantProps } from "class-variance-authority";
const buttonVariants = cva("base-classes", {
  variants: { variant: {...}, size: {...} },
  defaultVariants: { variant: "default", size: "default" },
});

// All components: forwardRef + cn() + displayName
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => { ... }
);
Button.displayName = "Button";
```

### cn() Utility

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

Always use `cn()` for className composition — it handles Tailwind conflict resolution.

### API Client Pattern

```typescript
// src/lib/api.ts
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function request<T>(method: string, path: string, options?: {...}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const tenantId = getTenantId();
  if (tenantId) headers["X-Tenant-ID"] = tenantId;
  // ... fetch with error handling
}

export const api = {
  get: <T>(path: string, params?: Record<string, string>) => ...,
  post: <T>(path: string, body?: unknown) => ...,
  patch: <T>(path: string, body?: unknown) => ...,
  delete: <T>(path: string) => ...,
};
```

### Auth Helpers

```typescript
// src/lib/auth.ts
// All functions guard against SSR: typeof window !== "undefined"
export function getToken(): string | null { ... }
export function setToken(token: string): void { ... }
export function removeToken(): void { ... }
export function getTenantId(): string | null { ... }
export function setTenantId(id: string): void { ... }
export function isAuthenticated(): boolean { ... }
```

### Styling

- Tailwind CSS v4 with `@import "tailwindcss"` in `globals.css`
- Design tokens defined via `@theme` block (shadcn/ui light theme)
- Inter font via `next/font/google` with CSS variable `--font-inter`
- Form pattern: `w-full max-w-md mx-auto` centered card

## Important Files

| File | Role |
|------|------|
| `frontend/package.json` | Dependencies and scripts |
| `frontend/next.config.ts` | `output: "standalone"` for Docker |
| `frontend/tsconfig.json` | Strict mode, `@/*` path alias |
| `frontend/src/app/layout.tsx` | Root layout, Inter font, metadata |
| `frontend/src/app/(dashboard)/layout.tsx` | Sidebar + header, active link detection |
| `frontend/src/lib/api.ts` | Fetch client with JWT + tenant header injection |
| `frontend/src/lib/auth.ts` | localStorage token management |
| `frontend/src/lib/utils.ts` | `cn()` classname utility |
| `frontend/src/components/ui/button.tsx` | cva-based Button with variants |
| `frontend/src/components/ui/card.tsx` | Card compound component |
| `frontend/src/components/ui/input.tsx` | Styled input with forwardRef |

## Runtime/Tooling Preferences

- **Runtime**: Node.js 22 (Docker), local dev with any Node >=18
- **Package manager**: npm
- **TypeScript**: strict mode, ES2022 target, bundler module resolution
- **Styling**: Tailwind CSS v4, PostCSS
- **Lint**: ESLint with `eslint-config-next`
- **Container**: Multi-stage Dockerfile, standalone Next.js output
