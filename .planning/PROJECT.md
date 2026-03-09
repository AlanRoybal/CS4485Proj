# Real Estate Market Analyzer

## What This Is

A web app for Dallas-area homebuyers and sellers: enter a zipcode and bedroom count, get a historical home value chart, a 1-month-ahead price prediction (XGBoost regressor), and a directional confidence signal (Logistic Regression). Built as a UT Dallas UTDesign Capstone project (Spring 2026, Advisor: Muhammad Ikram). Frontend on Vercel (Next.js), backend on Modal (serverless Python + ML).

## Core Value

A user enters one Dallas zipcode and gets a clear, data-backed answer: what prices have done and where they're likely heading next month.

## Requirements

### Validated

- ✓ Raw Zillow ZHVI data cleaned and merged — existing
- ✓ Feature engineering pipeline complete (14 leakage-free features) — existing
- ✓ Train/test CSVs on Modal Volume (`/mnt/real-estate-data/data/`) — existing
- ✓ Logistic Regression baseline trained (75.82% acc, 0.8231 AUC) and saved to Volume — existing

### Active

**Backend (Modal)**
- [ ] XGBoost regressor trained on 14 features, beats baseline, saved to Volume
- [ ] Prediction endpoint (`predict.py`) deployed — accepts zipcode + bedrooms, returns price prediction + direction + confidence
- [ ] History endpoint (`history.py`) deployed — returns last 5 years of ZHVI for a zipcode/bedroom combo

**Frontend (Next.js)**
- [ ] Landing page with zipcode input + bedroom selector, validates against 113 Dallas zipcodes
- [ ] Dashboard page with header (city, current price, YoY change), historical price chart, forecast callout, confidence gauge, and bedroom breakdown cards
- [ ] API routes proxying to Modal endpoints
- [ ] Static Dallas zipcode list (`lib/dallas-zipcodes.json`) for validation
- [ ] Local dev setup documented — any teammate can clone and run in under 5 minutes
- [ ] Vercel deployment configured with Modal endpoint env vars

### Out of Scope

- Mobile app — web-first, capstone scope
- OAuth / social login — email/password not even needed (no auth in this app)
- Real-time data feeds — Zillow CSV only
- Predictions beyond 1 month — tighter scope = more accurate model
- Zipcodes outside the 113 curated Dallas set — cleaner UX
- Video or media uploads — not relevant

## Context

- **Team:** Full team, multiple people across frontend and backend
- **Build order:** Frontend first with mocked/hardcoded data, then wire to real Modal endpoints once deployed
- **Timeline:** Week 5 of 9 — roughly 4 weeks to working demo + presentation
- **Data:** 255 Dallas zipcodes, monthly data, 72,912 rows total; time-split at Jan 2023 (never shuffle)
- **Models saved to Volume:** `baseline_logreg.pkl` done; `xgboost_1m.pkl` to be built
- **Frontend target audience:** Homebuyers and sellers — not developers; UI should be readable and approachable

## Constraints

- **Tech stack**: Next.js 14+ / TypeScript / Tailwind / Recharts (frontend) + Modal serverless / Python / XGBoost / scikit-learn (backend) — already decided, do not change
- **Data source**: Zillow ZHVI CSVs only — no external APIs, no database
- **Storage**: Modal Volumes (`real-estate-data`) only — parquet/CSV + `.pkl` model files
- **Prediction horizon**: 1 month ahead only
- **Features**: Exactly the 14 specified columns — leakage investigation is complete, do not add features
- **Zipcode scope**: 113 curated core Dallas zipcodes for frontend; model trains on 255
- **Setup**: Both local dev AND Vercel/Modal deployment must be straightforward (full team, not just the original author)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Frontend-first build order | Ship UI with mocked data so frontend and backend can develop in parallel without blocking | — Pending |
| XGBoost as primary regressor | Regression task (dollar price) + likely beats LR baseline; LR stays as direction signal | — Pending |
| Modal serverless backend | No infra to manage; direct Volume access for both data and models | — Pending |
| Time-based train/test split at Jan 2023 | Prevents future data leaking into training | ✓ Good |
| Removed `price_change_1m` and `price_change_3m` | 88.75% and 94.3% target alignment = data leakage | ✓ Good |
| Kept `price_change_12m` | 78% alignment is legitimate price momentum signal | ✓ Good |

---
*Last updated: 2026-03-05 after initialization*
