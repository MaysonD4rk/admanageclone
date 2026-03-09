# Setup Guide — AdManage

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ | LTS recommended |
| npm | 9+ | Comes with Node.js |
| PostgreSQL | 14+ | Local or via Docker |
| Docker + Compose | any | Optional — for containerized DB |

---

## Quick Start (Local Dev, no Docker)

> The app runs **without a database** using built-in mock data. Perfect for UI development.

```bash
# 1. Clone and enter the project
git clone <repo-url>
cd adManageTest

# 2. Install dependencies
cd apps/web
npm install

# 3. Generate Prisma client (required even without DB)
npx prisma generate

# 4. Start the dev server
npm run dev
```

Open **http://localhost:3000** — the app uses mock data automatically.

---

## Full Setup (with PostgreSQL)

### Option A — Local PostgreSQL (Homebrew on macOS)

```bash
# Install and start PostgreSQL
brew install postgresql@14
brew services start postgresql@14

# Create the database
psql -d postgres -c "CREATE DATABASE admanage;"

# Configure the environment
cd apps/web
echo "DATABASE_URL=postgresql://$(whoami)@localhost:5432/admanage" > .env
echo "DATABASE_URL=postgresql://$(whoami)@localhost:5432/admanage" > .env.local

# Apply the schema and seed initial data
npm run db:push
npm run db:seed

# Start the dev server
npm run dev
```

### Option B — Docker (Recommended for consistent environments)

```bash
# From the project root
docker-compose up -d   # starts PostgreSQL on port 5432

# Configure the app
cd apps/web
echo "DATABASE_URL=postgresql://admanage:admanage_secret@localhost:5432/admanage" > .env
echo "DATABASE_URL=postgresql://admanage:admanage_secret@localhost:5432/admanage" > .env.local

npm install
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

---

## Running the Full Stack with Docker (Production-like)

```bash
# Build and start everything (PostgreSQL + Next.js app)
docker-compose up --build

# The app will be available at http://localhost:3000
# PostgreSQL on port 5432
```

To stop:
```bash
docker-compose down
# To also delete the database volume:
docker-compose down -v
```

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | — (mock data used if missing) |
| `NODE_ENV` | `development` or `production` | `development` |

**Note:** Next.js reads `.env.local` for development. Prisma reads `.env`.
Both files should contain the same `DATABASE_URL`.

---

## Available Scripts

From `apps/web/`:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot-reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm test` | Run all unit tests |
| `npm run test:watch` | Watch mode for tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run db:push` | Sync Prisma schema → DB (no migration history) |
| `npm run db:migrate` | Create a named migration |
| `npm run db:seed` | Populate DB with initial data |
| `npm run db:studio` | Open Prisma Studio (visual DB browser) |

---

## Running Tests

```bash
cd apps/web

# Run all tests once
npm test

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

Test results:
```
Test Suites: 7 passed
Tests:       65 passed
```

Test files are in `apps/web/__tests__/`:
- `lib/errors.test.ts` — domain error classes
- `services/smart-assets.service.test.ts` — deduplication logic
- `services/brand-fetch.service.test.ts` — URL parsing & brand data generation
- `services/generate.service.test.ts` — image URL generation
- `components/CategoryTabs.test.tsx` — tab UI behavior
- `components/AdCard.test.tsx` — ad card render & interactions
- `components/SmartAssetsPicker.test.tsx` — async asset loading & selection

---

## Project Structure

```
adManageTest/
├── apps/
│   └── web/                  # Next.js 14 application
│       ├── app/              # Pages & API routes
│       ├── components/       # React components
│       ├── lib/              # Types, errors, services, DB
│       ├── prisma/           # Schema, seed
│       └── __tests__/        # Unit & component tests
├── docs/                     # Documentation
│   ├── setup.md              # This file
│   └── architecture-decisions.md
├── docker-compose.yml        # PostgreSQL + web service
└── package.json              # Workspace root
```

---

## Troubleshooting

**Port already in use:**
Next.js will auto-increment ports (3000 → 3001 → 3002...). Check the terminal output for the actual URL.
To kill existing instances: `pkill -f "next dev"`

**Prisma can't find DATABASE_URL:**
Prisma reads `.env`, not `.env.local`. Ensure both files exist with the same value.

**DB connection refused:**
Check if PostgreSQL is running:
```bash
pg_isready           # local
docker ps            # docker
```

**Tests fail with module not found:**
```bash
cd apps/web
npx prisma generate   # regenerates the Prisma client types
```
