-- =====================================================
-- MEPIE Foundation Financial Transparency Database Schema
-- Database: Supabase (PostgreSQL)
-- Version: 1.0
-- =====================================================

-- =====================================================
-- INCOMING FUNDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS incoming_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  source TEXT NOT NULL CHECK (source IN ('GoFundMe', 'Stripe', 'Bank Transfer', 'Check', 'Cash', 'Other')),
  donor_initials TEXT,
  net_income DECIMAL(10, 2) GENERATED ALWAYS AS (
    CASE
      WHEN source = 'GoFundMe' THEN amount * 0.9669
      ELSE amount
    END
  ) STORED,
  purpose_note TEXT,
  approved_by TEXT NOT NULL CHECK (approved_by IN ('Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_incoming_funds_date ON incoming_funds(date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_incoming_funds_source ON incoming_funds(source) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_incoming_funds_created_at ON incoming_funds(created_at DESC);

-- =====================================================
-- OUTGOING FUNDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS outgoing_funds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount >= 0),
  recipient TEXT NOT NULL,
  purpose TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Education', 'Operations', 'Marketing', 'Infrastructure', 'Salaries', 'Other')),
  approved_by TEXT NOT NULL CHECK (approved_by IN ('Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL,
  updated_by TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_outgoing_funds_date ON outgoing_funds(date DESC) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_outgoing_funds_category ON outgoing_funds(category) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_outgoing_funds_created_at ON outgoing_funds(created_at DESC);

-- =====================================================
-- AUDIT TRAIL TABLE
-- =====================================================
DO $$ BEGIN
  CREATE TYPE audit_action_type AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL CHECK (table_name IN ('incoming_funds', 'outgoing_funds')),
  record_id UUID NOT NULL,
  action audit_action_type NOT NULL,
  changed_by TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT
);

-- Indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_trail_table_record ON audit_trail(table_name, record_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_by ON audit_trail(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_trail_changed_at ON audit_trail(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);

-- =====================================================
-- AUTHENTICATION SESSION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS auth_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token TEXT UNIQUE NOT NULL,
  user_name TEXT NOT NULL CHECK (user_name IN ('Marshall Epie', 'Aruna Ramineni', 'Fitz Shrowder')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

-- Indexes for session lookups
CREATE INDEX IF NOT EXISTS idx_auth_sessions_token ON auth_sessions(session_token) WHERE expires_at > NOW();
CREATE INDEX IF NOT EXISTS idx_auth_sessions_expires ON auth_sessions(expires_at);

-- Auto-cleanup expired sessions function
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM auth_sessions WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS FOR AUDIT TRAIL
-- =====================================================

-- Function to record changes in audit trail
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO audit_trail (
      table_name, record_id, action, changed_by, new_values
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'CREATE', NEW.created_by,
      to_jsonb(NEW) - 'created_at' - 'updated_at' - 'created_by' - 'updated_by'
    );
    RETURN NEW;

  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO audit_trail (
      table_name, record_id, action, changed_by, old_values, new_values
    ) VALUES (
      TG_TABLE_NAME, NEW.id, 'UPDATE', NEW.updated_by,
      to_jsonb(OLD) - 'created_at' - 'updated_at' - 'created_by' - 'updated_by',
      to_jsonb(NEW) - 'created_at' - 'updated_at' - 'created_by' - 'updated_by'
    );
    RETURN NEW;

  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO audit_trail (
      table_name, record_id, action, changed_by, old_values
    ) VALUES (
      TG_TABLE_NAME, OLD.id, 'DELETE', OLD.deleted_by,
      to_jsonb(OLD) - 'created_at' - 'updated_at' - 'created_by' - 'updated_by'
    );
    RETURN OLD;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS audit_incoming_funds ON incoming_funds;
DROP TRIGGER IF EXISTS audit_outgoing_funds ON outgoing_funds;

-- Attach triggers to tables
CREATE TRIGGER audit_incoming_funds
AFTER INSERT OR UPDATE OR DELETE ON incoming_funds
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_outgoing_funds
AFTER INSERT OR UPDATE OR DELETE ON outgoing_funds
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================
-- TRIGGER FOR UPDATED_AT TIMESTAMP
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop triggers if they exist
DROP TRIGGER IF EXISTS update_incoming_funds_updated_at ON incoming_funds;
DROP TRIGGER IF EXISTS update_outgoing_funds_updated_at ON outgoing_funds;

CREATE TRIGGER update_incoming_funds_updated_at
BEFORE UPDATE ON incoming_funds
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_outgoing_funds_updated_at
BEFORE UPDATE ON outgoing_funds
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE incoming_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role can do everything on incoming_funds" ON incoming_funds;
DROP POLICY IF EXISTS "Service role can do everything on outgoing_funds" ON outgoing_funds;
DROP POLICY IF EXISTS "Service role can do everything on audit_trail" ON audit_trail;
DROP POLICY IF EXISTS "Service role can do everything on auth_sessions" ON auth_sessions;
DROP POLICY IF EXISTS "Public read access to incoming_funds" ON incoming_funds;
DROP POLICY IF EXISTS "Public read access to outgoing_funds" ON outgoing_funds;
DROP POLICY IF EXISTS "Public read access to audit_trail" ON audit_trail;

-- Policy: Allow service role full access (for Netlify Functions)
CREATE POLICY "Service role can do everything on incoming_funds"
ON incoming_funds FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can do everything on outgoing_funds"
ON outgoing_funds FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can do everything on audit_trail"
ON audit_trail FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role can do everything on auth_sessions"
ON auth_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Policy: Allow public read access (for transparency)
CREATE POLICY "Public read access to incoming_funds"
ON incoming_funds FOR SELECT
TO anon, authenticated
USING (is_deleted = FALSE);

CREATE POLICY "Public read access to outgoing_funds"
ON outgoing_funds FOR SELECT
TO anon, authenticated
USING (is_deleted = FALSE);

CREATE POLICY "Public read access to audit_trail"
ON audit_trail FOR SELECT
TO anon, authenticated
USING (true);

-- =====================================================
-- VIEWS FOR EASY QUERYING
-- =====================================================

-- View: Active incoming funds with audit info
CREATE OR REPLACE VIEW incoming_funds_active AS
SELECT
  id,
  date,
  amount,
  source,
  donor_initials,
  net_income,
  purpose_note,
  approved_by,
  created_at,
  updated_at,
  created_by,
  updated_by
FROM incoming_funds
WHERE is_deleted = FALSE
ORDER BY date DESC;

-- View: Active outgoing funds with audit info
CREATE OR REPLACE VIEW outgoing_funds_active AS
SELECT
  id,
  date,
  amount,
  recipient,
  purpose,
  category,
  approved_by,
  created_at,
  updated_at,
  created_by,
  updated_by
FROM outgoing_funds
WHERE is_deleted = FALSE
ORDER BY date DESC;

-- View: Financial summary
CREATE OR REPLACE VIEW financial_summary AS
SELECT
  (SELECT COALESCE(SUM(net_income), 0) FROM incoming_funds WHERE is_deleted = FALSE) as total_net_income,
  (SELECT COALESCE(SUM(amount), 0) FROM outgoing_funds WHERE is_deleted = FALSE) as total_outgoing,
  (SELECT COALESCE(SUM(net_income), 0) FROM incoming_funds WHERE is_deleted = FALSE) -
  (SELECT COALESCE(SUM(amount), 0) FROM outgoing_funds WHERE is_deleted = FALSE) as current_balance;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================

-- Grant read access to anon role for views
GRANT SELECT ON incoming_funds_active TO anon, authenticated;
GRANT SELECT ON outgoing_funds_active TO anon, authenticated;
GRANT SELECT ON financial_summary TO anon, authenticated;

-- =====================================================
-- SETUP COMPLETE
-- =====================================================

-- Run cleanup function to remove any expired sessions
SELECT cleanup_expired_sessions();
