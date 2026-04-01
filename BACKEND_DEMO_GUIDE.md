# Backend Demo Guide — Dallas Real Estate Predictor

This guide walks through a live demonstration of the FastAPI backend, highlighting the **mortgage rate integration** and **bedroom count** features.

---

## Table of Contents

1. [Pre-Demo Checklist](#pre-demo-checklist)
2. [Architecture Overview](#architecture-overview)
3. [Setup & Deployment](#setup--deployment)
4. [Demo Script](#demo-script)
   - [Part 1: Health Check & Metadata](#part-1-health-check--metadata)
   - [Part 2: Core Prediction (Bedroom + Bathroom)](#part-2-core-prediction-bedroom--bathroom)
   - [Part 3: Mortgage Rate Feature](#part-3-mortgage-rate-feature)
   - [Part 4: Bedroom Comparison](#part-4-bedroom-comparison)
   - [Part 5: Historical Data](#part-5-historical-data)
   - [Part 6: Model Transparency Endpoints](#part-6-model-transparency-endpoints)
   - [Part 7: Backtesting & Zipcode Profile](#part-7-backtesting--zipcode-profile)
5. [Talking Points for Each Feature](#talking-points-for-each-feature)
6. [Error Handling Demo](#error-handling-demo)
7. [Quick Command Reference](#quick-command-reference)

---

## Pre-Demo Checklist

Before the demo, verify the following:

- [ ] **Modal account is authenticated** — run `modal token new` if needed
- [ ] **Volume data is populated** — data and models exist on the `real-estate-data` volume
- [ ] **Backend is deployed** — `modal deploy backend/modal_app.py` has been run
- [ ] **Note your base URL** — the Modal deploy output gives you the HTTPS endpoint
- [ ] **`curl` or Postman is available** for live API calls
- [ ] **Optional: `jq` installed** for pretty-printing JSON (`brew install jq` on macOS)

### Verify Data Pipeline Was Run

The data pipeline must have been run at least once to populate the Modal volume:

```bash
# Step 1 — Refresh data (downloads Zillow + FRED mortgage rates, engineers features)
modal run backend/refresh_data.py

# Step 2 — Train XGBoost models (1m, 3m, 6m regressors)
modal run backend/train_xgboost.py

# Step 3 — Deploy the API
modal deploy backend/modal_app.py
```

### Quick Smoke Test

```bash
BASE="https://YOUR-MODAL-APP-URL"
curl -sS "$BASE/data-info" | python3 -m json.tool
```

You should see a JSON response with `data_date`, `forecast_date_1m/3m/6m`, and `zipcodes` count. If this works, the backend is live.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    Modal Cloud                       │
│                                                      │
│  ┌──────────────┐    ┌───────────────────────────┐  │
│  │ modal_app.py │───▶│ main.py (FastAPI)          │  │
│  │  ASGI wrapper│    │  10 API endpoints          │  │
│  └──────────────┘    │  XGBoost inference         │  │
│                      │  Bedroom/Bathroom scaling   │  │
│                      │  Mortgage rate passthrough   │  │
│                      └──────────┬────────────────┘  │
│                                 │                    │
│                      ┌──────────▼────────────────┐  │
│                      │ Volume: real-estate-data   │  │
│                      │  /data/dallas_clean.csv    │  │
│                      │  /models/xgboost_*.pkl     │  │
│                      │  /models/latest_data.pkl   │  │
│                      └───────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

**Key data flow:**
1. `refresh_data.py` downloads Zillow ZHVI CSVs + FRED 30-year mortgage rate → merges into `dallas_clean.csv`
2. `train_xgboost.py` trains 3 regressors (1m/3m/6m) using **15 features** (including `mortgage_rate_30y`) → saves `.pkl` artifacts
3. `main.py` loads models + data at startup, serves predictions via FastAPI

---

## Setup & Deployment

### Deploy the Backend

```bash
modal deploy backend/modal_app.py
```

Copy the URL from the output. It will look like:
```
https://YOUR-WORKSPACE--real-estate-predictor-fastapi-app.modal.run
```

### Set Your Base URL

For all demo commands below, set this once:

```bash
export BASE="https://YOUR-MODAL-APP-URL"
```

---

## Demo Script

### Part 1: Health Check & Metadata

**What to show:** The API is live and self-describing.

```bash
# Dataset metadata
curl -sS "$BASE/data-info" | python3 -m json.tool
```

**Expected output:**
```json
{
    "data_date": "2026-02-28",
    "forecast_date_1m": "2026-03-01",
    "forecast_date_3m": "2026-05-01",
    "forecast_date_6m": "2026-08-01",
    "zipcodes": 113
}
```

**Talking point:** "Our dataset covers 113 Dallas-area zipcodes. The data pipeline automatically pulls the latest Zillow Home Value Index data and FRED mortgage rates, so our predictions always use the most current information."

```bash
# List available zipcodes
curl -sS "$BASE/zipcodes" | python3 -m json.tool | head -20
```

---

### Part 2: Core Prediction (Bedroom + Bathroom)

**What to show:** The main prediction endpoint with bedroom and bathroom selection.

#### Basic 3-bedroom, 2-bathroom prediction

```bash
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 2}' \
  | python3 -m json.tool
```

**Expected response highlights:**
- `current_price` — the current bedroom-tier ZHVI adjusted for bathroom count
- `forecasts` — array with 1m, 3m, 6m predictions (price, dollar change, percent change, direction)
- `direction_1m` — direction signal with confidence score
- `direction_explanation` — plain-English summary of the prediction
- `current_mortgage_rate` — 30-year fixed mortgage rate from FRED

**Talking point:** "Each prediction returns three time horizons. The model predicts the overall ZHVI, then scales to the specific bedroom tier using current price ratios, and finally applies the NAHB-derived bathroom multiplier."

#### Show bathroom impact

```bash
# 1-bathroom home (multiplier ~0.81)
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 1}' \
  | python3 -m json.tool

# 4-bathroom home (multiplier ~1.45)
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 4}' \
  | python3 -m json.tool
```

**Talking point:** "Bathroom adjustment uses NAHB (National Association of Home Builders) multipliers. A 1-bath 3BR home is valued at roughly 81% of the 2-bath baseline, while a 4-bath home is about 145%. These multipliers are derived from the American Housing Survey."

#### Show bedroom tier comparison

```bash
# Compare all bedroom tiers for the same zipcode
for BR in 2 3 4 5; do
  echo "--- $BR Bedrooms ---"
  curl -sS -X POST "$BASE/predict" \
    -H "Content-Type: application/json" \
    -d "{\"zipcode\": \"75252\", \"bedrooms\": $BR, \"bathrooms\": 2}" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'  Current: \${d[\"current_price\"]:,.0f}  |  1m: \${d[\"forecasts\"][0][\"predicted_price\"]:,.0f} ({d[\"forecasts\"][0][\"predicted_change_pct\"]:+.2f}%)')"
done
```

**Talking point:** "Each bedroom tier uses a separate Zillow ZHVI column, so the price differences are based on real market data — not a generic multiplier. 2BR, 3BR, 4BR, and 5+BR each have their own historical time series."

---

### Part 3: Mortgage Rate Feature

**What to show:** Mortgage rates are integrated into the model as a training feature AND surfaced in the API response.

```bash
# Show the mortgage rate in the prediction response
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 2}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Current mortgage rate: {d[\"current_mortgage_rate\"]}%')
print(f'Data date: {d[\"data_date\"]}')
print(f'Current price: \${d[\"current_price\"]:,.0f}')
"
```

**Talking points:**
- "We integrated the FRED MORTGAGE30US data — the 30-year fixed mortgage rate published weekly by Freddie Mac."
- "The `refresh_data.py` pipeline downloads this data from FRED, resamples from weekly to monthly averages, and merges it with our Zillow data."
- "The mortgage rate is one of our 15 model features. The XGBoost model learns how rate changes correlate with home price movements."
- "The current rate is passed through in the `/predict` response so the frontend can display contextual information about the rate environment."

#### Show mortgage rate as a model feature

```bash
# Model info shows top feature importances — mortgage rate may appear
curl -sS "$BASE/model-info" | python3 -m json.tool
```

```bash
# Detailed importances for all 3 horizons — find mortgage_rate_30y
curl -sS "$BASE/model-info-detailed" | python3 -c "
import sys, json
data = json.load(sys.stdin)
for horizon in ['1m', '3m', '6m']:
    features = data[horizon]
    mortgage = next((f for f in features if 'Mortgage' in f['feature']), None)
    rank = next(i+1 for i, f in enumerate(features) if 'Mortgage' in f['feature'])
    print(f'{horizon}: 30-Year Mortgage Rate — importance {mortgage[\"importance\"]:.4f} (rank #{rank}/15)')
"
```

**Talking point:** "Here you can see the mortgage rate's feature importance across all three horizons. The model weighs it alongside 14 other features including price lags, bedroom segments, and seasonal patterns."

#### Deep dive — full model config confirms the feature

```bash
curl -sS "$BASE/model-deep-dive" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print('=== Features used by the model ===')
for f in d['features']:
    marker = '  <-- NEW' if f['name'] == 'mortgage_rate_30y' else ''
    print(f'  [{f[\"category\"]:>15}]  {f[\"label\"]}{marker}')
print(f'\nTotal features: {d[\"training\"][\"num_features\"]}')
"
```

---

### Part 4: Bedroom Comparison

**What to show:** The API supports all 4 bedroom tiers (2, 3, 4, 5+) with real Zillow data.

```bash
# Side-by-side bedroom comparison for 75252
echo "=== Bedroom Price Comparison — Zip 75252, 2 Bathrooms ==="
for BR in 2 3 4 5; do
  RESULT=$(curl -sS -X POST "$BASE/predict" \
    -H "Content-Type: application/json" \
    -d "{\"zipcode\": \"75252\", \"bedrooms\": $BR, \"bathrooms\": 2}")
  echo "$RESULT" | python3 -c "
import sys, json
d = json.load(sys.stdin)
br_label = '5+' if d['bedrooms'] == 5 else str(d['bedrooms'])
print(f'  {br_label} BR: \${d[\"current_price\"]:>10,.0f}  →  1m: \${d[\"forecasts\"][0][\"predicted_price\"]:>10,.0f}  ({d[\"forecasts\"][0][\"direction\"]:>4}, {d[\"forecasts\"][0][\"predicted_change_pct\"]:+.2f}%)')
"
done
```

**Talking point:** "Unlike bathrooms, we have direct Zillow data for each bedroom count. The model predicts overall ZHVI, then scales using the real ratio between the bedroom tier and the overall index for that zipcode."

---

### Part 5: Historical Data

**What to show:** Time series data for charts, with bathroom adjustment applied consistently.

```bash
# Historical ZHVI with bathroom multiplier
curl -sS -X POST "$BASE/history" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 2}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Zipcode: {d[\"zipcode\"]} | {d[\"bedrooms\"]}BR, {d[\"bathrooms\"]}BA')
print(f'Data points: {len(d[\"data\"])} months (from {d[\"data\"][0][\"date\"]} to {d[\"data\"][-1][\"date\"]})')
print(f'Latest value: \${d[\"data\"][-1][\"zhvi\"]:,.0f}')
print(f'First 3 months: {d[\"data\"][:3]}')
"
```

```bash
# Same zip, different bathroom — values shift by multiplier
curl -sS -X POST "$BASE/history" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 3}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'{d[\"bedrooms\"]}BR, {d[\"bathrooms\"]}BA — Latest: \${d[\"data\"][-1][\"zhvi\"]:,.0f}')
"
```

**Talking point:** "The `/history` endpoint returns data from 2019 onward. Bathroom multipliers are applied to every historical data point, so the chart shows internally consistent prices for the selected configuration."

---

### Part 6: Model Transparency Endpoints

**What to show:** The backend provides full model introspection.

#### Top feature drivers

```bash
curl -sS "$BASE/model-info" | python3 -m json.tool
```

#### Accuracy metrics (RMSE, MAE, MAPE)

```bash
curl -sS "$BASE/model-metrics" | python3 -m json.tool
```

**Expected output:**
```json
{
    "1m": { "rmse": ..., "mae": ..., "mape": ... },
    "3m": { "rmse": ..., "mae": ..., "mape": ... },
    "6m": { "rmse": ..., "mae": ..., "mape": ... }
}
```

**Talking point:** "MAPE tells you the average percentage error. A 1-month MAPE of ~1% means our predictions are typically within 1% of the actual price — around $3,000–$5,000 on a $350K home."

#### XGBoost deep dive

```bash
curl -sS "$BASE/model-deep-dive" | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Algorithm: {d[\"algorithm\"][\"name\"]}')
print(f'Type: {d[\"algorithm\"][\"type\"]}')
print(f'Horizons: {d[\"training\"][\"horizons\"]}')
print(f'Features: {d[\"training\"][\"num_features\"]}')
print(f'Train rows: {d[\"training\"][\"train_rows\"]:,}')
print(f'Test rows: {d[\"training\"][\"test_rows\"]:,}')
print(f'Trees used: {d[\"training\"][\"trees_used\"]}')
print(f'Date range: {d[\"training\"][\"date_range_start\"]} → {d[\"training\"][\"date_range_end\"]}')
"
```

---

### Part 7: Backtesting & Zipcode Profile

#### Backtest — how accurate were we historically for this zip?

```bash
curl -sS -X POST "$BASE/backtest" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 2}' \
  | python3 -c "
import sys, json
d = json.load(sys.stdin)
print(f'Backtest: {d[\"zipcode\"]} ({d[\"bedrooms\"]}BR, {d[\"bathrooms\"]}BA)')
print(f'Months tested: {len(d[\"data\"])}')
print(f'Avg error: \${d[\"avg_error_dollars\"]:,.0f} ({d[\"avg_error_pct\"]:.2f}%)')
print('Last 3 months:')
for r in d['data'][-3:]:
    print(f'  {r[\"date\"]}: predicted \${r[\"predicted\"]:,.0f} vs actual \${r[\"actual\"]:,.0f} (error {r[\"error_pct\"]:.2f}%)')
"
```

**Talking point:** "The backtest endpoint re-runs the 1-month model on historical data for a specific zipcode and compares predictions against what actually happened. This gives per-zip accuracy context."

#### Zipcode profile — volatility and seasonality

```bash
curl -sS -X POST "$BASE/zipcode-profile" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 3, "bathrooms": 2}' \
  | python3 -m json.tool
```

**Talking point:** "This endpoint ranks the zipcode's price volatility against all 113 zips and returns monthly seasonal patterns. A higher volatility percentile means the zip is more predictable — fewer volatile zips are harder to forecast."

---

## Talking Points for Each Feature

### Mortgage Rate Integration

| Aspect | Detail |
|--------|--------|
| **Data source** | FRED MORTGAGE30US (Freddie Mac, published weekly) |
| **Pipeline** | `refresh_data.py` downloads from FRED, resamples weekly→monthly, merges with Zillow |
| **Model role** | One of 15 features in XGBoost regressors (1m, 3m, 6m) |
| **API surface** | `current_mortgage_rate` field in `/predict` response |
| **Feature name** | `mortgage_rate_30y` (internal) / "30-Year Mortgage Rate" (display) |
| **Category** | "economic" — the only macroeconomic feature in the model |
| **Why it matters** | Mortgage rates directly affect buying power and housing demand |

### Bedroom Count

| Aspect | Detail |
|--------|--------|
| **Data source** | Zillow ZHVI by bedroom count (2BR, 3BR, 4BR, 5+BR) — real monthly indices |
| **Pipeline** | Each bedroom tier has its own Zillow CSV, downloaded and merged per zip |
| **Model role** | Bedroom ZHVI columns are both features AND the scaling denominator for predictions |
| **Scaling** | `predicted_zhvi * (current_br / current_zhvi)` — ratio-based |
| **Why it matters** | A 2BR and 5BR in the same zip can have very different price trajectories |

### Bathroom Count

| Aspect | Detail |
|--------|--------|
| **Data source** | NAHB House Price Estimator (American Housing Survey, Census/HUD) |
| **Approach** | Post-prediction multiplier (no separate model) |
| **Multipliers** | 1-bath: ~0.81x, 2-bath: 1.00x (baseline), 3-bath: ~1.21x, 4-bath: ~1.45x |
| **Why multiplier, not model?** | No public monthly index for bathrooms exists (we checked Zillow, Redfin, Realtor.com, Census, FHFA) |

---

## Error Handling Demo

Show the API handles bad input gracefully:

```bash
# Invalid zipcode format
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "abc", "bedrooms": 3}' | python3 -m json.tool

# Unknown zipcode (valid format, not in dataset)
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "00000", "bedrooms": 3}' | python3 -m json.tool

# Invalid bedroom count
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"zipcode": "75252", "bedrooms": 1}' | python3 -m json.tool

# Missing required field
curl -sS -X POST "$BASE/predict" \
  -H "Content-Type: application/json" \
  -d '{"bedrooms": 3}' | python3 -m json.tool
```

**Expected behaviors:**
- `"abc"` → 422 validation error (must be 5-digit string)
- `"00000"` → 404 (zipcode not found in dataset)
- `bedrooms: 1` → 422 validation error (must be 2, 3, 4, or 5)
- Missing zipcode → 422 validation error (field required)

---

## Quick Command Reference

Set once:
```bash
export BASE="https://YOUR-MODAL-APP-URL"
export ZIP=75252
export BR=3
export BA=2
```

| What | Command |
|------|---------|
| **Deploy** | `modal deploy backend/modal_app.py` |
| **Refresh data** | `modal run backend/refresh_data.py` |
| **Retrain models** | `modal run backend/train_xgboost.py` |
| **Dataset info** | `curl -sS "$BASE/data-info" \| python3 -m json.tool` |
| **All zipcodes** | `curl -sS "$BASE/zipcodes" \| python3 -m json.tool` |
| **Predict** | `curl -sS -X POST "$BASE/predict" -H "Content-Type: application/json" -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}" \| python3 -m json.tool` |
| **History** | `curl -sS -X POST "$BASE/history" -H "Content-Type: application/json" -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}" \| python3 -m json.tool` |
| **Backtest** | `curl -sS -X POST "$BASE/backtest" -H "Content-Type: application/json" -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}" \| python3 -m json.tool` |
| **Zipcode profile** | `curl -sS -X POST "$BASE/zipcode-profile" -H "Content-Type: application/json" -d "{\"zipcode\":\"$ZIP\",\"bedrooms\":$BR,\"bathrooms\":$BA}" \| python3 -m json.tool` |
| **Model info** | `curl -sS "$BASE/model-info" \| python3 -m json.tool` |
| **Model metrics** | `curl -sS "$BASE/model-metrics" \| python3 -m json.tool` |
| **Detailed importances** | `curl -sS "$BASE/model-info-detailed" \| python3 -m json.tool` |
| **Deep dive** | `curl -sS "$BASE/model-deep-dive" \| python3 -m json.tool` |

---

## Data Pipeline Summary

```
┌──────────────────────────────────────────────────────────────────┐
│  refresh_data.py                                                  │
│                                                                    │
│  Zillow ZHVI CSVs (7 files)                                      │
│    ├─ Overall ZHVI                                                │
│    ├─ 2BR, 3BR, 4BR, 5+BR                                       │
│    ├─ Top tier, Bottom tier                                       │
│    │                                                              │
│    └─ Melt wide→long, filter Dallas metro, merge on (Zip, Date)  │
│                                                                    │
│  FRED MORTGAGE30US                                                │
│    └─ Resample weekly→monthly, merge on Date, ffill/bfill        │
│                                                                    │
│  ──▶ Engineer features (lags, momentum, temporal)                 │
│  ──▶ Save dallas_clean.csv, train.csv, test.csv, latest_data.pkl │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│  train_xgboost.py                                                 │
│                                                                    │
│  15 features (including mortgage_rate_30y)                        │
│  3 horizons: 1-month, 3-month, 6-month                           │
│  Split: pre-2025 = train, 2025+ = test                           │
│  Early stopping: best of up to 1000 trees                        │
│                                                                    │
│  ──▶ Save xgboost_1m.pkl, xgboost_3m.pkl, xgboost_6m.pkl       │
│  ──▶ Save latest_data.pkl (one row per zip, most recent date)    │
└──────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────────┐
│  main.py (FastAPI, served via modal_app.py)                       │
│                                                                    │
│  Loads pickles + CSV at startup                                   │
│  Predicts ZHVI → scales to bedroom → applies bathroom multiplier │
│  Returns mortgage rate, direction, confidence, explanations       │
│  10 endpoints, CORS open, no auth required                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Suggested Demo Zipcodes

| Zipcode | City | Notes |
|---------|------|-------|
| 75252 | Plano | Popular suburban, good baseline demo |
| 75201 | Dallas | Urban core, different price dynamics |
| 75225 | Dallas (Highland Park area) | High-value zip, luxury tier |
| 75070 | McKinney | Growth area, may show stronger upward trends |
| 75034 | Frisco | Rapidly growing suburb |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 500 error on all endpoints | Models not loaded — check that `refresh_data.py` and `train_xgboost.py` were run on Modal volume |
| `current_mortgage_rate` is null | Mortgage rate column missing from data — re-run `modal run backend/refresh_data.py` then `modal run backend/train_xgboost.py` |
| 404 on a zipcode | That zip is not in the Dallas metro dataset — use `/zipcodes` to check available zips |
| Stale data date | Re-run `modal run backend/refresh_data.py` to pull latest Zillow + FRED data, then redeploy |
| Deploy fails | Check Modal token (`modal token new`), check `backend/requirements.txt` versions match |
