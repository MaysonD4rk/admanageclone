# Architecture Decisions — AdManage

## Overview

AdManage is a **Next.js 14 SPA** (App Router) for AI-powered ad creation. It follows a
**layered architecture** within a monorepo structure:

```
adManageTest/
├── apps/web/              # Next.js application (frontend + API)
│   ├── app/               # Next.js App Router pages & API routes
│   │   ├── api/           # HTTP layer — thin route handlers
│   │   ├── page.tsx       # Home (Ad Library)
│   │   ├── projects/      # Projects list + viewer
│   │   └── products/      # Products management
│   ├── components/        # React UI components
│   │   ├── home/          # Ad grid & category tabs
│   │   ├── layout/        # Sidebar, theme
│   │   ├── modals/        # All modal dialogs
│   │   ├── projects/      # Project viewer & card
│   │   ├── products/      # Product card
│   │   ├── smart-assets/  # Smart Assets picker
│   │   └── theme/         # ThemeProvider (dark/light mode)
│   ├── lib/               # Domain layer
│   │   ├── types.ts       # Shared TypeScript interfaces (single source of truth)
│   │   ├── errors.ts      # Domain error hierarchy
│   │   ├── db.ts          # Prisma client singleton
│   │   ├── mock-data.ts   # Fallback data when DB is unavailable
│   │   └── services/      # Business logic layer
│   ├── prisma/            # Schema, migrations, seed
│   └── __tests__/         # Unit & component tests
└── docs/                  # Project documentation
```

---

## Layered Architecture

```
┌─────────────────────────────────────────┐
│           UI Layer (components/)         │  React components — pure presentation
├─────────────────────────────────────────┤
│        HTTP Layer (app/api/)            │  Thin route handlers — parse → call service → respond
├─────────────────────────────────────────┤
│       Service Layer (lib/services/)     │  Business logic, validation, deduplication
├─────────────────────────────────────────┤
│        Data Layer (lib/db.ts + Prisma)  │  Prisma ORM → PostgreSQL
└─────────────────────────────────────────┘
```

**Dependency direction:** UI → HTTP → Services → Data. No layer accesses a layer above it.

---

## Key Design Decisions

### 1. Thin API Routes (Single Responsibility)

**Before:** Routes contained business logic, DB queries, and error handling all mixed together.

**After:** Routes are thin controllers:
```typescript
// app/api/smart-assets/route.ts
export async function POST(request: NextRequest) {
  const { imageUrl, title } = await request.json()
  const asset = await saveSmartAsset({ imageUrl, title })   // delegates to service
  return NextResponse.json(asset, { status: 201 })
}
```

**Why:** Follows Single Responsibility Principle. Services are independently testable
without HTTP context.

---

### 2. Centralized Type Definitions (`lib/types.ts`)

**Before:** Every component declared its own local `interface Ad { ... }`, causing type drift.

**After:** A single `lib/types.ts` exports all domain interfaces. Components import from there.
`AdCard.tsx` re-exports `Ad` for backwards-compatibility via `export type { Ad }`.

**Why:** Single source of truth. Changing a field in one place propagates everywhere. Compiler
catches mismatches immediately.

---

### 3. Domain Error Hierarchy (`lib/errors.ts`)

```typescript
AppError (base)
├── ValidationError   → HTTP 400
├── NotFoundError     → HTTP 404
└── DuplicateAssetError → HTTP 409
```

Routes catch typed errors and map them to HTTP status codes:
```typescript
} catch (error) {
  if (error instanceof DuplicateAssetError) {
    return NextResponse.json({ error: '...' }, { status: 409 })
  }
}
```

**Why:** Avoids relying on magic strings or status codes in application logic.
Centralizes the error → HTTP mapping. Makes error handling testable.

---

### 4. Graceful DB Fallback

Every service function that hits the DB has a try/catch that falls back to mock data.
This means the app runs without a database connection (useful for demos and local dev
without Docker).

```typescript
export async function getAllProjects(): Promise<Project[]> {
  try {
    return await prisma.project.findMany({ ... })
  } catch {
    return MOCK_PROJECTS  // fallback
  }
}
```

---

## Smart Assets Implementation

Smart Assets are user-curated images saved from generated ad campaigns for reuse across
projects and products.

### Storage

Database table: `SmartAsset { id, title, imageUrl, createdAt }`

### API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/smart-assets` | List all saved assets |
| POST | `/api/smart-assets` | Save single asset or batch (`{ items: [] }`) |
| DELETE | `/api/smart-assets` | Remove an asset by id |

### Integration

- **ProjectViewer** → "Save to Smart Assets" button uses batch mode
- **RecreateModal** → Shows saved assets as reference image picker
- **AddProductModal** → Shows saved assets as selectable product images

---

## Duplicate Prevention Logic

**Strategy:** URL comparison in the service layer.

```typescript
// lib/services/smart-assets.service.ts
export async function saveSmartAsset(input: CreateSmartAssetInput): Promise<SmartAsset> {
  const existing = await findSmartAssetByUrl(input.imageUrl)
  if (existing) throw new DuplicateAssetError(existing.id)
  return prisma.smartAsset.create({ data: ... })
}
```

**Single save:** throws `DuplicateAssetError` → API returns HTTP 409.

**Batch save (`saveSmartAssetsSafe`):** never throws. Returns per-item result:
```typescript
type SmartAssetSaveResult =
  | { isDuplicate: false; asset: SmartAsset }
  | { isDuplicate: true; existingAsset: SmartAsset }
```

The UI (ProjectViewer) shows a notification: *"2 saved, 1 already in Smart Assets (skipped)"*.

**Why URL comparison?** The images are picsum.photos URLs with deterministic seeds. The same
image always produces the same URL, making URL equality a reliable identity check without
needing image hashing.

---

## Mock S3 Upload Strategy

A two-step upload flow is simulated to mirror real pre-signed S3 uploads:

```
Client                  Backend                 "S3"
  │                        │                      │
  │── POST /presigned-url ──▶                      │
  │◀── { uploadUrl, finalUrl, key } ───────────────│
  │                        │                      │
  │── PUT uploadUrl ───────────────────────────────▶
  │◀── 200 OK ─────────────────────────────────────│
  │                        │                      │
  │  use finalUrl as imageUrl                      │
```

- `POST /api/upload/presigned-url` generates a `localhost` URL and a deterministic
  `picsum.photos` final URL based on a UUID.
- `PUT /api/upload/fake-s3?key=...` accepts any request body and returns 200.
- The `finalUrl` (picsum) becomes the stored image URL.

**Why:** Demonstrates the real pre-signed URL pattern without requiring actual AWS credentials.
The flow is identical from the client's perspective.

---

## Mock Data Strategy

All services have a `try/catch` that returns `MOCK_*` data from `lib/mock-data.ts`
when the database is unavailable. This enables:

1. Development without running Docker
2. Demo deployments without a database
3. Graceful degradation in production if DB is temporarily down

---

---

## NanoBanana Integration

### Overview

NanoBanana is the AI image generation provider. It is called when a user requests a new
ad image. The integration follows the same layered architecture as the rest of the project.

```
POST /api/generate-image
        │
        ▼
generated-images.service   ← orchestration layer
        │
        ├── nanobanana.service     ← API client (pure HTTP)
        │       │
        │       └── withRetry()    ← retry utility (lib/utils/retry.ts)
        │
        ├── prisma.generatedImage  ← persistence
        │
        └── smart-assets.service  ← optional asset saving (reused, no duplication)
```

### Prompt Engineering

Every prompt is enriched with advertising context before being sent to NanoBanana.
This is handled by `buildAdPrompt()` in `nanobanana.service.ts`:

```
"Create a high-quality advertising image suitable for digital marketing and ads.
The image should be visually appealing, attention-grabbing, and optimized for
promotional use. User request: {userPrompt}"
```

This is a **pure function** — deterministic, side-effect-free, fully tested.

### Request/Response Flow

```
Client → POST /api/generate-image
  body: { userPrompt, imageUrls?, aspectRatio?, resolution?, saveToSmartAssets? }

  1. buildAdPrompt(userPrompt)          → fullPrompt
  2. buildNanoBananaRequest(fullPrompt) → NanoBananaRequest payload
  3. withRetry(() => callNanoBananaAPI(payload), retryOptions)
       └─ POST https://api.nanobananaapi.ai/api/v1/nanobanana/generate-2
          headers: { Authorization: Bearer $NANOBANANA_API_KEY }
  4. Validate: successFlag === 1 (else throw NanoBananaError)
  5. Extract: response.resultImageUrl
  6. prisma.generatedImage.create(...)  → persist metadata
  7. [optional] saveSmartAssetsSafe()   → save to Smart Assets library

Client ← { generatedImage, smartAssetId? }
```

### Async Callback

NanoBanana also supports POSTing the result to a callback URL. The endpoint
`POST /api/generate-image/callback` handles this:
- Validates the incoming payload
- Calls `upsertFromCallback()` to update the DB record
- Always returns 200 (prevents NanoBanana from retrying indefinitely)

### Retry Logic

Implemented via `lib/utils/retry.ts` — `withRetry<T>(fn, options)`:

| Option | Value | Description |
|--------|-------|-------------|
| `maxRetries` | 3 | Max additional attempts after first failure |
| `baseDelayMs` | 1000 | Delay before 1st retry (doubles each time) |
| `isRetryable` | `isTransientError` | Only retry on network/5xx errors |
| `onRetry` | console.warn | Logs each retry attempt with delay |

Back-off: 1s → 2s → 4s (exponential).

**Retryable:** `TypeError` (network), `NanoBananaError` with 5xx status, ECONNRESET/ETIMEDOUT.
**Not retryable:** 4xx HTTP errors, `NanoBananaError` with successFlag ≠ 1 (content issues).

### Error Hierarchy

```
NanoBananaError (AppError, HTTP 502)
  ├── nanoBananaErrorCode: string | null   ← from API response
  ├── taskId?: string                      ← for tracing
  └── statusCode: number                  ← HTTP status to return

Special cases:
  NETWORK_ERROR  → fetch failed before receiving response (HTTP 503)
  HTTP_5xx       → API returned 5xx (HTTP 502)
  HTTP_4xx       → API returned 4xx (HTTP 400)
  MISSING_API_KEY → env var not set (HTTP 500)
```

### Database Model

```prisma
model GeneratedImage {
  id                String   @unique (cuid)
  taskId            String   @unique       ← NanoBanana task identifier
  userPrompt        String                 ← original user input
  fullPrompt        String                 ← enriched prompt sent to API
  generatedImageUrl String                 ← result from NanoBanana
  originalImageUrl  String?                ← reference image if provided
  aspectRatio       String   default "auto"
  resolution        String   default "1K"
  savedToAssets     Boolean  default false ← whether saved to Smart Assets
  smartAssetId      String?                ← FK to SmartAsset if saved
  createdAt         DateTime
}
```

### Smart Assets Reuse

When `saveToSmartAssets: true` is passed, the service calls `saveSmartAssetsSafe()`
from `smart-assets.service.ts`. This ensures:
- No duplicate storage code
- Deduplication logic is applied (URL comparison)
- The `GeneratedImage.savedToAssets` flag is updated after successful save

### Environment Variables

| Variable | Description |
|----------|-------------|
| `NANOBANANA_API_KEY` | Bearer token for the NanoBanana API |
| `NANOBANANA_CALLBACK_URL` | Webhook URL for async task notifications |

---

## Test Architecture

```
__tests__/
├── lib/
│   └── errors.test.ts              # Error class hierarchy (pure unit)
├── services/
│   ├── smart-assets.service.test.ts  # Dedup logic (prisma mocked)
│   ├── brand-fetch.service.test.ts   # Pure URL/brand utilities
│   └── generate.service.test.ts      # Pure image URL generation
└── components/
    ├── CategoryTabs.test.tsx         # Tab rendering & click behavior
    ├── AdCard.test.tsx               # Card render & recreate callback
    └── SmartAssetsPicker.test.tsx    # Async loading, selection, empty state
```

**Principles:**
- **Service tests** mock Prisma via `__tests__/mocks/prisma.mock.ts`
- **Pure function tests** need no mocks — test input/output directly
- **Component tests** use React Testing Library + jsdom; async state via `act()`
- Each test file has a `beforeEach(resetPrismaMocks)` to ensure test isolation
