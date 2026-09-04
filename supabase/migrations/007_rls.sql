-- Migration 007: Row Level Security
-- This is the primary authorization layer.
-- Frontend route guards are NOT sufficient — RLS is the enforcement point.

-- Enable RLS on all sensitive tables
ALTER TABLE identity_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE supports ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_state_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE restricted_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- identity_vault: ZERO ACCESS for all client roles
-- Only service_role (used by SECURITY DEFINER functions) can access it.
-- ============================================================
-- No SELECT policies added → zero rows returned for authenticated clients
-- (default deny when RLS is enabled and no policy matches)
CREATE POLICY "identity_vault_deny_all" ON identity_vault
  AS RESTRICTIVE
  USING (false);

-- ============================================================
-- Helper function: get the current user's role from JWT app_metadata
-- ============================================================
CREATE OR REPLACE FUNCTION auth_role()
RETURNS text AS $$
  SELECT COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    'student'
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth_college_id()
RETURNS uuid AS $$
  SELECT (auth.jwt() -> 'app_metadata' ->> 'college_id')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- complaints: SELECT policies
-- ============================================================

-- Anon + student: only public complaints
CREATE POLICY "complaints_public_select" ON complaints
  FOR SELECT
  USING (visibility = 'public');

-- Staff: public complaints + restricted ones assigned to their dept
-- + restricted ones they have an active grant for
CREATE POLICY "complaints_staff_select" ON complaints
  FOR SELECT
  USING (
    auth_role() IN ('staff') AND (
      visibility = 'public'
      OR (
        visibility = 'restricted'
        AND (
          -- assigned to their department
          department_id = (auth.jwt() -> 'app_metadata' ->> 'department_id')::uuid
          OR
          -- active grant exists
          EXISTS (
            SELECT 1 FROM active_restricted_access_grants
            WHERE complaint_id = complaints.id
              AND granted_to = auth.uid()
          )
        )
      )
    )
  );

-- Compliance + admin: all complaints
CREATE POLICY "complaints_compliance_admin_select" ON complaints
  FOR SELECT
  USING (auth_role() IN ('compliance', 'admin'));

-- ============================================================
-- complaints: INSERT — DENIED for all client roles
-- Only the submit_complaint() SECURITY DEFINER function can insert.
-- ============================================================
CREATE POLICY "complaints_deny_insert" ON complaints
  AS RESTRICTIVE
  FOR INSERT
  WITH CHECK (false);

-- ============================================================
-- complaints: UPDATE — DENIED for all client roles
-- All updates go through SECURITY DEFINER functions.
-- ============================================================
CREATE POLICY "complaints_deny_update" ON complaints
  AS RESTRICTIVE
  FOR UPDATE
  USING (false);

-- ============================================================
-- complaints: DELETE — DENIED for everyone
-- ============================================================
CREATE POLICY "complaints_deny_delete" ON complaints
  AS RESTRICTIVE
  FOR DELETE
  USING (false);

-- ============================================================
-- evidence: SELECT policies
-- Follows the same visibility rules as complaints.
-- ============================================================

CREATE POLICY "evidence_public_complaint_select" ON evidence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = evidence.complaint_id AND c.visibility = 'public'
    )
  );

CREATE POLICY "evidence_staff_select" ON evidence
  FOR SELECT
  USING (
    auth_role() IN ('staff') AND EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = evidence.complaint_id AND (
        c.visibility = 'public'
        OR c.department_id = (auth.jwt() -> 'app_metadata' ->> 'department_id')::uuid
        OR EXISTS (
          SELECT 1 FROM active_restricted_access_grants g
          WHERE g.complaint_id = c.id AND g.granted_to = auth.uid()
        )
      )
    )
  );

CREATE POLICY "evidence_compliance_admin_select" ON evidence
  FOR SELECT
  USING (auth_role() IN ('compliance', 'admin'));

-- INSERT: DENIED (handled by server-side API with service role)
CREATE POLICY "evidence_deny_insert" ON evidence
  AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "evidence_deny_update" ON evidence
  AS RESTRICTIVE FOR UPDATE USING (false);

CREATE POLICY "evidence_deny_delete" ON evidence
  AS RESTRICTIVE FOR DELETE USING (false);

-- ============================================================
-- supports: SELECT — aggregate view only (complaint_support_counts)
-- Individual support records are NOT readable by any client.
-- ============================================================
CREATE POLICY "supports_deny_select" ON supports
  AS RESTRICTIVE
  FOR SELECT
  USING (false);

-- Admin can read all
CREATE POLICY "supports_admin_select" ON supports
  FOR SELECT
  USING (auth_role() = 'admin');

-- ============================================================
-- resolution_votes: SELECT — admin/compliance only
-- ============================================================
CREATE POLICY "votes_deny_select" ON resolution_votes
  AS RESTRICTIVE
  FOR SELECT
  USING (false);

CREATE POLICY "votes_compliance_admin_select" ON resolution_votes
  FOR SELECT
  USING (auth_role() IN ('compliance', 'admin'));

-- ============================================================
-- complaint_state_history: SELECT
-- ============================================================
CREATE POLICY "state_history_public_select" ON complaint_state_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM complaints c
      WHERE c.id = complaint_state_history.complaint_id
        AND c.visibility = 'public'
    )
    OR auth_role() IN ('staff', 'compliance', 'admin')
  );

-- ============================================================
-- restricted_access_grants: SELECT
-- Staff can see their own grants. Compliance/admin see all.
-- ============================================================
CREATE POLICY "grants_staff_own_select" ON restricted_access_grants
  FOR SELECT
  USING (
    (auth_role() = 'staff' AND granted_to = auth.uid())
    OR auth_role() IN ('compliance', 'admin')
  );

-- ============================================================
-- audit_log: SELECT — compliance and admin ONLY (read-only)
-- ============================================================
CREATE POLICY "audit_log_compliance_admin_select" ON audit_log
  FOR SELECT
  USING (auth_role() IN ('compliance', 'admin'));

-- INSERT/UPDATE/DELETE: DENIED for everyone (including admin)
-- Only create_audit_record() SECURITY DEFINER function can write
CREATE POLICY "audit_log_deny_insert" ON audit_log
  AS RESTRICTIVE FOR INSERT WITH CHECK (false);

CREATE POLICY "audit_log_deny_update" ON audit_log
  AS RESTRICTIVE FOR UPDATE USING (false);

CREATE POLICY "audit_log_deny_delete" ON audit_log
  AS RESTRICTIVE FOR DELETE USING (false);

-- ============================================================
-- rate_limits: deny all client access
-- ============================================================
CREATE POLICY "rate_limits_deny_all" ON rate_limits
  AS RESTRICTIVE
  USING (false);

-- ============================================================
-- escalation_log: staff/compliance/admin can read
-- ============================================================
CREATE POLICY "escalation_log_staff_select" ON escalation_log
  FOR SELECT
  USING (auth_role() IN ('staff', 'compliance', 'admin'));

-- ============================================================
-- colleges and departments: public read
-- ============================================================
ALTER TABLE colleges ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "colleges_public_read" ON colleges FOR SELECT USING (true);
CREATE POLICY "departments_public_read" ON departments FOR SELECT USING (true);
