-- Migration 005: Views
-- Public-safe views that enforce visibility and strip identity fields.

-- ============================================================
-- VIEW: public_complaints_feed
-- Exposed to anon/student clients. NO identity fields.
-- Only public visibility complaints.
-- ============================================================
CREATE OR REPLACE VIEW public_complaints_feed AS
SELECT
  c.id,
  c.anonymous_id,
  c.category,
  c.title,
  c.description,
  c.location,
  c.severity,
  c.status,
  c.priority_score,
  c.escalation_level,
  c.created_at,
  c.updated_at,
  c.resolved_at,
  c.dispute_deadline,
  d.name AS department_name,
  COALESCE(sc.support_count, 0) AS support_count,
  (ev.evidence_count > 0) AS has_evidence
FROM complaints c
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN complaint_support_counts sc ON c.id = sc.complaint_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS evidence_count FROM evidence WHERE complaint_id = c.id
) ev ON true
WHERE c.visibility = 'public';

-- ============================================================
-- VIEW: staff_complaint_queue
-- Full complaint info for staff (all visibilities — RLS handles further restriction).
-- ============================================================
CREATE OR REPLACE VIEW staff_complaint_queue AS
SELECT
  c.id,
  c.anonymous_id,
  c.category,
  c.title,
  c.description,
  c.location,
  c.severity,
  c.status,
  c.visibility,
  c.priority_score,
  c.escalation_level,
  c.department_id,
  c.created_at,
  c.updated_at,
  c.resolved_at,
  c.dispute_deadline,
  d.name AS department_name,
  COALESCE(sc.support_count, 0) AS support_count,
  (ev.evidence_count > 0) AS has_evidence,
  -- Time since last assignment for escalation display
  COALESCE(
    (SELECT transitioned_at FROM complaint_state_history
     WHERE complaint_id = c.id AND to_status = 'assigned'
     ORDER BY transitioned_at DESC LIMIT 1),
    c.created_at
  ) AS assigned_at,
  EXTRACT(
    EPOCH FROM (now() - COALESCE(
      (SELECT transitioned_at FROM complaint_state_history
       WHERE complaint_id = c.id AND to_status = 'assigned'
       ORDER BY transitioned_at DESC LIMIT 1),
      c.created_at
    ))
  ) / 86400.0 AS days_since_assigned
FROM complaints c
LEFT JOIN departments d ON c.department_id = d.id
LEFT JOIN complaint_support_counts sc ON c.id = sc.complaint_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS evidence_count FROM evidence WHERE complaint_id = c.id
) ev ON true;

-- ============================================================
-- VIEW: complaint_priority_scores (for priority calculation reference)
-- ============================================================
CREATE OR REPLACE VIEW complaint_priority_scores AS
SELECT
  c.id AS complaint_id,
  c.priority_score,
  COALESCE(sc.support_count, 0) AS support_count,
  c.severity,
  EXTRACT(EPOCH FROM (now() - c.created_at)) / 86400.0 AS days_waiting,
  (ev.evidence_count > 0) AS has_evidence
FROM complaints c
LEFT JOIN complaint_support_counts sc ON c.id = sc.complaint_id
LEFT JOIN LATERAL (
  SELECT COUNT(*) AS evidence_count FROM evidence WHERE complaint_id = c.id
) ev ON true;

-- ============================================================
-- VIEW: active_restricted_access_grants
-- Current (non-expired, non-revoked) grants for staff.
-- ============================================================
CREATE OR REPLACE VIEW active_restricted_access_grants AS
SELECT *
FROM restricted_access_grants
WHERE revoked_at IS NULL
  AND expires_at > now();
