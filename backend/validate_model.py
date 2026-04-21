"""
Validation error for the **deployed** Dallas Real Estate XGBoost models.

Queries the live Modal API to retrieve:
  1. Production model metrics (RMSE, MAE, MAPE baked into the pickles)
  2. Training metadata (trees used, train/test split, data date)
  3. Rolling backtests across a sample of zipcodes via /backtest
  4. Comparison of local vs production data freshness

Run:  python3 backend/validate_model.py
"""
import json
import os
import sys
import time
import urllib.request
import urllib.error

import numpy as np
import pandas as pd

BACKEND_URL = "https://cs4485-project--real-estate-predictor-fastapi-app.modal.run"
DATA_DIR = os.path.dirname(__file__) or "."

BEDROOMS = [2, 3, 4, 5]
BATHROOMS = 2


def api_get(path: str) -> dict:
    url = f"{BACKEND_URL}{path}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def api_post(path: str, body: dict) -> dict:
    url = f"{BACKEND_URL}{path}"
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read())


def main():
    print("=" * 70)
    print("  Dallas Real Estate — Deployed Model Validation Report")
    print("=" * 70)

    # ------------------------------------------------------------------
    # 1. Production model metrics (baked into the pkl at training time)
    # ------------------------------------------------------------------
    print("\n[1/4] Fetching production model metrics (/model-metrics)...")
    metrics = api_get("/model-metrics")

    print(f"\n  {'Horizon':<10} {'RMSE':>12} {'MAE':>12} {'MAPE':>8}")
    print(f"  {'─'*10} {'─'*12} {'─'*12} {'─'*8}")
    for h in ("1m", "3m", "6m"):
        m = metrics[h]
        print(f"  {h:<10} ${m['rmse']:>10,.2f} ${m['mae']:>10,.2f} {m['mape']:>6.2f}%")

    # ------------------------------------------------------------------
    # 2. Training metadata
    # ------------------------------------------------------------------
    print("\n[2/4] Fetching training metadata (/model-deep-dive, /data-info)...")
    deep_dive = api_get("/model-deep-dive")
    data_info = api_get("/data-info")
    training = deep_dive["training"]

    print(f"\n  Production data date:    {data_info['data_date']}")
    print(f"  Train/test split:        {training['split_date']}")
    print(f"  Train rows:              {training['train_rows']:,}")
    print(f"  Test rows:               {training['test_rows']:,}")
    print(f"  Features:                {training['num_features']}")
    print(f"  Date range:              {training['date_range_start']} → {training['date_range_end']}")
    trees = training["trees_used"]
    print(f"  Trees used (early stop): 1m={trees['1m']}, 3m={trees['3m']}, 6m={trees['6m']}")

    # Compare with local data
    local_csv = os.path.join(DATA_DIR, "dallas_clean.csv")
    if os.path.exists(local_csv):
        local_df = pd.read_csv(local_csv)
        local_df["Date"] = pd.to_datetime(local_df["Date"])
        local_max = local_df["Date"].max().strftime("%Y-%m-%d")
        match = "MATCH" if local_max == data_info["data_date"] else "MISMATCH"
        print(f"\n  Local dallas_clean.csv:  {local_max}  [{match}]")
        if match == "MISMATCH":
            print(f"  ⚠ Local data ({local_max}) differs from production ({data_info['data_date']})")
            print(f"    Run 'python3 backend/refresh_data.py' to sync local data")
    else:
        print(f"\n  Local dallas_clean.csv:  not found")

    # ------------------------------------------------------------------
    # 3. Rolling backtest across sampled zipcodes
    # ------------------------------------------------------------------
    print("\n[3/4] Running backtests on deployed models (/backtest)...")
    print("       Sampling zipcodes across all bedroom tiers...")

    zipcodes_resp = api_get("/zipcodes")
    all_zips = [z["zipcode"] for z in zipcodes_resp]

    np.random.seed(42)
    sample_size = min(30, len(all_zips))
    sampled_zips = np.random.choice(all_zips, size=sample_size, replace=False)

    all_errors_pct = []
    all_errors_dollars = []
    per_zip_results = []
    failures = 0

    for i, zc in enumerate(sampled_zips):
        br = BEDROOMS[i % len(BEDROOMS)]
        sys.stdout.write(f"\r  Backtesting {i+1}/{sample_size}: zip={zc} br={br}...")
        sys.stdout.flush()
        try:
            result = api_post("/backtest", {"zipcode": zc, "bedrooms": br, "bathrooms": BATHROOMS})
            if result["data"]:
                per_zip_results.append({
                    "zipcode": zc,
                    "bedrooms": br,
                    "months": len(result["data"]),
                    "avg_error_pct": result["avg_error_pct"],
                    "avg_error_dollars": result["avg_error_dollars"],
                })
                for pt in result["data"]:
                    all_errors_pct.append(pt["error_pct"])
                    all_errors_dollars.append(abs(pt["predicted"] - pt["actual"]))
        except Exception as e:
            failures += 1
        time.sleep(0.1)

    print(f"\r  Backtested {sample_size} zipcodes ({sample_size - failures} succeeded, {failures} failed)" + " " * 20)

    if all_errors_pct:
        errors_pct = np.array(all_errors_pct)
        errors_dollars = np.array(all_errors_dollars)

        print(f"\n  Backtest results (1-month rolling, {len(errors_pct)} predictions across {len(per_zip_results)} zipcodes):")
        print(f"\n  {'Metric':<28} {'Dollar Error':>14} {'% Error':>10}")
        print(f"  {'─'*28} {'─'*14} {'─'*10}")
        print(f"  {'Mean':<28} ${np.mean(errors_dollars):>12,.2f} {np.mean(errors_pct):>8.2f}%")
        print(f"  {'Median':<28} ${np.median(errors_dollars):>12,.2f} {np.median(errors_pct):>8.2f}%")
        print(f"  {'Std Dev':<28} ${np.std(errors_dollars):>12,.2f} {np.std(errors_pct):>8.2f}%")
        print(f"  {'10th Percentile (best)':<28} ${np.percentile(errors_dollars, 10):>12,.2f} {np.percentile(errors_pct, 10):>8.2f}%")
        print(f"  {'90th Percentile (worst)':<28} ${np.percentile(errors_dollars, 90):>12,.2f} {np.percentile(errors_pct, 90):>8.2f}%")
        print(f"  {'Max':<28} ${np.max(errors_dollars):>12,.2f} {np.max(errors_pct):>8.2f}%")

        # Breakdown by bedroom tier
        print(f"\n  Backtest error by bedroom tier:")
        print(f"  {'Bedrooms':<12} {'Avg $ Error':>14} {'Avg % Error':>12} {'Zipcodes':>10}")
        print(f"  {'─'*12} {'─'*14} {'─'*12} {'─'*10}")
        for br in BEDROOMS:
            br_results = [r for r in per_zip_results if r["bedrooms"] == br]
            if br_results:
                avg_d = np.mean([r["avg_error_dollars"] for r in br_results])
                avg_p = np.mean([r["avg_error_pct"] for r in br_results])
                print(f"  {br:<12} ${avg_d:>12,.2f} {avg_p:>10.2f}%  {len(br_results):>8}")

        # Top 5 hardest and easiest zipcodes
        sorted_results = sorted(per_zip_results, key=lambda r: r["avg_error_pct"], reverse=True)
        print(f"\n  Top 5 hardest-to-predict zipcodes (deployed model):")
        print(f"  {'Zipcode':<10} {'BR':>4} {'Avg $ Error':>14} {'Avg % Error':>12} {'Months':>8}")
        for r in sorted_results[:5]:
            print(f"  {r['zipcode']:<10} {r['bedrooms']:>4} ${r['avg_error_dollars']:>12,.2f} {r['avg_error_pct']:>10.2f}%  {r['months']:>6}")

        print(f"\n  Top 5 most-accurate zipcodes (deployed model):")
        print(f"  {'Zipcode':<10} {'BR':>4} {'Avg $ Error':>14} {'Avg % Error':>12} {'Months':>8}")
        for r in sorted_results[-5:]:
            print(f"  {r['zipcode']:<10} {r['bedrooms']:>4} ${r['avg_error_dollars']:>12,.2f} {r['avg_error_pct']:>10.2f}%  {r['months']:>6}")

    # ------------------------------------------------------------------
    # 4. Summary
    # ------------------------------------------------------------------
    print(f"\n{'=' * 70}")
    print("  VALIDATION SUMMARY")
    print(f"{'=' * 70}")

    print(f"\n  Production metrics (from trained model artifacts):")
    for h in ("1m", "3m", "6m"):
        m = metrics[h]
        print(f"    {h}: RMSE=${m['rmse']:>10,.2f}  MAE=${m['mae']:>10,.2f}  MAPE={m['mape']:.2f}%")

    if all_errors_pct:
        print(f"\n  Live backtest validation ({len(per_zip_results)} zipcodes, {len(errors_pct)} predictions):")
        print(f"    Mean absolute error:   ${np.mean(errors_dollars):,.2f} ({np.mean(errors_pct):.2f}%)")
        print(f"    Median absolute error: ${np.median(errors_dollars):,.2f} ({np.median(errors_pct):.2f}%)")
        print(f"    90th percentile error: ${np.percentile(errors_dollars, 90):,.2f} ({np.percentile(errors_pct, 90):.2f}%)")

    print(f"\n  Data freshness:")
    print(f"    Production: {data_info['data_date']}")
    print(f"    Forecasting: {data_info['forecast_date_1m']} / {data_info['forecast_date_3m']} / {data_info['forecast_date_6m']}")
    print()


if __name__ == "__main__":
    main()
