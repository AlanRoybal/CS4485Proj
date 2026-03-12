# Real Estate Market Analyzer — Project Guide
**UT Dallas UTDesign Capstone | Spring 2026 | Advisor: Muhammad Ikram**

> This file is the single source of truth for everything that needs to be built.
> Reference it when starting any new task or picking up work from another team member.

**Recent change (PR #3 — backend merge):** Backend branch merged into main. Backend is now a single FastAPI app in `backend/main.py` with POST /predict (XGBoost 1m/3m/6m + LR direction), POST /history, and GET /zipcodes. Training scripts: `backend/train_xgboost.py`, `backend/train_logistic_regression.py`. Frontend API routes still use mock data until Phase III (wire to `MODAL_BACKEND_URL`).

---

## Project Summary

A web app where users enter a Dallas-area zipcode and bedroom count and receive:
- A historical home value chart (Zillow ZHVI data)
- A 1-month-ahead price prediction (XGBoost)
- A directional confidence signal — will prices go up or down? (Logistic Regression)

**Stack:** Next.js + TypeScript + Tailwind (frontend, Vercel) · Modal (backend, ML, storage)  
**Data:** Zillow ZHVI CSVs only — no external APIs, no database  
**Storage:** Modal Volumes (`real-estate-data`) — parquet/CSV files, saved model `.pkl` files  

---

## Current Status (Week 5+ of 9) — Updated after backend merge (PR #3)

| Component | Status | Notes |
|---|---|---|
| Raw data cleaning | ✅ Done | `clean_and_merge_zillow.py` |
| Feature engineering | ✅ Done | `prepare_training_data.py` |
| Train/test CSVs on Volume | ✅ Done | `/mnt/real-estate-data/data/` |
| Logistic Regression baseline | ✅ Done | 75.82% acc, 0.8231 AUC |
| LR saved to Volume | ✅ Done | `/mnt/real-estate-data/models/logistic_regression.pkl` |
| XGBoost models (1m, 3m, 6m) | ✅ Done | `backend/train_xgboost.py`, saved to Volume |
| Backend prediction + history + zipcodes | ✅ Done | FastAPI `backend/main.py` (Modal-served) |
| Latest data snapshot on Volume | ✅ Done | `/mnt/real-estate-data/models/latest_data.pkl` |
| Next.js frontend | ✅ In progress | Landing, dashboard, components (Phase 1) |
| Frontend ↔ Backend connection | 🔲 Not started | Replace mock with MODAL_*_URL (Phase III) |
| End-to-end testing | 🔲 Not started | Phase III |

---

## Data

### Files on Modal Volume (`/mnt/real-estate-data/`)
```
/data/
  train.csv          — 63,477 rows, all data before Jan 2023
  test.csv           — 6,120 rows, Jan 2023 onward
  dallas_clean.csv   — full combined dataset, 72,912 rows

/models/
  logistic_regression.pkl  — LR direction classifier + scaler + feature list
  xgboost_1m.pkl           — 1-month-ahead ZHVI regressor
  xgboost_3m.pkl           — 3-month-ahead ZHVI regressor
  xgboost_6m.pkl           — 6-month-ahead ZHVI regressor
  latest_data.pkl          — one row per zipcode (latest date) for /predict
```

### Dataset shape
- 255 Dallas-area zipcodes, monthly data
- 26 columns: ZipCode, Date, City, Metro, CountyName, State, SizeRank, ZHVI,
  lag features, price change features, bedroom tiers, targets
- Zero missing values
- Time-based split at January 2023 — never shuffle this data

### The 14 final features (leakage-free)
```python
FEATURES = [
    'zhvi_lag_1m',       # Most recent price — strongest signal
    'zhvi_lag_3m',       # 3-month lag
    'zhvi_lag_6m',       # 6-month lag
    'zhvi_lag_12m',      # 12-month lag — seasonal baseline
    'price_change_12m',  # 12-month momentum — verified safe (78% target alignment)
    'zhvi_2br',          # Entry-level / rental market
    'zhvi_3br',          # Core Dallas family home
    'zhvi_4br',          # Move-up buyer segment
    'zhvi_5br_plus',     # Luxury / large home tier
    'zhvi_top_tier',     # Top 35th percentile — market leading indicator
    'zhvi_bottom_tier',  # Bottom 35th percentile — affordability floor
    'month',             # Seasonality
    'year',              # Long-term trend
    'SizeRank',          # Zipcode size — proxy for market liquidity
]
```

### Features removed (data leakage)
- `price_change_1m` — matched target direction 88.75% of the time (encodes the answer)
- `price_change_3m` — 94.3% correlated with `price_change_1m` (indirect leak)
- `zhvi_1br` — not present in the actual CSV files

---

## Backend (Modal-served FastAPI)

**Location:** `backend/main.py` — single FastAPI app with Modal Volume mount.  
**Deploy:** `modal deploy backend/main.py` → one base URL; all endpoints live under it.

### Implemented (from backend merge — PR #3)

#### 1. XGBoost Regressors — `backend/train_xgboost.py` ✅
- **Targets:** `target_zhvi_1m`, `target_zhvi_3m`, `target_zhvi_6m` (regression)
- **Features:** Same 14 leakage-free features
- **Output:** Three `.pkl` files on Volume: `xgboost_1m.pkl`, `xgboost_3m.pkl`, `xgboost_6m.pkl`
- **Also saves:** `latest_data.pkl` — one row per zipcode (latest date) for the predict endpoint
- **Run:** `python3 train_xgboost.py` locally or `modal run train_xgboost.py` with Volume

#### 2. Logistic Regression direction classifier — `backend/train_logistic_regression.py` ✅
- **Target:** `target_direction_1m` (1 = up, 0 = down)
- **Data:** Pre-split `train.csv` / `test.csv` from Volume
- **Save to Volume:** `/mnt/real-estate-data/models/logistic_regression.pkl` (model + scaler + features)

#### 3. POST /predict
- **Input:** `{ "zipcode": "75252", "bedrooms": 3 }` (bedrooms: 2 | 3 | 4 | 5)
- **Output:**
```json
{
  "zipcode": "75252",
  "city": "Dallas",
  "bedrooms": 3,
  "current_price": 405000.00,
  "forecasts": [
    { "horizon": "1m", "predicted_price": 412500.00, "predicted_change_dollars": 7500.00, "predicted_change_pct": 1.85, "direction": "up" },
    { "horizon": "3m", "predicted_price": 418000.00, "predicted_change_dollars": 13000.00, "predicted_change_pct": 3.21, "direction": "up" },
    { "horizon": "6m", "predicted_price": 422000.00, "predicted_change_dollars": 17000.00, "predicted_change_pct": 4.20, "direction": "up" }
  ],
  "direction_1m": { "direction": "up", "confidence": 0.73 }
}
```
- Uses XGBoost 1m/3m/6m for price forecasts; scales to bedroom tier via ZHVI ratio. LR provides 1-month direction + confidence.

#### 4. POST /history
- **Input:** `{ "zipcode": "75252", "bedrooms": 3 }`
- **Output:** `{ "zipcode": "75252", "bedrooms": 3, "data": [ { "date": "2019-01-01", "zhvi": 250000.0 }, ... ] }` — from 2019-01-01, sorted by date.

#### 5. GET /zipcodes
- **Output:** `[ { "zipcode": "75252", "city": "Dallas" }, ... ]` — all zipcodes in the latest snapshot (for frontend validation/dropdowns).

### Volume paths (backend expects)
- `/mnt/real-estate-data/data/dallas_clean.csv`
- `/mnt/real-estate-data/data/train.csv`, `test.csv`
- `/mnt/real-estate-data/models/xgboost_1m.pkl`, `xgboost_3m.pkl`, `xgboost_6m.pkl`
- `/mnt/real-estate-data/models/logistic_regression.pkl`
- `/mnt/real-estate-data/models/latest_data.pkl`

---

## Frontend (Next.js)

### Stack
- Next.js 14+ with TypeScript
- Tailwind CSS for styling
- Recharts for all data visualization
- Deployed on Vercel

### Pages and components to build

#### `app/page.tsx` — Landing / Search Page
- Zipcode text input with validation (5-digit, must be in Dallas list)
- Bedroom count selector (2, 3, 4, 5+)
- Submit button → navigates to `/dashboard/[zipcode]`
- Simple, clean UI — target audience is homebuyers and sellers, not developers

#### `app/dashboard/[zipcode]/page.tsx` — Dashboard Page
Main output page. Receives zipcode and bedroom count, calls backend `/predict` and `/history`, renders results.

Sections to build:
1. **Header** — zipcode, city name (from predict response), current price, year-over-year change
2. **Historical price chart** — line chart from `/history` response (`data: [{ date, zhvi }]`), last 5 years of ZHVI
3. **Forecast callout** — use `forecasts` from `/predict` (1m, 3m, 6m); show 1-month predicted price, dollar change, percent change; optionally show 3m/6m
4. **Confidence gauge** — use `direction_1m` from `/predict` (`direction`, `confidence`)
5. **Bedroom breakdown** — small cards showing current 2br/3br/4br/5br+ prices for this zipcode (can be derived from same backend data or a separate call if needed)

#### `app/api/predict/route.ts` — API Route (proxy to backend)
- **Phase 3:** Replace mock with `POST` to backend base URL: `${MODAL_PREDICT_URL}/predict` (or single `MODAL_BACKEND_URL` + `/predict`).
- **Request body:** `{ zipcode: string, bedrooms: 2 | 3 | 4 | 5 }`.
- **Response shape:** `{ zipcode, city, bedrooms, current_price, forecasts: [{ horizon, predicted_price, predicted_change_dollars, predicted_change_pct, direction }], direction_1m: { direction, confidence } }`.

#### `app/api/history/route.ts` — API Route (proxy to backend)
- **Phase 3:** Replace mock with `POST` to backend: `${MODAL_HISTORY_URL}/history` or `${MODAL_BACKEND_URL}/history`.
- **Response shape:** `{ zipcode, bedrooms, data: [{ date, zhvi }] }`.

#### `app/api/zipcodes/route.ts` (optional)
- **Phase 3:** Optional GET proxy to backend `GET /zipcodes` for dynamic zipcode list: `[{ zipcode, city }]`. Frontend can use this instead of or in addition to `lib/dallas-zipcodes.json`.

#### `components/PriceChart.tsx`
```typescript
// Recharts LineChart showing historical ZHVI
// Props: data: { date: string, zhvi: number }[]
// X-axis: date, Y-axis: price formatted as $XXXk
// Add a vertical marker at "today" and a dotted line to the forecast point
```

#### `components/ConfidenceGauge.tsx`
```typescript
// Visual indicator of Logistic Regression confidence
// Props: direction: 'up' | 'down', confidence: number (0-1)
// Simple arc or progress bar showing confidence %
// Green for up, red for down
```

#### `components/BedroomCards.tsx`
```typescript
// Row of small stat cards
// Props: prices: { '2br': number, '3br': number, '4br': number, '5br+': number }
// Each card shows bedroom type + current median price for the zipcode
```

### Environment variables (`.env.local`)
Backend is a single FastAPI app; one base URL can serve all routes:
```
MODAL_BACKEND_URL=https://your-workspace--your-app-name.modal.run
```
Then: `POST ${MODAL_BACKEND_URL}/predict`, `POST ${MODAL_BACKEND_URL}/history`, `GET ${MODAL_BACKEND_URL}/zipcodes`.  
(If you still use separate env vars: `MODAL_PREDICT_URL`, `MODAL_HISTORY_URL` — point them at the same base URL with path appended as needed.)

### Zipcode validation
Use `dallas_zipcodes_reference.xlsx` (113 curated core Dallas zipcodes) for frontend validation.  
Convert to a static JSON file `lib/dallas-zipcodes.json` and validate on form submit before calling any endpoint.

---

## What Comes After Backend Merge

Backend (XGBoost 1m/3m/6m, LR, /predict, /history, /zipcodes) is implemented. Remaining work:

1. **Integration testing** — zip every valid Dallas zipcode through the predict endpoint, confirm no errors
2. **Edge case handling** — what happens if a zipcode has sparse data? If bedrooms don't match available data?
3. **Frontend polish** — loading skeletons, error states, mobile responsiveness
4. **Historical validation** — show on the frontend how the model would have predicted past months vs. actuals (satisfies project requirement to validate against historical data)
5. **Final report** — covers data pipeline, feature engineering decisions, leakage investigation, model training, evaluation results, system architecture
6. **Presentation + demo** — live demo of the working app

---

## Key Decisions Already Made (Do Not Revisit)

| Decision | What was decided | Why |
|---|---|---|
| Data source | Zillow ZHVI CSVs only | Simple, clean, free, sufficient |
| Storage | Modal Volumes (CSV/parquet) | No database needed at this scale |
| Prediction horizon | 1 month ahead only | Tighter scope = more accurate model |
| Train/test split | Time-based at Jan 2023 | Prevents future data leaking into training |
| Features | 14 specific columns | Leakage investigation confirmed these are clean |
| Removed features | `price_change_1m`, `price_change_3m` | 88.75% and 94.3% target alignment = leakage |
| Kept feature | `price_change_12m` | 78% alignment is legitimate price momentum |
| Baseline model | Logistic Regression 75.82% / 0.8231 AUC | Floor; now integrated in backend /predict as direction_1m |
| XGBoost horizons | 1m, 3m, 6m (regression) | Implemented in backend; forecasts array in /predict response |
| Zipcode scope | 113 curated core Dallas zipcodes (frontend) | Trains on 255; GET /zipcodes returns available zipcodes |
| Frontend stack | Next.js + Tailwind + Recharts on Vercel | Team decision, strong ecosystem |
| Backend stack | Modal-served FastAPI (`backend/main.py`) | Single app: /predict, /history, /zipcodes; Volume for data/models |

---

## Benchmarks to Beat

| Metric | Baseline (Logistic Regression) | XGBoost must beat |
|---|---|---|
| Accuracy | 75.82% | > 75.82% |
| AUC-ROC | 0.8231 | > 0.8231 |
| Up class recall | 61% | > 61% |
| Down class recall | 85% | Maintain or improve |

If XGBoost does not meaningfully beat these numbers, ship with Logistic Regression.

---

## File / Folder Structure

```
/                          ← Next.js project root
├── app/
│   ├── page.tsx           ← Landing page with zipcode search
│   ├── dashboard/
│   │   └── [zipcode]/
│   │       └── page.tsx   ← Main dashboard
│   └── api/
│       ├── predict/
│       │   └── route.ts   ← Proxy to backend /predict (Phase 3: replace mock)
│       └── history/
│           └── route.ts   ← Proxy to backend /history (Phase 3: replace mock)
├── components/
│   ├── PriceChart.tsx
│   ├── ConfidenceGauge.tsx
│   └── BedroomCards.tsx
├── lib/
│   └── dallas-zipcodes.json   ← 113 valid zipcodes (optional: use GET /zipcodes instead)
├── .env.local                 ← MODAL_BACKEND_URL or MODAL_PREDICT_URL / MODAL_HISTORY_URL (never commit)
│
backend/                   ← FastAPI app + training scripts (Modal Volume when deployed)
├── main.py                ← FastAPI: POST /predict, POST /history, GET /zipcodes (DONE)
├── train_logistic_regression.py  ← LR direction classifier (DONE)
├── train_xgboost.py       ← XGBoost 1m/3m/6m regressors + latest_data.pkl (DONE)
├── requirements.txt      ← fastapi, uvicorn, pandas, xgboost, scikit-learn, joblib, pydantic, etc.
├── data/                  ← (optional local copies; production uses Modal Volume)
└── models/                ← (optional local copies; production uses Modal Volume)
```
