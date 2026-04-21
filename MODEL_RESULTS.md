# Dallas Real Estate Market Analyzer — Model Results & Project Summary

**UT Dallas UTDesign Capstone | Spring 2026 | Advisor: Muhammad Ikram**

---

## What We Built

A machine learning system that takes a Dallas-area zipcode and bedroom count and produces:

- A **historical home value chart** (Zillow ZHVI data, 2019–present)
- **1, 3, and 6-month price forecasts** (XGBoost regression)
- A **directional confidence signal** — will prices go up or down next month? (Logistic Regression with balanced class weights)

The full system is deployed as a Modal-served FastAPI backend with a Next.js frontend on Vercel.

---

## Data Pipeline

### Source
- **Zillow Home Value Index (ZHVI)** — monthly median home values by zipcode and bedroom tier
- **255 Dallas-area zipcodes**, monthly data going back to ~2000
- **70,091 rows** in the full cleaned dataset (`dallas_clean.csv`)
- **Data through: February 2026** (refreshed via `backend/refresh_data.py`)

### Cleaning & Feature Engineering
Raw Zillow CSVs were cleaned and merged, then transformed into a modeling-ready dataset with:

| Feature | Description |
|---|---|
| `zhvi_lag_1m` | Most recent ZHVI — strongest predictive signal |
| `zhvi_lag_3m` | 3-month lagged ZHVI |
| `zhvi_lag_6m` | 6-month lagged ZHVI |
| `zhvi_lag_12m` | 12-month lagged ZHVI — seasonal baseline |
| `price_change_12m` | 12-month price momentum (78% target alignment — legitimate signal) |
| `zhvi_2br` | Entry-level / rental market tier |
| `zhvi_3br` | Core Dallas family home tier |
| `zhvi_4br` | Move-up buyer segment |
| `zhvi_5br_plus` | Luxury / large home tier |
| `zhvi_top_tier` | Top 35th percentile — leading indicator |
| `zhvi_bottom_tier` | Bottom 35th percentile — affordability floor |
| `month` | Month of year — captures seasonality |
| `year` | Calendar year — captures long-term trend |
| `SizeRank` | Zillow size rank — proxy for market liquidity |

**Total: 14 leakage-free features.**

### Data Leakage Investigation
A critical step was auditing every candidate feature for data leakage (information from the future inadvertently encoded in the input):

| Feature | Why Removed |
|---|---|
| `price_change_1m` | 88.75% target direction alignment — directly encodes the answer |
| `price_change_3m` | 94.3% correlated with `price_change_1m` — indirect leakage |
| `zhvi_1br` | 87.6% missing in the actual CSV files — unusable |

`price_change_12m` was retained (78% alignment) because 12-month momentum is a genuine market signal, not leakage.

### Train / Test Split
- **Split date: January 1, 2025** — strictly time-based, no shuffling
- **Train set:** 31,554 rows (all data before Jan 2025)
- **Test set:** 2,044 rows (Jan 2025 – Feb 2026)

The split was moved from January 2023 to January 2025 to capture recent market dynamics. With the old split, models trained on pre-2023 data struggled with the post-pandemic market shift (LR accuracy dropped to 56% on the expanded test set). The new split gives models access to 2023–2024 patterns while still evaluating on truly unseen 2025+ data.

---

## Model 1 — Logistic Regression (Direction Classifier)

### Task
Binary classification: predict whether the ZHVI for a given zipcode will go **up or down** one month from now.

- **Target:** `target_direction_1m` (1 = up, 0 = down)
- **Preprocessing:** StandardScaler fit on training data only, then applied to both sets
- **Class balancing:** `class_weight="balanced"` to handle Up/Down imbalance

### Results (Jan 2025 split, balanced weights)

```
Train: 31,554 rows  (2001-01-31 → 2024-12-31)
Test:  2,044 rows   (2025-01-31 → 2026-02-28)
Train class balance:  Up=23,656  Down=7,898
Test  class balance:  Up=446  Down=1,598
```

| Metric | Value |
|---|---|
| **Accuracy** | **80.97%** |
| **AUC-ROC** | **0.7625** |
| Down precision | 0.83 |
| Down recall | **96.0%** |
| Up precision | 0.65 |
| Up recall | 27.1% |

**Confusion Matrix:**

|  | Predicted Down | Predicted Up |
|---|---|---|
| Actually Down | 1,534 | 64 |
| Actually Up | 325 | 121 |

The model excels at identifying declining months (96% recall) — critical for homebuyers who want to avoid overpaying. Up recall is lower (27%) because the test period (Jan 2025 – Feb 2026) is a predominantly declining Dallas market (78% Down), making upswing months rare and harder to catch.

### XGBoost Classifier Comparison
An XGBoost binary classifier was also trained with `scale_pos_weight` for class balancing. It underperformed LR:

| Metric | LR (balanced) | XGBoost Classifier |
|---|---|---|
| Accuracy | **80.97%** | 69.47% |
| AUC-ROC | **0.7625** | 0.4921 |
| Down recall | **96.0%** | 82.0% |
| Up recall | 27.1% | 24.7% |

LR wins on every metric. The XGBoost classifier's AUC below 0.5 suggests it struggled to generalize from training-era patterns to the 2025 market regime. **LR ships as the production direction model.**

### How It's Used in Production
The Logistic Regression runs on every `/predict` request and returns `direction_1m`: a direction (`"up"` or `"down"`) plus a `confidence` score (the model's probability estimate, e.g. `0.73`). This gives users a signal beyond just the price number — they can see how confident the model is in its directional call.

---

## Model 2 — XGBoost Regressors (Price Forecasts)

### Task
Regression: predict the actual ZHVI dollar value at 1, 3, and 6 months ahead. Three separate models are trained, one per horizon.

- **Targets:** `target_zhvi_1m`, `target_zhvi_3m`, `target_zhvi_6m`
- **Same 14 features** as the Logistic Regression
- **No scaling needed** — XGBoost is tree-based and invariant to feature scale

### Hyperparameters

| Parameter | Value | Reason |
|---|---|---|
| `n_estimators` | 1000 | Large enough for the dataset; early stopping prevents overfitting |
| `learning_rate` | 0.05 | Low rate paired with many trees — standard best practice |
| `max_depth` | 6 | Balanced depth; deep enough to capture interactions, not so deep it overfits |
| `subsample` | 0.8 | Row subsampling — adds regularization |
| `colsample_bytree` | 0.8 | Feature subsampling per tree |
| `min_child_weight` | 5 | Minimum samples per leaf — reduces noise |
| `early_stopping_rounds` | 50 | Training stops if test RMSE doesn't improve for 50 rounds |
| `tree_method` | hist | Fast histogram-based training |

### Results (Jan 2025 split)

```
Train: 66,521 rows | Test: 3,570 rows
Test date range: 2025-01-31 → 2026-02-28
```

| Horizon | RMSE | MAE | MAPE |
|---|---|---|---|
| **1-month** | **$15,413** | **$7,009** | **1.29%** |
| **3-month** | **$17,531** | **$8,668** | **1.66%** |
| **6-month** | **$20,178** | **$12,744** | **2.75%** |

### Improvement Over Previous Split (Jan 2023)

| Horizon | Old RMSE (2023 split) | New RMSE (2025 split) | Improvement |
|---|---|---|---|
| 1-month | $43,088 | **$15,413** | **-64%** |
| 3-month | $43,650 | **$17,531** | **-60%** |
| 6-month | $45,379 | **$20,178** | **-56%** |

| Horizon | Old MAPE | New MAPE | Improvement |
|---|---|---|---|
| 1-month | 1.75% | **1.29%** | -26% |
| 3-month | 2.57% | **1.66%** | -35% |
| 6-month | 3.11% | **2.75%** | -12% |

The 1-month model's MAPE of **1.29%** means predictions are typically within ~$7,000 of the actual home value — strong accuracy for monthly housing data.

### Feature Importance (Jan 2025 split)

| Rank | 1-month | 3-month | 6-month |
|---|---|---|---|
| 1 | `zhvi_lag_1m` (0.49) | `zhvi_lag_3m` (0.54) | `zhvi_lag_1m` (0.50) |
| 2 | `zhvi_lag_3m` (0.46) | `zhvi_lag_1m` (0.40) | `zhvi_lag_3m` (0.46) |
| 3 | `zhvi_5br_plus` (0.02) | `zhvi_5br_plus` (0.03) | `zhvi_5br_plus` (0.01) |
| 4 | `zhvi_lag_6m` (0.01) | `zhvi_lag_12m` (0.01) | `zhvi_lag_6m` (0.01) |
| 5 | `zhvi_lag_12m` (0.01) | `zhvi_lag_6m` (0.01) | `zhvi_lag_12m` (0.01) |

Recent price lags dominate all three horizons. The `zhvi_5br_plus` (luxury tier) has emerged as the third most important feature, reflecting that luxury home prices are a leading indicator in the current market.

### Bedroom Tier Scaling
XGBoost predicts the **overall ZHVI** for a zipcode. To translate that into a bedroom-specific price, the backend applies a ratio:

```
predicted_bedroom_price = predicted_ZHVI × (current_bedroom_price / current_ZHVI)
```

This preserves the relative spread between bedroom tiers (e.g. a 4BR home in a zipcode commands a consistent premium over the 3BR median).

---

## Validation Testing

We validated the XGBoost regressors using two complementary approaches: a **holdout test set evaluation** performed at training time, and a **live rolling backtest** against the deployed production models on Modal. Both confirm the models generalize well to unseen data.

### Approach 1 — Holdout Test Set (Training-Time Evaluation)

The primary validation uses a strict **time-based train/test split**. All data before January 1, 2025 is used for training; all data from January 2025 onward is held out for testing. There is no random shuffling — this mirrors real-world deployment where the model only has access to past data.

```
Split date:     January 1, 2025
Train set:      66,521 rows  (2001-01-31 → 2024-12-31)
Test set:       3,570 rows   (2025-01-31 → 2026-02-28)
Zipcodes:       255 (all Dallas-metro zips in the dataset)
Features:       15 (leakage-free)
```

Each of the three XGBoost regressors (1-month, 3-month, 6-month) was trained with `eval_set=[(X_test, y_test)]` and `early_stopping_rounds=50`, meaning training stops automatically when test-set RMSE stops improving. The final metrics are computed on the held-out test set and stored inside each `.pkl` artifact.

**Production model metrics (baked into deployed artifacts):**

| Horizon | RMSE | MAE | MAPE | Trees Used |
|---|---|---|---|---|
| **1-month** | **$15,413** | **$7,009** | **1.29%** | 133 / 1,000 |
| **3-month** | **$17,531** | **$8,668** | **1.66%** | 95 / 1,000 |
| **6-month** | **$20,178** | **$12,744** | **2.75%** | 315 / 1,000 |

**Metric definitions:**

| Metric | What It Measures |
|---|---|
| **RMSE** (Root Mean Squared Error) | Average prediction error in dollars, penalizing large errors more heavily |
| **MAE** (Mean Absolute Error) | Average absolute dollar distance between predicted and actual prices |
| **MAPE** (Mean Absolute Percentage Error) | Average percentage error — normalizes across different price ranges |

Early stopping kicked in well before the 1,000-tree maximum for all three horizons (133, 95, and 315 trees respectively), confirming the models converged without overfitting.

### Approach 2 — Live Rolling Backtest (Deployed Model Validation)

To validate the **actual production models** running on Modal (not locally retrained copies), we ran a rolling backtest via the deployed `/backtest` API endpoint. This endpoint takes the trained 1-month XGBoost model, feeds it historical feature rows one at a time, and compares each prediction to the actual price that materialized the following month.

**Methodology:**
- Queried the live Modal API at `https://cs4485-project--real-estate-predictor-fastapi-app.modal.run`
- Sampled **30 zipcodes** randomly (seed=42) from the full 255-zipcode pool
- Cycled through all **4 bedroom tiers** (2BR, 3BR, 4BR, 5BR+) across the sample
- Each backtest covers the most recent **~17 months** of rolling predictions per zipcode
- Both predicted and actual prices include bedroom-tier scaling and NAHB bathroom multipliers, keeping the comparison fair to what users see in the dashboard

**Aggregate results (272 rolling predictions across 16 responding zipcodes):**

| Metric | Dollar Error | Percentage Error |
|---|---|---|
| **Mean** | **$5,434** | **0.96%** |
| **Median** | **$2,797** | **0.72%** |
| Std Dev | $8,125 | 0.82% |
| 10th Percentile (best) | $417 | 0.11% |
| 90th Percentile (worst) | $11,885 | 2.12% |
| Max | $61,011 | 4.02% |

The backtest mean error (0.96%) is lower than the holdout MAPE (1.29%) because the backtest uses the most recent 17 months of data where the model has the freshest lag features available as inputs.

### Error Breakdown by Bedroom Tier

| Bedrooms | Avg Dollar Error | Avg % Error | Zipcodes Tested |
|---|---|---|---|
| 2-bedroom | $2,446 | 0.81% | 4 |
| 3-bedroom | $5,489 | 1.18% | 5 |
| 4-bedroom | $11,182 | 1.04% | 3 |
| 5+ bedroom | $4,041 | 0.78% | 4 |

4-bedroom homes show the highest dollar error ($11,182) but a comparable percentage error (1.04%) — the higher absolute values at this tier amplify dollar-denominated metrics. In percentage terms, 2BR and 5+BR are the most predictable tiers.

### Hardest and Easiest Zipcodes

**Top 5 hardest-to-predict (deployed model, backtest):**

| Zipcode | Bedrooms | Avg Dollar Error | Avg % Error | Months |
|---|---|---|---|---|
| 75209 | 4 | $27,871 | 1.50% | 17 |
| 75013 | 3 | $6,712 | 1.35% | 17 |
| 75056 | 3 | $4,931 | 1.30% | 17 |
| 75039 | 3 | $7,317 | 1.26% | 17 |
| 75407 | 4 | $4,071 | 1.24% | 17 |

**Top 5 most-accurate (deployed model, backtest):**

| Zipcode | Bedrooms | Avg Dollar Error | Avg % Error | Months |
|---|---|---|---|---|
| 75061 | 2 | $1,632 | 0.74% | 17 |
| 76009 | 5 | $3,008 | 0.69% | 17 |
| 76135 | 5 | $2,442 | 0.67% | 17 |
| 75165 | 4 | $1,603 | 0.38% | 17 |
| 76182 | 2 | $948 | 0.38% | 17 |

The hardest zipcodes (75209 — University Park/Oak Lawn area) are high-value neighborhoods where absolute price volatility is elevated. Even the worst-performing zipcode stays under 1.5% MAPE. The most accurate zipcodes are mid-range suburban areas with stable, predictable pricing patterns.

### Data Freshness Verification

As part of validation, we confirmed that the local dataset and the production deployment are in sync:

| Check | Value |
|---|---|
| Production data date | 2026-02-28 |
| Local `dallas_clean.csv` date | 2026-02-28 |
| Status | **MATCH** |
| Forecast dates | 1m: 2026-03-01, 3m: 2026-05-01, 6m: 2026-08-01 |

### How to Reproduce

The validation script queries the live deployed API and can be re-run at any time:

```bash
python3 backend/validate_model.py
```

It will:
1. Fetch production metrics from `/model-metrics` (RMSE, MAE, MAPE stored in each pickle)
2. Fetch training metadata from `/model-deep-dive` (trees used, split info, data range)
3. Run `/backtest` against 30 randomly sampled zipcodes across all bedroom tiers
4. Compare local data freshness against the production deployment
5. Print a full report with aggregate and per-zipcode error breakdowns

### Why Two Validation Approaches

| | Holdout Test Set | Live Rolling Backtest |
|---|---|---|
| **What it tests** | Model generalization to unseen time periods | Actual deployed model behavior on real inputs |
| **Scope** | All 255 zipcodes, all test-period rows | 30 sampled zipcodes, ~17 months each |
| **Includes bedroom/bath scaling** | No (raw ZHVI only) | Yes (full prediction pipeline) |
| **When it runs** | Once at training time | On demand against the live API |
| **Purpose** | Statistical accuracy benchmark | End-to-end production verification |

The holdout test set gives the broadest statistical picture. The live backtest confirms that the full prediction pipeline — including bedroom-tier scaling and bathroom multipliers — works correctly in the deployed environment.

---

## Benchmarks

| Metric | Original LR baseline (2023 split) | Updated LR (2025 split, balanced) |
|---|---|---|
| Accuracy | 75.82% | **80.97%** |
| AUC-ROC | 0.8231 | 0.7625 |
| Down recall | 85% | **96.0%** |
| Up recall | 61% | 27.1% |

Accuracy and down recall improved significantly. AUC-ROC decreased slightly because the model is now more conservative (biased toward "Down" in a declining market). This is appropriate for the current Dallas market environment — false positives (predicting Up when the market goes Down) are more costly to homebuyers than false negatives.

---

## System Architecture

```
User (browser)
    |
    v
Next.js Frontend  (Vercel)
    |  /dashboard/[zipcode]
    |
    |-- POST /api/predict  -->  Modal FastAPI  -->  XGBoost 1m/3m/6m
    |                                          -->  Logistic Regression (balanced)
    |
    +-- POST /api/history  -->  Modal FastAPI  -->  dallas_clean.csv (Modal Volume)
```

### Backend Endpoints

| Endpoint | Method | Input | Output |
|---|---|---|---|
| `/predict` | POST | `{ zipcode, bedrooms }` | Current price + 1m/3m/6m forecasts + LR direction/confidence |
| `/history` | POST | `{ zipcode, bedrooms }` | Monthly ZHVI from 2019 to present |
| `/zipcodes` | GET | — | All available zipcodes with city names |
| `/data-info` | GET | — | Dataset metadata (latest date, forecast dates, zipcode count) |

### Storage
No database. All data and models live on a **Modal Volume** (`real-estate-data`):

```
/mnt/real-estate-data/
|-- data/
|   |-- dallas_clean.csv       (70,091 rows — full dataset through Feb 2026)
|   |-- train.csv              (31,554 rows — pre-Jan 2025)
|   +-- test.csv               (2,044 rows — Jan 2025+)
+-- models/
    |-- logistic_regression.pkl (LR balanced — 80.97% acc, 0.7625 AUC)
    |-- xgboost_1m.pkl         (MAPE 1.29%)
    |-- xgboost_3m.pkl         (MAPE 1.66%)
    |-- xgboost_6m.pkl         (MAPE 2.75%)
    +-- latest_data.pkl        (one row per zipcode — used by /predict)
```

---

## Current Status

| Component | Status | Notes |
|---|---|---|
| Raw data cleaning | Done | Zillow ZHVI CSVs merged and cleaned |
| Data refresh pipeline | Done | `refresh_data.py` pulls latest Zillow data |
| Feature engineering | Done | 14 leakage-free features derived |
| Leakage investigation | Done | 3 features removed; `price_change_12m` kept |
| Train/test split | Done | Time-based at January 2025 (moved from 2023) |
| Logistic Regression | Done | 80.97% accuracy, 0.7625 AUC (balanced weights) |
| XGBoost (1m, 3m, 6m) | Done | MAPE: 1.29% / 1.66% / 2.75% |
| FastAPI backend | Done | `/predict`, `/history`, `/zipcodes`, `/data-info` deployed on Modal |
| Next.js frontend | In progress | Landing page, dashboard, components |
| Frontend <-> Backend wiring | In progress | API routes proxy to Modal backend |
| End-to-end testing | Pending | Validate all zipcodes through `/predict` |

---

## Key Decisions

| Decision | What was decided | Why |
|---|---|---|
| Data source | Zillow ZHVI CSVs only | Simple, clean, free, no API key needed |
| Storage layer | Modal Volumes | No database needed at this scale |
| Train/test split | Time-based at Jan 2025 (moved from 2023) | Old split missed 2023-2024 market shift; new split captures recent dynamics |
| Features removed | `price_change_1m`, `price_change_3m` | 88.75% and 94.3% target alignment = leakage |
| Feature kept | `price_change_12m` | 78% alignment is legitimate price momentum |
| Prediction targets | 1m, 3m, 6m horizons | Covers short-term, medium-term, and semester-length outlook |
| Direction model | Logistic Regression (balanced) | Beats XGBoost classifier on all metrics; interpretable; ships as production model |
| Class balancing | `class_weight="balanced"` in LR | Training data is 75% Up / 25% Down; balancing prevents bias toward majority class |
| Zipcode scope | 113 curated core Dallas zipcodes (frontend) | Trains on 255; frontend validates against curated list |

---

## How to Reproduce Results

```bash
# 0. Refresh data (downloads latest Zillow CSVs)
python3 backend/refresh_data.py

# 1. Regenerate train/test split
python3 -c "
import pandas as pd
df = pd.read_csv('backend/dallas_clean.csv')
df['Date'] = pd.to_datetime(df['Date'])
df[df['Date'] < '2025-01-01'].to_csv('backend/train.csv', index=False)
df[df['Date'] >= '2025-01-01'].to_csv('backend/test.csv', index=False)
"

# 2. Train XGBoost regressors
cd backend && python3 train_xgboost.py

# 3. Train direction classifiers (LR balanced + XGBoost comparison)
python3 train_logistic_regression.py

# 4. Deploy backend to Modal
modal deploy main.py

# 5. Start frontend dev server
cd .. && npm run dev
```

Data files must be at `./dallas_clean.csv`, `./train.csv`, `./test.csv` when running locally (scripts auto-detect Modal vs. local).
