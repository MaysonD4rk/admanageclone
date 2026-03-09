<div align="center">

# ⚡ AdManage

**AI-powered ad creation platform — generate, manage, and reuse ads at scale.**

[![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io)
[![Tests](https://img.shields.io/badge/Tests-104%20passing-22c55e?style=flat-square&logo=jest)](./apps/web/__tests__)

</div>

---

## What is AdManage?

AdManage is a **full-stack SPA** that lets you generate, manage, and reuse AI-powered advertising images. It integrates with the **NanoBanana AI** image generation API to produce high-quality ad creatives, stores them in a Smart Assets library, and organizes everything into projects and products.

---

## Features

| Module | Description |
|---|---|
| **Ad Library** | Browse a curated library of ads filterable by category (Sale, Beauty, Health, Food…) |
| **AI Image Generation** | Generate ad images via NanoBanana with advertising-optimized prompts |
| **Smart Assets** | Save generated images to a reusable library with automatic duplicate prevention |
| **Projects** | Each generation creates a project with 4 image variations; select, download, or save to Smart Assets |
| **Products** | Create product/brand profiles with descriptions, USPs, and asset collections |
| **Brand Fetch** | Paste a product URL (Amazon, Shopify…) to extract brand colors, logo, and images automatically |
| **Dark / Light Mode** | Full dark mode support with instant toggle — persisted across sessions |

---

## Tech Stack

```
├── Framework      Next.js 14 (App Router)
├── Language       TypeScript 5 — strict mode
├── Styling        Tailwind CSS 3 — dark mode via class strategy
├── Database       PostgreSQL via Prisma ORM
├── AI Provider    NanoBanana API (image generation)
├── Storage        Mock S3 pre-signed URL flow (swappable with real S3)
├── Testing        Jest 29 + React Testing Library
└── Infra          Docker + docker-compose
```

---

## Architecture

The project follows a **layered architecture** with clear separation of concerns:

```
┌──────────────────────────────────────────────┐
│           UI Layer  (components/)             │  React — pure presentation
├──────────────────────────────────────────────┤
│        HTTP Layer  (app/api/)                │  Thin route handlers
├──────────────────────────────────────────────┤
│      Service Layer  (lib/services/)          │  Business logic + orchestration
├──────────────────────────────────────────────┤
│       Data Layer  (Prisma + PostgreSQL)      │  Persistence
└──────────────────────────────────────────────┘
```

Key design decisions:
- **Single source of truth** for types — `lib/types.ts`
- **Typed error hierarchy** — `AppError → ValidationError | NotFoundError | DuplicateAssetError | NanoBananaError`
- **Graceful DB fallback** — app runs with mock data when the DB is unavailable
- **Retry with exponential back-off** — 3 retries (1s → 2s → 4s) for transient NanoBanana failures
- **URL-based dedup** — Smart Assets prevents saving the same image twice

> See [`docs/architecture-decisions.md`](./docs/architecture-decisions.md) for the full breakdown.

---

## Quick Start

### Without Docker (mock data, no DB needed)

```bash
git clone https://github.com/MaysonD4rk/admanageclone.git
cd admanageclone/apps/web
npm install
npx prisma generate
npm run dev
```

Open **http://localhost:3000** — the app works immediately with built-in mock data.

### With PostgreSQL (full persistence)

```bash
# Copy and fill in your env vars
cp apps/web/.env.example apps/web/.env
cp apps/web/.env.example apps/web/.env.local

# Start the database
docker-compose up -d

# Apply schema and seed initial data
npm run db:push
npm run db:seed

# Start the app
npm run dev
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | No* | PostgreSQL connection string — uses mock data if missing |
| `NANOBANANA_API_KEY` | Yes | Bearer token for AI image generation |
| `NANOBANANA_CALLBACK_URL` | No | Webhook URL for async task notifications |

*The app degrades gracefully without a DB connection.

---

## Available Scripts

Run from `apps/web/`:

```bash
npm run dev              # Start dev server
npm run build            # Production build
npm test                 # Run all 104 tests
npm run test:coverage    # Tests with coverage report
npm run db:push          # Sync schema → DB
npm run db:seed          # Populate with sample data
npm run db:studio        # Open Prisma Studio
```

---

## NanoBanana Integration

Every user prompt is automatically enriched with advertising context before being sent:

```
"Create a high-quality advertising image suitable for digital marketing
and ads... User request: {your prompt}"
```

The generation endpoint (`POST /api/generate-image`) returns a `GeneratedImage` record with the result URL, task ID, and metadata. Failures are classified as retryable (network, 5xx) or permanent (4xx, content violations) and handled accordingly.

---

## Tests

```
Test Suites  10
Tests        104 passing
```

```
__tests__/
├── lib/errors.test.ts                       Domain error hierarchy
├── utils/retry.test.ts                      Exponential back-off logic
├── services/
│   ├── smart-assets.service.test.ts         Deduplication logic
│   ├── brand-fetch.service.test.ts          URL parsing & brand data
│   ├── generate.service.test.ts             Image URL generation
│   ├── nanobanana.service.test.ts           API client, prompt building
│   └── generated-images.service.test.ts    Orchestration, DB fallback
└── components/
    ├── CategoryTabs.test.tsx                Tab rendering & click
    ├── AdCard.test.tsx                      Card render & callbacks
    └── SmartAssetsPicker.test.tsx           Async loading, selection
```

---

## Project Structure

```
adManageTest/
├── apps/web/
│   ├── app/                  Pages + API routes (thin controllers)
│   ├── components/           React UI components
│   ├── lib/
│   │   ├── types.ts          Shared TypeScript interfaces
│   │   ├── errors.ts         Domain error classes
│   │   ├── services/         Business logic layer
│   │   └── utils/            Generic utilities (retry)
│   ├── prisma/               Schema, migrations, seed
│   └── __tests__/            Unit & component tests
├── docs/
│   ├── architecture-decisions.md
│   └── setup.md
├── docker-compose.yml
└── .gitignore
```

---

## Docs

- [Architecture Decisions](./docs/architecture-decisions.md) — layers, patterns, Smart Assets, NanoBanana, mock S3
- [Setup Guide](./docs/setup.md) — local dev, Docker, env vars, troubleshooting

---

<div align="center">
  <sub>Built with Next.js 14 · TypeScript · Tailwind · Prisma · NanoBanana AI</sub>
</div>
