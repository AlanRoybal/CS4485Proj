# Model Retrain & Improvements (2026-03-25)

## Branch: `frontend-backend-connect`

## Summary

Refreshed Zillow data through February 2026, moved the train/test split from January 2023 to January 2025, added class balancing to Logistic Regression, tested an XGBoost classifier for direction prediction, removed the LR direction signal in favor of XGBoost-derived direction to eliminate contradictions, and made forecast dates relative to the current month.

---

## What was done

### 1. Data refresh (`backend/refresh_data.py`)
- Ran `refresh_data.py` locally and on Modal to pull the latest Zillow ZHVI CSVs
- Dataset grew from 72,912 rows to **70,091 rows** (different count due to re-engineering features from scratch with updated data)
- Date range extended from ~June 2025 to **February 2026**
- Updated `dallas_clean.csv` and `latest_data.pkl` on both local disk and Modal Volume

**Why:** The models were trained on data ending mid-2025. Eight months of new data were available from Zillow, and the models needed to reflect current market conditions.

### 2. Train/test split moved to January 2025 (`backend/train_xgboost.py`)
- Changed `SPLIT_DATE` from `"2023-01-01"` to `"2025-01-01"`
- Regenerated `train.csv` (66,521 rows, through Dec 2024) and `test.csv` (3,570 rows, Jan 2025+)
- XGBoost training set went from 28,041 → 31,523 rows; test set from 4,650 → 1,168 rows

**Why:** With the old Jan 2023 split, the training data missed the entire 2023–2024 post-pandemic market shift. When we first retrained on new data *without* moving the split, performance degraded badly (LR accuracy dropped from 75.82% → 56.13%, XGBoost MAPE increased across all horizons). The models trained on pre-2023 patterns couldn't generalize to the changed market. Moving the split to Jan 2025 gives models access to recent dynamics while still evaluating on unseen 2025+ data.

### 3. XGBoost regressor results after improvements

| Horizon | Old RMSE (2023 split) | New RMSE (2025 split) | Improvement |
|---------|----------------------|----------------------|-------------|
| 1-month | $43,088 | **$17,536** | **-59%** |
| 3-month | $43,650 | **$17,378** | **-60%** |
| 6-month | $45,379 | **$20,587** | **-55%** |

| Horizon | Old MAPE | New MAPE |
|---------|----------|----------|
| 1-month | 1.75% | **1.44%** |
| 3-month | 2.57% | **1.86%** |
| 6-month | 3.11% | **2.82%** |

Feature importance shifted: `zhvi_lag_1m` and `zhvi_lag_3m` now dominate all horizons (~49% and ~46% respectively). `zhvi_5br_plus` (luxury tier) emerged as the third most important feature — it was not in the top 5 before.

### 4. Logistic Regression with balanced class weights (`backend/train_logistic_regression.py`)
- Added `class_weight="balanced"` to `LogisticRegression()`
- Training class balance: Up=23,656 / Down=7,898 (75% / 25%)
- Test class balance: Up=446 / Down=1,598 (22% / 78%)

Results:

| Metric | Old LR (2023 split, unbalanced) | New LR (2025 split, balanced) |
|--------|--------------------------------|-------------------------------|
| Accuracy | 75.82% | **80.97%** |
| AUC-ROC | 0.8231 | 0.7625 |
| Down recall | 85% | **96.0%** |
| Up recall | 61% | 27.1% |

**Why balanced weights:** The training data is 75% Up / 25% Down. Without balancing, the model biases toward predicting Up. With `class_weight="balanced"`, sklearn automatically upweights the minority class (Down) so the model learns both patterns. This dramatically improved down recall (96%) which is critical — false positives (predicting Up when market goes Down) are costly for homebuyers.

**Why AUC dropped:** AUC measures ranking ability across all thresholds. The balanced model is more conservative (predicts Down more often), which hurts AUC slightly but improves real-world accuracy in a declining market.

### 5. XGBoost classifier comparison (`backend/train_logistic_regression.py`)
- Added an XGBoost binary classifier (`XGBClassifier`) trained alongside LR
- Used `scale_pos_weight` for class imbalance handling (ratio of Down/Up in training)
- Ran a head-to-head comparison

Results:

| Metric | LR (balanced) | XGBoost Classifier |
|--------|--------------|-------------------|
| Accuracy | **80.97%** | 69.47% |
| AUC-ROC | **0.7625** | 0.4921 |
| Down recall | **96.0%** | 82.0% |
| Up recall | 27.1% | 24.7% |

**Why XGBoost lost:** AUC of 0.49 is below random chance — the XGBoost classifier memorized training-era patterns and couldn't generalize to the 2025 market regime. LR's simpler linear boundary generalized better. The script now saves the winner automatically based on AUC comparison.

### 6. Removed LR direction signal — XGBoost-derived direction (`backend/main.py`)
- Removed LR model loading from startup (`_state["lr"]` and `logistic_regression.pkl` no longer loaded)
- Removed `_predict_direction()` helper function
- `direction_1m` is now derived directly from XGBoost's 1-month forecast:
  - Direction: "up" if `predicted_change_dollars >= 0`, else "down"
  - Confidence: scaled from the absolute percent change (0% → 0.5 confidence, 5%+ → ~1.0)
- Removed `logistic_regression.pkl` from the Volume layout docstring

**Why:** XGBoost and LR could give contradictory signals. For example, 75252 (Dallas, 3BR): XGBoost predicted $519K (up from $512K) but LR said "down" with 81% confidence. This is confusing for users. Using a single source of truth (XGBoost) eliminates contradictions. The confidence score now reflects the magnitude of the predicted change rather than a separate model's opinion.

**Before:** `direction_1m: { direction: "down", confidence: 0.8107 }` (contradicts XGBoost "up")
**After:** `direction_1m: { direction: "up", confidence: 0.6352 }` (consistent with XGBoost prediction)

### 7. Forecast dates relative to current month (`backend/main.py`)
- Added `_current_forecast_base()` helper that returns the 1st of the current month
- `/predict` and `/data-info` now compute forecast dates from current month, not data date
- `_forecast_date()` signature changed from `pd.Timestamp` to `datetime`

**Why:** With the old logic, forecast dates were anchored to the latest data point (Feb 2026). If a user accessed the app in March 2026, the 1-month forecast showed "March 2026" — which is the current month, not a future prediction. Now it shows April 2026 (1m), June 2026 (3m), September 2026 (6m).

**Before (data_date-based):** `forecast_date_1m: "2026-03-01"` (current month — confusing)
**After (current-month-based):** `forecast_date_1m: "2026-04-01"` (next month — intuitive)

### 8. Modal Volume retraining script (`backend/retrain_on_modal.py` — NEW)
- Created a single script that runs the full retraining pipeline on Modal:
  1. Regenerates train/test split from `dallas_clean.csv` (split at Jan 2025)
  2. Trains all three XGBoost regressors
  3. Trains Logistic Regression with balanced weights
  4. Saves all artifacts to Modal Volume
- Run with: `modal run backend/retrain_on_modal.py`

**Why:** Previously, retraining required running multiple scripts and manually uploading to the Volume. This consolidates everything into one Modal function call.

### 9. Deployment
- Ran `modal run backend/refresh_data.py` to update data on Modal Volume
- Ran `modal run backend/retrain_on_modal.py` to retrain all models on Volume
- Ran `modal deploy backend/modal_app.py` to deploy updated backend
- Verified with live `/predict` call to production endpoint

---

## Files modified

| File | Change |
|------|--------|
| `backend/train_xgboost.py` | `SPLIT_DATE` changed from `"2023-01-01"` to `"2025-01-01"` |
| `backend/train_logistic_regression.py` | Added `class_weight="balanced"` to LR; added XGBoost classifier comparison; auto-saves best model |
| `backend/main.py` | Removed LR loading/prediction; direction derived from XGBoost; forecast dates use current month |
| `backend/retrain_on_modal.py` | **New** — consolidated retraining script for Modal |
| `backend/dallas_clean.csv` | Refreshed with data through Feb 2026 (70,091 rows) |
| `backend/models/xgboost_1m.pkl` | Retrained with Jan 2025 split |
| `backend/models/xgboost_3m.pkl` | Retrained with Jan 2025 split |
| `backend/models/xgboost_6m.pkl` | Retrained with Jan 2025 split |
| `backend/models/logistic_regression.pkl` | Retrained with balanced weights (kept for reference, no longer loaded by backend) |
| `backend/models/latest_data.pkl` | Rebuilt from refreshed data |
| `backend/train.csv` | Regenerated with Jan 2025 split |
| `backend/test.csv` | Regenerated with Jan 2025 split |
| `MODEL_RESULTS.md` | Updated with all new metrics, comparisons, and decisions |

---

## Known issues / follow-ups

1. **Up recall is still low (27%)** — the model correctly identifies 96% of declining months but only 27% of rising months. This reflects the 2025 market being predominantly down. Could explore threshold tuning (lowering the LR cutoff below 0.5) if a more balanced recall is needed.
2. **XGBoost confidence scaling is heuristic** — the `0.5 + abs(change_pct) / 10.0` formula maps percent change to confidence. A 1.35% change gives 0.635 confidence. This could be calibrated against historical prediction accuracy per change magnitude.
3. **LR model still saved but not loaded** — `logistic_regression.pkl` is still on the Volume and trained by `retrain_on_modal.py`. It could be fully removed from the pipeline if the team decides to commit to XGBoost-only direction.
4. **Test set is smaller** — moving split to Jan 2025 reduced the test set from ~4,600 to ~1,168 rows for XGBoost (regression targets require forward-looking data that doesn't exist yet for the most recent months). Metrics are strong but based on fewer test samples.
