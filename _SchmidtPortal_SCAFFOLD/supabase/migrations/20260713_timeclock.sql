-- =====================================================
-- TIMECLOCK SYSTEM — Pay rates, auto-midnight-clockout, flagged entries
-- Run in Supabase SQL Editor after the roles migration
-- =====================================================

-- 1. Add pay_rate to profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'pay_rate'
  ) THEN
    ALTER TABLE profiles ADD COLUMN pay_rate NUMERIC(8,2) DEFAULT 0;
  END IF;
END $$;

-- 2. Add flagged_for_review to time_entries
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'flagged'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN flagged BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 3. Add flag_reason column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'flag_reason'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN flag_reason TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. Add edited_by column (to track who edited a timesheet entry)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'edited_by'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN edited_by UUID REFERENCES profiles(id) DEFAULT NULL;
  END IF;
END $$;

-- 5. Add edited_at column
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'time_entries' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE time_entries ADD COLUMN edited_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 6. Promote all three admins
UPDATE profiles SET role = 'admin'
WHERE id IN (
  SELECT id FROM auth.users
  WHERE email IN ('matty@purepulse.one', 'mikiel@schmidt-construction.com', 'mike@walls2.com')
);

-- 7. Auto-midnight clockout function
-- Runs via pg_cron or Supabase Edge Function cron at 11:59 PM daily
-- Clocks out anyone still clocked in, flags the entry
CREATE OR REPLACE FUNCTION auto_midnight_clockout()
RETURNS void AS $$
BEGIN
  UPDATE time_entries
  SET
    clock_out = date_trunc('day', clock_in) + INTERVAL '23 hours 59 minutes 59 seconds',
    flagged = true,
    flag_reason = 'Auto-clocked out at midnight (forgot to clock out)'
  WHERE clock_out IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create a cron job to run at 11:59 PM Central (5:59 AM UTC next day)
-- NOTE: Supabase pg_cron uses UTC. Central Time is UTC-5 (CDT) or UTC-6 (CST)
-- 11:59 PM CDT = 4:59 AM UTC next day
-- Run this manually in SQL editor if pg_cron extension is enabled:
--
-- SELECT cron.schedule(
--   'midnight-clockout',
--   '59 4 * * *',  -- 4:59 AM UTC = 11:59 PM CDT
--   $$ SELECT auto_midnight_clockout(); $$
-- );

-- 9. Function to edit a time entry (admin only)
CREATE OR REPLACE FUNCTION edit_time_entry(
  p_entry_id UUID,
  p_clock_in TIMESTAMPTZ,
  p_clock_out TIMESTAMPTZ,
  p_job_id UUID DEFAULT NULL,
  p_clear_flag BOOLEAN DEFAULT false
)
RETURNS JSON AS $$
DECLARE
  v_entry time_entries;
BEGIN
  -- Only staff can edit
  IF NOT is_staff() THEN
    RAISE EXCEPTION 'Only employees/admins can edit time entries';
  END IF;

  UPDATE time_entries SET
    clock_in = p_clock_in,
    clock_out = p_clock_out,
    job_id = COALESCE(p_job_id, job_id),
    flagged = CASE WHEN p_clear_flag THEN false ELSE flagged END,
    flag_reason = CASE WHEN p_clear_flag THEN NULL ELSE flag_reason END,
    edited_by = auth.uid(),
    edited_at = NOW()
  WHERE id = p_entry_id
  RETURNING * INTO v_entry;

  RETURN row_to_json(v_entry);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. View: timesheet summary with pay calculation
CREATE OR REPLACE VIEW timesheet_summary AS
SELECT
  te.id,
  te.user_id,
  p.full_name AS employee_name,
  p.email AS employee_email,
  p.pay_rate,
  te.clock_in,
  te.clock_out,
  te.job_id,
  j.name AS job_name,
  te.flagged,
  te.flag_reason,
  te.edited_by,
  te.edited_at,
  CASE
    WHEN te.clock_out IS NOT NULL THEN
      ROUND(EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600.0, 2)
    ELSE NULL
  END AS hours_worked,
  CASE
    WHEN te.clock_out IS NOT NULL THEN
      ROUND(
        (EXTRACT(EPOCH FROM (te.clock_out - te.clock_in)) / 3600.0) * p.pay_rate,
        2
      )
    ELSE NULL
  END AS pay_earned,
  te.created_at
FROM time_entries te
JOIN profiles p ON p.id = te.user_id
LEFT JOIN jobs j ON j.id = te.job_id
ORDER BY te.clock_in DESC;

GRANT SELECT ON timesheet_summary TO authenticated;

-- 11. RLS: time entries - staff can manage all, users see only their own
DROP POLICY IF EXISTS "Staff manages time entries" ON time_entries;
CREATE POLICY "Staff manages time entries" ON time_entries
  FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Users see own time entries" ON time_entries;
CREATE POLICY "Users see own time entries" ON time_entries
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users insert own time entries" ON time_entries;
CREATE POLICY "Users insert own time entries" ON time_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own time entries" ON time_entries;
CREATE POLICY "Users update own time entries" ON time_entries
  FOR UPDATE USING (user_id = auth.uid());
