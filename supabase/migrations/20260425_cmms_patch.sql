-- ============================================================
-- CMMS Patch Migration — 2026-04-25
-- Incremental, non-destructive changes only.
-- Safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. SPARE PARTS — unit + min_stock
-- ──────────────────────────────────────────────────────────────
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS unit text DEFAULT 'piezas';
ALTER TABLE spare_parts ADD COLUMN IF NOT EXISTS min_stock integer DEFAULT 0;

-- ──────────────────────────────────────────────────────────────
-- 2. WORK ORDERS — soft delete fields
-- ──────────────────────────────────────────────────────────────
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- ──────────────────────────────────────────────────────────────
-- 3. PM PLANS — soft delete fields
-- ──────────────────────────────────────────────────────────────
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE pm_plans ADD COLUMN IF NOT EXISTS closed_at timestamptz;

-- ──────────────────────────────────────────────────────────────
-- 4. WORK ORDER HISTORY
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS work_order_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order_id uuid,
  snapshot      jsonb       NOT NULL,
  action_type   text        NOT NULL,   -- 'completed' | 'deleted'
  status_original text,
  company_id    uuid,
  user_id       text,                   -- who performed the action
  created_at    timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 5. PM PLAN HISTORY
-- ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pm_plan_history (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  pm_plan_id    uuid,
  snapshot      jsonb       NOT NULL,
  action_type   text        NOT NULL,   -- 'completed' | 'deleted'
  status_original text,
  company_id    uuid,
  user_id       text,                   -- who performed the action
  created_at    timestamptz DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────
-- 6. TECHNICIANS — new fields
-- ──────────────────────────────────────────────────────────────
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS hire_date date;
ALTER TABLE technicians ADD COLUMN IF NOT EXISTS phone text;

-- ──────────────────────────────────────────────────────────────
-- 7. RLS for new history tables
-- ──────────────────────────────────────────────────────────────
ALTER TABLE work_order_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_plan_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_work_order_history') THEN
    CREATE POLICY "allow_all_work_order_history" ON work_order_history
      FOR ALL USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_pm_plan_history') THEN
    CREATE POLICY "allow_all_pm_plan_history" ON pm_plan_history
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END
$$;
