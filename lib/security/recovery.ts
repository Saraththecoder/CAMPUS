// lib/security/recovery.ts
// Recovery code generation and hashing.
// Codes are human-readable and treated like passwords.
// NEVER log the plaintext code. NEVER store the plaintext code.

import { hash, compare } from 'bcryptjs'
import { randomInt } from 'crypto'

// Word lists for generating memorable recovery codes
// Using simple, unambiguous words
const ADJECTIVES = [
  'TIGER', 'EAGLE', 'SWIFT', 'BRAVE', 'CORAL', 'LUNAR', 'SOLAR',
  'POLAR', 'AMBER', 'CEDAR', 'DELTA', 'EMBER', 'FROST', 'GRACE',
  'HAVEN', 'IVORY', 'JADE', 'KARMA', 'LUMEN', 'MAPLE'
]

const NOUNS = [
  'CANAL', 'RIDGE', 'STONE', 'CREEK', 'GROVE', 'TRAIL', 'HAVEN',
  'BROOK', 'CLIFF', 'DUNES', 'FJORD', 'GLADE', 'HILLS', 'INLET',
  'KNOLL', 'LAGOON', 'MARSH', 'OASIS', 'PLAIN', 'RIVER'
]

/**
 * Generate a human-readable recovery code in format: WORD-WORD-NNNN
 * Example: TIGER-CANAL-9241
 * 
 * Entropy: 20 * 20 * 9000 = 3,600,000 combinations
 * With rate limiting (10 attempts/day), brute force is impractical.
 */
export function generateRecoveryCode(): string {
  const adj = ADJECTIVES[randomInt(0, ADJECTIVES.length)]
  const noun = NOUNS[randomInt(0, NOUNS.length)]
  const num = randomInt(1000, 9999)
  return `${adj}-${noun}-${num}`
}

/**
 * Hash a recovery code using bcrypt.
 * Cost factor 10 — fast enough for submission, hard enough for brute force.
 * NEVER store the plaintext code.
 */
export async function hashRecoveryCode(code: string): Promise<string> {
  return hash(code, 10)
}

/**
 * Verify a recovery code against its hash.
 * Used server-side only — the DB also does this via crypt().
 */
export async function verifyRecoveryCode(code: string, storedHash: string): Promise<boolean> {
  return compare(code, storedHash)
}
