-- ============================================================
-- Migration: 20260714_features.sql
-- Schmidt Construction Portal — 6 New Features
-- ============================================================

-- ============================================================
-- FEATURE 2: Jobs Board — ensure status column uses proper enum values
-- ============================================================

-- Add address column to jobs if not exists
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS address text;

-- Update status to support Kanban statuses
-- (existing rows with 'active' will be treated as 'in_progress')
DO $$
BEGIN
  -- Update any 'active' status to 'in_progress' for consistency
  UPDATE jobs SET status = 'in_progress' WHERE status = 'active';
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ============================================================
-- FEATURE 3: Photo Upload — photos table + storage bucket
-- ============================================================

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text DEFAULT '',
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- RLS on photos
ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

-- Employees can view all photos
CREATE POLICY "Employees can view photos" ON photos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Employees can insert photos
CREATE POLICY "Employees can insert photos" ON photos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Admins can delete photos
CREATE POLICY "Admins can delete photos" ON photos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create storage bucket for job photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-photos', 'job-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: employees can upload
CREATE POLICY "Employees can upload job photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'job-photos'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Anyone authenticated can view job photos
CREATE POLICY "Authenticated users can view job photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'job-photos'
  );

-- Admins can delete job photos
CREATE POLICY "Admins can delete job photos"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'job-photos'
    AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================
-- FEATURE 4: Estimate → Invoice — ensure invoices table has needed cols
-- ============================================================

-- Add estimate_id to invoices for tracking lineage
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS estimate_id uuid REFERENCES estimates(id);

-- ============================================================
-- FEATURE 5: Customer Estimate Actions — change_requests table
-- ============================================================

CREATE TABLE IF NOT EXISTS change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved
  created_at timestamptz DEFAULT now()
);

ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;

-- Customers can insert change requests for their own estimates
CREATE POLICY "Customers can create change requests" ON change_requests
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = change_requests.customer_id
      AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Customers can view their own change requests
CREATE POLICY "Customers can view own change requests" ON change_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = change_requests.customer_id
      AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Employees can view all change requests
CREATE POLICY "Employees can view all change requests" ON change_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- Employees can update change requests
CREATE POLICY "Employees can update change requests" ON change_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'employee')
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_photos_job_id ON photos(job_id);
CREATE INDEX IF NOT EXISTS idx_change_requests_estimate_id ON change_requests(estimate_id);
CREATE INDEX IF NOT EXISTS idx_invoices_estimate_id ON invoices(estimate_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
