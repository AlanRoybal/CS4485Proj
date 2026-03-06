# Roadmap: Real Estate Market Analyzer

## Overview

Three phases deliver the complete app sequentially. Phase 1 builds the Next.js frontend shell with mocked data. Phase 2 trains XGBoost and deploys both Modal endpoints. Phase 3 wires the two together: full dashboard connected to live Modal endpoints, error handling, loading states, and historical validation. The result is a deployed, working app where a homebuyer enters a Dallas zipcode and gets a price forecast backed by real ML.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Frontend Shell** - Build the Next.js landing page, UI components, and static zipcode data with mocked responses
- [ ] **Phase 2: ML Backend** - Train XGBoost and deploy both Modal prediction and history endpoints
- [ ] **Phase 3: Integration and Polish** - Wire frontend to live Modal endpoints, complete dashboard, loading states, error handling, and historical validation

## Phase Details

### Phase 1: Frontend Shell
**Goal**: Any teammate can clone the repo, run the Next.js app, and navigate from the landing page to a dashboard showing plausible mocked data — without needing Modal endpoints live
**Depends on**: Nothing
**Requirements**: LAND-01, LAND-02, LAND-03, LAND-04, COMP-01, COMP-02, COMP-03, DATA-01
**Success Criteria** (what must be TRUE):
  1. User can type a Dallas zipcode, pick a bedroom count, and submit — invalid zipcodes show an inline error before any network call
  2. Valid submission navigates to /dashboard/[zipcode]?bedrooms=[n]
  3. The PriceChart component renders a Recharts line chart with date on X-axis and $XXXk-formatted price on Y-axis when given sample data
  4. The ConfidenceGauge component shows green/red directional indicator with a confidence percentage
  5. The BedroomCards component renders four stat cards (2br, 3br, 4br, 5br+) with prices
**Plans**: 4 plans

Plans:
- [ ] 01-01-PLAN.md — Bootstrap Next.js 15 project, install dependencies, create static zipcode list, type contracts, mock fixture, and test scaffolds
- [ ] 01-02-PLAN.md — Build PriceChart, ConfidenceGauge, and BedroomCards UI components with Recharts
- [ ] 01-03-PLAN.md — Build SearchForm, NavBar, landing page, and About page
- [ ] 01-04-PLAN.md — Assemble dashboard page wiring all 5 sections with mock data, add stub API proxy routes

### Phase 2: ML Backend
**Goal**: The prediction and history Modal endpoints are deployed and return correct data for any valid Dallas zipcode
**Depends on**: Phase 1
**Requirements**: XGBT-01, XGBT-02, XGBT-03, ENDP-01, ENDP-02, ENDP-03, ENDP-04
**Success Criteria** (what must be TRUE):
  1. A POST to the deployed predict endpoint with a valid Dallas zipcode and bedroom count returns a JSON response containing predicted_price, direction, confidence, current_price, predicted_change_dollars, and predicted_change_pct
  2. A POST to the deployed history endpoint returns an array of date/zhvi objects covering the past 5 years for the requested zipcode and bedroom combo
  3. The XGBoost model's test-set RMSE, MAE, and MAPE are printed and documented — and XGBoost direction accuracy either beats 75.82% or the decision to stay with Logistic Regression is recorded
  4. The predict endpoint returns a clear error response when given a zipcode outside the allowed training set
  5. Both endpoints load models once at startup, not on every request
**Plans**: TBD

### Phase 3: Integration and Polish
**Goal**: The deployed app on Vercel shows a real price forecast and 5-year chart for any of the 113 Dallas zipcodes, with no broken states left for a user to encounter
**Depends on**: Phase 1, Phase 2
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, INTG-01, INTG-02, INTG-03, PLSH-01, PLSH-02, PLSH-03
**Success Criteria** (what must be TRUE):
  1. Dashboard header shows the correct city name, current median price, and year-over-year change for the queried zipcode
  2. Historical price chart displays 5 years of real ZHVI data with a vertical marker at today and a dotted line to the predicted next-month price
  3. Forecast callout and confidence gauge both display live data from the Modal endpoints — not mocked values
  4. During Modal cold starts, the dashboard shows skeleton loading states instead of blank or broken sections
  5. If an endpoint fails or a zipcode has sparse data, the user sees a readable error message rather than a crash or empty page
  6. A historical validation section on the dashboard shows how the model's past predictions compare to actual recorded prices
**Plans**: TBD

## Progress

**Execution Order:**
Sequential. Phase 2 depends on Phase 1. Phase 3 requires both complete.

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Frontend Shell | 0/4 | Not started | - |
| 2. ML Backend | 0/? | Not started | - |
| 3. Integration and Polish | 0/? | Not started | - |
