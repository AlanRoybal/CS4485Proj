"""
FastAPI endpoints for Dallas real estate price prediction.

Endpoints:
  POST /predict   — 1m / 3m / 6m price forecasts for a zipcode + bedroom count
  POST /history   — historical ZHVI for a zipcode + bedroom count
  GET  /zipcodes  — list of all available zipcodes with city names

Run locally:
  uvicorn main:app --reload
"""
import os
from contextlib import asynccontextmanager
from typing import Literal

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_ON_MODAL  = os.path.exists("/mnt/real-estate-data")
MODEL_DIR  = "/mnt/real-estate-data/models" if _ON_MODAL else "./models"
DATA_DIR   = "/mnt/real-estate-data/data"   if _ON_MODAL else "."

BEDROOM_COL = {2: "zhvi_2br", 3: "zhvi_3br", 4: "zhvi_4br", 5: "zhvi_5br_plus"}

# ---------------------------------------------------------------------------
# Startup: load models + data once, keep in memory
# ---------------------------------------------------------------------------
_state: dict = {}

@asynccontextmanager
async def lifespan(app: FastAPI):
    _state["models"] = {
        h: joblib.load(f"{MODEL_DIR}/xgboost_{h}.pkl")
        for h in ("1m", "3m", "6m")
    }
    _state["latest"] = joblib.load(f"{MODEL_DIR}/latest_data.pkl")
    _state["history_df"] = pd.read_csv(f"{DATA_DIR}/dallas_clean.csv")
    _state["history_df"]["Date"] = pd.to_datetime(_state["history_df"]["Date"])
    print("Models and data loaded.")
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


class PredictResponse(BaseModel):
    zipcode: str
    city: str
    bedrooms: int
    current_price: float
    forecasts: list[HorizonResult]


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
    art = _state["models"][horizon]
    features = art["features"]
    X = row[features].values.reshape(1, -1)
    pred_zhvi: float = float(art["model"].predict(X)[0])

    current_zhvi = float(row["ZHVI"])
    current_br   = float(row[br_col])
    if current_zhvi == 0:
        return pred_zhvi
    br_ratio = current_br / current_zhvi
    return pred_zhvi * br_ratio


# ---------------------------------------------------------------------------
# POST /predict
# ---------------------------------------------------------------------------
@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    row    = _get_zipcode_row(req.zipcode)
    br_col = BEDROOM_COL[req.bedrooms]

    current_price = float(row[br_col])
    city          = str(row.get("City", "Unknown"))

    forecasts: list[HorizonResult] = []
    for horizon in ("1m", "3m", "6m"):
        pred_price  = _predict_bedroom_price(row, horizon, br_col)
        change_dollars = pred_price - current_price
        change_pct     = (change_dollars / current_price * 100) if current_price else 0.0
        forecasts.append(HorizonResult(
            horizon=horizon,
            predicted_price=round(pred_price, 2),
            predicted_change_dollars=round(change_dollars, 2),
            predicted_change_pct=round(change_pct, 4),
            direction="up" if change_dollars >= 0 else "down",
        ))

    return PredictResponse(
        zipcode=req.zipcode,
        city=city,
        bedrooms=req.bedrooms,
        current_price=round(current_price, 2),
        forecasts=forecasts,
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
