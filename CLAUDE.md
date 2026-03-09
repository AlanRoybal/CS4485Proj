# Real Estate Market Analyzer — Project Guide
**UT Dallas UTDesign Capstone | Spring 2026 | Advisor: Muhammad Ikram**

> This file is the single source of truth for everything that needs to be built.
> Reference it when starting any new task or picking up work from another team member.

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

## Current Status (Week 5 of 9)

| Component | Status | Notes |
|---|---|---|
| Raw data cleaning | ✅ Done | `clean_and_merge_zillow.py` |
| Feature engineering | ✅ Done | `prepare_training_data.py` |
| Train/test CSVs on Volume | ✅ Done | `/mnt/real-estate-data/data/` |
| Logistic Regression baseline | ✅ Done | 75.82% acc, 0.8231 AUC |
| Baseline saved to Volume | ✅ Done | `/mnt/real-estate-data/models/baseline_logreg.pkl` |
| XGBoost model | 🔲 Not started | Next priority |
| Modal prediction endpoints | 🔲 Not started | After XGBoost |
| Next.js frontend | 🔲 Not started | Can start in parallel |
| Frontend ↔ Modal connection | 🔲 Not started | Phase III |
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
  baseline_logreg.pkl  — model + scaler + feature list bundled together
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

## Backend (Modal)

### What needs to be built

#### 1. XGBoost Regressor — `train_xgboost.py`
- **Target:** `target_zhvi_1m` (actual dollar price next month)
- **Task:** Regression, not classification
- **Features:** Same 14 features as Logistic Regression baseline
- **Must beat:** Baseline accuracy of 75.82% and AUC of 0.8231 to justify use
- **Evaluate with:** RMSE, MAE, MAPE on test set
- **Address:** Known weakness of baseline — poor recall on "Up" class (61%). Use `scale_pos_weight` or SMOTE
- **Save to Volume:** `/mnt/real-estate-data/models/xgboost_1m.pkl`

```python
# Starter structure
import xgboost as xgb
from sklearn.metrics import mean_squared_error, mean_absolute_error
import pandas as pd, numpy as np, joblib, os

train_df = pd.read_csv('/mnt/real-estate-data/data/train.csv')
test_df  = pd.read_csv('/mnt/real-estate-data/data/test.csv')

FEATURES = [ ... ]  # same 14 as baseline
TARGET = 'target_zhvi_1m'

X_train, y_train = train_df[FEATURES].dropna(), train_df[TARGET]
X_test,  y_test  = test_df[FEATURES].dropna(),  test_df[TARGET]

model = xgb.XGBRegressor(n_estimators=500, learning_rate=0.05, random_state=42)
model.fit(X_train, y_train)

preds = model.predict(X_test)
rmse = np.sqrt(mean_squared_error(y_test, preds))
mae  = mean_absolute_error(y_test, preds)
mape = np.mean(np.abs((y_test - preds) / y_test)) * 100
print(f"RMSE: {rmse:.2f} | MAE: {mae:.2f} | MAPE: {mape:.2f}%")

os.makedirs('/mnt/real-estate-data/models', exist_ok=True)
joblib.dump({'model': model, 'features': FEATURES}, '/mnt/real-estate-data/models/xgboost_1m.pkl')
```

#### 2. Prediction Endpoint — `predict.py`
Modal web endpoint that the Next.js frontend calls.

- **Input:** `{ zipcode: "75252", bedrooms: 3 }`
- **Output:**
```json
{
  "zipcode": "75252",
  "bedrooms": 3,
  "predicted_price": 412500.00,
  "direction": "up",
  "confidence": 0.73,
  "current_price": 405000.00,
  "predicted_change_dollars": 7500.00,
  "predicted_change_pct": 1.85
}
```
- Load both models from Volume on startup
- Use the same `FEATURES` list and scaler from the saved `.pkl` files
- Validate zipcode is in the allowed list of 113 curated Dallas zipcodes

```python
import modal

app = modal.App("real-estate-predict")
volume = modal.Volume.from_name("real-estate-data")

image = modal.Image.debian_slim().pip_install(
    "pandas", "scikit-learn", "xgboost", "joblib"
)

@app.function(image=image, volumes={"/mnt/real-estate-data": volume})
@modal.web_endpoint(method="POST")
def predict(data: dict):
    import joblib, pandas as pd

    xgb_artifacts  = joblib.load('/mnt/real-estate-data/models/xgboost_1m.pkl')
    logreg_artifacts = joblib.load('/mnt/real-estate-data/models/baseline_logreg.pkl')

    # build feature row from zipcode + bedrooms
    # run both models
    # return combined response
    ...
```

#### 3. History Endpoint — `history.py`
Returns historical ZHVI data for a given zipcode (for the chart on the frontend).

- **Input:** `{ zipcode: "75252", bedrooms: 3 }`
- **Output:** Array of `{ date, zhvi }` objects for the past 5 years
- Reads directly from `dallas_clean.csv` on the Volume
- Filter by zipcode, select the right bedroom column based on input

```python
@app.function(image=image, volumes={"/mnt/real-estate-data": volume})
@modal.web_endpoint(method="POST")
def history(data: dict):
    import pandas as pd

    df = pd.read_csv('/mnt/real-estate-data/data/dallas_clean.csv')
    zipcode  = data['zipcode']
    bedrooms = data['bedrooms']

    bedroom_col_map = { 2: 'zhvi_2br', 3: 'zhvi_3br', 4: 'zhvi_4br', 5: 'zhvi_5br_plus' }
    price_col = bedroom_col_map.get(bedrooms, 'ZHVI')

    filtered = df[df['ZipCode'] == int(zipcode)][['Date', price_col]].dropna()
    filtered = filtered.rename(columns={price_col: 'zhvi'})
    filtered = filtered[filtered['Date'] >= '2019-01-01']

    return filtered.to_dict(orient='records')
```

### Deploying endpoints
```bash
modal deploy predict.py
modal deploy history.py
```
This gives you two public HTTPS URLs to plug into the Next.js API routes.

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
Main output page. Receives zipcode and bedroom count, calls both Modal endpoints, renders results.

Sections to build:
1. **Header** — zipcode, city name, current price, year-over-year change
2. **Historical price chart** — line chart from `history` endpoint, last 5 years of ZHVI
3. **Forecast callout** — predicted price next month, dollar change, percent change
4. **Confidence gauge** — directional signal from Logistic Regression ("73% confidence prices will rise")
5. **Bedroom breakdown** — small cards showing current 2br/3br/4br/5br+ prices for this zipcode

#### `app/api/predict/route.ts` — API Route (proxy to Modal)
```typescript
export async function POST(req: Request) {
  const body = await req.json();

  const res = await fetch(process.env.MODAL_PREDICT_URL!, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  return Response.json(data);
}
```

#### `app/api/history/route.ts` — API Route (proxy to Modal)
Same pattern as above, calls `process.env.MODAL_HISTORY_URL`.

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
```
MODAL_PREDICT_URL=https://your-workspace--real-estate-predict.modal.run
MODAL_HISTORY_URL=https://your-workspace--real-estate-history.modal.run
```

### Zipcode validation
Use `dallas_zipcodes_reference.xlsx` (113 curated core Dallas zipcodes) for frontend validation.  
Convert to a static JSON file `lib/dallas-zipcodes.json` and validate on form submit before calling any endpoint.

---

## What Comes After XGBoost

Once XGBoost is trained and the endpoints are built, the remaining work is:

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
| Baseline model | Logistic Regression 75.82% / 0.8231 AUC | Floor that XGBoost must beat |
| Zipcode scope | 113 curated core Dallas zipcodes (frontend) | Trains on 255, serves 113 for cleaner UX |
| Frontend stack | Next.js + Tailwind + Recharts on Vercel | Team decision, strong ecosystem |
| Backend stack | Modal serverless | No infra to manage, direct Volume access |

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
│       │   └── route.ts   ← Proxy to Modal predict endpoint
│       └── history/
│           └── route.ts   ← Proxy to Modal history endpoint
├── components/
│   ├── PriceChart.tsx
│   ├── ConfidenceGauge.tsx
│   └── BedroomCards.tsx
├── lib/
│   └── dallas-zipcodes.json   ← 113 valid zipcodes for validation
├── .env.local                 ← Modal endpoint URLs (never commit)
│
/modal/                    ← Modal Python scripts (separate from Next.js)
├── train_baseline.py      ← Logistic Regression (DONE)
├── train_xgboost.py       ← XGBoost regressor (TODO)
├── predict.py             ← Prediction web endpoint (TODO)
└── history.py             ← History web endpoint (TODO)
```
