"""
Zillow ZHVI Data Refresh Pipeline
==================================
Downloads the latest Zillow ZHVI CSVs, cleans/merges/engineers features,
and updates dallas_clean.csv + latest_data.pkl on the Modal Volume.

Run locally:  python3 backend/refresh_data.py
Run on Modal: modal run backend/refresh_data.py

The existing XGBoost and Logistic Regression models do NOT need retraining —
they generalize to new months because they use lag features and temporal
features (month, year) that naturally extend forward.
"""

import os
import io
import datetime
import warnings
import numpy as np
import pandas as pd

try:
    import requests
except ImportError:
    requests = None

try:
    import joblib
except ImportError:
    joblib = None

warnings.filterwarnings("ignore", category=FutureWarning)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_ON_MODAL = os.path.exists("/mnt/real-estate-data")
DATA_DIR = "/mnt/real-estate-data/data" if _ON_MODAL else os.path.join(os.path.dirname(__file__), "")
MODEL_DIR = "/mnt/real-estate-data/models" if _ON_MODAL else os.path.join(os.path.dirname(__file__), "models")
os.makedirs(MODEL_DIR, exist_ok=True)

# ---------------------------------------------------------------------------
# Zillow ZHVI CSV URLs — public research data
# ---------------------------------------------------------------------------
ZHVI_URLS = {
    "ZHVI": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi_2br": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_bdrmcnt_2_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi_3br": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_bdrmcnt_3_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi_4br": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_bdrmcnt_4_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi_5br_plus": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_bdrmcnt_5_uc_sfrcondo_tier_0.33_0.67_sm_sa_month.csv",
    "zhvi_top_tier": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.67_1.0_sm_sa_month.csv",
    "zhvi_bottom_tier": "https://files.zillowstatic.com/research/public_csvs/zhvi/Zip_zhvi_uc_sfrcondo_tier_0.0_0.33_sm_sa_month.csv",
}

# Dallas-Fort Worth metro — filter CSVs to this metro area
DALLAS_METRO = "Dallas-Fort Worth-Arlington, TX"

# Columns the model expects
FEATURES = [
    "zhvi_lag_1m", "zhvi_lag_3m", "zhvi_lag_6m", "zhvi_lag_12m",
    "price_change_12m",
    "zhvi_2br", "zhvi_3br", "zhvi_4br", "zhvi_5br_plus",
    "zhvi_top_tier", "zhvi_bottom_tier",
    "month", "year", "SizeRank",
]


# ---------------------------------------------------------------------------
# Step 1: Download and melt a single Zillow CSV
# ---------------------------------------------------------------------------
def download_and_melt(url: str, value_name: str) -> pd.DataFrame:
    """Download a wide-format Zillow CSV and melt to long format."""
    if requests is None:
        raise ImportError("requests is required — pip install requests")

    print(f"  Downloading {value_name}...")
    resp = requests.get(url, timeout=120)
    resp.raise_for_status()

    df = pd.read_csv(io.StringIO(resp.text))

    # Identify date columns (YYYY-MM-DD format)
    meta_cols = [c for c in df.columns if not c[0].isdigit()]
    date_cols = [c for c in df.columns if c[0].isdigit()]

    # Filter to Dallas metro
    if "Metro" in df.columns:
        df = df[df["Metro"] == DALLAS_METRO].copy()
    elif "CountyName" in df.columns:
        # Fallback: filter by known Dallas counties
        dallas_counties = [
            "Dallas County", "Tarrant County", "Collin County",
            "Denton County", "Rockwall County", "Kaufman County",
            "Ellis County", "Johnson County", "Parker County",
            "Wise County", "Hunt County",
        ]
        df = df[df["CountyName"].isin(dallas_counties)].copy()

    if df.empty:
        print(f"    WARNING: No Dallas rows found for {value_name}")
        return pd.DataFrame()

    # Melt wide → long
    melted = df.melt(
        id_vars=meta_cols,
        value_vars=date_cols,
        var_name="Date",
        value_name=value_name,
    )

    # Standardize zipcode column name
    for col in ("RegionName", "RegionID"):
        if col in melted.columns and "ZipCode" not in melted.columns:
            if col == "RegionName":
                melted = melted.rename(columns={"RegionName": "ZipCode"})

    melted["Date"] = pd.to_datetime(melted["Date"])
    melted["ZipCode"] = melted["ZipCode"].astype(int)

    return melted


# ---------------------------------------------------------------------------
# Step 2: Merge all CSVs into one long-format DataFrame
# ---------------------------------------------------------------------------
def download_and_merge() -> pd.DataFrame:
    """Download all 7 Zillow ZHVI CSVs and merge into a single DataFrame."""
    print("\n=== Step 1: Downloading Zillow ZHVI data ===")

    base_df = None

    for value_name, url in ZHVI_URLS.items():
        melted = download_and_melt(url, value_name)
        if melted.empty:
            continue

        if base_df is None:
            # Keep metadata from the first (base ZHVI) download
            keep_cols = ["ZipCode", "Date", value_name]
            for c in ("City", "Metro", "CountyName", "State", "SizeRank"):
                if c in melted.columns:
                    keep_cols.append(c)
            base_df = melted[keep_cols].copy()
        else:
            # Merge subsequent downloads on ZipCode + Date
            base_df = base_df.merge(
                melted[["ZipCode", "Date", value_name]],
                on=["ZipCode", "Date"],
                how="left",
            )

    if base_df is None:
        raise RuntimeError("No data downloaded — check URLs and network")

    print(f"  Merged: {len(base_df):,} rows, {base_df['ZipCode'].nunique()} zipcodes")
    print(f"  Date range: {base_df['Date'].min().date()} → {base_df['Date'].max().date()}")
    return base_df


# ---------------------------------------------------------------------------
# Step 3: Engineer features (same logic as the original pipeline)
# ---------------------------------------------------------------------------
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag features, price changes, temporal features, and targets."""
    print("\n=== Step 2: Engineering features ===")

    df = df.sort_values(["ZipCode", "Date"]).reset_index(drop=True)

    # Lag features
    for months, name in [(1, "zhvi_lag_1m"), (3, "zhvi_lag_3m"),
                         (6, "zhvi_lag_6m"), (12, "zhvi_lag_12m")]:
        df[name] = df.groupby("ZipCode")["ZHVI"].shift(months)

    # Price change features
    df["price_change_1m"] = df["ZHVI"] - df["zhvi_lag_1m"]
    df["price_change_3m"] = df["ZHVI"] - df["zhvi_lag_3m"]
    df["price_change_12m"] = df["ZHVI"] - df["zhvi_lag_12m"]

    # Temporal features
    df["month"] = df["Date"].dt.month
    df["year"] = df["Date"].dt.year

    # Targets (1-month forward)
    df["target_zhvi_1m"] = df.groupby("ZipCode")["ZHVI"].shift(-1)
    df["target_direction_1m"] = (df["target_zhvi_1m"] > df["ZHVI"]).astype(float)

    # Drop rows with NaN in critical columns (first 12 months per zipcode)
    before = len(df)
    df = df.dropna(subset=["zhvi_lag_12m", "price_change_12m"])
    print(f"  Dropped {before - len(df):,} rows with NaN lag features")
    print(f"  Final: {len(df):,} rows")

    return df


# ---------------------------------------------------------------------------
# Step 4: Build latest_data.pkl (one row per zipcode, most recent date)
# ---------------------------------------------------------------------------
def build_latest_snapshot(df: pd.DataFrame) -> pd.DataFrame:
    """Extract the most recent row per zipcode for the predict endpoint."""
    latest = (
        df.sort_values("Date")
        .groupby("ZipCode")
        .last()
        .reset_index()
    )
    print(f"\n=== Step 3: Latest snapshot ===")
    print(f"  {len(latest)} zipcodes, latest date: {latest['Date'].max().date()}")
    return latest


# ---------------------------------------------------------------------------
# Step 5: Save everything
# ---------------------------------------------------------------------------
def save_outputs(df: pd.DataFrame, latest: pd.DataFrame):
    """Save updated CSV and latest_data.pkl."""
    print("\n=== Step 4: Saving outputs ===")

    csv_path = os.path.join(DATA_DIR, "dallas_clean.csv")
    df.to_csv(csv_path, index=False)
    print(f"  dallas_clean.csv → {csv_path} ({len(df):,} rows)")

    if joblib is not None:
        pkl_path = os.path.join(MODEL_DIR, "latest_data.pkl")
        joblib.dump(latest, pkl_path)
        print(f"  latest_data.pkl → {pkl_path} ({len(latest)} zipcodes)")
    else:
        print("  WARNING: joblib not available — skipping latest_data.pkl")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def refresh():
    """Full pipeline: download → merge → engineer → save."""
    start = datetime.datetime.now()
    print(f"Data refresh started at {start.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  Data dir:  {DATA_DIR}")
    print(f"  Model dir: {MODEL_DIR}")

    df = download_and_merge()
    df = engineer_features(df)
    latest = build_latest_snapshot(df)
    save_outputs(df, latest)

    elapsed = (datetime.datetime.now() - start).total_seconds()
    print(f"\nDone in {elapsed:.1f}s")
    print(f"Latest data date: {latest['Date'].max().date()}")
    return latest["Date"].max().date()


# ---------------------------------------------------------------------------
# Modal entrypoint — run with: modal run backend/refresh_data.py
# ---------------------------------------------------------------------------
try:
    import modal as _modal

    _volume = _modal.Volume.from_name("real-estate-data")
    _image = _modal.Image.debian_slim(python_version="3.11").pip_install(
        "pandas", "numpy", "scikit-learn", "joblib", "requests",
    )
    _modal_app = _modal.App("refresh-zillow-data", image=_image)

    @_modal_app.function(
        volumes={"/mnt/real-estate-data": _volume},
        timeout=600,
    )
    def run_refresh():
        refresh()
        _volume.commit()

    @_modal_app.local_entrypoint()
    def main():
        run_refresh.remote()
except ImportError:
    pass

if __name__ == "__main__":
    refresh()
