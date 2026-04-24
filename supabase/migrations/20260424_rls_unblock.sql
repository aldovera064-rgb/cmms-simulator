-- Unblock RLS for signup flow.
-- Allows all operations on user_companies, companies, and admins.
-- This is intentionally permissive to unblock the system; tighten later.

ALTER TABLE user_companies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_insert_user_companies') THEN
    CREATE POLICY "allow_all_insert_user_companies" ON user_companies FOR INSERT WITH CHECK (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_select_user_companies') THEN
    CREATE POLICY "allow_all_select_user_companies" ON user_companies FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_update_user_companies') THEN
    CREATE POLICY "allow_all_update_user_companies" ON user_companies FOR UPDATE USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_delete_user_companies') THEN
    CREATE POLICY "allow_all_delete_user_companies" ON user_companies FOR DELETE USING (true);
  END IF;
END $$;

-- Companies table
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_companies') THEN
    CREATE POLICY "allow_all_companies" ON companies FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- Admins table
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'allow_all_admins') THEN
    CREATE POLICY "allow_all_admins" ON admins FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
