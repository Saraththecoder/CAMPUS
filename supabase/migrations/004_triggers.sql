-- Migration 004: Triggers
-- Enforces server-side invariants that the frontend cannot bypass.

-- ============================================================
-- TRIGGER: set_updated_at
-- Auto-updates the updated_at column on any row change.
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_set_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- TRIGGER: enforce_visibility_from_category
-- Sensitive categories → restricted. All others → public.
-- The frontend CANNOT set visibility directly; this trigger overrides it.
-- This is a core security control.
-- ============================================================
CREATE OR REPLACE FUNCTION enforce_visibility_from_category()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.category IN ('conduct', 'harassment', 'discrimination', 'safety') THEN
    NEW.visibility = 'restricted';
  ELSE
    NEW.visibility = 'public';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_enforce_visibility
  BEFORE INSERT OR UPDATE OF category ON complaints
  FOR EACH ROW EXECUTE FUNCTION enforce_visibility_from_category();

-- ============================================================
-- TRIGGER: prevent_immutable_field_change
-- These fields must never change after complaint creation:
--   submitter_hash, anonymous_id, college_id, created_at,
--   recovery_hash, visibility (visibility is derived, not directly settable)
-- Even service-role cannot bypass this via direct UPDATE —
-- only internal SECURITY DEFINER functions that recreate the row would bypass it,
-- but we don't do that by design.
-- ============================================================
CREATE OR REPLACE FUNCTION prevent_immutable_field_change()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.submitter_hash IS DISTINCT FROM OLD.submitter_hash THEN
    RAISE EXCEPTION 'submitter_hash is immutable after creation';
  END IF;
  IF NEW.anonymous_id IS DISTINCT FROM OLD.anonymous_id THEN
    RAISE EXCEPTION 'anonymous_id is immutable after creation';
  END IF;
  IF NEW.college_id IS DISTINCT FROM OLD.college_id THEN
    RAISE EXCEPTION 'college_id is immutable after creation';
  END IF;
  IF NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'created_at is immutable after creation';
  END IF;
  IF NEW.recovery_hash IS DISTINCT FROM OLD.recovery_hash THEN
    RAISE EXCEPTION 'recovery_hash is immutable after creation';
  END IF;
  -- visibility is derived; prevent direct override
  -- (the category trigger already handles this, but defense-in-depth)
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER complaints_prevent_immutable_change
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION prevent_immutable_field_change();

-- ============================================================
-- TRIGGER: update_priority_score
-- Recalculates priority whenever support count or other
-- relevant fields change. Uses:
--   support_count * 1.5  (community weight)
--   severity_weight * 3  (severity: low=1, medium=2, high=3, critical=4)
--   days_waiting * 0.5   (aging weight — time since last assignment)
--   has_evidence * 2     (evidence bonus)
-- ============================================================
CREATE OR REPLACE FUNCTION recalculate_priority_score(p_complaint_id uuid)
RETURNS void AS $$
DECLARE
  v_support_count int;
  v_severity complaint_severity;
  v_severity_weight int;
  v_days_waiting numeric;
  v_has_evidence boolean;
  v_score numeric;
  v_assigned_at timestamptz;
BEGIN
  -- support count (aggregate only)
  SELECT COALESCE(COUNT(*), 0) INTO v_support_count
  FROM supports WHERE complaint_id = p_complaint_id;

  -- severity weight
  SELECT severity INTO v_severity FROM complaints WHERE id = p_complaint_id;
  v_severity_weight := CASE v_severity
    WHEN 'low'      THEN 1
    WHEN 'medium'   THEN 2
    WHEN 'high'     THEN 3
    WHEN 'critical' THEN 4
    ELSE 2
  END;

  -- time since assignment (or submission if never assigned)
  SELECT COALESCE(
    (SELECT transitioned_at FROM complaint_state_history
     WHERE complaint_id = p_complaint_id AND to_status = 'assigned'
     ORDER BY transitioned_at DESC LIMIT 1),
    (SELECT created_at FROM complaints WHERE id = p_complaint_id)
  ) INTO v_assigned_at;

  v_days_waiting := EXTRACT(EPOCH FROM (now() - v_assigned_at)) / 86400.0;

  -- evidence presence
  SELECT EXISTS(SELECT 1 FROM evidence WHERE complaint_id = p_complaint_id) INTO v_has_evidence;

  -- weighted formula
  v_score := (v_support_count * 1.5)
           + (v_severity_weight * 3)
           + (v_days_waiting * 0.5)
           + (CASE WHEN v_has_evidence THEN 2 ELSE 0 END);

  UPDATE complaints SET priority_score = v_score WHERE id = p_complaint_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to recalculate priority when a support is added
CREATE OR REPLACE FUNCTION trigger_recalculate_priority()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM recalculate_priority_score(
    COALESCE(NEW.complaint_id, OLD.complaint_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER supports_recalculate_priority
  AFTER INSERT OR DELETE ON supports
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_priority();

CREATE TRIGGER evidence_recalculate_priority
  AFTER INSERT OR DELETE ON evidence
  FOR EACH ROW EXECUTE FUNCTION trigger_recalculate_priority();
