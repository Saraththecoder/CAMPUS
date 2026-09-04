-- Migration 002: Core Schema
-- All tables, types, enums, and constraints.
-- Security design: complaints have NO user_id / email FK.
-- Identity isolation is maintained via separate salted HMAC hashes.

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE complaint_category AS ENUM (
  'infrastructure',
  'academic',
  'hostel',
  'mess',
  'facilities',
  'conduct',
  'harassment',
  'discrimination',
  'safety'
);

CREATE TYPE complaint_severity AS ENUM ('low', 'medium', 'high', 'critical');

CREATE TYPE complaint_status AS ENUM (
  'submitted',
  'reviewed',
  'assigned',
  'in_progress',
  'resolved',
  'disputed',
  'verified',
  'closed'
);

CREATE TYPE complaint_visibility AS ENUM ('public', 'restricted');

CREATE TYPE vote_type AS ENUM ('confirm', 'dispute');

CREATE TYPE audit_action AS ENUM (
  'status_change',
  'reassign',
  'restricted_view',
  'evidence_upload',
  'grant_access',
  'revoke_access',
  'reclassify',
  'submit',
  'support',
  'vote',
  'triage_alert',
  'escalation'
);

CREATE TYPE actor_type AS ENUM ('student', 'staff', 'compliance', 'admin', 'system');

-- ============================================================
-- TABLE: colleges
-- ============================================================
CREATE TABLE colleges (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  domain      text NOT NULL UNIQUE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: identity_vault
-- SECURITY: This table must NEVER be readable by any client role.
-- Only service-role / SECURITY DEFINER functions may touch it.
-- Stores HMAC(email, HMAC_SECRET) — not the email itself.
-- ============================================================
CREATE TABLE identity_vault (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash    text NOT NULL UNIQUE,  -- HMAC(email, HMAC_SECRET)
  college_id    uuid NOT NULL REFERENCES colleges(id),
  role          text NOT NULL DEFAULT 'student',
  verified_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: departments
-- ============================================================
CREATE TABLE departments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id  uuid NOT NULL REFERENCES colleges(id),
  name        text NOT NULL,
  head_email  text,  -- for escalation notifications only
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, name)
);

-- ============================================================
-- TABLE: complaints
-- SECURITY: NO user_id, NO email, NO student identity FK.
-- submitter_hash = HMAC(email, COMPLAINT_SALT)  -- different salt from identity_vault
-- anonymous_id   = random, not derivable from identity
-- recovery_hash  = bcrypt(recovery_code)
-- visibility     = derived by DB trigger from category — client cannot set it
-- ============================================================
CREATE TABLE complaints (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  anonymous_id     text NOT NULL DEFAULT gen_random_uuid()::text,
  college_id       uuid NOT NULL REFERENCES colleges(id),
  department_id    uuid REFERENCES departments(id),
  category         complaint_category NOT NULL,
  title            text NOT NULL CHECK (char_length(title) BETWEEN 5 AND 200),
  description      text NOT NULL CHECK (char_length(description) BETWEEN 20 AND 5000),
  location         text,
  severity         complaint_severity NOT NULL DEFAULT 'medium',
  status           complaint_status NOT NULL DEFAULT 'submitted',
  visibility       complaint_visibility NOT NULL DEFAULT 'public',  -- overridden by trigger
  submitter_hash   text NOT NULL,  -- HMAC(email, COMPLAINT_SALT) — never joinable to identity_vault
  recovery_hash    text NOT NULL,  -- bcrypt hash — never returned to client
  priority_score   numeric NOT NULL DEFAULT 0,
  escalation_level int NOT NULL DEFAULT 0,
  resolved_at      timestamptz,
  dispute_deadline timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: evidence
-- Stored in private Supabase Storage buckets.
-- Access is authorized server-side — never public URLs.
-- ============================================================
CREATE TABLE evidence (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  storage_path      text NOT NULL,
  file_name         text NOT NULL,
  mime_type         text NOT NULL,
  file_size_bytes   int NOT NULL,
  uploaded_by_hash  text NOT NULL,  -- same submitter_hash
  created_at        timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: supports
-- Individual records are NOT queryable by clients.
-- Only the aggregate count view is exposed.
-- support_token = HMAC(user_submitter_hash, complaint_id, SUPPORT_SALT)
-- ============================================================
CREATE TABLE supports (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  support_token text NOT NULL UNIQUE,  -- deterministic, non-reversible
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (complaint_id, support_token)
);

-- ============================================================
-- TABLE: resolution_votes
-- Tracks confirm/dispute votes during 7-day dispute window.
-- vote_token = HMAC(user_submitter_hash, complaint_id, VOTE_SALT)
-- ============================================================
CREATE TABLE resolution_votes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  vote_token    text NOT NULL UNIQUE,
  vote_type     vote_type NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: complaint_state_history
-- Records every status transition for escalation tracking.
-- Escalation time is computed from the ASSIGNMENT timestamp.
-- ============================================================
CREATE TABLE complaint_state_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id    uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  from_status     complaint_status,
  to_status       complaint_status NOT NULL,
  actor_id        uuid,   -- staff/compliance user id
  actor_type      actor_type NOT NULL DEFAULT 'system',
  department_id   uuid REFERENCES departments(id),
  notes           text,
  transitioned_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TABLE: escalation_log
-- Prevents duplicate escalation records per complaint per level.
-- ============================================================
CREATE TABLE escalation_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  level         int NOT NULL,
  notified_at   timestamptz NOT NULL DEFAULT now(),
  actor_type    text NOT NULL DEFAULT 'system',
  UNIQUE (complaint_id, level)
);

-- ============================================================
-- TABLE: rate_limits
-- Server-side rate limiting backed by database state.
-- identity_key = HMAC(user_identity, action, RATELIMIT_SALT)
-- ============================================================
CREATE TABLE rate_limits (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_key   text NOT NULL,
  action_type    text NOT NULL,
  window_start   timestamptz NOT NULL,
  attempt_count  int NOT NULL DEFAULT 0,
  UNIQUE (identity_key, action_type, window_start)
);

-- ============================================================
-- TABLE: restricted_access_grants
-- Explicit grants for dept staff to access restricted complaints.
-- Every grant requires a reason. Every revocation is logged.
-- ============================================================
CREATE TABLE restricted_access_grants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  uuid NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  granted_to    uuid NOT NULL,   -- staff user_id (Supabase auth.users.id)
  granted_by    uuid NOT NULL,   -- compliance/admin user_id
  reason        text NOT NULL,
  granted_at    timestamptz NOT NULL DEFAULT now(),
  revoked_at    timestamptz,
  expires_at    timestamptz NOT NULL DEFAULT now() + INTERVAL '30 days'
);

-- ============================================================
-- TABLE: audit_log
-- IMMUTABLE — no client can INSERT/UPDATE/DELETE.
-- Only SECURITY DEFINER functions can write to it.
-- Admin can READ but never mutate.
-- ============================================================
CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid,
  actor_type    actor_type NOT NULL DEFAULT 'system',
  action        audit_action NOT NULL,
  target_table  text,
  target_id     uuid,
  reason        text,
  before_state  jsonb,
  after_state   jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- VIEW: complaint_support_counts (aggregate only — no individual tokens)
-- ============================================================
CREATE VIEW complaint_support_counts AS
SELECT
  complaint_id,
  COUNT(*) AS support_count
FROM supports
GROUP BY complaint_id;
