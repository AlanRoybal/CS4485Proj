# Phase 1: Frontend Shell - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Build the Next.js frontend shell: landing page with zipcode/bedroom input, dashboard page with all 5 sections (header, chart, forecast callout, confidence gauge, bedroom cards), and the three UI components (PriceChart, ConfidenceGauge, BedroomCards). All data is mocked — no live Modal endpoints required. Any teammate can clone and run the app.

</domain>

<decisions>
## Implementation Decisions

### Landing page layout
- Hero + form layout: headline describing the tool, a short tagline, then the zipcode/bedroom form below
- Title + explanation paragraph: explain what data is used and what the user will see (educate homebuyer audience)
- Subtle gradient or light color wash background (not plain white, not dark mode)

### Landing page form
- Bedroom count: toggle button group — four clickable buttons (2, 3, 4, 5+), one selected at a time
- Zipcode input: placeholder hint (e.g., "e.g., 75252") inside the field; no example chips
- Zipcode validation: shake animation on the input + inline error text below — no toasts
- Submit button: shows a spinner while navigating to the dashboard

### Navigation
- Top nav bar on both landing and dashboard: app name/logo on the left + "About" link
- About link is included (page or modal TBD — Claude's discretion on implementation)
- The top nav app name/logo links back to the landing page from the dashboard

### Dashboard layout
- Card grid: each section is its own elevated card, arranged in a responsive grid
- Header card shows: zipcode, city name, current median price, YoY % change, AND bedroom count context (e.g., "3-bedroom homes")
- Historical chart is mid-sized (approximately 300–400px tall) — prominent but not dominating
- Responsive: should work on desktop; mobile is v2 scope

### Color scheme
- Green/teal primary accent throughout
- Green for "up" direction, red for "down" direction (as required)
- Neutral grays for card backgrounds and secondary text

### PriceChart component
- Recharts LineChart, date on X-axis, price formatted as $XXXk on Y-axis
- Forecast annotation: shaded background zone for the future region + a distinct forecast dot at the end of the dotted extension line
- Solid vertical line at today's date separates historical from projected

### ConfidenceGauge component
- Semicircular arc gauge (half-circle)
- Arc fills to confidence percentage (e.g., 73% filled)
- Direction label (UP / DOWN) inside the arc
- Green when direction is "up", red when direction is "down"

### BedroomCards component
- Four small stat cards in a horizontal row: 2BR, 3BR, 4BR, 5BR+
- Each card shows bedroom label + current median price
- The user's selected bedroom tier is visually highlighted (distinct border or accent color)

### Mocked data
- Single hardcoded fixture for one zipcode (e.g., 75252, 3-bedroom)
- Realistic Dallas price ranges — looks credible for demos and presentations
- Lives in `lib/mock-data.ts`, exported as typed objects
- Structured to match the exact shape the real API routes will return in Phase 3 (easy to swap out)

### Claude's Discretion
- About page vs. modal implementation
- Exact gradient/color wash for landing background
- Specific Tailwind classes, spacing, and typography details
- Card grid breakpoints (how many columns on different screen sizes)
- Exact mock price values (use realistic Dallas 3BR range ~$380k–$420k trend)

</decisions>

<specifics>
## Specific Ideas

- Target audience: homebuyers and sellers — not developers. UI should feel approachable, not technical
- The dashboard is the main output. Make the forecast callout and confidence gauge visually prominent within the card grid
- The ConfidenceGauge arc style was explicitly chosen — not a progress bar

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None yet — greenfield Next.js project. No existing components or hooks.

### Established Patterns
- Stack is locked: Next.js 14+ / TypeScript / Tailwind CSS / Recharts
- File structure defined in CLAUDE.md: `app/`, `components/`, `lib/`
- Static zipcode list: `lib/dallas-zipcodes.json` (113 curated Dallas zipcodes)

### Integration Points
- `lib/mock-data.ts` will be replaced by real API calls to `app/api/predict/route.ts` and `app/api/history/route.ts` in Phase 3
- Dashboard route: `/dashboard/[zipcode]?bedrooms=[n]`
- API proxy routes (stubs only in Phase 1, wired in Phase 3): `app/api/predict/route.ts`, `app/api/history/route.ts`

</code_context>

<deferred>
## Deferred Ideas

- None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-frontend-shell*
*Context gathered: 2026-03-05*
