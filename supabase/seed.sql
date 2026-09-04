-- Seed data for development environment
-- WARNING: This is development-only data. Never use in production.
-- All dev passwords are clearly marked and should never be production credentials.

-- ============================================================
-- College
-- ============================================================
INSERT INTO colleges (id, name, domain) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Campus University', 'campus.edu')
ON CONFLICT (domain) DO NOTHING;

-- ============================================================
-- Departments
-- ============================================================
INSERT INTO departments (id, college_id, name, head_email) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Infrastructure & Facilities', 'infra-head@campus.edu'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Academic Affairs', 'academic-head@campus.edu'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Student Welfare & Hostel', 'hostel-head@campus.edu'),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'Student Conduct & Compliance', 'compliance-head@campus.edu'),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', 'Mess & Catering', 'mess-head@campus.edu')
ON CONFLICT (college_id, name) DO NOTHING;

-- ============================================================
-- Example public complaints (no identity — dev data only)
-- submitter_hash and recovery_hash are fake dev values
-- ============================================================

-- Public complaint 1: Infrastructure
INSERT INTO complaints (
  id, college_id, category, title, description, location,
  severity, status, submitter_hash, recovery_hash, priority_score,
  department_id
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'infrastructure',
  'Water leakage in Block C bathroom',
  'There is persistent water leakage from the ceiling of the second-floor bathroom in Block C. The floor is constantly wet and poses a slip hazard. This has been ongoing for 3 weeks.',
  'Block C, 2nd Floor Bathroom',
  'high',
  'in_progress',
  'dev_submitter_hash_1',
  '$2a$10$dev_recovery_hash_placeholder_1',
  12.5,
  '10000000-0000-0000-0000-000000000001'
);

-- Public complaint 2: Academic
INSERT INTO complaints (
  id, college_id, category, title, description, location,
  severity, status, submitter_hash, recovery_hash, priority_score,
  department_id
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'academic',
  'Lab equipment outdated and non-functional',
  'The electronics lab (EE-301) has 8 of 20 oscilloscopes that are non-functional. Students are unable to complete required lab experiments. Last calibration was in 2022.',
  'EE Building, Lab 301',
  'medium',
  'assigned',
  'dev_submitter_hash_2',
  '$2a$10$dev_recovery_hash_placeholder_2',
  8.0,
  '10000000-0000-0000-0000-000000000002'
);

-- Public complaint 3: Mess — Resolved with dispute
INSERT INTO complaints (
  id, college_id, category, title, description, location,
  severity, status, submitter_hash, recovery_hash, priority_score,
  department_id, resolved_at, dispute_deadline
) VALUES (
  '20000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'mess',
  'Unhygienic food preparation observed in main mess',
  'On multiple occasions, food handlers have been observed not wearing gloves or hairnets. Several students have reported stomach issues after consuming food from the main mess this week.',
  'Main Mess Hall',
  'critical',
  'disputed',
  'dev_submitter_hash_3',
  '$2a$10$dev_recovery_hash_placeholder_3',
  18.0,
  '10000000-0000-0000-0000-000000000005',
  now() - INTERVAL '9 days',
  now() - INTERVAL '2 days'
);

-- Restricted complaint: Harassment (should NOT appear in public feed)
INSERT INTO complaints (
  id, college_id, category, title, description, location,
  severity, status, submitter_hash, recovery_hash, priority_score,
  department_id
) VALUES (
  '20000000-0000-0000-0000-000000000004',
  '00000000-0000-0000-0000-000000000001',
  'harassment',
  'Verbal harassment by faculty member during tutorial',
  'During the CS-401 tutorial on [date], a faculty member repeatedly singled out and verbally demeaned a student in front of the class. Multiple witnesses present.',
  'CS Building, Tutorial Room 2',
  'high',
  'reviewed',
  'dev_submitter_hash_4',
  '$2a$10$dev_recovery_hash_placeholder_4',
  9.0,
  '10000000-0000-0000-0000-000000000004'
);
-- Note: visibility = 'restricted' is automatically set by trigger

-- Verified complaint
INSERT INTO complaints (
  id, college_id, category, title, description, location,
  severity, status, submitter_hash, recovery_hash, priority_score,
  department_id, resolved_at
) VALUES (
  '20000000-0000-0000-0000-000000000005',
  '00000000-0000-0000-0000-000000000001',
  'hostel',
  'Hot water not available in Hostel Block A',
  'Hot water has not been available in Block A (rooms 101-120) for the past two weeks. Multiple complaints submitted to hostel warden with no action taken.',
  'Hostel Block A',
  'medium',
  'verified',
  'dev_submitter_hash_5',
  '$2a$10$dev_recovery_hash_placeholder_5',
  5.0,
  '10000000-0000-0000-0000-000000000003',
  now() - INTERVAL '3 days'
);

-- ============================================================
-- Sample state history
-- ============================================================
INSERT INTO complaint_state_history (complaint_id, from_status, to_status, actor_type, transitioned_at) VALUES
  ('20000000-0000-0000-0000-000000000001', NULL, 'submitted', 'student', now() - INTERVAL '15 days'),
  ('20000000-0000-0000-0000-000000000001', 'submitted', 'reviewed', 'staff', now() - INTERVAL '12 days'),
  ('20000000-0000-0000-0000-000000000001', 'reviewed', 'assigned', 'staff', now() - INTERVAL '10 days'),
  ('20000000-0000-0000-0000-000000000001', 'assigned', 'in_progress', 'staff', now() - INTERVAL '5 days'),
  ('20000000-0000-0000-0000-000000000002', NULL, 'submitted', 'student', now() - INTERVAL '7 days'),
  ('20000000-0000-0000-0000-000000000002', 'submitted', 'reviewed', 'staff', now() - INTERVAL '5 days'),
  ('20000000-0000-0000-0000-000000000002', 'reviewed', 'assigned', 'staff', now() - INTERVAL '3 days'),
  ('20000000-0000-0000-0000-000000000003', NULL, 'submitted', 'student', now() - INTERVAL '14 days'),
  ('20000000-0000-0000-0000-000000000003', 'submitted', 'reviewed', 'staff', now() - INTERVAL '12 days'),
  ('20000000-0000-0000-0000-000000000003', 'reviewed', 'assigned', 'staff', now() - INTERVAL '11 days'),
  ('20000000-0000-0000-0000-000000000003', 'assigned', 'in_progress', 'staff', now() - INTERVAL '10 days'),
  ('20000000-0000-0000-0000-000000000003', 'in_progress', 'resolved', 'staff', now() - INTERVAL '9 days'),
  ('20000000-0000-0000-0000-000000000003', 'resolved', 'disputed', 'system', now() - INTERVAL '2 days'),
  ('20000000-0000-0000-0000-000000000005', NULL, 'submitted', 'student', now() - INTERVAL '10 days'),
  ('20000000-0000-0000-0000-000000000005', 'submitted', 'reviewed', 'staff', now() - INTERVAL '8 days'),
  ('20000000-0000-0000-0000-000000000005', 'reviewed', 'assigned', 'staff', now() - INTERVAL '7 days'),
  ('20000000-0000-0000-0000-000000000005', 'assigned', 'resolved', 'staff', now() - INTERVAL '4 days'),
  ('20000000-0000-0000-0000-000000000005', 'resolved', 'verified', 'system', now() - INTERVAL '3 days');

-- ============================================================
-- Sample supports (anonymous tokens — dev placeholders only)
-- ============================================================
INSERT INTO supports (complaint_id, support_token) VALUES
  ('20000000-0000-0000-0000-000000000001', 'dev_support_token_a1'),
  ('20000000-0000-0000-0000-000000000001', 'dev_support_token_a2'),
  ('20000000-0000-0000-0000-000000000001', 'dev_support_token_a3'),
  ('20000000-0000-0000-0000-000000000002', 'dev_support_token_b1'),
  ('20000000-0000-0000-0000-000000000002', 'dev_support_token_b2'),
  ('20000000-0000-0000-0000-000000000003', 'dev_support_token_c1'),
  ('20000000-0000-0000-0000-000000000003', 'dev_support_token_c2'),
  ('20000000-0000-0000-0000-000000000003', 'dev_support_token_c3'),
  ('20000000-0000-0000-0000-000000000003', 'dev_support_token_c4'),
  ('20000000-0000-0000-0000-000000000003', 'dev_support_token_c5');

-- ============================================================
-- DEVELOPMENT USERS
-- NOTE: These users must be created in Supabase Auth manually or via the
-- Supabase dashboard. The seed data below notes what app_metadata must be
-- set for each user. Set these via Admin API or dashboard.
--
-- DEV USER 1: dev-staff@campus.edu (password: DevStaff123!)
--   app_metadata: { "role": "staff", "college_id": "00000000-...-0001",
--                   "department_id": "10000000-...-0001" }
--
-- DEV USER 2: dev-compliance@campus.edu (password: DevCompliance123!)
--   app_metadata: { "role": "compliance", "college_id": "00000000-...-0001" }
--
-- DEV USER 3: dev-admin@campus.edu (password: DevAdmin123!)
--   app_metadata: { "role": "admin", "college_id": "00000000-...-0001" }
--
-- Students use magic link / OTP — no seed users needed.
-- ============================================================
