---
phase: 1
slug: frontend-shell
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-05
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest + React Testing Library |
| **Config file** | `vitest.config.ts` — Wave 0 gap (does not exist yet) |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | DATA-01 | unit | `npx vitest run tests/zipcodes.test.ts` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | LAND-01, LAND-02, LAND-03, LAND-04 | unit | `npx vitest run tests/SearchForm.test.tsx` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 0 | COMP-01 | unit | `npx vitest run tests/PriceChart.test.tsx` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 0 | COMP-02 | unit | `npx vitest run tests/ConfidenceGauge.test.tsx` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 0 | COMP-03 | unit | `npx vitest run tests/BedroomCards.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — Vitest config with jsdom environment and React Testing Library
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react @testing-library/react @testing-library/user-event jsdom`
- [ ] `tests/zipcodes.test.ts` — stubs for DATA-01
- [ ] `tests/SearchForm.test.tsx` — stubs for LAND-01, LAND-02, LAND-03, LAND-04
- [ ] `tests/PriceChart.test.tsx` — stubs for COMP-01
- [ ] `tests/ConfidenceGauge.test.tsx` — stubs for COMP-02
- [ ] `tests/BedroomCards.test.tsx` — stubs for COMP-03

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Shake animation fires on invalid zipcode submit | LAND-03 | CSS animation timing not reliably testable in jsdom | 1. Load landing page in browser. 2. Enter "99999" (not in list). 3. Click Submit. 4. Verify input shakes. |
| Spinner appears on valid submit | LAND-04 | Navigation transition state hard to observe in unit test | 1. Enter "75252", select 3BR. 2. Click Submit. 3. Verify spinner shows before dashboard loads. |
| Dashboard card grid is visually responsive | N/A | Visual layout | Resize browser to tablet/desktop widths, verify cards reflow correctly. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
