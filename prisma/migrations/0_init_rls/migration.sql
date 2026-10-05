-- ====================================================================
-- PostgreSQL Row-Level Security (RLS) Policies for TenaPharm Multi-Tenancy
-- ====================================================================
-- Every tenant-scoped table has RLS enabled with a policy that checks:
-- tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
--
-- For Super Admin operations or background jobs, the session variable
-- 'app.bypass_rls' can be set to 'on'.

-- Helper function to retrieve the active tenant context
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS uuid AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', true), '')::uuid;
END;
$$ LANGUAGE plpgsql STABLE;

-- Helper function to check if RLS bypass is active
CREATE OR REPLACE FUNCTION is_rls_bypassed() RETURNS boolean AS $$
BEGIN
  RETURN COALESCE(current_setting('app.bypass_rls', true) = 'on', false);
END;
$$ LANGUAGE plpgsql STABLE;

-- Macro / list of tables to protect with RLS
DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'roles',
    'users',
    'locations',
    'categories',
    'generics',
    'manufacturers',
    'suppliers',
    'units',
    'products',
    'batches',
    'stock_balances',
    'stock_movements',
    'purchase_orders',
    'grns',
    'transfer_orders',
    'sales_invoices',
    'customers',
    'audit_logs'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Enable Row Level Security
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', tbl);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY;', tbl);

    -- Drop policy if already exists to ensure idempotency
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_policy ON %I;', tbl);

    -- Create unified SELECT, INSERT, UPDATE, DELETE isolation policy
    EXECUTE format(
      'CREATE POLICY tenant_isolation_policy ON %I ' ||
      'AS RESTRICTIVE ' ||
      'FOR ALL ' ||
      'USING (is_rls_bypassed() OR tenant_id = current_tenant_id()) ' ||
      'WITH CHECK (is_rls_bypassed() OR tenant_id = current_tenant_id());',
      tbl
    );
  END LOOP;
END;
$$;
