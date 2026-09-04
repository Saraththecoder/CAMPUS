// __tests__/security/hmac-isolation.test.ts
// Tests for HMAC identity isolation — verifies that different salts
// produce uncorrelated hashes, preventing cross-table identity correlation.

import { deriveIdentityHash, deriveSubmitterHash, deriveSupportToken, deriveVoteToken } from '@/lib/security/hmac'

// Set test secrets (in production these are from environment variables)
beforeAll(() => {
  process.env.HMAC_SECRET = 'test-hmac-secret-32-chars-minimum!!'
  process.env.COMPLAINT_SALT = 'test-complaint-salt-32-chars-min!!'
  process.env.SUPPORT_SALT = 'test-support-salt-32-chars-min!!!'
  process.env.VOTE_SALT = 'test-vote-salt-32-chars-minimum!!!!'
  process.env.RATELIMIT_SALT = 'test-rate-limit-salt-32-chars-min!!'
  process.env.COLLEGE_DOMAIN = 'campus.edu'
})

describe('HMAC identity isolation', () => {
  const email = 'student@campus.edu'

  test('identity hash and submitter hash are different for the same email', () => {
    const identityHash = deriveIdentityHash(email)
    const submitterHash = deriveSubmitterHash(email)
    expect(identityHash).not.toBe(submitterHash)
    expect(identityHash).toHaveLength(64)  // hex-encoded sha256
    expect(submitterHash).toHaveLength(64)
  })

  test('identity hash is deterministic (same input → same output)', () => {
    const hash1 = deriveIdentityHash(email)
    const hash2 = deriveIdentityHash(email)
    expect(hash1).toBe(hash2)
  })

  test('submitter hash is deterministic', () => {
    const hash1 = deriveSubmitterHash(email)
    const hash2 = deriveSubmitterHash(email)
    expect(hash1).toBe(hash2)
  })

  test('different emails produce different hashes', () => {
    const hash1 = deriveSubmitterHash('alice@campus.edu')
    const hash2 = deriveSubmitterHash('bob@campus.edu')
    expect(hash1).not.toBe(hash2)
  })

  test('support token is complaint-specific', () => {
    const submitterHash = deriveSubmitterHash(email)
    const complaintId1 = '00000000-0000-0000-0000-000000000001'
    const complaintId2 = '00000000-0000-0000-0000-000000000002'
    const token1 = deriveSupportToken(submitterHash, complaintId1)
    const token2 = deriveSupportToken(submitterHash, complaintId2)
    expect(token1).not.toBe(token2)
  })

  test('support token is different from vote token for same inputs', () => {
    const submitterHash = deriveSubmitterHash(email)
    const complaintId = '00000000-0000-0000-0000-000000000001'
    const supportToken = deriveSupportToken(submitterHash, complaintId)
    const voteToken = deriveVoteToken(submitterHash, complaintId)
    expect(supportToken).not.toBe(voteToken)
  })

  test('email is case-insensitive for hashing', () => {
    const hash1 = deriveSubmitterHash('STUDENT@CAMPUS.EDU')
    const hash2 = deriveSubmitterHash('student@campus.edu')
    expect(hash1).toBe(hash2)
  })

  test('identity hash is NOT equal to any salt-derived token (no correlation)', () => {
    const identityHash = deriveIdentityHash(email)
    const submitterHash = deriveSubmitterHash(email)
    const complaintId = '00000000-0000-0000-0000-000000000001'
    const supportToken = deriveSupportToken(submitterHash, complaintId)
    const voteToken = deriveVoteToken(submitterHash, complaintId)

    // None of these should be equal to each other
    const hashes = [identityHash, submitterHash, supportToken, voteToken]
    const uniqueHashes = new Set(hashes)
    expect(uniqueHashes.size).toBe(4)
  })
})

describe('Recovery code properties', () => {
  const { generateRecoveryCode, hashRecoveryCode, verifyRecoveryCode } = require('@/lib/security/recovery')

  test('recovery code has correct format', () => {
    const code = generateRecoveryCode()
    expect(code).toMatch(/^[A-Z]+-[A-Z]+-\d{4}$/)
  })

  test('recovery codes are unique', () => {
    const codes = new Set(Array.from({ length: 100 }, () => generateRecoveryCode()))
    // Should be very unlikely to collide in 100 draws from 3.6M combinations
    expect(codes.size).toBeGreaterThan(90)
  })

  test('bcrypt hash and verify roundtrip works', async () => {
    const code = 'TIGER-CANAL-9241'
    const hash = await hashRecoveryCode(code)
    expect(hash).not.toBe(code)
    expect(hash).toMatch(/^\$2a\$/)
    const valid = await verifyRecoveryCode(code, hash)
    expect(valid).toBe(true)
    const invalid = await verifyRecoveryCode('WRONG-CODE-0000', hash)
    expect(invalid).toBe(false)
  })
})
