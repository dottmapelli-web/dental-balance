---
task: Redesign financial app with modern Crextio-style UI
slug: 20260509-120000_modern-ui-redesign
effort: advanced
phase: complete
progress: 32/32
mode: interactive
started: 2026-05-09T12:00:00Z
updated: 2026-05-09T12:05:00Z
---

## Context

User wants the financial dashboard app redesigned to match the Crextio HR dashboard reference image.
Current app has warm beige/cream background with yellow accent — color palette is close.
Main issues: layout is too plain/vertical, lacks bento-grid structure, numbers not prominent enough.
`page.tsx` is missing (renamed to .bak) — must be created as part of this work.

Key reference design elements:
- Bento grid 4-column layout with mixed card sizes
- Large KPI numbers prominently displayed top-right
- Warm cream background with yellow/gold accent (#FFD747 already in codebase)
- Dark (#1D1D1D) pill nav with glass morphism — already implemented in ModernNavbar
- Left hero card with big balance number (like Crextio profile card)
- Center charts (bar chart for trends, donut for breakdown)
- Dark right card for objectives/tasks
- Very rounded corners (2-3rem radius)
- Clean white cards on warm background
- Typography: bold large numbers, small uppercase labels

All Firebase data logic must be preserved from page.tsx.bak.

### Risks
- page.tsx missing: must create fresh from .bak
- Bento grid responsiveness complexity
- Chart components may need wrapper adjustments for new sizes

## Criteria

- [ ] ISC-1: page.tsx exists at src/app/page.tsx with all original Firebase logic
- [ ] ISC-2: Dashboard uses bento-grid 4-column layout on desktop
- [ ] ISC-3: Bento grid collapses gracefully to 1 column on mobile
- [ ] ISC-4: Bento grid shows 2 columns on tablet (md breakpoint)
- [ ] ISC-5: Top header shows "Benvenuto" welcome text large on left
- [ ] ISC-6: Top header shows 3 KPI numbers (Entrate, Uscite, Saldo) on right
- [ ] ISC-7: KPI numbers displayed large (text-4xl+) with bold weight
- [ ] ISC-8: KPI labels are small uppercase with letter-spacing
- [ ] ISC-9: Bank balance hero card spans full width at top of bento grid
- [ ] ISC-10: Bank balance amount is displayed extra-large (text-5xl+)
- [ ] ISC-11: Bank balance card uses warm cream/beige styling distinct from other cards
- [ ] ISC-12: Bank balance card edit button is present and functional
- [ ] ISC-13: 6-month bar chart card occupies center-large bento slot
- [ ] ISC-14: Bar chart card has proper title and description
- [ ] ISC-15: Expense pie/donut chart occupies a bento slot
- [ ] ISC-16: Cashflow line chart occupies a bento slot
- [ ] ISC-17: Financial objectives card uses dark (#1D1D1D) card style
- [ ] ISC-18: Objectives card shows progress bars with yellow accent
- [ ] ISC-19: AI insight card is present with generate button
- [ ] ISC-20: Category breakdown cards use rounded card grid (2-3 col)
- [ ] ISC-21: Category cards have category name, amount, item count
- [ ] ISC-22: All cards use border-radius of 1.5-2.5rem (rounded-3xl or rounded-[2.5rem])
- [ ] ISC-23: Card backgrounds are white/cream with subtle border
- [ ] ISC-24: Yellow accent (#FFD747) used for highlights, active states, progress
- [ ] ISC-25: Dark pill (#1D1D1D) used for objectives card and CTAs
- [ ] ISC-26: All existing data loading states (Loader2 spinners) preserved
- [ ] ISC-27: All existing Firebase fetch functions preserved and called correctly
- [ ] ISC-28: Transaction modal still opens from navbar buttons
- [ ] ISC-29: Invoice scanner modal still opens and functions
- [ ] ISC-30: Motion animations (framer-motion) applied to cards on mount
- [ ] ISC-31: globals.css has bento-grid utility classes defined
- [ ] ISC-32: No TypeScript compilation errors in modified files

## Decisions

## Verification
