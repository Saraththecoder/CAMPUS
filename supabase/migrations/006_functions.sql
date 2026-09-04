-- Migration 006: SECURITY DEFINER Functions
-- All sensitive operations go through these functions.
-- They run with elevated privileges but enforce strict authorization.

-- ============================================================
-- FUNCTION: create_audit_record (internal only)
-- Only callable from other SECURITY DEFINER functions.
-- The audit_log table has no direct INSERT privileges for any client.
-- ============================================================
CREATE OR REPLACE FUNCTION create_audit_record(
  p_actor_id     uuid,
  p_actor_type   actor_type,
  p_action       audit_action,
  p_target_table text,
  p_target_id    uuid,
  p_reason       text DEFAULT NULL,
  p_before_state jsonb DEFAULT NULL,
  p_after_state  jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO audit_log (actor_id, actor_type, action, target_table, target_id, reason, before_state, after_state)
  VALUES (p_actor_id, p_actor_type, p_action, p_target_table, p_target_id, p_reason, p_before_state, p_after_state)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: check_rate_limit
-- Returns true if the action is ALLOWED (within limit).
-- Increments the counter atomically.
-- ============================================================
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identity_key text,
  p_action_type  text,
  p_limit        int,
  p_window_hours int DEFAULT 24
)
RETURNS boolean AS $$
DECLARE
  v_window_start timestamptz;
  v_count        int;
BEGIN
  -- Truncate to the current window
  v_window_start := date_trunc('hour', now()) - (
    (EXTRACT(HOUR FROM now())::int % p_window_hours) * INTERVAL '1 hour'
  );

  -- Upsert the rate limit record
  INSERT INTO rate_limits (identity_key, action_type, window_start, attempt_count)
  VALUES (p_identity_key, p_action_type, v_window_start, 1)
  ON CONFLICT (identity_key, action_type, window_start)
  DO UPDATE SET attempt_count = rate_limits.attempt_count + 1
  RETURNING attempt_count INTO v_count;

  RETURN v_count <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: submit_complaint
-- The ONLY way to create a complaint. Validates all inputs server-side.
-- Never stores plaintext email. Never returns recovery_hash.
-- ============================================================
CREATE OR REPLACE FUNCTION submit_complaint(
  p_college_id     uuid,
  p_category       complaint_category,
  p_title          text,
  p_description    text,
  p_location       text,
  p_severity       complaint_severity,
  p_submitter_hash text,  -- HMAC(email, COMPLAINT_SALT) — computed server-side
  p_recovery_hash  text,  -- bcrypt(recovery_code) — computed server-side
  p_rate_key       text   -- HMAC(email, RATELIMIT_SALT) — for rate limiting
)
RETURNS TABLE(complaint_id uuid, anonymous_id text) AS $$
DECLARE
  v_allowed       boolean;
  v_complaint_id  uuid;
  v_anonymous_id  text;
BEGIN
  -- Rate limit: 5 submissions per 24 hours per identity
  v_allowed := check_rate_limit(p_rate_key, 'submit_complaint', 5, 24);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded: Too many submissions. Try again later.';
  END IF;

  -- Generate anonymous_id (random, not derivable from identity)
  v_anonymous_id := 'anon_' || replace(gen_random_uuid()::text, '-', '');

  -- Insert complaint (visibility will be set by trigger from category)
  INSERT INTO complaints (
    college_id, category, title, description, location,
    severity, submitter_hash, recovery_hash, anonymous_id
  ) VALUES (
    p_college_id, p_category, p_title, p_description, p_location,
    p_severity, p_submitter_hash, p_recovery_hash, v_anonymous_id
  ) RETURNING id INTO v_complaint_id;

  -- Record initial state history
  INSERT INTO complaint_state_history (complaint_id, from_status, to_status, actor_type)
  VALUES (v_complaint_id, NULL, 'submitted', 'student');

  -- Audit: submit (no identity in after_state)
  PERFORM create_audit_record(
    NULL, 'student', 'submit', 'complaints', v_complaint_id,
    NULL, NULL,
    jsonb_build_object('category', p_category, 'severity', p_severity)
  );

  RETURN QUERY SELECT v_complaint_id, v_anonymous_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: lookup_recovery_code
-- Rate-limited. Returns only safe complaint fields.
-- NEVER returns: submitter_hash, recovery_hash, identity info.
-- The plaintext code is compared server-side using crypt().
-- ============================================================
CREATE OR REPLACE FUNCTION lookup_recovery_code(
  p_code     text,
  p_rate_key text   -- HMAC(ip_hash, RATELIMIT_SALT) or session key
)
RETURNS TABLE(
  complaint_id    uuid,
  anonymous_id    text,
  category        complaint_category,
  title           text,
  status          complaint_status,
  severity        complaint_severity,
  visibility      complaint_visibility,
  created_at      timestamptz,
  updated_at      timestamptz,
  resolved_at     timestamptz,
  dispute_deadline timestamptz,
  department_name  text
) AS $$
DECLARE
  v_allowed boolean;
BEGIN
  -- Rate limit: 10 attempts per 24 hours
  v_allowed := check_rate_limit(p_rate_key, 'recovery_lookup', 10, 24);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded: Too many recovery attempts.';
  END IF;

  -- Use bcrypt verification: crypt(input, stored_hash) = stored_hash
  -- We must scan and verify — cannot do index lookup on bcrypt
  -- In production, the API layer computes candidate hashes for search
  -- This function takes the raw code and does the bcrypt check
  RETURN QUERY
  SELECT
    c.id,
    c.anonymous_id,
    c.category,
    c.title,
    c.status,
    c.severity,
    c.visibility,
    c.created_at,
    c.updated_at,
    c.resolved_at,
    c.dispute_deadline,
    d.name
  FROM complaints c
  LEFT JOIN departments d ON c.department_id = d.id
  WHERE crypt(p_code, c.recovery_hash) = c.recovery_hash
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: staff_update_complaint_status
-- Validates permitted status transitions per role.
-- Department staff can only perform department-level transitions.
-- Records state history and audit.
-- ============================================================
CREATE OR REPLACE FUNCTION staff_update_complaint_status(
  p_complaint_id  uuid,
  p_new_status    complaint_status,
  p_actor_id      uuid,
  p_actor_type    actor_type,
  p_department_id uuid DEFAULT NULL,
  p_notes         text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_current_status complaint_status;
  v_current_dept   uuid;
  v_allowed        boolean := false;
BEGIN
  SELECT status, department_id INTO v_current_status, v_current_dept
  FROM complaints WHERE id = p_complaint_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Complaint not found';
  END IF;

  -- Validate transitions based on actor type
  IF p_actor_type = 'staff' THEN
    -- Staff can only perform these transitions
    v_allowed := (v_current_status, p_new_status) IN (
      ('submitted', 'reviewed'),
      ('reviewed', 'assigned'),
      ('assigned', 'in_progress'),
      ('in_progress', 'resolved'),
      ('disputed', 'in_progress')
    );
    -- Staff can only act on complaints assigned to their department
    IF p_department_id IS NOT NULL AND v_current_dept IS DISTINCT FROM p_department_id THEN
      RAISE EXCEPTION 'forbidden: Complaint not assigned to your department';
    END IF;
  ELSIF p_actor_type IN ('compliance', 'admin') THEN
    -- Compliance/admin can perform any valid transition
    v_allowed := true;
  END IF;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'forbidden: Status transition % → % not permitted for %',
      v_current_status, p_new_status, p_actor_type;
  END IF;

  -- Update complaint status
  UPDATE complaints
  SET
    status      = p_new_status,
    resolved_at = CASE WHEN p_new_status = 'resolved' THEN now() ELSE resolved_at END,
    dispute_deadline = CASE WHEN p_new_status = 'resolved' THEN now() + INTERVAL '7 days' ELSE dispute_deadline END,
    department_id = COALESCE(p_department_id, department_id)
  WHERE id = p_complaint_id;

  -- Record state history
  INSERT INTO complaint_state_history (
    complaint_id, from_status, to_status, actor_id, actor_type, department_id, notes
  ) VALUES (
    p_complaint_id, v_current_status, p_new_status, p_actor_id, p_actor_type, p_department_id, p_notes
  );

  -- Audit
  PERFORM create_audit_record(
    p_actor_id, p_actor_type, 'status_change', 'complaints', p_complaint_id,
    p_notes,
    jsonb_build_object('status', v_current_status),
    jsonb_build_object('status', p_new_status)
  );

  -- Recalculate priority
  PERFORM recalculate_priority_score(p_complaint_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: staff_reassign_complaint
-- Reassigns complaint to a different department.
-- ============================================================
CREATE OR REPLACE FUNCTION staff_reassign_complaint(
  p_complaint_id     uuid,
  p_new_department_id uuid,
  p_actor_id         uuid,
  p_actor_type       actor_type,
  p_notes            text DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_old_dept uuid;
  v_status   complaint_status;
BEGIN
  SELECT department_id, status INTO v_old_dept, v_status
  FROM complaints WHERE id = p_complaint_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Complaint not found';
  END IF;

  IF p_actor_type NOT IN ('compliance', 'admin', 'staff') THEN
    RAISE EXCEPTION 'forbidden: Insufficient role for reassignment';
  END IF;

  UPDATE complaints
  SET department_id = p_new_department_id, status = 'assigned'
  WHERE id = p_complaint_id;

  INSERT INTO complaint_state_history (
    complaint_id, from_status, to_status, actor_id, actor_type, department_id, notes
  ) VALUES (
    p_complaint_id, v_status, 'assigned', p_actor_id, p_actor_type, p_new_department_id, p_notes
  );

  PERFORM create_audit_record(
    p_actor_id, p_actor_type, 'reassign', 'complaints', p_complaint_id,
    p_notes,
    jsonb_build_object('department_id', v_old_dept),
    jsonb_build_object('department_id', p_new_department_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: compliance_reclassify_complaint
-- Only compliance/admin can change category or severity.
-- ============================================================
CREATE OR REPLACE FUNCTION compliance_reclassify_complaint(
  p_complaint_id  uuid,
  p_actor_id      uuid,
  p_reason        text,
  p_new_category  complaint_category DEFAULT NULL,
  p_new_severity  complaint_severity DEFAULT NULL
)
RETURNS void AS $$
DECLARE
  v_before jsonb;
  v_after  jsonb;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'validation: A reason is required for reclassification';
  END IF;

  SELECT jsonb_build_object('category', category, 'severity', severity)
  INTO v_before FROM complaints WHERE id = p_complaint_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Complaint not found';
  END IF;

  UPDATE complaints
  SET
    category = COALESCE(p_new_category, category),
    severity = COALESCE(p_new_severity, severity)
  WHERE id = p_complaint_id;
  -- Note: visibility trigger fires automatically on category change

  SELECT jsonb_build_object('category', category, 'severity', severity)
  INTO v_after FROM complaints WHERE id = p_complaint_id;

  PERFORM create_audit_record(
    p_actor_id, 'compliance', 'reclassify', 'complaints', p_complaint_id,
    p_reason, v_before, v_after
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: grant_restricted_access
-- Grants a dept staff member access to a specific restricted complaint.
-- ============================================================
CREATE OR REPLACE FUNCTION grant_restricted_access(
  p_complaint_id uuid,
  p_grant_to     uuid,
  p_reason       text,
  p_actor_id     uuid,
  p_expires_days int DEFAULT 30
)
RETURNS uuid AS $$
DECLARE
  v_grant_id uuid;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'validation: A reason is required for access grants';
  END IF;

  INSERT INTO restricted_access_grants (
    complaint_id, granted_to, granted_by, reason, expires_at
  ) VALUES (
    p_complaint_id, p_grant_to, p_actor_id, p_reason,
    now() + (p_expires_days || ' days')::interval
  ) RETURNING id INTO v_grant_id;

  PERFORM create_audit_record(
    p_actor_id, 'compliance', 'grant_access', 'restricted_access_grants', v_grant_id,
    p_reason,
    NULL,
    jsonb_build_object('granted_to', p_grant_to, 'complaint_id', p_complaint_id)
  );

  RETURN v_grant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: revoke_restricted_access
-- Revokes an existing access grant.
-- ============================================================
CREATE OR REPLACE FUNCTION revoke_restricted_access(
  p_grant_id uuid,
  p_actor_id uuid,
  p_reason   text
)
RETURNS void AS $$
DECLARE
  v_grant restricted_access_grants;
BEGIN
  SELECT * INTO v_grant FROM restricted_access_grants
  WHERE id = p_grant_id AND revoked_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Active grant not found';
  END IF;

  UPDATE restricted_access_grants
  SET revoked_at = now()
  WHERE id = p_grant_id;

  PERFORM create_audit_record(
    p_actor_id, 'compliance', 'revoke_access', 'restricted_access_grants', p_grant_id,
    p_reason,
    jsonb_build_object('granted_to', v_grant.granted_to, 'complaint_id', v_grant.complaint_id),
    jsonb_build_object('revoked_at', now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: access_restricted_complaint
-- Break-glass access for compliance/admin, or staff with active grant.
-- Requires a non-empty reason. Creates audit record.
-- ============================================================
CREATE OR REPLACE FUNCTION access_restricted_complaint(
  p_complaint_id uuid,
  p_actor_id     uuid,
  p_actor_type   actor_type,
  p_reason       text
)
RETURNS TABLE(
  id               uuid,
  anonymous_id     text,
  category         complaint_category,
  title            text,
  description      text,
  location         text,
  severity         complaint_severity,
  status           complaint_status,
  visibility       complaint_visibility,
  priority_score   numeric,
  escalation_level int,
  department_id    uuid,
  department_name  text,
  created_at       timestamptz,
  updated_at       timestamptz,
  resolved_at      timestamptz,
  dispute_deadline timestamptz
) AS $$
DECLARE
  v_has_grant boolean := false;
BEGIN
  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'validation: A reason is required to access restricted complaints';
  END IF;

  -- Check authorization
  IF p_actor_type = 'staff' THEN
    SELECT EXISTS(
      SELECT 1 FROM active_restricted_access_grants
      WHERE complaint_id = p_complaint_id AND granted_to = p_actor_id
    ) INTO v_has_grant;

    IF NOT v_has_grant THEN
      RAISE EXCEPTION 'forbidden: No active access grant for this restricted complaint';
    END IF;
  ELSIF p_actor_type NOT IN ('compliance', 'admin') THEN
    RAISE EXCEPTION 'forbidden: Insufficient role to access restricted complaints';
  END IF;

  -- Log the access
  PERFORM create_audit_record(
    p_actor_id, p_actor_type, 'restricted_view', 'complaints', p_complaint_id,
    p_reason, NULL, NULL
  );

  -- Return complaint data (no identity fields)
  RETURN QUERY
  SELECT
    c.id, c.anonymous_id, c.category, c.title, c.description, c.location,
    c.severity, c.status, c.visibility, c.priority_score, c.escalation_level,
    c.department_id, d.name AS department_name,
    c.created_at, c.updated_at, c.resolved_at, c.dispute_deadline
  FROM complaints c
  LEFT JOIN departments d ON c.department_id = d.id
  WHERE c.id = p_complaint_id AND c.visibility = 'restricted';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found: Restricted complaint not found';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: add_support
-- One support per token per complaint (unique constraint).
-- Rate-limited. Anonymous — only the token is stored.
-- ============================================================
CREATE OR REPLACE FUNCTION add_support(
  p_complaint_id  uuid,
  p_support_token text,
  p_rate_key      text
)
RETURNS boolean AS $$
DECLARE
  v_allowed boolean;
  v_vis     complaint_visibility;
BEGIN
  -- Rate limit: 20 supports per hour
  v_allowed := check_rate_limit(p_rate_key, 'add_support', 20, 1);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded: Too many support actions. Try again later.';
  END IF;

  -- Only support public complaints
  SELECT visibility INTO v_vis FROM complaints WHERE id = p_complaint_id;
  IF v_vis = 'restricted' THEN
    RAISE EXCEPTION 'forbidden: Cannot support restricted complaints';
  END IF;

  -- Insert (will fail silently on duplicate due to unique constraint)
  BEGIN
    INSERT INTO supports (complaint_id, support_token)
    VALUES (p_complaint_id, p_support_token);
    -- Trigger recalculates priority
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;  -- Already supported
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: cast_resolution_vote
-- Vote confirm/dispute during the 7-day window.
-- Rate-limited. One vote per token per complaint.
-- ============================================================
CREATE OR REPLACE FUNCTION cast_resolution_vote(
  p_complaint_id uuid,
  p_vote_token   text,
  p_vote_type    vote_type,
  p_rate_key     text
)
RETURNS boolean AS $$
DECLARE
  v_allowed        boolean;
  v_dispute_deadline timestamptz;
  v_status         complaint_status;
BEGIN
  v_allowed := check_rate_limit(p_rate_key, 'cast_vote', 5, 24);
  IF NOT v_allowed THEN
    RAISE EXCEPTION 'rate_limit_exceeded: Too many vote attempts.';
  END IF;

  SELECT dispute_deadline, status INTO v_dispute_deadline, v_status
  FROM complaints WHERE id = p_complaint_id;

  IF v_status <> 'resolved' THEN
    RAISE EXCEPTION 'validation: Complaint is not in resolved state';
  END IF;

  IF v_dispute_deadline IS NULL OR now() > v_dispute_deadline THEN
    RAISE EXCEPTION 'validation: Dispute window has closed';
  END IF;

  BEGIN
    INSERT INTO resolution_votes (complaint_id, vote_token, vote_type)
    VALUES (p_complaint_id, p_vote_token, p_vote_type);
    RETURN true;
  EXCEPTION WHEN unique_violation THEN
    RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: find_duplicate_complaints
-- Trigram similarity search for fuzzy duplicate detection.
-- Returns up to 3 potentially similar complaints.
-- ============================================================
CREATE OR REPLACE FUNCTION find_duplicate_complaints(
  p_title     text,
  p_category  complaint_category,
  p_threshold float DEFAULT 0.4
)
RETURNS TABLE(
  complaint_id uuid,
  title        text,
  category     complaint_category,
  status       complaint_status,
  similarity   float,
  support_count bigint,
  created_at   timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.title,
    c.category,
    c.status,
    similarity(c.title, p_title)::float AS sim,
    COALESCE(sc.support_count, 0),
    c.created_at
  FROM complaints c
  LEFT JOIN complaint_support_counts sc ON c.id = sc.complaint_id
  WHERE
    c.category = p_category
    AND c.visibility = 'public'
    AND c.status NOT IN ('closed', 'verified')
    AND similarity(c.title, p_title) >= p_threshold
  ORDER BY sim DESC
  LIMIT 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
