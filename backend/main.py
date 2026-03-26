"""
Dallas Real Estate Predictor — Modal-served FastAPI backend.

Endpoints:
  POST /predict   — 1m / 3m / 6m price forecasts (XGBoost) + direction derived from price change
  POST /history   — historical ZHVI for a zipcode + bedroom count
  GET  /zipcodes  — list of all available zipcodes with city names
  GET  /data-info — metadata about the dataset (latest date, forecast dates)

Deploy:
  modal deploy backend/main.py

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

# ---------------------------------------------------------------------------
# Startup: load models + data once, keep in memory
# ---------------------------------------------------------------------------
_state: dict = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
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

    print("Models and data loaded.")
    print(f"  XGBoost:  1m, 3m, 6m")
    print(f"  Zipcodes: {len(_state['latest'])}")
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
    current_price: float
    forecasts: list[HorizonResult]
    direction_1m: DirectionResult
    direction_explanation: DirectionExplanation
    data_date: str         # date of the latest data point (YYYY-MM-DD)
    forecast_date_1m: str  # 1 month after data_date
    forecast_date_3m: str  # 3 months after data_date
    forecast_date_6m: str  # 6 months after data_date


class HistoryRequest(BaseModel):
    zipcode: str
    bedrooms: Literal[2, 3, 4, 5]

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
) -> float:
    """Use XGBoost to predict ZHVI, then scale to the bedroom tier."""
    art = _state["xgb_models"][horizon]
    features = art["features"]
    X = row[features].values.reshape(1, -1)
    pred_zhvi: float = float(art["model"].predict(X)[0])

    current_zhvi = float(row["ZHVI"])
    current_br   = float(row[br_col])
    if current_zhvi == 0:
        return pred_zhvi
    br_ratio = current_br / current_zhvi
    return pred_zhvi * br_ratio


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

    current_price = float(row[br_col])
    city          = str(row.get("City", "Unknown"))

    # XGBoost forecasts (1m, 3m, 6m)
    forecasts: list[HorizonResult] = []
    for horizon in ("1m", "3m", "6m"):
        pred_price     = _predict_bedroom_price(row, horizon, br_col)
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

    return PredictResponse(
        zipcode=req.zipcode,
        city=city,
        bedrooms=req.bedrooms,
        current_price=round(current_price, 2),
        forecasts=forecasts,
        direction_1m=direction_1m,
        direction_explanation=explanation,
        data_date=data_date.strftime("%Y-%m-%d"),
        forecast_date_1m=_forecast_date(data_date, 1),
        forecast_date_3m=_forecast_date(data_date, 3),
        forecast_date_6m=_forecast_date(data_date, 6),
    )


# ---------------------------------------------------------------------------
# POST /history
# ---------------------------------------------------------------------------
@app.post("/history", response_model=HistoryResponse)
def history(req: HistoryRequest):
    df     = _state["history_df"]
    br_col = BEDROOM_COL[req.bedrooms]

    filtered = df[df["ZipCode"] == int(req.zipcode)][["Date", br_col]].dropna()
    if filtered.empty:
        raise HTTPException(status_code=404, detail=f"Zipcode {req.zipcode} not found in dataset")

    filtered = filtered[filtered["Date"] >= "2019-01-01"].sort_values("Date")
    data = [
        HistoryPoint(date=row["Date"].strftime("%Y-%m-%d"), zhvi=round(float(row[br_col]), 2))
        for _, row in filtered.iterrows()
    ]

    return HistoryResponse(zipcode=req.zipcode, bedrooms=req.bedrooms, data=data)


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