# BookMeBadminton 🏸

> A high-performance, single-platform badminton court booking and matchmaking application built with Next.js App Router, React 19, TypeScript, Tailwind CSS, Prisma ORM, and PostgreSQL.

---

## 🚀 Tech Stack

* **Framework**: Next.js (App Router, Turbopack)
* **Frontend**: React 19, Tailwind CSS, Motion (framer-motion v13), Lucide React
* **Backend**: Next.js Route Handlers, Advisory Locks for Concurrency
* **Database & ORM**: PostgreSQL, Prisma ORM
* **Testing & Scripts**: `tsx` test runners, shell backup/recovery scripts
* **PWA & Offline**: Web App Manifest, Service Worker (`sw.js`), Offline Fallback

---

## 📂 Project Structure

```text
Bookmebad/
├── app/                       # Next.js App Router (pages, layouts, routes)
│   ├── (public pages)         # /, /bookings, /courts/[id], /favorites, /players
│   ├── friendly-matches/      # Community match discovery and creation
│   ├── leaderboards/          # Competitive player rankings and stats
│   ├── notifications/         # User notification center & preferences
│   ├── offline/               # PWA offline fallback page
│   ├── owner/                 # Court owner management dashboard
│   ├── admin/                 # Platform administration & moderation
│   ├── api/                   # Serverless route handlers & business endpoints
│   ├── globals.css            # Global CSS and design tokens
│   └── manifest.ts            # Dynamic PWA Web App Manifest
├── components/                # Reusable React components
│   ├── admin/                 # Admin dashboard tabs & sections
│   ├── owner/                 # Owner analytics, bookings & court controls
│   ├── ui/                    # Base UI primitives (dialog, sheet, calendar, etc.)
│   └── (shared modals)        # LoginModal, CalendarModal, PaymentQRModal, Navbar
├── context/                   # Global React state management (AppContext.tsx)
├── docs/                      # Operational documentation and runbooks
│   ├── DATABASE_BACKUP_AND_RECOVERY.md
│   └── STAGING_AND_RELEASE_CHECKLIST.md
├── hooks/                     # Reusable React hooks
│   ├── useNetworkStatus.ts    # Online/offline network detection
│   └── useUnreadNotifications.ts # Unread count polling & event subscriptions
├── lib/                       # Core domain engines and utility services
│   ├── admin-service.ts       # Moderation, user controls & audit logging
│   ├── auth.ts                # Server-side user & role verification
│   ├── booking-engine.ts      # Concurrency-safe slot booking & pricing
│   ├── env-config.ts          # Server environment validation
│   ├── invitation-service.ts  # Friendly match invitations
│   ├── leaderboard-engine.ts  # Leaderboard calculations & periods
│   ├── logger.ts              # Redacted structured logger
│   ├── match-engine.ts        # Match creation, joining & state machine
│   ├── match-result-service.ts# Match scores, confirmation & disputes
│   ├── matchmaking-engine.ts  # Player compatibility scoring & recommendations
│   ├── notification-service.ts# In-app notifications & preferences
│   ├── owner-analytics.ts     # Revenue, court utilization & peak hours
│   ├── player-review-service.ts# Player ratings & community reviews
│   ├── player-statistics.ts   # Player win rates & match history
│   ├── prisma.ts              # Prisma Client singleton
│   ├── reminder-service.ts    # Cron reminder notification job
│   └── utils.ts               # Class name utility (cn)
├── prisma/                    # Database schema and migration history
│   ├── migrations/            # Ordered PostgreSQL migration history
│   ├── schema.prisma          # Database models, relations and enums
│   └── seed.ts                # Minimal database seeding script
├── public/                    # Static assets served at web root
│   ├── court_image/           # High-resolution court and equipment photography
│   ├── icons/                 # PWA icons (192x192, 512x512, maskable, badge)
│   ├── images/                # Hero illustrations and branding elements
│   ├── logo.png               # Main platform logo
│   └── sw.js                  # Service Worker for PWA caching & offline support
├── scripts/                   # Maintenance and automation scripts
│   ├── backup-db.sh           # Automated PostgreSQL backup script
│   ├── restore-db.sh          # Safe PostgreSQL restore script with confirmation
│   ├── generate-pwa-icons.js  # PWA icon generator using Sharp
│   └── seed-data.ts           # Comprehensive demo & fixture database seeder
├── tests/                     # Automated test suites
│   ├── booking-flow.test.ts
│   ├── matches-flow.test.ts
│   ├── matchmaking-flow.test.ts
│   ├── notifications-flow.test.ts
│   ├── statistics-and-ratings.test.ts
│   ├── owner-analytics.test.ts
│   ├── admin-platform.test.ts
│   ├── mobile-pwa-flow.test.ts
│   ├── e2e-quality-assurance.test.ts
│   └── production-deployment.test.ts
├── types/                     # Shared TypeScript domain definitions
│   └── index.ts               # Core domain interfaces and types
├── Dockerfile                 # Production container image specification
├── vercel.json                # Vercel deployment & cron job configuration
└── package.json               # Project manifest, dependencies, and scripts
```

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js 20+
- PostgreSQL 15+ database

### 2. Installation
```bash
npm install
```

### 3. Environment Setup
Copy the example environment configuration and update with your PostgreSQL credentials:
```bash
cp .env.example .env
```

### 4. Database Initialization
```bash
# Generate Prisma Client
npx prisma generate

# Apply migrations
npx prisma migrate deploy

# Seed initial database records
npm run db:seed
# Or run comprehensive fixtures:
npx tsx scripts/seed-data.ts
```

### 5. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

Run the full automated test suite:
```bash
npm run test
```

Run TypeScript and lint checks:
```bash
npx tsc --noEmit
npm run lint
```

Build for production:
```bash
npm run build
```
