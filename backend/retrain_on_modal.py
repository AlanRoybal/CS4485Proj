"""
Retrain all models on Modal Volume.

Runs the full pipeline:
  1. Regenerate train/test split from dallas_clean.csv (split at Jan 2025)
  2. Train XGBoost regressors (1m, 3m, 6m)
  3. Train Logistic Regression (balanced) direction classifier
  4. Save all artifacts to Modal Volume

Usage:  modal run backend/retrain_on_modal.py
"""
import modal

volume = modal.Volume.from_name("real-estate-data")
image = modal.Image.debian_slim(python_version="3.11").pip_install(
    "pandas", "numpy", "scikit-learn", "xgboost", "joblib",
)
app = modal.App("retrain-models", image=image)

SPLIT_DATE = "2025-01-01"
DATA_DIR = "/mnt/real-estate-data/data"
MODEL_DIR = "/mnt/real-estate-data/models"

FEATURES = [
    "zhvi_lag_1m", "zhvi_lag_3m", "zhvi_lag_6m", "zhvi_lag_12m",
    "price_change_12m",
    "zhvi_2br", "zhvi_3br", "zhvi_4br", "zhvi_5br_plus",
    "zhvi_top_tier", "zhvi_bottom_tier",
    "month", "year", "SizeRank",
]

BEDROOM_COL = {2: "zhvi_2br", 3: "zhvi_3br", 4: "zhvi_4br", 5: "zhvi_5br_plus"}


@app.function(
    volumes={"/mnt/real-estate-data": volume},
    timeout=600,
)
def retrain():
    import os
    import numpy as np
    import pandas as pd
    import joblib
    import xgboost as xgb
    from sklearn.linear_model import LogisticRegression
    from sklearn.preprocessing import StandardScaler
    from sklearn.metrics import (
        mean_squared_error, mean_absolute_error,
        accuracy_score, roc_auc_score, classification_report, confusion_matrix,
    )

    os.makedirs(MODEL_DIR, exist_ok=True)

    # ── 1. Load and split ─────────────────────────────────────────────────
    print("=" * 60)
    print("Step 1: Loading dallas_clean.csv and splitting")
    print("=" * 60)
    df = pd.read_csv(f"{DATA_DIR}/dallas_clean.csv")
    df["Date"] = pd.to_datetime(df["Date"])
    df = df.sort_values(["ZipCode", "Date"]).reset_index(drop=True)
    print(f"  Total rows: {len(df):,}")
    print(f"  Date range: {df['Date'].min().date()} -> {df['Date'].max().date()}")

    # Save train/test CSVs
    train_full = df[df["Date"] < SPLIT_DATE]
    test_full = df[df["Date"] >= SPLIT_DATE]
    train_full.to_csv(f"{DATA_DIR}/train.csv", index=False)
    test_full.to_csv(f"{DATA_DIR}/test.csv", index=False)
    print(f"  Train: {len(train_full):,} rows | Test: {len(test_full):,} rows")

    # ── 2. Train XGBoost regressors ───────────────────────────────────────
    print("\n" + "=" * 60)
    print("Step 2: Training XGBoost regressors")
    print("=" * 60)

    # Engineer 3m and 6m targets
    df["target_zhvi_3m"] = df.groupby("ZipCode")["ZHVI"].shift(-3)
    df["target_zhvi_6m"] = df.groupby("ZipCode")["ZHVI"].shift(-6)
    for br, col in BEDROOM_COL.items():
        df[f"target_{col}_3m"] = df.groupby("ZipCode")[col].shift(-3)
        df[f"target_{col}_6m"] = df.groupby("ZipCode")[col].shift(-6)

    ALL_TARGETS = [
        "target_zhvi_1m", "target_zhvi_3m", "target_zhvi_6m",
        *[f"target_{col}_3m" for col in BEDROOM_COL.values()],
        *[f"target_{col}_6m" for col in BEDROOM_COL.values()],
    ]

    required = FEATURES + ALL_TARGETS
    df_clean = df.dropna(subset=required).copy()
    train_df = df_clean[df_clean["Date"] < SPLIT_DATE]
    test_df = df_clean[df_clean["Date"] >= SPLIT_DATE]
    X_train = train_df[FEATURES]
    X_test = test_df[FEATURES]
    print(f"  Train: {len(train_df):,} rows | Test: {len(test_df):,} rows")

    def rmse(y_true, y_pred):
        return np.sqrt(mean_squared_error(y_true, y_pred))

    def mape(y_true, y_pred):
        mask = y_true != 0
        return np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100

    XGB_PARAMS = dict(
        n_estimators=1000, learning_rate=0.05, max_depth=6,
        subsample=0.8, colsample_bytree=0.8, min_child_weight=5,
        reg_alpha=0.1, reg_lambda=1.0, early_stopping_rounds=50,
        random_state=42, n_jobs=-1, tree_method="hist",
    )

    horizons = [("1m", "target_zhvi_1m"), ("3m", "target_zhvi_3m"), ("6m", "target_zhvi_6m")]
    for label, target_col in horizons:
        print(f"\n  Training XGBoost {label}...")
        y_train = train_df[target_col].values
        y_test = test_df[target_col].values
        model = xgb.XGBRegressor(**XGB_PARAMS)
        model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=0)
        preds = model.predict(X_test)
        r = rmse(y_test, preds)
        m = mean_absolute_error(y_test, preds)
        mp = mape(y_test, preds)
        print(f"    RMSE: ${r:,.2f}  |  MAE: ${m:,.2f}  |  MAPE: {mp:.2f}%")
        artifact = {
            "model": model, "features": FEATURES, "horizon": label,
            "target_col": target_col, "metrics": {"rmse": r, "mae": m, "mape": mp},
            "bedroom_col_map": BEDROOM_COL,
        }
        joblib.dump(artifact, f"{MODEL_DIR}/xgboost_{label}.pkl")
        print(f"    Saved -> {MODEL_DIR}/xgboost_{label}.pkl")

    # Save latest data snapshot
    latest = df.sort_values("Date").groupby("ZipCode").last().reset_index()
    joblib.dump(latest, f"{MODEL_DIR}/latest_data.pkl")
    print(f"\n  Latest snapshot: {len(latest)} zipcodes -> {MODEL_DIR}/latest_data.pkl")

    # ── 3. Train Logistic Regression (balanced) ──────────────────────────
    print("\n" + "=" * 60)
    print("Step 3: Training Logistic Regression (balanced)")
    print("=" * 60)

    TARGET = "target_direction_1m"
    train_lr = train_full.copy()
    test_lr = test_full.copy()

    # Derive target if needed
    for lbl, d in [("Train", train_lr), ("Test", test_lr)]:
        if TARGET not in d.columns:
            d[TARGET] = (d["target_zhvi_1m"] > d["ZHVI"]).astype(float)

    cols_needed = FEATURES + [TARGET]
    train_lr = train_lr.dropna(subset=cols_needed)
    test_lr = test_lr.dropna(subset=cols_needed)

    X_train_lr = train_lr[FEATURES]
    y_train_lr = train_lr[TARGET]
    X_test_lr = test_lr[FEATURES]
    y_test_lr = test_lr[TARGET]

    print(f"  Train: {len(train_lr):,} rows | Test: {len(test_lr):,} rows")

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train_lr)
    X_test_scaled = scaler.transform(X_test_lr)

    lr_model = LogisticRegression(max_iter=1000, random_state=42, class_weight="balanced")
    lr_model.fit(X_train_scaled, y_train_lr)

    y_pred = lr_model.predict(X_test_scaled)
    y_pred_proba = lr_model.predict_proba(X_test_scaled)[:, 1]

    accuracy = accuracy_score(y_test_lr, y_pred)
    auc = roc_auc_score(y_test_lr, y_pred_proba)
    cm = confusion_matrix(y_test_lr, y_pred)

    print(f"  Accuracy: {accuracy:.4f} ({accuracy*100:.2f}%)")
    print(f"  AUC-ROC:  {auc:.4f}")
    print(f"  Down recall: {cm[0][0]/(cm[0][0]+cm[0][1])*100:.1f}%")
    print(f"  Up recall:   {cm[1][1]/(cm[1][0]+cm[1][1])*100:.1f}%")

    lr_artifact = {"model": lr_model, "scaler": scaler, "features": FEATURES}
    joblib.dump(lr_artifact, f"{MODEL_DIR}/logistic_regression.pkl")
    print(f"  Saved -> {MODEL_DIR}/logistic_regression.pkl")

    print("\n" + "=" * 60)
    print("All models retrained and saved to Modal Volume.")
    print("=" * 60)


@app.local_entrypoint()
def main():
    retrain.remote()
