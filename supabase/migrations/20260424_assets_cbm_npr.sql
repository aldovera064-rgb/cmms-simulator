-- Add CBM (Condition Based Monitoring) and NPR (Risk Priority Number) columns to assets.
-- Additive only: safe to run on existing data.

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
