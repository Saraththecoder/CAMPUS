-- Migration 009: Escalation Engine (pg_cron)
-- IMPORTANT: pg_cron must be enabled in Supabase dashboard before running this migration.
-- Navigate to: Database → Extensions → Enable pg_cron

-- ============================================================
-- FUNCTION: process_escalations
-- Runs hourly. Escalation time is measured from ASSIGNMENT,
-- not from complaint submission.
-- Level 1: 3 days → reminder
-- Level 2: 7 days → department head escalation
-- Level 3: 10 days → administration escalation
-- ============================================================
CREATE OR REPLACE FUNCTION process_escalations()
RETURNS void AS $$
DECLARE
  v_complaint RECORD;
  v_assigned_at timestamptz;
  v_days_since_assigned numeric;
  v_target_level int;
BEGIN
  FOR v_complaint IN
    SELECT c.id, c.status, c.escalation_level, c.department_id,
           c.title, c.category, c.severity
    FROM complaints c
    WHERE c.status IN ('assigned', 'in_progress')
      AND c.escalation_level < 3
  LOOP
    -- Find the most recent assignment timestamp
    SELECT transitioned_at INTO v_assigned_at
    FROM complaint_state_history
    WHERE complaint_id = v_complaint.id
      AND to_status = 'assigned'
    ORDER BY transitioned_at DESC
    LIMIT 1;

    IF v_assigned_at IS NULL THEN
      CONTINUE;  -- Never assigned, skip
    END IF;

    v_days_since_assigned := EXTRACT(EPOCH FROM (now() - v_assigned_at)) / 86400.0;

    -- Determine which escalation level should be active
    v_target_level := CASE
      WHEN v_days_since_assigned >= 10 THEN 3
      WHEN v_days_since_assigned >= 7  THEN 2
      WHEN v_days_since_assigned >= 3  THEN 1
      ELSE 0
    END;

    -- Only escalate if we need a higher level than current
    IF v_target_level > v_complaint.escalation_level THEN
      -- Insert escalation log (UNIQUE constraint prevents duplicates)
      BEGIN
        INSERT INTO escalation_log (complaint_id, level)
        VALUES (v_complaint.id, v_target_level);

        -- Update complaint escalation level
        UPDATE complaints
        SET escalation_level = v_target_level
        WHERE id = v_complaint.id;

        -- Audit the escalation
        PERFORM create_audit_record(
          NULL, 'system', 'escalation', 'complaints', v_complaint.id,
          format('Escalation level %s: %s days since assignment', v_target_level, round(v_days_since_assigned)),
          jsonb_build_object('escalation_level', v_complaint.escalation_level),
          jsonb_build_object('escalation_level', v_target_level)
        );

        -- NOTE: Email notification via Edge Function is triggered from the
        -- application layer (API route) that polls this table, or via
        -- Supabase webhook on escalation_log INSERT.

      EXCEPTION WHEN unique_violation THEN
        -- Already escalated to this level, continue
        NULL;
      END;
    END IF;
  END LOOP;

  -- Triage alert: complaints stuck in submitted/reviewed > 2 days
  FOR v_complaint IN
    SELECT c.id, c.title, c.category, c.severity, c.status, c.created_at
    FROM complaints c
    WHERE c.status IN ('submitted', 'reviewed')
      AND c.created_at < now() - INTERVAL '2 days'
  LOOP
    BEGIN
      INSERT INTO escalation_log (complaint_id, level)
      VALUES (v_complaint.id, -1);  -- -1 = triage alert level

      PERFORM create_audit_record(
        NULL, 'system', 'triage_alert', 'complaints', v_complaint.id,
        'Complaint stuck in triage for > 2 days',
        NULL,
        jsonb_build_object('status', v_complaint.status, 'days_waiting',
          EXTRACT(EPOCH FROM (now() - v_complaint.created_at)) / 86400.0)
      );
    EXCEPTION WHEN unique_violation THEN
      NULL;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- FUNCTION: process_dispute_deadlines
-- Runs hourly. Transitions resolved complaints past their dispute deadline.
-- disputes > confirmations → disputed
-- otherwise → verified
-- ============================================================
CREATE OR REPLACE FUNCTION process_dispute_deadlines()
RETURNS void AS $$
DECLARE
  v_complaint RECORD;
  v_confirms  int;
  v_disputes  int;
  v_new_status complaint_status;
BEGIN
  FOR v_complaint IN
    SELECT id, dispute_deadline
    FROM complaints
    WHERE status = 'resolved'
      AND dispute_deadline IS NOT NULL
      AND dispute_deadline < now()
  LOOP
    SELECT
      COUNT(*) FILTER (WHERE vote_type = 'confirm'),
      COUNT(*) FILTER (WHERE vote_type = 'dispute')
    INTO v_confirms, v_disputes
    FROM resolution_votes
    WHERE complaint_id = v_complaint.id;

    v_new_status := CASE WHEN v_disputes > v_confirms THEN 'disputed' ELSE 'verified' END;

    UPDATE complaints
    SET status = v_new_status
    WHERE id = v_complaint.id;

    INSERT INTO complaint_state_history (
      complaint_id, from_status, to_status, actor_type, notes
    ) VALUES (
      v_complaint.id, 'resolved', v_new_status, 'system',
      format('Dispute window closed. Confirms: %s, Disputes: %s', v_confirms, v_disputes)
    );

    PERFORM create_audit_record(
      NULL, 'system', 'status_change', 'complaints', v_complaint.id,
      format('Dispute deadline passed. Confirms: %s, Disputes: %s', v_confirms, v_disputes),
      jsonb_build_object('status', 'resolved'),
      jsonb_build_object('status', v_new_status, 'confirms', v_confirms, 'disputes', v_disputes)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- pg_cron scheduled jobs
-- IMPORTANT: These will fail if pg_cron extension is not enabled.
-- Enable it first in Supabase dashboard: Database → Extensions → pg_cron
-- ============================================================

-- Escalation check: every hour
SELECT cron.schedule(
  'campus-escalation-check',
  '0 * * * *',
  'SELECT process_escalations()'
);

-- Dispute deadline check: every hour
SELECT cron.schedule(
  'campus-dispute-check',
  '0 * * * *',
  'SELECT process_dispute_deadlines()'
);

GRANT EXECUTE ON FUNCTION process_escalations TO authenticated;
GRANT EXECUTE ON FUNCTION process_dispute_deadlines TO authenticated;
