# BudgetWise

A premium personal budgeting application built with Next.js, Firebase, and AI-powered natural language processing. Offline-first, PWA-ready, and designed for mobile and desktop.

**This is proprietary software. All rights reserved. See [LICENSE](#license).**

---

## Features

### Core Financial Management
- **Transactions** — Track income, expenses, and transfers with category tagging, payment methods, and notes
- **Accounts** — Manage multiple accounts (cash, bank, mobile banking, credit card, loan) with real-time balance tracking
- **Categories** — Custom expense and income categories with emoji icons and color coding
- **Budgets** — Set weekly, monthly, or yearly spending limits per category with alert thresholds and progress tracking
- **Analytics** — Visual spending breakdowns and financial insights

### AI Assistant
- **Natural Language Commands** — Create transactions, accounts, categories, and budgets by typing or speaking plain language (e.g., "I spent 500 taka on food from cash today")
- **Voice Input** — Web Speech API integration for hands-free command entry
- **Smart Parsing** — AI-powered intent detection with fuzzy entity matching and ambiguity resolution
- **Auto-Form Population** — Parsed data automatically populates the relevant creation form for user review before submission
- **Multi-Entity Support** — Handles transactions, accounts, categories, and budgets through a single conversational interface
- **Token-Based Quota** — Per-user monthly token limits with configurable defaults, custom overrides, unlimited mode, and hard-stop enforcement
- **Usage Tracking** — Every AI request is logged with input/output tokens, model, feature, and status; monthly aggregates updated atomically
- **User Quota Visibility** — Progress bar in the assistant panel showing used/remaining tokens with warning states at 75%, 90%, and limit reached
- **FOMO Locked State** — Users without AI access see an animated preview of commands with a frosted lock overlay and a request-access CTA

### Offline-First & PWA
- **Service Worker** — Full offline support with background sync
- **Local Database** — Dexie.js (IndexedDB) for client-side persistence
- **Pull-to-Refresh** — Native-feeling refresh on mobile
- **Installable** — Add to home screen on iOS and Android
- **Cached User Session** — Works offline with cached authentication state

### Admin Panel
- **Dashboard** — Overview page with user stats (total, active 7d/30d, AI-enabled), role breakdown, AI token usage summary, and OpenAI cross-check
- **User Management** — Paginated user list with search, AI status filters, date range filters, sorting, and bulk AI toggle
- **Per-User Controls** — Click any user to open a detail modal with AI config (enable/disable, custom token limit, unlimited mode, hard stop) and usage stats
- **Role Management** — Superadmins can assign roles (superadmin, admin, manager, user) from the user detail modal
- **Global AI Settings** — Collapsible panel on the dashboard to configure default monthly token limit, hard stop, and manual OpenAI reported tokens for cross-checking
- **Tab Navigation** — Overview and Users tabs across the admin section

### Role-Based Access Control
- **Superadmin** — Full access including role management; bootstrapped by setting `role: "superadmin"` in Firestore
- **Admin** — Full access to admin panel and all settings
- **Manager** — Can view admin pages and manage user AI access
- **User** — Regular user (default); no admin access
- All roles are stored in Firestore (`users/{email}.role`) — no environment variable dependency

### Design & UX
- **Glassmorphism UI** — Frosted glass cards, gradient accents, and grain texture overlay
- **Dark Mode** — Full dark theme with CSS variable-driven color system
- **Responsive Layout** — Bottom nav + FAB on mobile, sidebar on desktop
- **Framer Motion Animations** — Spring-physics panel transitions, staggered reveals, and micro-interactions
- **Typography** — Syne (display) + Outfit (body) font pairing

### Authentication & Security
- **Google OAuth** — NextAuth v5 with JWT session strategy
- **User Profile Storage** — Name, email, and avatar stored in Firestore on every sign-in
- **Server-Side Route Protection** — Auth checks at layout level with redirect to login
- **API-Level Gating** — AI endpoints verify authentication, per-user access flags, and token quota before processing

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) |
| Auth | NextAuth v5 (Google OAuth) |
| Database | Firebase Firestore (server) + Dexie.js (client) |
| AI Parser | OpenAI API (configurable model) |
| Styling | Tailwind CSS + custom design system |
| Animation | Framer Motion |
| State | Zustand |
| Deployment | Vercel |

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# OpenAI (AI Assistant)
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-nano
```

---

## Admin Setup

There is no admin email environment variable. Roles are managed entirely in Firestore:

1. Sign in to the app with your Google account
2. In the Firebase Console, find your user document at `users/{your-email}`
3. Add a field: `role` with value `"superadmin"`
4. Refresh the app — you'll see the Admin link in the sidebar
5. Use the admin UI to promote other users to admin or manager

---

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deployment

Recommended: **Vercel** (free hobby tier).

1. Push to GitHub, import into Vercel
2. Add all environment variables from `.env.example`
3. Add your production OAuth callback URL in Google Cloud Console:
   `https://<your-domain>/api/auth/callback/google`
4. Every push to `main` auto-deploys

---

## License

Copyright (c) 2025 BudgetWise. All rights reserved.

This software is proprietary and confidential. No part of this software may be reproduced, distributed, or transmitted in any form or by any means without the prior written permission of the author. Unauthorized copying, modification, or distribution of this software is strictly prohibited.
