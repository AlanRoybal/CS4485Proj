"""
Dallas Real Estate Predictor — Modal-served FastAPI backend.

Endpoints:
  POST /predict   — 1m / 3m / 6m price forecasts (XGBoost) + direction derived from price change
  POST /history   — historical ZHVI for a zipcode + bedroom count
  GET  /zipcodes  — list of all available zipcodes with city names
  GET  /data-info — metadata about the dataset (latest date, forecast dates)

Deploy:
  modal deploy backend/modal_app.py

Volume layout (real-estate-data):
  /data/dallas_clean.csv
  /data/train.csv
  /data/test.csv
  /models/xgboost_1m.pkl
  /models/xgboost_3m.pkl
  /models/xgboost_6m.pkl
  /models/latest_data.pkl
"""
import os
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# Paths (Modal Volume)
# ---------------------------------------------------------------------------
MODEL_DIR = "/mnt/real-estate-data/models"
DATA_DIR  = "/mnt/real-estate-data/data"

BEDROOM_COL = {2: "zhvi_2br", 3: "zhvi_3br", 4: "zhvi_4br", 5: "zhvi_5br_plus"}

# NAHB-derived bathroom multipliers relative to 2-bath baseline (1.0).
# Source: NAHB House Price Estimator (American Housing Survey, Census/HUD).
# Keys: (bedrooms, bathrooms) → multiplier
BATHROOM_MULTIPLIER: dict[tuple[int, int], float] = {
    (2, 1): 0.81, (2, 2): 1.00, (2, 3): 1.21, (2, 4): 1.45,
    (3, 1): 0.81, (3, 2): 1.00, (3, 3): 1.21, (3, 4): 1.45,
    (4, 1): 0.80, (4, 2): 1.00, (4, 3): 1.22, (4, 4): 1.46,
    (5, 1): 0.80, (5, 2): 1.00, (5, 3): 1.22, (5, 4): 1.46,
}


def _bath_multiplier(bedrooms: int, bathrooms: int) -> float:
    return BATHROOM_MULTIPLIER.get((bedrooms, bathrooms), 1.0)


# ---------------------------------------------------------------------------
# Startup: load models + data once, keep in memory
# ---------------------------------------------------------------------------
_state: dict = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    import traceback as _tb
    try:
        # XGBoost regressors (1m, 3m, 6m)
        _state["xgb_models"] = {
            h: joblib.load(f"{MODEL_DIR}/xgboost_{h}.pkl")
            for h in ("1m", "3m", "6m")
        }

        # Latest data snapshot (one row per zipcode — used by /predict)
        _state["latest"] = joblib.load(f"{MODEL_DIR}/latest_data.pkl")

        # Full history (used by /history)
        _state["history_df"] = pd.read_csv(f"{DATA_DIR}/dallas_clean.csv")
        _state["history_df"]["Date"] = pd.to_datetime(_state["history_df"]["Date"])

        # Precompute per-zipcode volatility for /zipcode-profile
        hist = _state["history_df"]
        vol_map = {}
        for zc, grp in hist.groupby("ZipCode"):
            grp_sorted = grp.sort_values("Date")
            pct_changes = grp_sorted["ZHVI"].pct_change().dropna()
            vol_map[int(zc)] = float(pct_changes.std()) if len(pct_changes) > 1 else 0.0
        _state["volatility_by_zipcode"] = vol_map

        print("Models and data loaded.")
        print(f"  XGBoost:  1m, 3m, 6m")
        print(f"  Zipcodes: {len(_state['latest'])}")
    except Exception as exc:
        print(f"LIFESPAN ERROR: {exc}")
        _tb.print_exc()
        raise
    yield
    _state.clear()

app = FastAPI(title="Dallas Real Estate Predictor", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class PredictRequest(BaseModel):
    zipcode: str
    bedrooms: Literal[2, 3, 4, 5]
    bathrooms: Literal[1, 2, 3, 4] = 2

    @field_validator("zipcode")
    @classmethod
    def zipcode_must_be_5_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 5:
            raise ValueError("zipcode must be a 5-digit string")
        return v


class HorizonResult(BaseModel):
    horizon: str
    predicted_price: float
    predicted_change_dollars: float
    predicted_change_pct: float
    direction: Literal["up", "down"]


class DirectionResult(BaseModel):
    direction: Literal["up", "down"]
    confidence: float


class DirectionExplanation(BaseModel):
    confidence_label: str          # "Slight lean" / "Moderate" / "Strong" / "Very strong"
    summary: str                   # Plain-English explanation of the signal
    method: str                    # How direction + confidence are computed
    predicted_change_pct: float    # Raw predicted 1m change %
    model_mape_1m: float           # XGBoost 1-month MAPE (historical accuracy)


class PredictResponse(BaseModel):
    zipcode: str
    city: str
    bedrooms: int
    bathrooms: int
    current_price: float
    forecasts: list[HorizonResult]
    direction_1m: DirectionResult
    direction_explanation: DirectionExplanation
    data_date: str              # date of the latest data point (YYYY-MM-DD)
    forecast_date_1m: str       # 1 month after data_date
    forecast_date_3m: str       # 3 months after data_date
    forecast_date_6m: str       # 6 months after data_date
    current_mortgage_rate: float | None = None  # 30-year fixed rate at data_date


class HistoryRequest(BaseModel):
    zipcode: str
    bedrooms: Literal[2, 3, 4, 5]
    bathrooms: Literal[1, 2, 3, 4] = 2

    @field_validator("zipcode")
    @classmethod
    def zipcode_must_be_5_digits(cls, v: str) -> str:
        if not v.isdigit() or len(v) != 5:
            raise ValueError("zipcode must be a 5-digit string")
        return v


class HistoryPoint(BaseModel):
    date: str
    zhvi: float


class HistoryResponse(BaseModel):
    zipcode: str
    bedrooms: int
    bathrooms: int
    data: list[HistoryPoint]


class ZipcodeInfo(BaseModel):
    zipcode: str
    city: str


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _get_zipcode_row(zipcode: str) -> pd.Series:
    latest: pd.DataFrame = _state["latest"]
    row = latest[latest["ZipCode"] == int(zipcode)]
    if row.empty:
        raise HTTPException(status_code=404, detail=f"Zipcode {zipcode} not found in dataset")
    return row.iloc[0]


def _predict_bedroom_price(
    row: pd.Series,
    horizon: str,
    br_col: str,
    bedrooms: int = 3,
    bathrooms: int = 2,
) -> float:
    """Use XGBoost to predict ZHVI, then scale to the bedroom tier and
    apply the NAHB-derived bathroom multiplier."""
    art = _state["xgb_models"][horizon]
    features = art["features"]
    X = row[features].values.reshape(1, -1)
    pred_zhvi: float = float(art["model"].predict(X)[0])

    current_zhvi = float(row["ZHVI"])
    current_br   = float(row[br_col])
    if current_zhvi == 0:
        return pred_zhvi * _bath_multiplier(bedrooms, bathrooms)
    br_ratio = current_br / current_zhvi
    return pred_zhvi * br_ratio * _bath_multiplier(bedrooms, bathrooms)


def _get_data_date() -> pd.Timestamp:
    """Return the latest date in the dataset."""
    latest: pd.DataFrame = _state["latest"]
    return pd.to_datetime(latest["Date"]).max()


def _confidence_label(confidence: float) -> str:
    """Map a 0.5–1.0 confidence score to a human-readable level."""
    if confidence >= 0.80:
        return "Very strong"
    if confidence >= 0.70:
        return "Strong"
    if confidence >= 0.60:
        return "Moderate"
    return "Slight lean"


def _direction_explanation(
    direction: str,
    confidence: float,
    change_pct: float,
    mape_1m: float,
) -> DirectionExplanation:
    """Build a plain-English explanation of the direction signal."""
    label = _confidence_label(confidence)
    abs_pct = abs(change_pct)
    word = "increase" if direction == "up" else "decrease"

    summary = (
        f"Our XGBoost model predicts a {abs_pct:.2f}% price {word} over the next month. "
        f"This translates to a {label.lower()} signal ({round(confidence * 100)}% confidence). "
        f"Historically, 1-month predictions are within {mape_1m:.1f}% of actual prices on average."
    )

    method = (
        "Direction is determined by the XGBoost 1-month price forecast: "
        "if the predicted price is higher than the current price, direction is \"up\", otherwise \"down\". "
        "Confidence is scaled from the predicted percent change — "
        "a larger predicted move means higher confidence, "
        "while a near-zero change results in ~50% confidence (essentially a coin flip)."
    )

    return DirectionExplanation(
        confidence_label=label,
        summary=summary,
        method=method,
        predicted_change_pct=round(change_pct, 4),
        model_mape_1m=round(mape_1m, 2),
    )


def _forecast_date(base: pd.Timestamp, months: int) -> str:
    """Add N months to a date and return YYYY-MM-DD string."""
    year = base.year + (base.month + months - 1) // 12
    month = (base.month + months - 1) % 12 + 1
    return f"{year}-{month:02d}-01"


# ---------------------------------------------------------------------------
# POST /predict
# ---------------------------------------------------------------------------
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    row    = _get_zipcode_row(req.zipcode)
    br_col = BEDROOM_COL[req.bedrooms]
    bath_mult = _bath_multiplier(req.bedrooms, req.bathrooms)

    current_price = float(row[br_col]) * bath_mult
    city          = str(row.get("City", "Unknown"))

    # XGBoost forecasts (1m, 3m, 6m)
    forecasts: list[HorizonResult] = []
    for horizon in ("1m", "3m", "6m"):
        pred_price     = _predict_bedroom_price(row, horizon, br_col, req.bedrooms, req.bathrooms)
        change_dollars = pred_price - current_price
        change_pct     = (change_dollars / current_price * 100) if current_price else 0.0
        forecasts.append(HorizonResult(
            horizon=horizon,
            predicted_price=round(pred_price, 2),
            predicted_change_dollars=round(change_dollars, 2),
            predicted_change_pct=round(change_pct, 4),
            direction="up" if change_dollars >= 0 else "down",
        ))

    # Direction derived from XGBoost 1m prediction (single source of truth)
    forecast_1m = forecasts[0]
    change_pct_abs = abs(forecast_1m.predicted_change_pct)
    # Confidence: scale the pct change into 0.5–1.0 range
    # 0% change → 0.5 (coin flip), >=5% change → ~1.0 (very confident)
    confidence = min(0.5 + change_pct_abs / 10.0, 1.0)
    direction_1m = DirectionResult(
        direction=forecast_1m.direction,
        confidence=round(confidence, 4),
    )

    # Model accuracy context for the explanation
    mape_1m = _state["xgb_models"]["1m"].get("metrics", {}).get("mape", 0.0)

    explanation = _direction_explanation(
        direction=forecast_1m.direction,
        confidence=confidence,
        change_pct=forecast_1m.predicted_change_pct,
        mape_1m=mape_1m,
    )

    data_date = _get_data_date()

    mortgage_rate = row.get("mortgage_rate_30y")
    mortgage_rate = round(float(mortgage_rate), 2) if mortgage_rate is not None and not pd.isna(mortgage_rate) else None

    return PredictResponse(
        zipcode=req.zipcode,
        city=city,
        bedrooms=req.bedrooms,
        bathrooms=req.bathrooms,
        current_price=round(current_price, 2),
        forecasts=forecasts,
        direction_1m=direction_1m,
        direction_explanation=explanation,
        data_date=data_date.strftime("%Y-%m-%d"),
        forecast_date_1m=_forecast_date(data_date, 1),
        forecast_date_3m=_forecast_date(data_date, 3),
        forecast_date_6m=_forecast_date(data_date, 6),
        current_mortgage_rate=mortgage_rate,
    )


# ---------------------------------------------------------------------------
# POST /history
# ---------------------------------------------------------------------------
@app.post("/history", response_model=HistoryResponse)
def history(req: HistoryRequest):
    df     = _state["history_df"]
    br_col = BEDROOM_COL[req.bedrooms]
    bath_mult = _bath_multiplier(req.bedrooms, req.bathrooms)

    filtered = df[df["ZipCode"] == int(req.zipcode)][["Date", br_col]].dropna()
    if filtered.empty:
        raise HTTPException(status_code=404, detail=f"Zipcode {req.zipcode} not found in dataset")

    filtered = filtered[filtered["Date"] >= "2019-01-01"].sort_values("Date")
    data = [
        HistoryPoint(date=row["Date"].strftime("%Y-%m-%d"), zhvi=round(float(row[br_col]) * bath_mult, 2))
        for _, row in filtered.iterrows()
    ]

    return HistoryResponse(zipcode=req.zipcode, bedrooms=req.bedrooms, bathrooms=req.bathrooms, data=data)


# ---------------------------------------------------------------------------
# GET /zipcodes
# ---------------------------------------------------------------------------
@app.get("/zipcodes", response_model=list[ZipcodeInfo])
def zipcodes():
    latest: pd.DataFrame = _state["latest"]
    result = (
        latest[["ZipCode", "City"]]
        .drop_duplicates()
        .sort_values("ZipCode")
    )
    return [
        ZipcodeInfo(zipcode=str(row["ZipCode"]), city=str(row["City"]))
        for _, row in result.iterrows()
    ]


# ---------------------------------------------------------------------------
# GET /data-info
# ---------------------------------------------------------------------------
@app.get("/data-info")
def data_info():
    """Return metadata about the current dataset."""
    data_date = _get_data_date()
    return {
        "data_date": data_date.strftime("%Y-%m-%d"),
        "forecast_date_1m": _forecast_date(data_date, 1),
        "forecast_date_3m": _forecast_date(data_date, 3),
        "forecast_date_6m": _forecast_date(data_date, 6),
        "zipcodes": len(_state["latest"]),
    }


# ---------------------------------------------------------------------------
# GET /model-metrics
# ---------------------------------------------------------------------------
@app.get("/model-info")
def model_info():
    """Return high-level model info: top feature drivers + dataset stats."""
    FEATURE_LABELS = {
        "zhvi_lag_1m": "Recent Price Trend",
        "zhvi_lag_3m": "3-Month Price History",
        "zhvi_lag_6m": "6-Month Price History",
        "zhvi_lag_12m": "Annual Price Baseline",
        "price_change_12m": "12-Month Momentum",
        "zhvi_2br": "2-Bedroom Market",
        "zhvi_3br": "3-Bedroom Market",
        "zhvi_4br": "4-Bedroom Market",
        "zhvi_5br_plus": "Luxury Home Tier",
        "zhvi_top_tier": "Premium Segment",
        "zhvi_bottom_tier": "Affordability Floor",
        "month": "Seasonal Patterns",
        "year": "Long-Term Trend",
        "SizeRank": "Market Size",
        "mortgage_rate_30y": "30-Year Mortgage Rate",
    }

    art = _state["xgb_models"]["1m"]
    features = art["features"]
    importances = art["model"].feature_importances_

    ranked = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)
    top_drivers = [
        {"feature": FEATURE_LABELS.get(f, f), "importance": round(float(imp), 4)}
        for f, imp in ranked[:5]
    ]

    history_df = _state["history_df"]
    data_date = _get_data_date()

    return {
        "top_drivers": top_drivers,
        "dataset": {
            "zipcodes": int(history_df["ZipCode"].nunique()),
            "data_points": len(history_df),
            "date_range_start": history_df["Date"].min().strftime("%Y-%m-%d"),
            "date_range_end": data_date.strftime("%Y-%m-%d"),
        },
    }


@app.get("/model-metrics")
def model_metrics():
    """Return accuracy metrics stored in each XGBoost model artifact."""
    metrics = {}
    for h in ("1m", "3m", "6m"):
        art = _state["xgb_models"][h]
        m = art.get("metrics", {})
        metrics[h] = {
            "rmse": round(m.get("rmse", 0), 2),
            "mae": round(m.get("mae", 0), 2),
            "mape": round(m.get("mape", 0), 2),
        }
    return metrics


# ---------------------------------------------------------------------------
# GET /model-info-detailed — all 14 features x 3 horizons
# ---------------------------------------------------------------------------
FEATURE_LABELS = {
    "zhvi_lag_1m": "Recent Price Trend",
    "zhvi_lag_3m": "3-Month Price History",
    "zhvi_lag_6m": "6-Month Price History",
    "zhvi_lag_12m": "Annual Price Baseline",
    "price_change_12m": "12-Month Momentum",
    "zhvi_2br": "2-Bedroom Market",
    "zhvi_3br": "3-Bedroom Market",
    "zhvi_4br": "4-Bedroom Market",
    "zhvi_5br_plus": "Luxury Home Tier",
    "zhvi_top_tier": "Premium Segment",
    "zhvi_bottom_tier": "Affordability Floor",
    "month": "Seasonal Patterns",
    "year": "Long-Term Trend",
    "SizeRank": "Market Size",
    "mortgage_rate_30y": "30-Year Mortgage Rate",
}


@app.get("/model-info-detailed")
def model_info_detailed():
    """Return all feature importances for each XGBoost horizon."""
    result = {}
    for h in ("1m", "3m", "6m"):
        art = _state["xgb_models"][h]
        features = art["features"]
        importances = art["model"].feature_importances_
        ranked = sorted(zip(features, importances), key=lambda x: x[1], reverse=True)
        result[h] = [
            {"feature": FEATURE_LABELS.get(f, f), "importance": round(float(imp), 4)}
            for f, imp in ranked
        ]
    return result


# ---------------------------------------------------------------------------
# POST /backtest — historical accuracy for a specific zipcode
# ---------------------------------------------------------------------------
@app.post("/backtest")
def backtest(req: PredictRequest):
    """Run 1m model on past months and compare predictions to actuals."""
    df = _state["history_df"]
    br_col = BEDROOM_COL[req.bedrooms]
    bath_mult = _bath_multiplier(req.bedrooms, req.bathrooms)
    art = _state["xgb_models"]["1m"]
    features = art["features"]

    zc_df = df[df["ZipCode"] == int(req.zipcode)].sort_values("Date").copy()
    if zc_df.empty:
        raise HTTPException(status_code=404, detail=f"Zipcode {req.zipcode} not found")

    # Use last ~18 months of data where we have a next-month actual
    zc_df = zc_df.reset_index(drop=True)
    results = []
    for i in range(max(0, len(zc_df) - 18), len(zc_df) - 1):
        row = zc_df.iloc[i]
        actual_next = zc_df.iloc[i + 1]

        # Check we have all needed features
        if any(pd.isna(row.get(f)) for f in features):
            continue

        X = row[features].values.reshape(1, -1)
        pred_zhvi = float(art["model"].predict(X)[0])

        # Scale to bedroom tier then apply bathroom multiplier
        current_zhvi = float(row["ZHVI"])
        current_br = float(row[br_col])
        if current_zhvi > 0:
            br_ratio = current_br / current_zhvi
            pred_price = pred_zhvi * br_ratio * bath_mult
        else:
            pred_price = pred_zhvi * bath_mult

        actual_price = float(actual_next[br_col]) * bath_mult
        error_dollars = abs(pred_price - actual_price)
        error_pct = (error_dollars / actual_price * 100) if actual_price > 0 else 0.0

        results.append({
            "date": actual_next["Date"].strftime("%Y-%m-%d"),
            "predicted": round(pred_price, 2),
            "actual": round(actual_price, 2),
            "error_pct": round(error_pct, 2),
        })

    avg_error_dollars = np.mean([abs(r["predicted"] - r["actual"]) for r in results]) if results else 0
    avg_error_pct = np.mean([r["error_pct"] for r in results]) if results else 0

    return {
        "zipcode": req.zipcode,
        "bedrooms": req.bedrooms,
        "bathrooms": req.bathrooms,
        "data": results,
        "avg_error_dollars": round(float(avg_error_dollars), 2),
        "avg_error_pct": round(float(avg_error_pct), 2),
    }


# ---------------------------------------------------------------------------
# POST /zipcode-profile — volatility ranking + seasonal patterns
# ---------------------------------------------------------------------------
@app.post("/zipcode-profile")
def zipcode_profile(req: PredictRequest):
    """Return predictability score and seasonal trends for a zipcode."""
    df = _state["history_df"]
    vol_map = _state["volatility_by_zipcode"]
    zc = int(req.zipcode)

    if zc not in vol_map:
        raise HTTPException(status_code=404, detail=f"Zipcode {req.zipcode} not found")

    # Volatility percentile (lower vol = more predictable = higher percentile)
    zc_vol = vol_map[zc]
    all_vols = list(vol_map.values())
    # Count how many zipcodes are MORE volatile (higher std dev)
    more_volatile = sum(1 for v in all_vols if v > zc_vol)
    percentile = round(more_volatile / len(all_vols) * 100, 1)

    if percentile >= 80:
        label = "Very High"
    elif percentile >= 60:
        label = "High"
    elif percentile >= 40:
        label = "Moderate"
    elif percentile >= 20:
        label = "Low"
    else:
        label = "Very Low"

    # Seasonal patterns: average month-over-month change by calendar month
    br_col = BEDROOM_COL[req.bedrooms]
    zc_df = df[df["ZipCode"] == zc].sort_values("Date")
    zc_df = zc_df[["Date", br_col]].dropna().copy()
    zc_df["pct_change"] = zc_df[br_col].pct_change() * 100
    zc_df["month"] = zc_df["Date"].dt.month

    seasonal = []
    month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    for m in range(1, 13):
        month_data = zc_df[zc_df["month"] == m]["pct_change"].dropna()
        avg = float(month_data.mean()) if len(month_data) > 0 else 0.0
        seasonal.append({
            "month": month_names[m - 1],
            "avg_change_pct": round(avg, 3),
        })

    return {
        "zipcode": req.zipcode,
        "bathrooms": req.bathrooms,
        "volatility_percentile": percentile,
        "predictability_label": label,
        "seasonal": seasonal,
    }


# ---------------------------------------------------------------------------
# GET /model-deep-dive — XGBoost algorithm details for the deep-dive UI
# ---------------------------------------------------------------------------
FEATURE_CATEGORIES = {
    "zhvi_lag_1m":        "price_history",
    "zhvi_lag_3m":        "price_history",
    "zhvi_lag_6m":        "price_history",
    "zhvi_lag_12m":       "price_history",
    "price_change_12m":   "momentum",
    "zhvi_2br":           "market_segment",
    "zhvi_3br":           "market_segment",
    "zhvi_4br":           "market_segment",
    "zhvi_5br_plus":      "market_segment",
    "zhvi_top_tier":      "market_segment",
    "zhvi_bottom_tier":   "market_segment",
    "month":              "context",
    "year":               "context",
    "SizeRank":           "context",
    "mortgage_rate_30y":  "economic",
}

HYPERPARAMETER_DESCRIPTIONS = {
    "n_estimators":         "Maximum number of trees the model can build",
    "learning_rate":        "How much each tree contributes — lower means more cautious learning",
    "max_depth":            "How many levels deep each decision tree can grow",
    "subsample":            "Fraction of data rows sampled for each tree (reduces overfitting)",
    "colsample_bytree":     "Fraction of features sampled for each tree",
    "min_child_weight":     "Minimum data required in a leaf node — higher prevents overfitting",
    "reg_alpha":            "L1 regularization — encourages simpler trees",
    "reg_lambda":           "L2 regularization — penalizes large predictions",
    "early_stopping_rounds": "Stop training if accuracy hasn't improved in this many rounds",
}


@app.get("/model-deep-dive")
def model_deep_dive():
    """Return XGBoost algorithm details, hyperparameters, and training info."""

    trees_used = {}
    for h in ("1m", "3m", "6m"):
        model = _state["xgb_models"][h]["model"]
        best = getattr(model, "best_iteration", None)
        trees_used[h] = (best + 1) if best is not None else int(model.n_estimators)

    features_list = []
    for feat in _state["xgb_models"]["1m"]["features"]:
        features_list.append({
            "name": feat,
            "label": FEATURE_LABELS.get(feat, feat),
            "category": FEATURE_CATEGORIES.get(feat, "other"),
        })

    history_df = _state["history_df"]
    data_date = _get_data_date()

    return {
        "algorithm": {
            "name": "XGBoost (Extreme Gradient Boosting)",
            "type": "Gradient Boosted Decision Trees",
            "description": (
                "Builds an ensemble of decision trees sequentially, "
                "where each new tree corrects errors made by the previous ones. "
                "This iterative error-correction process is called gradient boosting."
            ),
        },
        "hyperparameters": {
            "n_estimators":         1000,
            "learning_rate":        0.05,
            "max_depth":            6,
            "subsample":            0.8,
            "colsample_bytree":     0.8,
            "min_child_weight":     5,
            "reg_alpha":            0.1,
            "reg_lambda":           1.0,
            "early_stopping_rounds": 50,
        },
        "hyperparameter_descriptions": HYPERPARAMETER_DESCRIPTIONS,
        "training": {
            "split_date": "2025-01-01",
            "num_features": len(features_list),
            "horizons": ["1m", "3m", "6m"],
            "trees_used": trees_used,
            "train_rows": int(history_df[history_df["Date"] < "2025-01-01"].shape[0]),
            "test_rows":  int(history_df[history_df["Date"] >= "2025-01-01"].shape[0]),
            "date_range_start": history_df["Date"].min().strftime("%Y-%m-%d"),
            "date_range_end":   data_date.strftime("%Y-%m-%d"),
        },
        "features": features_list,
        "prediction_steps": [
            "Collect the latest Zillow Home Value Index (ZHVI) data for the selected zipcode",
            "Extract 14 market features: price lags, bedroom tiers, momentum, and seasonal context",
            "Feed features into the trained XGBoost model to predict future overall ZHVI",
            "Scale the ZHVI prediction to the selected bedroom tier using current price ratios",
            "Apply NAHB-derived bathroom multiplier to adjust for the selected bathroom count",
            "Derive direction signal, confidence score, and expected price range from the forecast",
        ],
    }