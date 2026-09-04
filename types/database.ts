// types/database.ts
// TypeScript types generated from the database schema.
// These match the Supabase table structure.

export type ComplaintCategory =
  | 'infrastructure'
  | 'academic'
  | 'hostel'
  | 'mess'
  | 'facilities'
  | 'conduct'
  | 'harassment'
  | 'discrimination'
  | 'safety'

export type ComplaintSeverity = 'low' | 'medium' | 'high' | 'critical'

export type ComplaintStatus =
  | 'submitted'
  | 'reviewed'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'disputed'
  | 'verified'
  | 'closed'

export type ComplaintVisibility = 'public' | 'restricted'
export type VoteType = 'confirm' | 'dispute'
export type AuditAction =
  | 'status_change'
  | 'reassign'
  | 'restricted_view'
  | 'evidence_upload'
  | 'grant_access'
  | 'revoke_access'
  | 'reclassify'
  | 'submit'
  | 'support'
  | 'vote'
  | 'triage_alert'
  | 'escalation'

export type ActorType = 'student' | 'staff' | 'compliance' | 'admin' | 'system'

// Sensitive categories that auto-derive restricted visibility
export const SENSITIVE_CATEGORIES: ComplaintCategory[] = [
  'conduct', 'harassment', 'discrimination', 'safety'
]

export const PUBLIC_CATEGORIES: ComplaintCategory[] = [
  'infrastructure', 'academic', 'hostel', 'mess', 'facilities'
]

export function isRestrictedCategory(category: ComplaintCategory): boolean {
  return SENSITIVE_CATEGORIES.includes(category)
}

export interface Database {
  public: {
    Tables: {
      colleges: {
        Row: {
          id: string
          name: string
          domain: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          domain: string
          created_at?: string
        }
        Update: {
          name?: string
          domain?: string
        }
      }
      identity_vault: {
        Row: {
          id: string
          email_hash: string
          college_id: string
          role: string
          verified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email_hash: string
          college_id: string
          role?: string
          verified_at?: string | null
        }
        Update: never  // Never allow updates via typed client
      }
      complaints: {
        Row: {
          id: string
          anonymous_id: string
          college_id: string
          department_id: string | null
          category: ComplaintCategory
          title: string
          description: string
          location: string | null
          severity: ComplaintSeverity
          status: ComplaintStatus
          visibility: ComplaintVisibility
          submitter_hash: string
          recovery_hash: string
          priority_score: number
          escalation_level: number
          resolved_at: string | null
          dispute_deadline: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          college_id: string
          department_id?: string | null
          category: ComplaintCategory
          title: string
          description: string
          location?: string | null
          severity?: ComplaintSeverity
          status?: ComplaintStatus
          visibility?: ComplaintVisibility
          submitter_hash: string
          recovery_hash: string
          priority_score?: number
          escalation_level?: number
          resolved_at?: string | null
          dispute_deadline?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          department_id?: string | null
          status?: ComplaintStatus
          visibility?: ComplaintVisibility
          priority_score?: number
          escalation_level?: number
          resolved_at?: string | null
          dispute_deadline?: string | null
        }
      }
      evidence: {
        Row: {
          id: string
          complaint_id: string
          storage_path: string
          file_name: string
          mime_type: string
          file_size_bytes: number
          uploaded_by_hash: string
          created_at: string
        }
        Insert: {
          id?: string
          complaint_id: string
          storage_path: string
          file_name: string
          mime_type: string
          file_size_bytes: number
          uploaded_by_hash: string
          created_at?: string
        }
        Update: {
          storage_path?: string
          file_name?: string
        }
      }
      supports: {
        Row: {
          id: string
          complaint_id: string
          support_token: string
          created_at: string
        }
        Insert: {
          id?: string
          complaint_id: string
          support_token: string
          created_at?: string
        }
        Update: {
          support_token?: string
        }
      }
      resolution_votes: {
        Row: {
          id: string
          complaint_id: string
          vote_token: string
          vote_type: VoteType
          created_at: string
        }
        Insert: {
          id?: string
          complaint_id: string
          vote_token: string
          vote_type: VoteType
          created_at?: string
        }
        Update: {
          vote_type?: VoteType
        }
      }
      complaint_state_history: {
        Row: {
          id: string
          complaint_id: string
          from_status: ComplaintStatus | null
          to_status: ComplaintStatus
          actor_id: string | null
          actor_type: ActorType
          department_id: string | null
          notes: string | null
          transitioned_at: string
        }
        Insert: {
          id?: string
          complaint_id: string
          from_status?: ComplaintStatus | null
          to_status: ComplaintStatus
          actor_id?: string | null
          actor_type: ActorType
          department_id?: string | null
          notes?: string | null
          transitioned_at?: string
        }
        Update: {
          to_status?: ComplaintStatus
        }
      }
      escalation_log: {
        Row: {
          id: string
          complaint_id: string
          level: number
          notified_at: string
          actor_type: string
        }
        Insert: {
          id?: string
          complaint_id: string
          level: number
          notified_at?: string
          actor_type?: string
        }
        Update: {
          level?: number
        }
      }
      rate_limits: {
        Row: {
          id: string
          identity_key: string
          action_type: string
          window_start: string
          attempt_count: number
        }
        Insert: {
          id?: string
          identity_key: string
          action_type: string
          window_start?: string
          attempt_count?: number
        }
        Update: {
          attempt_count?: number
        }
      }
      restricted_access_grants: {
        Row: {
          id: string
          complaint_id: string
          granted_to: string
          granted_by: string
          reason: string
          granted_at: string
          revoked_at: string | null
          expires_at: string
        }
        Insert: {
          id?: string
          complaint_id: string
          granted_to: string
          granted_by: string
          reason: string
          granted_at?: string
          revoked_at?: string | null
          expires_at: string
        }
        Update: {
          revoked_at?: string | null
        }
      }
      audit_log: {
        Row: {
          id: string
          actor_id: string | null
          actor_type: ActorType
          action: AuditAction
          target_table: string | null
          target_id: string | null
          reason: string | null
          before_state: Record<string, unknown> | null
          after_state: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          actor_id?: string | null
          actor_type: ActorType
          action: AuditAction
          target_table?: string | null
          target_id?: string | null
          reason?: string | null
          before_state?: Record<string, unknown> | null
          after_state?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          reason?: string | null
        }
      }
      departments: {
        Row: {
          id: string
          college_id: string
          name: string
          head_email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          college_id: string
          name: string
          head_email?: string | null
        }
        Update: {
          name?: string
          head_email?: string | null
        }
      }
    }
    Views: {
      public_complaints_feed: {
        Row: {
          id: string
          anonymous_id: string
          category: ComplaintCategory
          title: string
          description: string
          location: string | null
          severity: ComplaintSeverity
          status: ComplaintStatus
          priority_score: number
          escalation_level: number
          created_at: string
          updated_at: string
          resolved_at: string | null
          dispute_deadline: string | null
          department_name: string | null
          support_count: number
          has_evidence: boolean
        }
      }
      staff_complaint_queue: {
        Row: {
          id: string
          anonymous_id: string
          category: ComplaintCategory
          title: string
          description: string
          location: string | null
          severity: ComplaintSeverity
          status: ComplaintStatus
          visibility: ComplaintVisibility
          priority_score: number
          escalation_level: number
          department_id: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          dispute_deadline: string | null
          department_name: string | null
          support_count: number
          has_evidence: boolean
          assigned_at: string
          days_since_assigned: number
        }
      }
      complaint_support_counts: {
        Row: {
          complaint_id: string
          support_count: number
        }
      }
      active_restricted_access_grants: {
        Row: {
          id: string
          complaint_id: string
          granted_to: string
          granted_by: string
          reason: string
          granted_at: string
          revoked_at: string | null
          expires_at: string
        }
      }
    }
    Functions: {
      submit_complaint: {
        Args: {
          p_college_id: string
          p_category: ComplaintCategory
          p_title: string
          p_description: string
          p_location: string
          p_severity: ComplaintSeverity
          p_submitter_hash: string
          p_recovery_hash: string
          p_rate_key: string
        }
        Returns: Array<{ complaint_id: string; anonymous_id: string }>
      }
      lookup_recovery_code: {
        Args: { p_code: string; p_rate_key: string }
        Returns: Array<{
          complaint_id: string
          anonymous_id: string
          category: ComplaintCategory
          title: string
          status: ComplaintStatus
          severity: ComplaintSeverity
          visibility: ComplaintVisibility
          created_at: string
          updated_at: string
          resolved_at: string | null
          dispute_deadline: string | null
          department_name: string | null
        }>
      }
      find_duplicate_complaints: {
        Args: {
          p_title: string
          p_category: ComplaintCategory
          p_threshold?: number
        }
        Returns: Array<{
          complaint_id: string
          title: string
          category: ComplaintCategory
          status: ComplaintStatus
          similarity: number
          support_count: number
          created_at: string
        }>
      }
      staff_update_complaint_status: {
        Args: {
          p_complaint_id: string
          p_new_status: ComplaintStatus
          p_actor_id: string
          p_actor_type: ActorType
          p_department_id?: string
          p_notes?: string
        }
        Returns: void
      }
      staff_reassign_complaint: {
        Args: {
          p_complaint_id: string
          p_new_department_id: string
          p_actor_id: string
          p_actor_type: ActorType
          p_notes?: string
        }
        Returns: void
      }
      compliance_reclassify_complaint: {
        Args: {
          p_complaint_id: string
          p_new_category?: ComplaintCategory
          p_new_severity?: ComplaintSeverity
          p_actor_id: string
          p_reason: string
        }
        Returns: void
      }
      grant_restricted_access: {
        Args: {
          p_complaint_id: string
          p_grant_to: string
          p_reason: string
          p_actor_id: string
          p_expires_days?: number
        }
        Returns: string
      }
      revoke_restricted_access: {
        Args: {
          p_grant_id: string
          p_actor_id: string
          p_reason: string
        }
        Returns: void
      }
      access_restricted_complaint: {
        Args: {
          p_complaint_id: string
          p_actor_id: string
          p_actor_type: ActorType
          p_reason: string
        }
        Returns: Array<{
          id: string
          anonymous_id: string
          category: ComplaintCategory
          title: string
          description: string
          location: string | null
          severity: ComplaintSeverity
          status: ComplaintStatus
          visibility: ComplaintVisibility
          priority_score: number
          escalation_level: number
          department_id: string | null
          department_name: string | null
          created_at: string
          updated_at: string
          resolved_at: string | null
          dispute_deadline: string | null
        }>
      }
      add_support: {
        Args: {
          p_complaint_id: string
          p_support_token: string
          p_rate_key: string
        }
        Returns: boolean
      }
      cast_resolution_vote: {
        Args: {
          p_complaint_id: string
          p_vote_token: string
          p_vote_type: VoteType
          p_rate_key: string
        }
        Returns: boolean
      }
    }
  }
}

// Derived types for use across the application
export type PublicComplaint = Database['public']['Views']['public_complaints_feed']['Row']
export type StaffComplaint = Database['public']['Views']['staff_complaint_queue']['Row']
export type College = Database['public']['Tables']['colleges']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type AuditLogEntry = Database['public']['Tables']['audit_log']['Row']
export type StateHistoryEntry = Database['public']['Tables']['complaint_state_history']['Row']
export type AccessGrant = Database['public']['Tables']['restricted_access_grants']['Row']
