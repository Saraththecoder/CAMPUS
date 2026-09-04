# Security Policy & Cryptographic Architecture

## Security Policy

We take the security and confidentiality of campus compliance portal submissions extremely seriously. If you discover a vulnerability, please report it to our security team immediately at `security@campus.edu`. Do not file a public issue. We aim to respond within 24 hours and resolve any verified vulnerabilities within 7 days.

---

## Cryptographic Design & Identity Isolation

This system is architected to guarantee absolute anonymity for student submitters, even if the database is fully compromised.

```
                  +--------------------------------+
                  |         Student Email          |
                  +---------------+----------------+
                                  |
            +---------------------+---------------------+
            |                                           |
            v                                           v
  HMAC(email, HMAC_SECRET)                    HMAC(email, COMPLAINT_SALT)
            |                                           |
            v                                           v
  +---------+--------+                       +----------+---------+
  |  identity_vault  |                       | complaints.        |
  |  (Email Hash)    |                       | submitter_hash     |
  +---------+--------+                       +----------+---------+
            |                                           |
            v                                           +-------------+
        User ID                                         |             |
                                                        v             v
                                                     Support        Vote
                                                      Token         Token
```

### 1. Dual-Salt HMAC Strategy
To prevent correlating entries in the public `complaints` table with rows in the private `identity_vault` (used to record who verified their institutional email), the system derives two completely different hashes from a student's email using separate salts:
- **Identity Hash**: `HMAC_SHA256(email, HMAC_SECRET)`. Stored only in `identity_vault.email_hash`.
- **Submitter Hash**: `HMAC_SHA256(email, COMPLAINT_SALT)`. Stored in `complaints.submitter_hash`.

Because `HMAC_SECRET` and `COMPLAINT_SALT` are distinct and kept secure on the server, a database leak will reveal two lists of hashes that cannot be mathematically linked without brute-forcing the HMAC secrets.

### 2. Action Token Derivation
To support or vote on complaints without exposing who did so, we derive deterministic tokens that allow only one support/vote action per user per complaint:
- **Support Token**: `HMAC_SHA256(submitter_hash + ':' + complaint_id, SUPPORT_SALT)`
- **Vote Token**: `HMAC_SHA256(submitter_hash + ':' + complaint_id, VOTE_SALT)`

This ensures the support/vote count is mathematically deduplicated per complaint, without storing a connection between the voter's identity and the vote.

### 3. Recovery Code Hashing
Plaintext recovery codes (`WORD-WORD-NNNN` format) are generated on the server and returned to the client **exactly once** upon submission.
- The server stores only the **bcrypt hash** of the code (`recovery_hash` with cost factor 10).
- When a student looks up a complaint, the code is sent to the server, hashed, and compared. Rate limiting (10 attempts per IP/bucket per day) prevents brute forcing the 3.6 million combinations.
- Recovery codes are never logged in any application or server logs.

---

## Access Control & Row-Level Security (RLS)

All tables have RLS enabled. Frontend route guards are treated only as a UX convenience.

- **`identity_vault`**: Locked down completely. Zero read/write access for anon or authenticated roles. Only `service_role` can query it.
- **`audit_log`**: Read-only for `compliance` and `admin` roles. Write access is revoked entirely for all standard roles.
- **`complaints`**:
  - `SELECT`: Anyone can view `visibility = 'public'` complaints. Only `staff` from the assigned department or users with active `restricted_access_grants` can view `visibility = 'restricted'` complaints. `compliance` and `admin` can view all.
  - `INSERT` / `UPDATE`: Denied for everyone. All writes go through `SECURITY DEFINER` database functions.

---

## Audit Trail Immutability

The `audit_log` is protected by database triggers and RLS:
1. **Append-Only**: Direct inserts are blocked. System changes must call the `create_audit_record()` database function.
2. **Immutable Entries**: Database triggers block updates or deletes on any audit log entry.
3. **Audit of Access**: Every lookup of a restricted complaint through the break-glass interface immediately inserts a record into the audit log before returning the data.
