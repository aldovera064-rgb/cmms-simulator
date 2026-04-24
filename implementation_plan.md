# CMMS System — Full Implementation Plan

Comprehensive plan covering all 13 items. Organized into 4 phases by dependency order.

---

## Summary of Existing State

After researching every file in the codebase, here's what **already works** and what **needs fixing**:

| Item | Current State | Action Needed |
|------|--------------|---------------|
| Signup flow (login-form.tsx) | Flat sequential flow already exists from prior fix | Add RLS policy + retry logic |
| Select company page | Already uses manual join + "Volver al login" button | Minor: add session clear on back |
| Manage users panel | Exists with create/delete/role change | Add "add existing user" + company-scoped delete |
| Dashboard KPIs | MTBF, MTTR, Availability, overdue already computed | Add OEE, Backlog, PM compliance |
| Priority badges | P1=red, P2=orange, P3=yellow, P4=green ✅ | Add pulse animation for P1 |
| Company isolation | `company_id` filter used on most queries ✅ | Audit + fix any gaps |
| PM auto-generation | Already works in pm-plans-page-client.tsx ✅ | Verify only |
| Asset fields | Basic: name, area, status, start_time | Add CBM fields + NPR |
| Work order detail | Has root cause text field | Add Ishikawa modal |
| OEE | Not implemented | New dashboard card + gauge |

---

## Phase 1 — Critical Bugs (Blocking)

### 1A. RLS Policy for `user_companies`

> [!CAUTION]
> The `user_companies` insert fails silently because Supabase RLS blocks it. This is the **root cause** of the signup bug.

#### [NEW] [20260424_rls_unblock.sql](file:///c:/Users/ARNOLD/Documents/New%20project/supabase/migrations/20260424_rls_unblock.sql)

```sql
-- Enable RLS but allow all operations (tighten later)
ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_insert_user_companies"
  ON user_companies FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_all_select_user_companies"
  ON user_companies FOR SELECT USING (true);

CREATE POLICY "allow_all_update_user_companies"
  ON user_companies FOR UPDATE USING (true);

CREATE POLICY "allow_all_delete_user_companies"
  ON user_companies FOR DELETE USING (true);

-- Also ensure companies and admins tables are accessible
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_companies" ON companies FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all_admins" ON admins FOR ALL USING (true) WITH CHECK (true);
```

> [!IMPORTANT]
> **You must run this SQL in Supabase Dashboard → SQL Editor** for it to take effect. The migration file is for documentation. Do you want me to also create an API route that runs this, or will you run it manually?

---

### 1B. Signup Flow Hardening

#### [MODIFY] [login-form.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/auth/login-form.tsx)

The current flat flow is structurally correct. Changes:

1. **Add retry logic** — if `user_companies` insert fails, wait 500ms and retry once
2. **Add verification query** — after insert, SELECT to confirm row exists
3. **Surface the actual error** — show `relationError.message` in alert so RLS errors are visible

---

### 1C. Select Company Page — Already Fixed

The current [select-company-page-client.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/auth/select-company-page-client.tsx) already:
- ✅ Uses manual 2-query join (lines 37-67)
- ✅ Has "Volver al login" button (lines 124-131)
- ✅ Calls `logout()` which clears session

**No changes needed** for items 3 and 4.

---

## Phase 2 — RBAC & User Management

### 2A. Manage Users Improvements

#### [MODIFY] [manage-users-panel.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/dashboard/manage-users-panel.tsx)

**A. Add existing user to company:**
- New section below create form: input for username + "Agregar a empresa" button
- Logic: find user in `admins` by username → insert into `user_companies` with `company_id = activeCompanyId`

**B. Remove user from company (NOT global delete):**
- Change current "Delete" button behavior for admin role:
  - Admin: `DELETE FROM user_companies WHERE user_id = X AND company_id = activeCompanyId` (remove from company only)
  - God: Keep full delete (user_companies + admins) as current behavior

**C. God capabilities — add "Delete Company" button:**

#### [MODIFY] [company-views-panel.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/dashboard/company-views-panel.tsx)

- Add "Eliminar" button next to each company (god only)
- On click: delete company from `companies`, cascade delete from `user_companies`

---

### 2B. Role Visibility Rules

#### [MODIFY] [company-views-panel.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/dashboard/company-views-panel.tsx)

- viewer role: hide component entirely (already partially done — it checks `companies.length > 1`)
- Fix: also check `isReadOnlyRole(user?.role)` → return null

#### [MODIFY] [middleware.ts](file:///c:/Users/ARNOLD/Documents/New%20project/middleware.ts)

- God users: if authenticated + no active company cookie → redirect to `/select-company` (NOT dashboard)
- Already handled by `CompanyAccessGuard` client-side, but middleware should match

#### No other changes needed — the current guards already:
- ✅ God goes to select-company (pickActiveCompanyId returns null for god)
- ✅ Admin sees only assigned companies (loadAccessibleCompanies filters by user_companies)
- ✅ Viewer is read-only (isReadOnlyRole checks)

---

## Phase 3 — CMMS Core Features

### 3A. Assets Extension (CBM + NPR)

#### [NEW] [20260424_assets_cbm_npr.sql](file:///c:/Users/ARNOLD/Documents/New%20project/supabase/migrations/20260424_assets_cbm_npr.sql)

```sql
ALTER TABLE assets
  ADD COLUMN IF NOT EXISTS temperature NUMERIC,
  ADD COLUMN IF NOT EXISTS vibration NUMERIC,
  ADD COLUMN IF NOT EXISTS current_val NUMERIC,
  ADD COLUMN IF NOT EXISTS pressure NUMERIC,
  ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC,
  ADD COLUMN IF NOT EXISTS cbm_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS severity INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS occurrence INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS detection INT DEFAULT 1;
```

#### [MODIFY] [cmms-data.ts](file:///c:/Users/ARNOLD/Documents/New%20project/lib/cmms-data.ts)

- Extend `AssetRow` type with new fields
- Update seed data to include CBM sample values

#### [MODIFY] [assets-page-client.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/assets/assets-page-client.tsx)

- Add columns: Temperature, Vibration, NPR badge
- NPR calculation: `S × O × D`
- NPR badge colors: green (<100), yellow (<200), red (≥200)
- Asset status dot: green (OPERATIVE), yellow (MAINTENANCE), red (OUT_OF_SERVICE)

#### [MODIFY] [asset-form-modal.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/assets/asset-form-modal.tsx)

- Add fields: temperature, vibration, current, pressure, alert_threshold, cbm_enabled toggle
- Add NPR fields: severity (1-10), occurrence (1-10), detection (1-10)

---

### 3B. Auto Work Order Trigger (CBM)

#### [NEW] [cbm-check.ts](file:///c:/Users/ARNOLD/Documents/New%20project/lib/cbm-check.ts)

```ts
// Called when assets are loaded on dashboard/assets page
// For each asset where cbm_enabled && temperature > alert_threshold:
//   Check if open predictive WO already exists → if not, auto-create one
```

- Work order: `type: "PREDICTIVE"`, `priority: "P2"`, `description: "Auto-generated: threshold exceeded on [asset]"`
- Called from `dashboard-page-content.tsx` after loading assets

---

### 3C. OEE Calculation

#### [MODIFY] [dashboard-page-content.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/dashboard/dashboard-page-content.tsx)

Add to KPIs section:

- **OEE = Availability × Performance × Quality**
  - Availability: already calculated (operative/total assets)
  - Performance: `(planned_cycle_time × total_pieces) / operating_time` — simplified as ratio of completed WOs to total
  - Quality: simplified as `1 - (rework_orders / total_orders)` — assume 95% for now
- **Backlog**: count of non-CLOSED work orders
- **PM Compliance**: `(completed_PM / total_PM) × 100`

New dashboard cards:
- OEE gauge (circular SVG gauge visualization)
- Backlog count
- PM Compliance %

---

### 3D. Ishikawa Root Cause Modal

#### [NEW] [ishikawa-modal.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/work-orders/ishikawa-modal.tsx)

- Categories: Method, Machine, Manpower, Material, Environment
- Each category: text input for cause
- Saves as structured JSON in `root_cause` field
- Triggered by "Análisis causa raíz" button in work order close section

#### [MODIFY] [work-order-detail-modal.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/work-orders/work-order-detail-modal.tsx)

- Add "Análisis causa raíz" button in close section
- Opens Ishikawa modal
- On save: concatenates categories into root_cause text

---

### 3E. PM Auto Generation — Already Working ✅

The current [pm-plans-page-client.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/pm-plans/pm-plans-page-client.tsx) already:
- Detects overdue plans (line 104-107)
- Auto-creates PREVENTIVE work orders (line 111-123)
- Updates last_run/next_run dates (line 125-135)

**No changes needed.**

---

## Phase 4 — UI Polish

### 4A. Priority & Status Animations

#### [MODIFY] [globals.css](file:///c:/Users/ARNOLD/Documents/New%20project/app/globals.css)

Add:
```css
@keyframes pulse-danger {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.animate-pulse-danger {
  animation: pulse-danger 2s ease-in-out infinite;
}
```

#### [MODIFY] [work-order-priority-badge.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/work-orders/work-order-priority-badge.tsx)

- Add `animate-pulse-danger` class to P1 badges

### 4B. Asset Status Indicators

#### [MODIFY] [assets-page-client.tsx](file:///c:/Users/ARNOLD/Documents/New%20project/components/assets/assets-page-client.tsx)

- Add colored dot before asset name:
  - 🟢 OPERATIVE → `bg-green-500`
  - 🟡 MAINTENANCE → `bg-yellow-500`
  - 🔴 OUT_OF_SERVICE → `bg-red-500`

---

## Data Isolation Audit

All queries already use `applyCompanyFilter()` or `.eq("company_id", activeCompanyId)`. Verified in:
- ✅ `cmms-data.ts` — all fetch functions
- ✅ `assets-page-client.tsx` — create/update/delete
- ✅ `work-orders-page-client.tsx` — create/update/delete
- ✅ `pm-plans-page-client.tsx` — create/update/delete
- ✅ `manage-users-panel.tsx` — user queries scoped by company

**No gaps found.**

---

## Open Questions

> [!IMPORTANT]
> **RLS SQL execution**: The RLS policy SQL must be run directly in your Supabase Dashboard SQL Editor. Should I provide the exact SQL to copy-paste, or do you need a different approach?

> [!IMPORTANT]
> **OEE simplification**: Real OEE requires production data (cycle times, piece counts). Since this data doesn't exist in the current schema, I'll use simplified proxy metrics (WO completion rates). Is that acceptable, or do you want to add production tracking tables?

---

## Verification Plan

### Automated Tests
1. `npx next build` — must pass with zero errors after every phase
2. Browser test: sign up new user → verify `user_companies` record via console logs

### Manual Verification
1. **After Phase 1**: Create new user + company → must appear in `user_companies` → must redirect to dashboard
2. **After Phase 2**: Add existing user to company → remove user from company → verify god can delete companies
3. **After Phase 3**: Set asset temperature above threshold → verify predictive WO auto-created → check OEE/NPR display
4. **After Phase 4**: Verify P1 badges pulse, asset status dots show correct colors

---

## Execution Order

| Order | Phase | Est. Files Changed |
|-------|-------|--------------------|
| 1 | Phase 1: RLS + Signup fix | 2 files (1 SQL, 1 TSX) |
| 2 | Phase 2: RBAC + Users | 3 files |
| 3 | Phase 3: CMMS Core | 8 files (2 SQL, 1 new TSX, 5 modified) |
| 4 | Phase 4: UI Polish | 3 files |
| **Total** | | **~16 files** |
