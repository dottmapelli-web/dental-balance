---
task: Fix forecast charts and improve budget objectives AI
slug: 20260509-120000_fix-forecast-charts-budget-ai
effort: advanced
phase: complete
progress: 27/27
mode: interactive
started: 2026-05-09T12:00:00Z
updated: 2026-05-09T12:05:00Z
---

## Context

The `globals.css` file is missing `--chart-1` through `--chart-5` CSS variables. All Recharts charts in the app use `hsl(var(--chart-N))` in their ChartConfig objects (via shadcn/ui ChartContainer). Without these vars, SVG `stroke` resolves to nothing (invisible lines) and SVG `fill` defaults to black — explaining dots-only line charts and all-black bar charts.

Additionally, the budget-objectives page needs an AI-assisted budget suggestion feature that analyzes last year's historical data and proposes monthly budgets per category, with user approval before saving to Firestore.

### Risks
- ChartContainer might inject CSS vars differently than expected — verify behavior after fix
- Budget suggestion saving might conflict with existing budget entries — need to handle duplicates gracefully

## Criteria

- [ ] ISC-1: `--chart-1` defined in :root with emerald green value (income color)
- [ ] ISC-2: `--chart-2` defined in :root with rose red value (expenses color)
- [ ] ISC-3: `--chart-3` defined in :root with blue value (profit/balance color)
- [ ] ISC-4: `--chart-4` defined in :root with amber value (4th series)
- [ ] ISC-5: `--chart-5` defined in :root with violet value (5th series)
- [ ] ISC-6: All five `--chart-N` vars defined in .dark with lighter versions
- [ ] ISC-7: Monthly summary income line chart shows connected colored line
- [ ] ISC-8: Monthly summary expenses line chart shows connected colored line
- [ ] ISC-9: Monthly summary balance line chart shows connected colored line
- [ ] ISC-10: Annual summary income bars render colored (green, not black)
- [ ] ISC-11: Annual summary expense bars render colored (rose, not black)
- [ ] ISC-12: Annual monthly income bars render colored per month
- [ ] ISC-13: Annual monthly expense bars render colored per month
- [ ] ISC-14: Annual profit line chart renders connected colored line
- [ ] ISC-15: Annual expense pie chart renders distinct multi-color segments
- [ ] ISC-16: Budget-objectives page shows "Suggerimenti Budget" section
- [ ] ISC-17: Suggestions generated from previous year actual Completato transactions
- [ ] ISC-18: Each suggestion shows category, type, last year total, suggested monthly budget
- [ ] ISC-19: User can select/deselect individual suggestions via checkboxes
- [ ] ISC-20: "Salva Selezionati" button saves only checked suggestions to Firestore budgets
- [ ] ISC-21: Suggestions section shows empty state when no previous year data exists
- [ ] ISC-22: Saved suggestions create Firestore docs with category, budgeted, period: "Mensile"
- [ ] ISC-23: After saving, existing budget table refreshes with newly saved budgets
- [ ] ISC-24: TypeScript compiles with 0 errors after all changes
- [ ] ISC-A1: Existing budget add/edit/delete functionality NOT broken
- [ ] ISC-A2: Existing page layouts NOT changed beyond new section addition
- [ ] ISC-A3: Other pages unaffected except CSS vars fix

## Decisions

## Verification
