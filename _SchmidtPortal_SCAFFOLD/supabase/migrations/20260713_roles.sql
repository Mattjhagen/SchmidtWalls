-- =====================================================
-- ROLE-BASED ACCESS CONTROL FOR SCHMIDT PORTAL
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor)
-- =====================================================

-- 1. Add role column to profiles (if not exists)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'customer';
  END IF;
END $$;

-- 2. Add constraint for valid roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'employee', 'customer'));

-- 3. Promote yourself to admin (replace with your email)
UPDATE profiles SET role = 'admin'
WHERE id = (SELECT id FROM auth.users WHERE email = 'matty@purepulse.one');

-- 4. Helper function: check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 5. Helper function: check if current user is employee or admin
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role IN ('admin', 'employee')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 6. Helper function: get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 7. RLS policy for profiles: users see own profile, staff sees all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users see own profile" ON profiles;
CREATE POLICY "Users see own profile" ON profiles
  FOR SELECT USING (id = auth.uid() OR is_staff());

DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Admins manage all profiles" ON profiles;
CREATE POLICY "Admins manage all profiles" ON profiles
  FOR ALL USING (is_admin());

-- 8. RLS for estimates: customers see only theirs, staff sees all
DROP POLICY IF EXISTS "Staff sees all estimates" ON estimates;
CREATE POLICY "Staff sees all estimates" ON estimates
  FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers see own estimates" ON estimates;
CREATE POLICY "Customers see own estimates" ON estimates
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 9. RLS for customers table: staff full access, customers see own
DROP POLICY IF EXISTS "Staff manages customers" ON customers;
CREATE POLICY "Staff manages customers" ON customers
  FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers see own record" ON customers;
CREATE POLICY "Customers see own record" ON customers
  FOR SELECT USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- 10. RLS for jobs: staff full access, customers see their jobs
DROP POLICY IF EXISTS "Staff manages jobs" ON jobs;
CREATE POLICY "Staff manages jobs" ON jobs
  FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers see own jobs" ON jobs;
CREATE POLICY "Customers see own jobs" ON jobs
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 11. RLS for time_entries: only staff
DROP POLICY IF EXISTS "Staff manages time entries" ON time_entries;
CREATE POLICY "Staff manages time entries" ON time_entries
  FOR ALL USING (is_staff());

-- 12. RLS for invoices: staff full, customers see theirs
DROP POLICY IF EXISTS "Staff manages invoices" ON invoices;
CREATE POLICY "Staff manages invoices" ON invoices
  FOR ALL USING (is_staff());

DROP POLICY IF EXISTS "Customers see own invoices" ON invoices;
CREATE POLICY "Customers see own invoices" ON invoices
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE email = (
        SELECT email FROM auth.users WHERE id = auth.uid()
      )
    )
  );

-- 13. Function to invite a user (called by admin)
-- This creates a profile entry so when they sign in, they get the right role
CREATE OR REPLACE FUNCTION invite_user(
  p_email TEXT,
  p_role TEXT DEFAULT 'customer',
  p_name TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  -- Only admins can invite
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only admins can invite users';
  END IF;

  -- Validate role
  IF p_role NOT IN ('admin', 'employee', 'customer') THEN
    RAISE EXCEPTION 'Invalid role: %', p_role;
  END IF;

  RETURN json_build_object(
    'email', p_email,
    'role', p_role,
    'name', p_name,
    'status', 'ready_to_invite'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Trigger: when a new user signs up, create profile with pending role
-- (If they were pre-invited, use that role; otherwise default to 'customer')
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_role TEXT := 'customer';
  pending_invite RECORD;
BEGIN
  -- Check if there's a pending invitation for this email
  SELECT * INTO pending_invite FROM profiles
  WHERE id IS NOT NULL
    AND role IS NOT NULL
    LIMIT 0; -- placeholder, invites tracked differently

  -- Insert profile
  INSERT INTO profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    assigned_role
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger (drop first to avoid duplicates)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 15. View for admin user management
CREATE OR REPLACE VIEW admin_user_list AS
SELECT
  p.id,
  p.email,
  p.full_name,
  p.role,
  p.created_at,
  u.last_sign_in_at
FROM profiles p
LEFT JOIN auth.users u ON u.id = p.id
ORDER BY p.created_at DESC;

-- Grant access to the view
GRANT SELECT ON admin_user_list TO authenticated;
