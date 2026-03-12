"""
Logistic Regression — Baseline Direction Classifier
=====================================================
Run this in a Modal notebook or as a standalone Modal script.

Trains a binary classifier to predict whether ZHVI will go up or down
1 month from now, then saves model + scaler + feature list as a single
.pkl file to the Modal Volume.

Data source:  /mnt/real-estate-data/data/train.csv  (pre-split, before Jan 2023)
              /mnt/real-estate-data/data/test.csv   (pre-split, Jan 2023 onward)
Save path:    /mnt/real-estate-data/models/logistic_regression.pkl

Target:       target_direction_1m  (1 = up, 0 = down)
Features:     14 leakage-free features
Split:        Already done — train.csv / test.csv at January 2023
"""

# ── Imports ──────────────────────────────────────────────────────────────
import os
import pandas as pd
import numpy as np
import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    accuracy_score,
    roc_auc_score,
    classification_report,
    confusion_matrix,
)

# ── Paths (Modal Volume) ────────────────────────────────────────────────
_ON_MODAL = os.path.exists("/mnt/real-estate-data")
DATA_DIR  = "/mnt/real-estate-data/data"   if _ON_MODAL else "."
MODEL_DIR = "/mnt/real-estate-data/models" if _ON_MODAL else "./models"
os.makedirs(MODEL_DIR, exist_ok=True)

TRAIN_PATH = f"{DATA_DIR}/train.csv"
TEST_PATH  = f"{DATA_DIR}/test.csv"
SAVE_PATH  = f"{MODEL_DIR}/logistic_regression.pkl"

# ── Feature definition ──────────────────────────────────────────────────
# 14 leakage-free features.
# REMOVED: price_change_1m  (88.75% target match — direct leakage)
# REMOVED: price_change_3m  (94.3% correlated with 1m — indirect leakage)
# REMOVED: zhvi_1br          (87.6% missing — not usable)
FEATURE_COLS = [
    # Lag features — historical ZHVI snapshots
    "zhvi_lag_1m",
    "zhvi_lag_3m",
    "zhvi_lag_6m",
    "zhvi_lag_12m",
    # Momentum — safe long-range momentum (78% alignment = real signal)
    "price_change_12m",
    # Bedroom segment tiers
    "zhvi_2br",
    "zhvi_3br",
    "zhvi_4br",
    "zhvi_5br_plus",
    # Market tiers
    "zhvi_top_tier",
    "zhvi_bottom_tier",
    # Temporal
    "month",
    "year",
    # Geographic
    "SizeRank",
]

TARGET = "target_direction_1m"

# ── 1. Load pre-split data ──────────────────────────────────────────────
print("Loading data...")
print(f"  Train: {TRAIN_PATH}")
print(f"  Test:  {TEST_PATH}")

train = pd.read_csv(TRAIN_PATH)
test  = pd.read_csv(TEST_PATH)
train["Date"] = pd.to_datetime(train["Date"])
test["Date"]  = pd.to_datetime(test["Date"])

print(f"  Train raw rows: {len(train):,}")
print(f"  Test  raw rows: {len(test):,}")
print(f"  Columns: {list(train.columns)}")

# ── 2. Derive target if missing ─────────────────────────────────────────
# train.csv / test.csv may only have target_zhvi_1m (used by XGBoost).
# If target_direction_1m is missing, compute it: 1 if next month > current, else 0.
for label, df in [("Train", train), ("Test", test)]:
    if TARGET not in df.columns:
        if "target_zhvi_1m" not in df.columns or "ZHVI" not in df.columns:
            raise ValueError(f"Cannot derive target in {label} — need 'target_zhvi_1m' and 'ZHVI'")
        df[TARGET] = (df["target_zhvi_1m"] > df["ZHVI"]).astype(float)
        print(f"  Derived {TARGET} in {label} from target_zhvi_1m vs ZHVI")
    else:
        print(f"  {TARGET} already exists in {label} ✓")

# ── 3. Drop rows with missing values ───────────────────────────────────
cols_needed = FEATURE_COLS + [TARGET]
before_train, before_test = len(train), len(test)
train = train.dropna(subset=cols_needed)
test  = test.dropna(subset=cols_needed)
print(f"  Train: dropped {before_train - len(train):,} NaN rows → {len(train):,} remain")
print(f"  Test:  dropped {before_test - len(test):,} NaN rows → {len(test):,} remain")

# ── 4. Extract features and target ─────────────────────────────────────
X_train = train[FEATURE_COLS]
y_train = train[TARGET]
X_test  = test[FEATURE_COLS]
y_test  = test[TARGET]

print(f"\n  Train: {len(train):,} rows  ({train['Date'].min().date()} → {train['Date'].max().date()})")
print(f"  Test:  {len(test):,} rows   ({test['Date'].min().date()} → {test['Date'].max().date()})")
print(f"  Train class balance:  Up={y_train.sum():,.0f}  Down={len(y_train)-y_train.sum():,.0f}")
print(f"  Test  class balance:  Up={y_test.sum():,.0f}  Down={len(y_test)-y_test.sum():,.0f}")

# ── 5. Scale features ───────────────────────────────────────────────────
# Fit scaler on training data ONLY, then transform both sets.
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

print("\n  Scaler fit on training data only ✓")

# ── 6. Train logistic regression ────────────────────────────────────────
print("\nTraining Logistic Regression...")
model = LogisticRegression(
    max_iter=1000,
    random_state=42,
)
model.fit(X_train_scaled, y_train)
print("  Training complete ✓")

# ── 7. Evaluate ─────────────────────────────────────────────────────────
y_pred       = model.predict(X_test_scaled)
y_pred_proba = model.predict_proba(X_test_scaled)[:, 1]  # probability of "Up"

accuracy = accuracy_score(y_test, y_pred)
auc_roc  = roc_auc_score(y_test, y_pred_proba)
cm       = confusion_matrix(y_test, y_pred)

print("\n" + "=" * 55)
print("  BASELINE LOGISTIC REGRESSION RESULTS")
print("=" * 55)
print(f"  Accuracy:  {accuracy:.4f}  ({accuracy*100:.2f}%)")
print(f"  AUC-ROC:   {auc_roc:.4f}")
print()
print("  Classification Report:")
print(classification_report(y_test, y_pred, target_names=["Down", "Up"]))
print("  Confusion Matrix:")
print(f"                  Predicted Down   Predicted Up")
print(f"  Actually Down     {cm[0][0]:>6,}          {cm[0][1]:>6,}")
print(f"  Actually Up       {cm[1][0]:>6,}          {cm[1][1]:>6,}")
print()

# ── 8. Save model artifact ──────────────────────────────────────────────
# Backend usage:
#   art = joblib.load("logistic_regression.pkl")
#   X_scaled = art["scaler"].transform(row[art["features"]])
#   proba = art["model"].predict_proba(X_scaled)[0]
#   direction = "up" if proba[1] >= 0.5 else "down"
#   confidence = float(max(proba))
artifact = {
    "model":    model,
    "scaler":   scaler,
    "features": FEATURE_COLS,
}

joblib.dump(artifact, SAVE_PATH)
print(f"  Saved to: {SAVE_PATH}")
print(f"  Keys:     {list(artifact.keys())}")
print("  Done ✓")