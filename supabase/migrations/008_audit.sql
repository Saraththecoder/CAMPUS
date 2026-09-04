-- Migration 008: Audit Log Hardening
-- Revoke all direct data-manipulation privileges from every role.
-- The audit_log table is append-only via SECURITY DEFINER function only.

-- Revoke direct write access on audit_log from ALL standard roles
REVOKE INSERT, UPDATE, DELETE ON audit_log FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON audit_log FROM anon;

-- Also ensure the public role cannot write
REVOKE ALL ON audit_log FROM public;

-- Grant service_role the ability to use the create_audit_record function
-- (service_role already bypasses RLS, but we want the function as the gatekeeper)
GRANT EXECUTE ON FUNCTION create_audit_record TO authenticated;

-- Grant read access to compliance/admin (RLS policies enforce the role check)
GRANT SELECT ON audit_log TO authenticated;

-- Ensure all sequences and tables have correct grants
GRANT SELECT ON complaint_support_counts TO authenticated, anon;
GRANT SELECT ON active_restricted_access_grants TO authenticated;
GRANT SELECT ON public_complaints_feed TO authenticated, anon;
GRANT SELECT ON staff_complaint_queue TO authenticated;
GRANT SELECT ON complaint_priority_scores TO authenticated;

-- Grant EXECUTE on public-facing SECURITY DEFINER functions
GRANT EXECUTE ON FUNCTION submit_complaint TO authenticated;
GRANT EXECUTE ON FUNCTION lookup_recovery_code TO authenticated, anon;
GRANT EXECUTE ON FUNCTION staff_update_complaint_status TO authenticated;
GRANT EXECUTE ON FUNCTION staff_reassign_complaint TO authenticated;
GRANT EXECUTE ON FUNCTION compliance_reclassify_complaint TO authenticated;
GRANT EXECUTE ON FUNCTION grant_restricted_access TO authenticated;
GRANT EXECUTE ON FUNCTION revoke_restricted_access TO authenticated;
GRANT EXECUTE ON FUNCTION access_restricted_complaint TO authenticated;
GRANT EXECUTE ON FUNCTION add_support TO authenticated;
GRANT EXECUTE ON FUNCTION cast_resolution_vote TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_complaints TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_rate_limit TO authenticated, anon;

-- auth_role helper available to all
GRANT EXECUTE ON FUNCTION auth_role TO authenticated, anon;
GRANT EXECUTE ON FUNCTION auth_college_id TO authenticated, anon;
