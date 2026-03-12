"""
XGBoost training script for Dallas real estate price prediction.
Trains three regressors: 1-month, 3-month, and 6-month ahead ZHVI forecasts.

Run locally:  python3 train_xgboost.py
Run on Modal: modal run train_xgboost.py
"""
import os
import numpy as np
import pandas as pd
import xgboost as xgb
import joblib
from sklearn.metrics import mean_squared_error, mean_absolute_error

# ---------------------------------------------------------------------------
# Paths — works both locally and inside a Modal container with the volume
# ---------------------------------------------------------------------------
_ON_MODAL = os.path.exists("/mnt/real-estate-data")
DATA_DIR  = "/mnt/real-estate-data/data"  if _ON_MODAL else "."
MODEL_DIR = "/mnt/real-estate-data/models" if _ON_MODAL else "./models"
os.makedirs(MODEL_DIR, exist_ok=True)

SPLIT_DATE = "2023-01-01"   # time-based train/test boundary — do not change

# 14 leakage-free features (price_change_1m and price_change_3m excluded)
FEATURES = [
    "zhvi_lag_1m",       # most recent price
    "zhvi_lag_3m",
    "zhvi_lag_6m",
    "zhvi_lag_12m",      # seasonal baseline
    "price_change_12m",  # 12-month momentum (78% target alignment — safe)
    "zhvi_2br",          # entry-level / rental market
    "zhvi_3br",          # core Dallas family home
    "zhvi_4br",          # move-up buyer
    "zhvi_5br_plus",     # luxury tier
    "zhvi_top_tier",     # top 35th percentile — leading indicator
    "zhvi_bottom_tier",  # bottom 35th percentile — affordability floor
    "month",             # seasonality
    "year",              # long-term trend
    "SizeRank",          # market liquidity proxy
]

BEDROOM_COL = {
    2: "zhvi_2br",
    3: "zhvi_3br",
    4: "zhvi_4br",
    5: "zhvi_5br_plus",
}

# ---------------------------------------------------------------------------
# Load and prepare data
# ---------------------------------------------------------------------------
print("Loading dallas_clean.csv …")
df = pd.read_csv(f"{DATA_DIR}/dallas_clean.csv")
df["Date"] = pd.to_datetime(df["Date"])
df = df.sort_values(["ZipCode", "Date"]).reset_index(drop=True)

# Engineer 3-month and 6-month forward targets (shift ZHVI backward in time)
df["target_zhvi_3m"] = df.groupby("ZipCode")["ZHVI"].shift(-3)
df["target_zhvi_6m"] = df.groupby("ZipCode")["ZHVI"].shift(-6)

# Also engineer bedroom-specific 3m and 6m targets
for br, col in BEDROOM_COL.items():
    df[f"target_{col}_3m"] = df.groupby("ZipCode")[col].shift(-3)
    df[f"target_{col}_6m"] = df.groupby("ZipCode")[col].shift(-6)

ALL_TARGETS = [
    "target_zhvi_1m", "target_zhvi_3m", "target_zhvi_6m",
    *[f"target_{col}_3m" for col in BEDROOM_COL.values()],
    *[f"target_{col}_6m" for col in BEDROOM_COL.values()],
]

# Drop rows where any target or feature is missing
required = FEATURES + ALL_TARGETS
df_clean = df.dropna(subset=required).copy()

train_df = df_clean[df_clean["Date"] <  SPLIT_DATE]
test_df  = df_clean[df_clean["Date"] >= SPLIT_DATE]

X_train = train_df[FEATURES]
X_test  = test_df[FEATURES]

print(f"Train: {len(train_df):,} rows | Test: {len(test_df):,} rows")
print(f"Test date range: {test_df['Date'].min().date()} → {test_df['Date'].max().date()}")

# ---------------------------------------------------------------------------
# XGBoost hyper-parameters
# ---------------------------------------------------------------------------
XGB_PARAMS = dict(
    n_estimators=1000,
    learning_rate=0.05,
    max_depth=6,
    subsample=0.8,
    colsample_bytree=0.8,
    min_child_weight=5,
    reg_alpha=0.1,
    reg_lambda=1.0,
    early_stopping_rounds=50,
    random_state=42,
    n_jobs=-1,
    tree_method="hist",   # fast histogram method
)

# ---------------------------------------------------------------------------
# Train one model per prediction horizon
# ---------------------------------------------------------------------------
def rmse(y_true, y_pred):
    return np.sqrt(mean_squared_error(y_true, y_pred))

def mape(y_true, y_pred):
    mask = y_true != 0
    return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

horizons = [
    ("1m", "target_zhvi_1m"),
    ("3m", "target_zhvi_3m"),
    ("6m", "target_zhvi_6m"),
]

artifacts = {}  # will hold model + metadata for each horizon

for label, target_col in horizons:
    print(f"\n{'='*60}")
    print(f"Training XGBoost — {label} horizon  (target: {target_col})")
    print(f"{'='*60}")

    y_train = train_df[target_col].values
    y_test  = test_df[target_col].values

    model = xgb.XGBRegressor(**XGB_PARAMS)
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=100,
    )

    preds = model.predict(X_test)

    r = rmse(y_test, preds)
    m = mean_absolute_error(y_test, preds)
    mp = mape(y_test, preds)
    print(f"\nRMSE: ${r:,.2f}  |  MAE: ${m:,.2f}  |  MAPE: {mp:.2f}%")

    # Feature importance (top 5)
    importances = pd.Series(model.feature_importances_, index=FEATURES).sort_values(ascending=False)
    print("\nTop-5 feature importances:")
    print(importances.head(5).to_string())

    out_path = f"{MODEL_DIR}/xgboost_{label}.pkl"
    artifact = {
        "model": model,
        "features": FEATURES,
        "horizon": label,
        "target_col": target_col,
        "metrics": {"rmse": r, "mae": m, "mape": mp},
        "bedroom_col_map": BEDROOM_COL,
    }
    joblib.dump(artifact, out_path)
    artifacts[label] = artifact
    print(f"Saved → {out_path}")

# ---------------------------------------------------------------------------
# Save latest data snapshot (one row per zipcode) for the predict endpoint
# ---------------------------------------------------------------------------
latest = (
    df.sort_values("Date")
    .groupby("ZipCode")
    .last()
    .reset_index()
)
latest_path = f"{MODEL_DIR}/latest_data.pkl"
joblib.dump(latest, latest_path)
print(f"\nLatest data snapshot ({len(latest)} zipcodes) saved → {latest_path}")

# ---------------------------------------------------------------------------
# Summary table
# ---------------------------------------------------------------------------
print("\n" + "="*60)
print("Final model performance summary")
print("="*60)
for label, art in artifacts.items():
    m = art["metrics"]
    print(f"  {label}:  RMSE=${m['rmse']:>10,.2f}  MAE=${m['mae']:>10,.2f}  MAPE={m['mape']:>6.2f}%")
print("\nDone.")
