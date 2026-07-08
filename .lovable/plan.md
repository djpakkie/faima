
# Microfinance Management System — Build Plan

This is a large internal fintech app. I'll build it in phases so you can review as it grows, rather than shipping everything in one shot. Before I start, a few decisions and confirmations.

## Stack

- Frontend: React + TypeScript + Tailwind (already in template), TanStack Router/Query
- Backend: **Lovable Cloud** (Supabase under the hood) for auth, Postgres DB, storage, and server functions
- Currency formatting: Namibian Dollars (N$) via `Intl.NumberFormat`
- PDF export: `jspdf` + `jspdf-autotable`; Excel via `xlsx`; Charts via `recharts`

## Roles & Access

Roles stored in a dedicated `user_roles` table (never on profiles) with a `has_role()` security-definer function, enforced via RLS:
- `administrator`, `loan_officer`, `finance_officer`

Login is email + password (internal staff only — no public signup). Admins create users. Session timeout after inactivity (configurable, default 15 min).

## Database Schema (high level)

```
profiles           (id → auth.users, full_name, phone, active)
user_roles         (user_id, role)  -- app_role enum
customers          (customer_number, personal info, employment, banking, next_of_kin)
customer_documents (customer_id, doc_type, storage_path)
loan_products      (name, min/max amount, interest, max term, fees, penalty, grace)
loan_applications  (application_number, customer_id, product_id, amount, term,
                    frequency, purpose, status, affordability snapshot, officer_id)
loans              (loan_number, application_id, disbursed_at, balance, status)
repayment_schedule (loan_id, seq, due_date, principal, interest, balance, paid)
repayments         (loan_id, date, amount, method, receipt_number, penalty, notes)
arrears_notes      (loan_id, note, follow_up_date)
notifications      (user_id, type, payload, read_at)
audit_log          (user_id, action, entity, entity_id, meta, ip, created_at)
```

All tables get `GRANT` statements + RLS policies scoped by role.

## Phased Delivery

**Phase 1 — Foundation (this turn)**
- Enable Lovable Cloud
- Design system (fintech blue/green/white, light + dark), sidebar + topbar shell
- Auth (login, password reset, session timeout, protected routes)
- Roles, profiles, `has_role` function, admin user-management page
- Audit log infrastructure (server-side helper + viewer)
- Empty dashboard shell with cards & chart placeholders

**Phase 2 — Customers & Products**
- Customer CRUD with auto customer number, search, history tab
- Document upload (private storage bucket, signed URLs)
- Loan products CRUD (admin only)

**Phase 3 — Calculators & Applications**
- Loan calculator (amortization for monthly / weekly / biweekly) with PDF export
- Affordability calculator with eligibility verdict
- Loan application workflow with status machine (Draft → Submitted → Under Review → Approved/Declined → Disbursed → Closed)
- Auto-generated repayment schedule on approval

**Phase 4 — Repayments, Arrears, Reports**
- Record repayments, receipts, auto balance/arrears update, penalty accrual (server function run on demand + on payment)
- Arrears dashboard, payment arrangements, collection notes
- Reports (daily/monthly collections, portfolio, outstanding, overdue, customer list, income, interest earned, officer performance) with PDF/Excel/CSV export
- Dashboard fully wired with live metrics + charts
- Global search, notifications center

## Decisions I'm making unless you say otherwise

- Customer number format: `CUS-YYYY-#####`, loan: `LN-YYYY-#####`, application: `APP-YYYY-#####`, receipt: `RCP-YYYY-#####`
- Interest method: **reducing-balance** (standard for microfinance amortization). Flat-rate can be added as a product option later.
- Penalty: percentage of overdue instalment per day after grace period, configurable per product
- Session timeout: 15 min idle → auto logout
- Only admins can create staff accounts; no public sign-up route
- Light mode default, dark mode toggle available (you did say light/dark — I'll include it since this is an internal tool where staff preference matters)

## Questions before I start Phase 1

1. **Multi-branch?** Should customers/loans be scoped to a branch, or single-office for now?
2. **First admin account** — I'll seed a bootstrap flow where the first signed-up user auto-becomes admin (only when no admin exists). OK?
3. **Approval workflow** — should approvals require a two-step (loan officer recommends → admin approves), or can loan officers with permission approve directly?
4. **Anything to cut from Phase 1** so I can ship it faster, or proceed with the full Phase 1 scope above?

Reply and I'll enable Cloud and start Phase 1.
