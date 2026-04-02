# API Reference, Project Overview, and Testing Guide

This document summarizes how the Dallas Real Estate Predictor works end to end: the FastAPI backend endpoints, the Next.js frontend features, and how to exercise them.

---

## Architecture

| Layer | Technology | Role |
|-------|------------|------|
| **Frontend** | Next.js (App Router), React, Tailwind, Recharts | Landing page, zipcode dashboard, charts, model explanations |
| **Backend** | FastAPI + XGBoost, served on [Modal](https://modal.com) | Load pickles + CSV from a Modal volume; expose JSON APIs |
| **Models** | Three `XGBRegressor` artifacts (`xgboost_1m.pkl`, `3m`, `6m`) + `latest_data.pkl` | Predict ZHVI horizons; bedroom prices are scaled from overall ZHVI; bathroom adjustment via NAHB multipliers |
| **Data** | `dallas_clean.csv` on volume | Monthly ZHVI by zipcode and bedroom tier (history + features) |

**Deployment**

- Backend: Modal app (`backend/modal_app.py`) mounts volume `real-estate-data` at `/mnt/real-estate-data` and serves `main.py` as an ASGI app.
- Frontend: `MODAL_BACKEND_URL` in `.env.local` must point to the deployed Modal app base URL (no trailing slash).

**Request flow**

1. User opens `/dashboard/[zipcode]?bedrooms=N&bathrooms=M`.
2. The Next.js server component calls `lib/api.ts` helpers, which `fetch` the Modal backend.
3. Chart data is built in `lib/mock-data.ts` from `/history` + `/predict`.

---

## Current State of the Project

### Backend (`backend/main.py`)

- **Startup**: Loads three XGBoost pickles, `latest_data.pkl`, and full `dallas_clean.csv`; precomputes per-zip volatility for zipcode profiles.
- **Inference**: For each horizon, predicts ZHVI then scales to the requested bedroom column using `predicted_zhvi * (current_br / current_zhvi)`, then applies the NAHB-derived bathroom multiplier.
- **Direction / confidence**: Derived only from the **1-month** forecast vs current price; confidence is a heuristic based on the magnitude of the predicted percent change.

### Frontend (`CS4485Proj/`)

- **Landing** (`app/page.tsx`): Entry to search or select a zipcode.
- **Dashboard** (`app/dashboard/[zipcode]/page.tsx`): Single page that parallel-fetches prediction, history, bedroom prices, model metrics, model info, backtest, zipcode profile, detailed importances, and deep-dive metadata.
- **Optional BFF routes** (`app/api/predict`, `app/api/history`): Proxies if you prefer calling Next instead of Modal directly from the browser (current dashboard uses `MODAL_BACKEND_URL` server-side).
- **Tests**: Vitest + component tests (e.g. chart tests) under `tests/`.

---

## Feature List (User-Facing)

| Feature | Where it lives | Data source |
|---------|----------------|-------------|
| Zipcode + bedroom forecast | Dashboard header, chart, timeline | `/predict`, `/history` |
| 12-month trend chart + **next-month-only** forecast point | `PriceChart`, `buildChartData` | `/history` + 1m slice of `/predict` |
| 1m / 3m / 6m forecast cards with **expected range** (MAPE-based) | `ForecastTimeline` | `/predict` + `/model-metrics` |
| Direction signal + explanation | `ConfidenceGauge` | `/predict` (`direction_explanation`, `direction_1m`) |
| Map and sidebar stats | `DashboardMap`, sidebar | Geo + history + `/predict` |
| Zipcode profile (volatility, seasonality) | `ZipcodeProfile` | `/zipcode-profile` |
| Historical accuracy for this zip | `BacktestChart` | `/backtest` |
| Global model accuracy (RMSE, MAE, MAPE) | `ModelAccuracy` | `/model-metrics` |
| “How we predict” pipeline strip | `PredictionPipeline` | `/model-info` + `/model-metrics` |
| Feature importances (tabs 1m/3m/6m, expandable) | `ModelInsights` | `/model-info`, `/model-info-detailed` |
| XGBoost deep dive (accordion) | `XGBoostDeepDive` | `/model-deep-dive` + `/model-metrics` + `/model-info` |
| Bathroom count selection + impact explanation | `SearchForm` (picker), `BathroomImpact` (dashboard card) | NAHB multiplier (post-prediction scaling) |

---

## API Endpoints — How They Work

All paths are relative to your backend **base URL** (e.g. `https://….modal.run`).

### `POST /predict`

**Purpose:** Produce 1m, 3m, and 6m bedroom-level price forecasts and the UI “direction” signal.

**Body:** `{ "zipcode": "75252", "bedrooms": 3, "bathrooms": 2 }` — `bedrooms` must be `2`, `3`, `4`, or `5`; `bathrooms` must be `1`, `2`, `3`, or `4` (defaults to `2`).

**Behavior:**

1. Looks up the latest row for the zip in `latest_data.pkl`.
2. Runs each horizon’s XGBoost on the 14 features, gets `pred_zhvi`.
3. Scales to the selected bedroom ZHVI column.
4. Applies NAHB-derived bathroom multiplier (relative to 2-bath baseline).
5. Builds `forecasts[]` with dollar and percent change vs **current** bathroom-adjusted bedroom price.
6. Sets `direction_1m` and `direction_explanation` from the **1m** forecast only; confidence increases with larger predicted moves.

**Response highlights:** `current_price`, `bathrooms`, `forecasts[]`, `direction_1m`, `direction_explanation`, `data_date`, `forecast_date_1m` / `_3m` / `_6m`.

**Errors:** `404` if zipcode is not in `latest`.

---

### `POST /history`

**Purpose:** Time series of median home values for the zip and bedroom tier (for charts).

**Body:** Same shape as `/predict`.

**Behavior:** Filters `dallas_clean.csv` by zip and bedroom column, keeps dates `>= 2019-01-01`, sorted ascending. Applies bathroom multiplier to each ZHVI value.

**Response:** `{ "zipcode", "bedrooms", "bathrooms", "data": [ { "date", "zhvi" }, ... ] }`.

**Errors:** `404` if no rows for that zip.

---

### `GET /zipcodes`

**Purpose:** Populate search / pickers with all supported zips and city names.

**Behavior:** Dedupes `latest` on `ZipCode` + `City`, sorted by zip.

**Response:** `[ { "zipcode", "city" }, ... ]`.

---

### `GET /data-info`

**Purpose:** Lightweight dataset metadata (no zip required).

**Response:** Global `data_date`, `forecast_date_1m` / `_3m` / `_6m`, and count of zips in `latest`.

---

### `GET /model-info`

**Purpose:** Dashboard “How we predict” — top 5 feature importances for the **1m** model plus dataset stats.

**Response:**

- `top_drivers`: `[ { "feature", "importance" }, ... ]` (human-readable feature names).
- `dataset`: `zipcodes`, `data_points`, `date_range_start`, `date_range_end`.

---

### `GET /model-metrics`

**Purpose:** Test-set metrics baked into each pickle after training.

**Response:** Per horizon (`1m`, `3m`, `6m`): `rmse`, `mae`, `mape`.

Used by **Model Accuracy**, **Forecast Timeline** ranges, and explanations that cite MAPE.

---

### `GET /model-info-detailed`

**Purpose:** Full ranked feature importances for **all three** horizons (14 features each).

**Response:** Object with keys `1m`, `3m`, `6m`; each value is a list of `{ feature, importance }`.

---

### `POST /backtest`

**Purpose:** Rolling evaluation of the **1m** model on historical rows for **one** zip and bedroom tier.

**Body:** Same as `/predict`.

**Behavior:** For roughly the last 18 usable months (where next month exists), predicts from month *t* and compares to actual at *t+1*; applies the same bedroom + bathroom scaling as live `/predict`.

**Response:** `data[]` with `date`, `predicted`, `actual`, `error_pct`; plus `avg_error_dollars`, `avg_error_pct`.

**Errors:** `404` if zip not found.

---

### `POST /zipcode-profile`

**Purpose:** Volatility percentile vs all zips and average MoM % change by calendar month for this zip’s tier.

**Body:** Same as `/predict`.

**Behavior:** Uses precomputed volatility map; seasonality averages `pct_change` grouped by month.

**Response:** `volatility_percentile`, `predictability_label`, `seasonal[]` (month + `avg_change_pct`).

**Errors:** `404` if zip not in volatility map.

---

### `GET /model-deep-dive`

**Purpose:** Static + live metadata for the **Under the Hood: XGBoost** UI.

**Behavior:** Returns algorithm blurb, training hyperparameters (matching `train_xgboost.py`), plain-English descriptions, **trees used** per horizon from `best_iteration`, train/test row counts (split at `2025-01-01`), full feature list with categories, and ordered `prediction_steps`.

**Response:** JSON object; see `XGBoostDeepDiveInfo` in `lib/api.ts`.

---

## How to Test

### 1. Environment

**Frontend**

```bash
cd CS4485Proj
cp .env.local.example .env.local   # optional template
# Set MODAL_BACKEND_URL=https://your-modal-deployment-url in .env.local
npm install
npm run dev
```

Open `http://localhost:3000`, navigate to a dashboard URL, e.g. `/dashboard/75252?bedrooms=3&bathrooms=2`.

**Backend (Modal)**

After deploying (`modal deploy` per project docs), use the Modal HTTPS base URL as `MODAL_BACKEND_URL`.

To run FastAPI **locally**, you must align paths in `main.py` (`MODEL_DIR`, `DATA_DIR`) with local `models/` and `data/` and install Python deps; the repo is primarily oriented toward Modal volumes.

---

### 2. API smoke tests (`curl`)

Set once:

```bash
BASE="https://YOUR-MODAL-APP-URL"   # no trailing slash
ZIP=75252
BR=3
BA=2
```

**GET (no body)**

```bash
curl -sS "$BASE/zipcodes" | head -c 500
curl -sS "$BASE/data-info"
curl -sS "$BASE/model-info"
curl -sS "$BASE/model-metrics"
curl -sS "$BASE/model-info-detailed"
curl -sS "$BASE/model-deep-dive"
```

**POST (JSON body)**

```bash
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}"

curl -sS -X POST "$BASE/history" \
  -H "Content-Type: application/json" \
  -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}"

curl -sS -X POST "$BASE/backtest" \
  -H "Content-Type: application/json" \
  -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}"

curl -sS -X POST "$BASE/zipcode-profile" \
  -H "Content-Type: application/json" \
  -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}"
```

Pretty-print:

```bash
curl -sS "$BASE/data-info" | python3 -m json.tool
```

**Negative tests**

- Invalid zip: use a non-numeric or wrong-length `zipcode` (expect validation error).
- Unknown zip: use a 5-digit zip not in the dataset (expect `404` on `/predict` and `/history`).

---

### 3. Frontend checks

| Check | Action |
|-------|--------|
| Forecasts load | Dashboard shows three horizon cards with prices |
| Chart | Historical area + dashed line to **one** future month |
| Ranges | Under each horizon card, “Expected range” appears when metrics exist |
| Direction | Gauge matches sign of 1m change |
| Backtest | Section appears only when `/backtest` returns non-empty `data` |
| Model accuracy | Section shows when `/model-metrics` returns keys |
| How we predict | Pipeline + expandable drivers |
| Deep dive | “Under the Hood: XGBoost” accordions; config section needs `/model-deep-dive` |

---

### 4. Automated tests

```bash
cd CS4485Proj
npm test
```

---

## Quick reference — endpoint summary

| Method | Path | Auth | Notes |
|--------|------|------|--------|
| POST | `/predict` | No | Core forecasts + direction |
| POST | `/history` | No | Chart series from 2019 |
| GET | `/zipcodes` | No | All zips |
| GET | `/data-info` | No | Global metadata |
| GET | `/model-info` | No | Top 5 drivers (1m) |
| GET | `/model-metrics` | No | RMSE / MAE / MAPE |
| GET | `/model-info-detailed` | No | 14 features × 3 horizons |
| POST | `/backtest` | No | Per-zip rolling 1m errors |
| POST | `/zipcode-profile` | No | Volatility + seasonality |
| GET | `/model-deep-dive` | No | XGBoost UI copy + hyperparams |

CORS is open (`*`) for browser access from any origin.

---

## Related files

| Concern | Path |
|---------|------|
| FastAPI app and routes | `backend/main.py` |
| Modal wiring | `backend/modal_app.py` |
| Training pipeline | `backend/train_xgboost.py` |
| Frontend HTTP client | `lib/api.ts` |
| Dashboard page | `app/dashboard/[zipcode]/page.tsx` |
| Bathroom impact card | `components/BathroomImpact.tsx` |
| Chart data assembly | `lib/mock-data.ts` |

## Bathroom Selection Feature — Research, Rationale, and Implementation

### The problem

The bedroom selection feature works because Zillow publishes separate ZHVI time-series for each bedroom count (2 BR, 3 BR, 4 BR, 5+ BR) at the zip-code level. This gives us real observed market data for each tier. We wanted to offer the same experience for bathroom counts, but first needed to find a comparable data source.

### Data source investigation

We searched every major public housing data provider for bathroom-specific price indices:

| Source | Bathroom-level price data? | What it offers instead |
|--------|---------------------------|----------------------|
| **Zillow ZHVI** (zillow.com/research/data) | **No** — only overall, by bedroom count, and by price tier | Bedroom-count CSVs (`bdrmcnt_2` through `bdrmcnt_5`) used by the existing pipeline |
| **Redfin Data Center** (redfin.com/news/data-center) | **No** — zip-level market data without bathroom segmentation | Individual listings include bath counts, but no aggregated time series |
| **Realtor.com Research** (realtor.com/research/data) | **No** — monthly inventory and hotness metrics only | No bathroom breakdown |
| **U.S. Census / ACS** (census.gov, ACS 5-Year) | **No** — median home value by ZCTA, not by bathroom count | ACS does not collect bathroom-specific price data |
| **FHFA House Price Index** (fhfa.gov) | **No** — repeat-sales index, no property-feature segmentation | Metro/state level only |
| **Kaggle "DFW Real Estate Data"** | **Partial** — individual listings with bath counts | Not a monthly index; can't be used as a time series |

**Conclusion:** No public data source provides a monthly home-value index segmented by bathroom count at the zip-code level. Unlike bedrooms, where Zillow provides direct time-series CSVs, bathrooms have no equivalent publicly available dataset.

### Choosing the multiplier approach

Since we cannot observe bathroom-specific price indices, we evaluated three alternatives:

1. **Model feature only** — Add an average bathroom count per zip as a training feature. This would improve predictions marginally but give the user no way to select or compare bathroom counts.
2. **Heuristic multiplier** — Apply a research-backed percentage adjustment to the bedroom-tier price based on the selected bathroom count. Transparent, deterministic, and user-selectable.
3. **Alternative data source** — Scrape individual listings and build our own bathroom index. Prohibitively complex, legally uncertain, and would lag behind Zillow's smoothed index.

We chose **option 2** because it delivers the user-facing feature (selectable bathroom count with adjusted prices) without requiring a new data pipeline or retraining the model. The multiplier is applied as a post-prediction step, keeping the XGBoost model unchanged.

### Where the multipliers come from

The multipliers are derived from the **NAHB (National Association of Home Builders) House Price Estimator**, which is itself based on the **American Housing Survey** — a joint product of the U.S. Census Bureau and HUD. The NAHB data provides the incremental value of adding a bathroom, broken down by the home's bedroom count:

| Transition | 2 BR homes | 3 BR homes | 4 BR homes |
|------------|-----------|-----------|-----------|
| 1 → 1.5 baths | +11.5% | +12.0% | +12.5% |
| 1.5 → 2 baths | +10.0% | +10.0% | +10.5% |
| 2 → 2.5 baths | +10.5% | +10.5% | +11.0% |
| 2.5 → 3 baths | +9.5% | +9.5% | +9.5% |
| 3 → 3.5 baths | — | +10.0% | +10.5% |
| 3.5 → 4 baths | — | +9.0% | +9.5% |

To convert these incremental steps into a single multiplier relative to 2 bathrooms (the most common configuration in Dallas), we compound the percentages. For example, for a 3-bedroom home:

- **1 bath:** Start at 2-bath baseline, divide by the compounded 1→2 premium: `1 / (1.12 × 1.10) = 0.81`
- **2 bath:** Baseline = `1.00`
- **3 bath:** Compound the 2→3 premium: `1.105 × 1.095 = 1.21`
- **4+ bath:** Continue compounding: `1.21 × 1.10 × 1.09 = 1.45`

### Final multiplier table

| Bathrooms | 2 BR | 3 BR | 4 BR | 5+ BR |
|-----------|------|------|------|-------|
| 1         | 0.81 | 0.81 | 0.80 | 0.80  |
| 2         | 1.00 | 1.00 | 1.00 | 1.00  |
| 3         | 1.21 | 1.21 | 1.22 | 1.22  |
| 4+        | 1.45 | 1.45 | 1.46 | 1.46  |

The slight variation across bedroom counts (e.g., 1.22 for 4 BR vs 1.21 for 3 BR at the 3-bath tier) reflects the NAHB finding that higher-bedroom homes see marginally larger bathroom premiums.

### How it is applied in the codebase

The multiplier is stored in `backend/main.py` as `BATHROOM_MULTIPLIER`, a dict keyed by `(bedrooms, bathrooms)`. A helper function `_bath_multiplier(bedrooms, bathrooms)` returns the correct value (defaulting to `1.0` for any unrecognized combination).

The scaling is applied at three points:

1. **`/predict`** — `current_price` and each horizon's `predicted_price` are multiplied by the bathroom factor after the existing bedroom ratio scaling.
2. **`/history`** — Every ZHVI value in the returned time-series is multiplied, so the chart, YoY, and momentum calculations are internally consistent.
3. **`/backtest`** — Both predicted and actual prices are multiplied so the error comparison remains fair.

Percentage-based metrics (`/zipcode-profile` seasonal patterns, direction signal) are unaffected because the multiplier is constant across time and cancels out in relative calculations.

### Backward compatibility

All `bathrooms` parameters default to `2` in both the backend Pydantic models and the frontend URL parsing. The 2-bath multiplier is `1.0`, so any existing link, API call, or bookmark without a `bathrooms` parameter produces results identical to before the feature was added.

### Frontend presentation

- **Landing page (`SearchForm`):** A 4-button bathroom picker (1, 2, 3, 4+) sits below the bedroom picker, sharing the same visual style.
- **Dashboard header:** The title now reads e.g. "3-bed, 2-bath Homes" to reflect both selections.
- **Bathroom Impact section (`BathroomImpact` component):** A dedicated dashboard card shows the selected bathroom's percentage impact, a horizontal bar chart comparing all 4 tiers, and an expandable methodology explanation with the multiplier grid.
- **Bedroom cards:** When a non-default bathroom count is selected, the bath label is appended to each row.

### Limitations

- The multipliers are national averages derived from the American Housing Survey, not Dallas-specific. The actual premium for an extra bathroom in a specific Dallas-area zip may differ.
- The NAHB data reflects how bathroom count correlates with home value at a point in time. It does not capture how bathroom premiums might change over time (e.g., during a luxury market boom vs correction).
- Half-bathrooms are not modeled. The tiers are whole numbers (1, 2, 3, 4+).

---

  Step 1 — Regenerate data on the Volume (adds mortgage_rate_30y to the volume's CSV):
  modal run backend/refresh_data.py

  Step 2 — Retrain models on the Volume (saves new .pkl files to the volume):
  modal run backend/train_xgboost.py
  modal run backend/train_logistic_regression.py

  Step 3 — Deploy the updated API:
  modal deploy backend/main.py