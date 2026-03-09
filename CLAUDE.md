# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Run all Vitest tests (single pass)
npm run test:watch   # Vitest in watch mode
```

To run a single test file:
```bash
npx vitest run tests/SearchForm.test.tsx
```

## Project Overview

Dallas Real Estate Market Analyzer — UT Dallas UTDesign Capstone Spring 2026. Users enter a Dallas zipcode + bedroom count and get a historical ZHVI chart, 1-month price prediction (XGBoost), and direction confidence signal (Logistic Regression). Frontend on Vercel (Next.js), backend on Modal (serverless Python).

**Current state:** Phase 1 (frontend shell) complete. All data is mocked. Phase 2 (Modal ML backend) is in progress. Phase 3 will wire the Next.js API routes to live Modal endpoints.

## Architecture

**Next.js App Router** with Server Components by default; client boundaries isolated to interactive/chart components.

```
app/
  layout.tsx                    # Root layout with NavBar
  page.tsx                      # Landing page (Server Component)
  about/page.tsx                # About page
  dashboard/[zipcode]/page.tsx  # Dashboard (Server Component, fetches both API routes)
  api/
    predict/route.ts            # POST stub → Phase 3: proxy to Modal MODAL_PREDICT_URL
    history/route.ts            # POST stub → Phase 3: proxy to Modal MODAL_HISTORY_URL

components/
  NavBar.tsx                    # Server
  SearchForm.tsx                # Client — form validation + navigation
  DashboardHeader.tsx           # Server
  ForecastCallout.tsx           # Server
  PriceChart.tsx                # Client — Recharts LineChart
  ConfidenceGauge.tsx           # Client — Recharts pie gauge
  BedroomCards.tsx              # Server (no hooks/browser APIs needed)

lib/
  types.ts                      # Shared TS interfaces (HistoryPoint, PredictionResult, etc.)
  mock-data.ts                  # MOCK_PREDICTION, MOCK_HISTORY — replace in Phase 3
  dallas-zipcodes.json          # 113 validated Dallas zipcodes for SearchForm validation

tests/                          # Vitest + React Testing Library
.planning/                      # PROJECT.md, STATE.md, ROADMAP.md, per-phase plans
```

**Data flow:** SearchForm validates zipcode → navigates to `/dashboard/[zipcode]?bedrooms=N` → dashboard Server Component calls both API routes → renders all 5 sections.

## Key Constraints (do not change)

- **Stack is locked:** Next.js/TypeScript/Tailwind/Recharts on frontend; Modal/Python/XGBoost/scikit-learn on backend
- **14 ML features are locked** — leakage investigation complete, do not add features
- **Zipcode scope:** 113 curated Dallas zipcodes for frontend; model trains on 255
- **Prediction horizon:** 1 month ahead only
- **Data source:** Zillow ZHVI CSVs only; no external APIs, no database

## Important Patterns

- **Tailwind v4**: Config lives in `app/globals.css` (not `tailwind.config.ts`). Custom animation `animate-shake` is defined there.
- **Vitest + Recharts jsdom**: Tests require `class MockResizeObserver` + `getBoundingClientRect` spy. `vi.fn()` cannot be used as a constructor in Vitest 4.x — use a class.
- **API route stubs**: Each stub contains commented Phase 3 replacement code. Keep the comments when modifying.
- **YoY change**: Computed in the dashboard page from history array indices (no separate API field).
- **SearchForm validation**: Uses inline error text + `animate-shake`. No toasts. Shake resets after 400ms by toggling a CSS class.
