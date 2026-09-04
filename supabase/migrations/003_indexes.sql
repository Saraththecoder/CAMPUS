-- Migration 003: Indexes for performance and search

-- Complaints: primary lookup patterns
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_category ON complaints(category);
CREATE INDEX idx_complaints_visibility ON complaints(visibility);
CREATE INDEX idx_complaints_department_id ON complaints(department_id);
CREATE INDEX idx_complaints_college_id ON complaints(college_id);
CREATE INDEX idx_complaints_created_at ON complaints(created_at DESC);
CREATE INDEX idx_complaints_priority_score ON complaints(priority_score DESC);
CREATE INDEX idx_complaints_submitter_hash ON complaints(submitter_hash);
CREATE INDEX idx_complaints_escalation_level ON complaints(escalation_level);

-- Full-text search index for title (for duplicate detection + search)
CREATE INDEX idx_complaints_title_trgm ON complaints USING gin (title gin_trgm_ops);
CREATE INDEX idx_complaints_description_trgm ON complaints USING gin (description gin_trgm_ops);

-- Evidence
CREATE INDEX idx_evidence_complaint_id ON evidence(complaint_id);

-- Supports
CREATE INDEX idx_supports_complaint_id ON supports(complaint_id);

-- Resolution votes
CREATE INDEX idx_resolution_votes_complaint_id ON resolution_votes(complaint_id);

-- State history
CREATE INDEX idx_state_history_complaint_id ON complaint_state_history(complaint_id);
CREATE INDEX idx_state_history_transitioned_at ON complaint_state_history(transitioned_at);

-- Escalation log
CREATE INDEX idx_escalation_log_complaint_id ON escalation_log(complaint_id);

-- Rate limits
CREATE INDEX idx_rate_limits_key_action ON rate_limits(identity_key, action_type, window_start);

-- Restricted access grants
CREATE INDEX idx_grants_complaint_id ON restricted_access_grants(complaint_id);
CREATE INDEX idx_grants_granted_to ON restricted_access_grants(granted_to);

-- Audit log
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
CREATE INDEX idx_audit_log_target_id ON audit_log(target_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at DESC);
