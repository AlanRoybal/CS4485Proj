# Requirements: Real Estate Market Analyzer

**Defined:** 2026-03-05
**Core Value:** A user enters one Dallas zipcode and gets a clear, data-backed answer: what prices have done and where they're likely heading next month.

## v1 Requirements

### XGBoost Model

- [ ] **XGBT-01**: Developer can run `train_xgboost.py` on Modal to train an XGBoost regressor on the 14 specified features targeting `target_zhvi_1m`
- [ ] **XGBT-02**: Training script prints RMSE, MAE, and MAPE on the test set and compares against baseline benchmarks
- [ ] **XGBT-03**: Trained model is saved to Modal Volume at `/mnt/real-estate-data/models/xgboost_1m.pkl` with model + feature list bundled

### Modal Endpoints

- [ ] **ENDP-01**: Prediction endpoint (`predict.py`) deployed on Modal accepts `{ zipcode, bedrooms }` and returns `{ predicted_price, direction, confidence, current_price, predicted_change_dollars, predicted_change_pct }`
- [ ] **ENDP-02**: Prediction endpoint validates zipcode is in the allowed 255-zipcode training set and returns a clear error for unknown zipcodes
- [ ] **ENDP-03**: History endpoint (`history.py`) deployed on Modal accepts `{ zipcode, bedrooms }` and returns array of `{ date, zhvi }` for the past 5 years
- [ ] **ENDP-04**: Both endpoints load models from Volume on startup (not on every request)

### Landing Page

- [ ] **LAND-01**: User can enter a 5-digit Dallas zipcode in a text input field
- [ ] **LAND-02**: User can select bedroom count from 2, 3, 4, 5+ options
- [ ] **LAND-03**: User sees a validation error if zipcode is not in the 113-zipcode Dallas list before any API call is made
- [ ] **LAND-04**: Submitting valid input navigates to `/dashboard/[zipcode]?bedrooms=[n]`

### Dashboard Page

- [ ] **DASH-01**: Dashboard header shows zipcode, city name, current median price, and year-over-year price change
- [ ] **DASH-02**: Historical price chart displays last 5 years of ZHVI as a Recharts line chart with date on X-axis and price (formatted as $XXXk) on Y-axis
- [ ] **DASH-03**: Price chart includes a vertical marker at the current date and a dotted line extending to the forecast point
- [ ] **DASH-04**: Forecast callout shows predicted price next month, dollar change, and percent change
- [ ] **DASH-05**: Confidence gauge shows direction (up/down) and confidence percentage from Logistic Regression, green for up and red for down
- [ ] **DASH-06**: Bedroom breakdown shows current median prices for 2br, 3br, 4br, and 5br+ in that zipcode as stat cards

### UI Components

- [ ] **COMP-01**: `PriceChart.tsx` renders a Recharts LineChart accepting `data: { date: string, zhvi: number }[]`
- [ ] **COMP-02**: `ConfidenceGauge.tsx` renders a directional confidence indicator accepting `direction: 'up' | 'down'` and `confidence: number`
- [ ] **COMP-03**: `BedroomCards.tsx` renders a row of stat cards accepting prices for each bedroom tier

### Integration

- [ ] **INTG-01**: `app/api/predict/route.ts` proxies POST requests to `MODAL_PREDICT_URL` env variable
- [ ] **INTG-02**: `app/api/history/route.ts` proxies POST requests to `MODAL_HISTORY_URL` env variable
- [ ] **INTG-03**: `.env.local.example` documents required env variables so any teammate can configure without asking

### Static Data

- [ ] **DATA-01**: `lib/dallas-zipcodes.json` contains the 113 curated core Dallas zipcodes as a static JSON array for frontend validation

### Polish

- [ ] **PLSH-01**: Dashboard shows loading skeleton states while Modal endpoints are responding (cold starts can take several seconds)
- [ ] **PLSH-02**: Dashboard shows a user-friendly error state when a zipcode has no data or an endpoint fails
- [ ] **PLSH-03**: Dashboard includes a historical validation section showing how the model would have predicted past months vs actual prices

## v2 Requirements

### Responsive Design

- **RESP-01**: Dashboard layout is readable on mobile (< 768px)
- **RESP-02**: Price chart is scrollable horizontally on small screens

### Performance

- **PERF-01**: Modal endpoints handle concurrent requests without cold-start delays (keep-warm strategy)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Authentication / login | No user accounts needed — public read-only tool |
| Mobile app | Web-first, capstone scope |
| Real-time data feeds | Zillow CSV only, no streaming |
| Predictions beyond 1 month | Tighter scope = more accurate model; already decided |
| Zipcodes outside 113 Dallas list | Cleaner UX; already decided |
| OAuth / social login | Not applicable |
| Multiple metro areas | Dallas only for capstone scope |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| XGBT-01 | Phase 1 | Pending |
| XGBT-02 | Phase 1 | Pending |
| XGBT-03 | Phase 1 | Pending |
| ENDP-01 | Phase 1 | Pending |
| ENDP-02 | Phase 1 | Pending |
| ENDP-03 | Phase 1 | Pending |
| ENDP-04 | Phase 1 | Pending |
| LAND-01 | Phase 2 | Pending |
| LAND-02 | Phase 2 | Pending |
| LAND-03 | Phase 2 | Pending |
| LAND-04 | Phase 2 | Pending |
| COMP-01 | Phase 2 | Pending |
| COMP-02 | Phase 2 | Pending |
| COMP-03 | Phase 2 | Pending |
| DATA-01 | Phase 2 | Pending |
| DASH-01 | Phase 3 | Pending |
| DASH-02 | Phase 3 | Pending |
| DASH-03 | Phase 3 | Pending |
| DASH-04 | Phase 3 | Pending |
| DASH-05 | Phase 3 | Pending |
| DASH-06 | Phase 3 | Pending |
| INTG-01 | Phase 3 | Pending |
| INTG-02 | Phase 3 | Pending |
| INTG-03 | Phase 3 | Pending |
| PLSH-01 | Phase 3 | Pending |
| PLSH-02 | Phase 3 | Pending |
| PLSH-03 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-05*
*Last updated: 2026-03-05 after roadmap creation*
