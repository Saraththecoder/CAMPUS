// __tests__/security/rls-boundaries.test.ts
// Automated security boundary tests for RLS and API authorization.
// 
// Prerequisites:
//   - Supabase local dev running: supabase start
//   - Migrations applied: supabase db reset
//   - TEST_* env vars set in .env.test.local
//
// Run: npx jest __tests__/security/rls-boundaries.test.ts

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://localhost:54321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// Test user credentials (created via supabase test fixtures)
const TEST_STUDENT_TOKEN = process.env.TEST_STUDENT_TOKEN ?? ''
const TEST_STAFF_TOKEN = process.env.TEST_STAFF_TOKEN ?? ''
const TEST_COMPLIANCE_TOKEN = process.env.TEST_COMPLIANCE_TOKEN ?? ''

function createAnonClient() {
  return createClient<Database>(SUPABASE_URL, ANON_KEY)
}

function createUserClient(token: string) {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY)
  // Set the JWT session directly
  client.auth.setSession({ access_token: token, refresh_token: '' })
  return client
}

function createAdminClient() {
  if (!SERVICE_KEY) return null as any
  return createClient<Database>(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

if (!ANON_KEY || !SERVICE_KEY) {
  describe('RLS: boundaries (skipped)', () => {
    test('skipped: Supabase credentials not set in environment', () => {
      console.warn('Skipping RLS tests because ANON_KEY or SERVICE_KEY is not set')
    })
  })
} else {

// ============================================================
// TEST SUITE: Identity Vault Isolation
// ============================================================
describe('RLS: identity_vault', () => {
  test('anonymous client cannot read identity_vault', async () => {
    const client = createAnonClient()
    const { data, error } = await client.from('identity_vault').select('*').limit(1)
    // Either an error is thrown, or data is empty (restrictive policy returns 0 rows)
    expect(error?.code === 'PGRST116' || data?.length === 0).toBe(true)
  })

  test('student user cannot read identity_vault', async () => {
    if (!TEST_STUDENT_TOKEN) {
      console.warn('TEST_STUDENT_TOKEN not set — skipping')
      return
    }
    const client = createUserClient(TEST_STUDENT_TOKEN)
    const { data } = await client.from('identity_vault').select('*').limit(1)
    expect(data?.length ?? 0).toBe(0)
  })

  test('staff user cannot read identity_vault', async () => {
    if (!TEST_STAFF_TOKEN) {
      console.warn('TEST_STAFF_TOKEN not set — skipping')
      return
    }
    const client = createUserClient(TEST_STAFF_TOKEN)
    const { data } = await client.from('identity_vault').select('*').limit(1)
    expect(data?.length ?? 0).toBe(0)
  })

  test('identity_vault is inaccessible even for compliance role', async () => {
    if (!TEST_COMPLIANCE_TOKEN) {
      console.warn('TEST_COMPLIANCE_TOKEN not set — skipping')
      return
    }
    const client = createUserClient(TEST_COMPLIANCE_TOKEN)
    const { data } = await client.from('identity_vault').select('*').limit(1)
    expect(data?.length ?? 0).toBe(0)
  })
})

// ============================================================
// TEST SUITE: Complaints Table
// ============================================================
describe('RLS: complaints table', () => {
  let testComplaintId: string | null = null
  let restrictedComplaintId: string | null = null
  const adminClient = createAdminClient()

  beforeAll(async () => {
    if (!adminClient) return
    // Get first public complaint from seed data
    const { data: publicC } = await adminClient
      .from('complaints')
      .select('id')
      .eq('visibility', 'public')
      .limit(1)
    testComplaintId = publicC?.[0]?.id ?? null

    // Get first restricted complaint
    const { data: restrictedC } = await adminClient
      .from('complaints')
      .select('id')
      .eq('visibility', 'restricted')
      .limit(1)
    restrictedComplaintId = restrictedC?.[0]?.id ?? null
  })

  test('anonymous client can read public complaints', async () => {
    const client = createAnonClient()
    const { data, error } = await client.from('complaints').select('id, visibility').limit(10)
    expect(error).toBeNull()
    // All returned complaints must be public
    data?.forEach(c => expect(c.visibility).toBe('public'))
  })

  test('anonymous client cannot see restricted complaints', async () => {
    if (!restrictedComplaintId) return
    const client = createAnonClient()
    const { data } = await client
      .from('complaints')
      .select('id')
      .eq('id', restrictedComplaintId)
    expect(data?.length ?? 0).toBe(0)
  })

  test('anonymous client cannot INSERT directly into complaints', async () => {
    const client = createAnonClient()
    const { error } = await client.from('complaints').insert({
      category: 'infrastructure',
      title: 'test',
      description: 'test insert',
      severity: 'low',
      submitter_hash: 'test_hash',
      recovery_hash: 'test_hash',
      college_id: '00000000-0000-0000-0000-000000000001',
    } as any)
    expect(error).toBeTruthy()
  })

  test('student cannot UPDATE complaint directly', async () => {
    if (!testComplaintId || !TEST_STUDENT_TOKEN) return
    const client = createUserClient(TEST_STUDENT_TOKEN)
    const { error } = await client
      .from('complaints')
      .update({ status: 'closed' } as any)
      .eq('id', testComplaintId)
    expect(error).toBeTruthy()
  })

  test('staff cannot UPDATE complaint directly (must use SECURITY DEFINER function)', async () => {
    if (!testComplaintId || !TEST_STAFF_TOKEN) return
    const client = createUserClient(TEST_STAFF_TOKEN)
    const { error } = await client
      .from('complaints')
      .update({ status: 'closed' } as any)
      .eq('id', testComplaintId)
    expect(error).toBeTruthy()
  })

  test('no one can DELETE a complaint', async () => {
    if (!testComplaintId || !TEST_COMPLIANCE_TOKEN) return
    const client = createUserClient(TEST_COMPLIANCE_TOKEN)
    const { error } = await client
      .from('complaints')
      .delete()
      .eq('id', testComplaintId)
    expect(error).toBeTruthy()
  })
})

// ============================================================
// TEST SUITE: Audit Log Immutability
// ============================================================
describe('RLS: audit_log immutability', () => {
  const adminClient = createAdminClient()

  test('authenticated user cannot INSERT into audit_log directly', async () => {
    if (!TEST_STAFF_TOKEN) return
    const client = createUserClient(TEST_STAFF_TOKEN)
    const { error } = await client.from('audit_log').insert({
      actor_type: 'staff',
      action: 'status_change',
      target_table: 'complaints',
    } as any)
    expect(error).toBeTruthy()
  })

  test('authenticated user cannot UPDATE audit_log entries', async () => {
    if (!TEST_COMPLIANCE_TOKEN) return
    // First, get an audit log entry
    const { data: entries } = await adminClient.from('audit_log').select('id').limit(1)
    if (!entries?.[0]) return

    const client = createUserClient(TEST_COMPLIANCE_TOKEN)
    const { error } = await client
      .from('audit_log')
      .update({ reason: 'tampered' } as any)
      .eq('id', entries[0].id)
    expect(error).toBeTruthy()
  })

  test('no one can DELETE audit_log entries', async () => {
    if (!TEST_COMPLIANCE_TOKEN) return
    const client = createUserClient(TEST_COMPLIANCE_TOKEN)
    const { error } = await client.from('audit_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    expect(error).toBeTruthy()
  })

  test('compliance user can READ audit_log', async () => {
    if (!TEST_COMPLIANCE_TOKEN) return
    const client = createUserClient(TEST_COMPLIANCE_TOKEN)
    const { error } = await client.from('audit_log').select('id, action, actor_type').limit(5)
    expect(error).toBeNull()
  })

  test('staff user cannot READ audit_log', async () => {
    if (!TEST_STAFF_TOKEN) return
    const client = createUserClient(TEST_STAFF_TOKEN)
    const { data } = await client.from('audit_log').select('id').limit(5)
    // Either error or empty — staff cannot read audit log
    expect(data?.length ?? 0).toBe(0)
  })
})

// ============================================================
// TEST SUITE: Rate Limiting
// ============================================================
describe('RLS: rate_limits table', () => {
  test('anonymous cannot read rate_limits table', async () => {
    const client = createAnonClient()
    const { data } = await client.from('rate_limits').select('*').limit(5)
    expect(data?.length ?? 0).toBe(0)
  })

  test('student cannot read rate_limits table', async () => {
    if (!TEST_STUDENT_TOKEN) return
    const client = createUserClient(TEST_STUDENT_TOKEN)
    const { data } = await client.from('rate_limits').select('*').limit(5)
    expect(data?.length ?? 0).toBe(0)
  })
})

// ============================================================
// TEST SUITE: Supports — No Individual Record Access
// ============================================================
describe('RLS: supports table', () => {
  test('anonymous cannot read supports individual records', async () => {
    const client = createAnonClient()
    const { data } = await client.from('supports').select('*').limit(5)
    expect(data?.length ?? 0).toBe(0)
  })

  test('aggregate count view is readable', async () => {
    const client = createAnonClient()
    const { data, error } = await client.from('complaint_support_counts').select('*').limit(5)
    expect(error).toBeNull()
    // Public aggregate is accessible
    expect(Array.isArray(data)).toBe(true)
  })
})

// ============================================================
// TEST SUITE: Restricted Complaint Access
// ============================================================
describe('RLS: restricted complaints access control', () => {
  let restrictedComplaintId: string | null = null
  const adminClient = createAdminClient()

  beforeAll(async () => {
    const { data } = await adminClient
      .from('complaints')
      .select('id')
      .eq('visibility', 'restricted')
      .limit(1)
    restrictedComplaintId = data?.[0]?.id ?? null
  })

  test('student cannot access restricted complaint directly', async () => {
    if (!restrictedComplaintId || !TEST_STUDENT_TOKEN) return
    const client = createUserClient(TEST_STUDENT_TOKEN)
    const { data } = await client
      .from('complaints')
      .select('id, visibility')
      .eq('id', restrictedComplaintId)
    expect(data?.length ?? 0).toBe(0)
  })

  test('restricted complaint is not in public_complaints_feed view', async () => {
    if (!restrictedComplaintId) return
    const client = createAnonClient()
    const { data } = await client
      .from('public_complaints_feed')
      .select('id')
      .eq('id', restrictedComplaintId)
    expect(data?.length ?? 0).toBe(0)
  })
})

// ============================================================
// TEST SUITE: Colleges and Departments
// ============================================================
describe('RLS: public tables', () => {
  test('anyone can read colleges', async () => {
    const client = createAnonClient()
    const { data, error } = await client.from('colleges').select('id, name, domain')
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })

  test('anyone can read departments', async () => {
    const client = createAnonClient()
    const { data, error } = await client.from('departments').select('id, name')
    expect(error).toBeNull()
    expect(Array.isArray(data)).toBe(true)
  })
})
}
