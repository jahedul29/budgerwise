# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test:e2e     # Playwright E2E tests (starts dev server with E2E_AUTH_BYPASS=1)
npm run test:e2e:ui  # Playwright with interactive UI
npx playwright test tests/e2e/auth-routing.spec.ts  # Run a single E2E test file
```

## Architecture

**Full-stack Next.js 14 PWA** (App Router) with offline-first data strategy.

### Data Layer (Dual Database)

- **Client**: Dexie.js (IndexedDB) — all CRUD happens locally first for instant UI
- **Server**: Firebase Firestore — source of truth, synced via pull-to-refresh + background sync
- **Sync**: `lib/sync-engine.ts` pushes pending local changes, then pulls latest. Records use `_syncStatus` field (`synced | pending_create | pending_update | pending_delete`)
- **Collections**: `users/{email}`, `transactions/{userId}/**`, `categories/{userId}/**`, `budgets/{userId}/**`, `accounts/{userId}/**`

### Auth

- NextAuth v5 (beta.25) with Google OAuth provider
- JWT session strategy; user ID stored in token
- Config: `lib/auth.config.ts` + `lib/auth.ts`
- Route protection: server-side `auth()` call in `app/(app)/layout.tsx`
- E2E bypass: cookie `bw_e2e_auth` when `E2E_AUTH_BYPASS=1`
- Roles: `superadmin | admin | manager | user` (stored in Firestore `users/{email}.role`)

### State Management

- **Zustand stores**: `store/transactionStore.ts` (transactions + filters), `store/uiStore.ts` (sync status, assistant drafts, UI state)
- **Hooks**: `useStableUser` (cached user for offline), `useOnlineStatus`, `useSync`, `useTransactions`, `useCategories`, `useAccounts`, `useBudgets`, `useCurrency`, `useUserRole`

### Route Structure

- `app/(app)/` — Protected routes (dashboard, transactions, budgets, analytics, more, admin)
- `app/(auth)/` — Public routes (login)
- `app/api/` — API routes (auth, assistant, admin, sync, preferences, accounts, transactions)

### AI Assistant

- OpenAI integration (`lib/assistant/openai-parser.ts`) with configurable model (env `OPENAI_MODEL`, defaults to `gpt-5-nano`)
- Flow: user input → `/api/assistant/parse` → intent extraction → UI form pre-fill → `/api/assistant/execute`
- Token usage tracked per-user with monthly quotas and trial system (`lib/ai-usage.ts`)

### UI

- Tailwind CSS 3 with custom design tokens (green primary `#06D6A0`, blue accent `#118AB2`, navy surfaces)
- Radix UI primitives (shadcn-style) in `components/ui/`
- Dark/light mode via `next-themes` with CSS variables
- Fonts: Syne (display), Outfit (body)
- Glassmorphism, custom animations (slide-up, fade-in, shimmer, gradient-shift)

### PWA

- `next-pwa` generates service worker at `public/sw.js`
- Manifest at `public/manifest.json`
- Offline-capable with local DB fallback

## Key Conventions

- Path alias: `@/*` maps to project root
- All types in `types/index.ts`; validation schemas in `lib/validations.ts`
- Client components marked with `'use client'`; server components are async
- Dates handled with `date-fns` v4
- Node 20.x required

## Environment Variables

Firebase (`NEXT_PUBLIC_FIREBASE_*` for client, `FIREBASE_*` for admin), `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `OPENAI_API_KEY`, `OPENAI_MODEL`
