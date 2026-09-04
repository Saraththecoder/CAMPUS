// lib/security/hmac.ts
// Server-side HMAC utilities for identity isolation.
// NEVER import in client components.
// 
// Architecture:
//   identity_vault uses: HMAC(email, HMAC_SECRET)
//   complaints.submitter_hash uses: HMAC(email, COMPLAINT_SALT)  ← different salt
//   supports uses: HMAC(submitter_hash + complaint_id, SUPPORT_SALT)
//   rate_limits uses: HMAC(identity_key, RATELIMIT_SALT)
//
// Using different salts for each purpose ensures that even if two hashes
// are compared, they cannot be correlated across tables.

import { createHmac } from 'crypto'

function getSecret(envKey: string): string {
  const secret = process.env[envKey]
  if (!secret) {
    throw new Error(`Missing required secret: ${envKey}`)
  }
  return secret
}

/**
 * Derive the identity vault email hash.
 * HMAC(email, HMAC_SECRET) — used to identify a returning user.
 * NEVER store this in complaints.
 */
export function deriveIdentityHash(email: string): string {
  const secret = getSecret('HMAC_SECRET')
  return createHmac('sha256', secret)
    .update(email.toLowerCase().trim())
    .digest('hex')
}

/**
 * Derive the complaint submitter hash.
 * HMAC(email, COMPLAINT_SALT) — different from identity hash.
 * Stored in complaints.submitter_hash.
 * Cannot be correlated with identity_vault.email_hash without knowing BOTH secrets.
 */
export function deriveSubmitterHash(email: string): string {
  const salt = getSecret('COMPLAINT_SALT')
  return createHmac('sha256', salt)
    .update(email.toLowerCase().trim())
    .digest('hex')
}

/**
 * Derive a support token.
 * HMAC(submitterHash + ':' + complaintId, SUPPORT_SALT)
 * Deterministic: same user supporting same complaint always gives same token.
 */
export function deriveSupportToken(submitterHash: string, complaintId: string): string {
  const salt = getSecret('SUPPORT_SALT')
  return createHmac('sha256', salt)
    .update(`${submitterHash}:${complaintId}`)
    .digest('hex')
}

/**
 * Derive a resolution vote token.
 * HMAC(submitterHash + ':' + complaintId, VOTE_SALT)
 */
export function deriveVoteToken(submitterHash: string, complaintId: string): string {
  const salt = getSecret('VOTE_SALT')
  return createHmac('sha256', salt)
    .update(`${submitterHash}:${complaintId}`)
    .digest('hex')
}

/**
 * Derive a rate-limit identity key.
 * HMAC(identityKey, RATELIMIT_SALT) — used to bucket rate limits without exposing identity.
 */
export function deriveRateLimitKey(identityKey: string, action: string): string {
  const salt = getSecret('RATELIMIT_SALT')
  return createHmac('sha256', salt)
    .update(`${identityKey}:${action}`)
    .digest('hex')
}

/**
 * Validate that an email belongs to the configured institutional domain.
 */
export function validateInstitutionalEmail(email: string): boolean {
  const domain = process.env.COLLEGE_DOMAIN
  if (!domain) {
    throw new Error('COLLEGE_DOMAIN environment variable is not set')
  }
  return email.toLowerCase().trim().endsWith(`@${domain.toLowerCase()}`)
}
