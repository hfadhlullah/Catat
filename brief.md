# Project Brief — Catat

**One-liner:** Internal PWA to replace WhatsApp-based invoice and expense tracking during private house construction. Mobile-first, owner + admin only, structured and reportable.

---

## 1. Problem

Current state: admin logs invoices and expenses by sending photos + free-text messages into a WhatsApp group. This causes:
- Expenses scattered across thousands of chat messages, no search
- No structured totals — owner can't answer "how much did we spend on material last month?" without scrolling
- Invoice photos lost when phones change, chats archived, or storage fills
- No budget visibility — overspend is discovered after the fact
- No category or vendor breakdown — can't spot leaks or renegotiate

## 2. Vision

A single source of truth for every rupiah spent on the house. Admin logs in under 20 seconds per expense from their phone. Owner opens the app and instantly sees: this month's spend vs budget, where money is going, and which vendors are eating the most. The WhatsApp group becomes obsolete for finance.

## 3. Users & Roles

| Role | Who | Can do |
|---|---|---|
| Owner | Project owner (1 person) | Everything: budget, reports, user mgmt, view & edit all expenses |
| Admin | Site/finance admin (1–2 people) | Log expenses, manage vendors & categories, view reports. No budget edit, no user mgmt. |

## 4. Goals

- Cut expense-logging time from "send to WhatsApp + manually tally later" to **<20s per expense, fully structured**
- Owner gets **real-time budget vs actual** without asking admin
- 100% of construction expenses captured in one searchable place with invoice photos attached
- Works reliably on mid-range Android, including poor connectivity (offline write queue)

## 5. Non-Goals (v1)

- OCR / auto-extraction from invoices (deferred — adds complexity, low ROI until we have real samples)
- Multi-project support (one house only)
- Approval workflows (trust-based, owner reviews after)
- WhatsApp bot integration (full replacement, not hybrid)
- Multi-currency, foreign tax handling
- CSV/PDF export (deferred to v1.1)

## 6. Success Metrics

**North Star:** % of monthly construction expenses logged in-app within 24h of being incurred. Target: **≥90% by month 2 of rollout.**

**Supporting:**
- Median time-to-log per expense: **<20 seconds**
- Admin daily active rate: **≥5 days/week** during active construction
- Budget variance discovered before month-end: **≥80% of overruns flagged in-app before owner asks**
- WhatsApp finance messages: **trending to zero by week 4**

## 7. Scope — v1 (Standard MVP)

**Hot path:**
- Add Expense screen: amount, category chip, vendor dropdown + inline-add, camera (multi-photo), note, date — optimized for <20s on mobile

**Supporting:**
- Expenses list grouped by day, filter by category/vendor/date, search
- Expense detail with photo gallery, edit, delete
- Vendors CRUD (with total-spent-per-vendor surface)
- Categories CRUD (with color/icon)
- Monthly budget per category, with live actual-vs-budget bars
- Reports: this month total, by-category bar, top 10 vendors, 6-month trend
- Role-based access (owner vs admin) enforced server-side

**Platform:**
- PWA: installable, offline read, offline write queue with sync
- Mobile-first (380px viewport priority), bottom nav, FAB for Add

## 8. Tech Stack

- **Frontend:** Next.js 15 (App Router, TS), Tailwind, shadcn/ui
- **Backend:** Convex (DB, file storage, real-time, auth)
- **PWA:** Serwist or next-pwa
- **Charts:** Recharts
- **Locale:** id-ID, currency IDR only

## 9. Key Decisions & Trade-offs

| Decision | Rationale | Trade-off accepted |
|---|---|---|
| Full WhatsApp replacement (not hybrid) | One source of truth; hybrid creates two systems and reconciliation overhead | Higher change-management cost upfront |
| Skip OCR in v1 | Manual entry takes ~10s anyway; OCR adds cost, latency, accuracy bugs | Slight slowdown vs auto-fill dream |
| Single project (no multi-project) | Faster shipping; current need is one house | Future generalization needs schema change |
| IDR-only | Local construction is IDR-only | Imported materials priced in USD must be converted manually |
| Convex over Postgres/Supabase | Real-time + file storage + auth in one; matches existing Zero stack expertise | Vendor lock-in to Convex |
| PWA over native app | One codebase, instant updates, no app store | iOS PWA quirks (camera, install UX worse than Android) |

## 10. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Admin reverts to WhatsApp because app feels slower | High | Obsess over Add Expense UX. Time-trial it. <20s or redesign. |
| iOS PWA install/camera friction | Medium | Test on iOS Safari early; document install steps; tolerate gap if admin uses Android |
| Offline writes duplicate on reconnect | Medium | Client-generated UUID per expense, server upsert by ID |
| Photo storage costs balloon | Low–Medium | Compress images client-side to ~500KB before upload; monitor Convex usage monthly |
| Admin's phone breaks / admin leaves | Medium | All data in Convex (not on phone); owner can reassign role and continue |

## 11. Milestones (estimate, part-time pace)

| Week | Deliverable |
|---|---|
| 1 | Scaffold, Convex schema, auth, Add Expense end-to-end |
| 2 | Expenses list + filters, vendors + categories CRUD |
| 3 | Budget setup, reports page |
| 4 | PWA shell, offline write queue, mobile polish |
| 5 | Internal testing with admin, iterate on Add Expense friction |
| 6 | Production rollout, retire WhatsApp finance flow |

## 12. Open Questions

- How many admin users in practice — one person or multiple? (Affects user mgmt UX priority)
- Backfill: do we import existing WhatsApp invoices into Catat, or start fresh from launch date?
- PPN/tax tracking — needed for any reporting to tax authority or contractor reconciliation?
- Who sets initial budget — owner alone, or with contractor input?
- Is there a contractor / kontraktor utama whose invoices need separate treatment from ad-hoc material runs?
