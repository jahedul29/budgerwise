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
- **Admin-Gated Access** — AI features are toggled per-user by an admin

### Offline-First & PWA
- **Service Worker** — Full offline support with background sync
- **Local Database** — Dexie.js (IndexedDB) for client-side persistence
- **Pull-to-Refresh** — Native-feeling refresh on mobile
- **Installable** — Add to home screen on iOS and Android
- **Cached User Session** — Works offline with cached authentication state

### Admin Panel
- **User Management** — View all registered users with profile details, join date, and last login
- **AI Access Control** — Enable or disable AI assistant access per user
- **Search** — Filter users by name or email
- **Admin-Only Access** — Protected by environment variable email matching on both client and server

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
- **API-Level Gating** — AI endpoints verify both authentication and per-user access flags

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

# Admin
NEXT_PUBLIC_ADMIN_EMAIL=
```

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
