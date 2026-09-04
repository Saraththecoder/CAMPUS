# Deployment & Production Configuration Guide

This guide outlines the steps required to deploy the **Campus Compliance Portal** to a production environment using Next.js on Vercel and a managed Supabase database.

---

## Production Checklist

1. [ ] **Supabase Extensions**: Enable `pgcrypto`, `pg_trgm`, and `pg_cron`.
2. [ ] **Supabase Migrations**: Run all migration files (`001` through `009`) against the production DB.
3. [ ] **Storage Buckets**: Configure `evidence-public` and `evidence-restricted` buckets.
4. [ ] **Production Salts**: Generate unique random 64-character secrets for all HMAC operations.
5. [ ] **Resend integration**: Configure domain authentication and set the API key.
6. [ ] **Environment variables**: Verify all required environment variables are set in Vercel.

---

## 1. Database Deployment (Supabase)

### Step A: Initialize Production Project
Create a new project in the Supabase Dashboard. Note your connection string and API credentials.

### Step B: Enable Extensions
Enable the required database extensions before running migrations:
1. Navigate to **Database** → **Extensions**.
2. Find and enable:
   - `pgcrypto`
   - `pg_trgm` (for fuzzy duplicate checking)
   - `pg_cron` (for automated escalations)

### Step C: Apply Migrations
Use the Supabase CLI to apply migrations to your production database:
```bash
npx supabase db push --db-url "postgres://postgres:[YOUR-PASSWORD]@[YOUR-DB-HOST]:5432/postgres"
```

---

## 2. Storage Bucket Setup

Create two separate storage buckets in Supabase Storage with the following configurations:

1. **`evidence-public`**
   - Public access: **No** (Direct access disabled)
   - Allow uploading: Handled via signed upload URLs.
   - Purpose: Evidence for public category complaints.

2. **`evidence-restricted`**
   - Public access: **No**
   - Allow uploading: Handled via signed upload URLs.
   - Purpose: Evidence for sensitive categories (conduct, safety, etc.).

---

## 3. Server Deployment (Vercel)

### Step A: Import to Vercel
1. Link your git repository to Vercel.
2. Select **Next.js** as the framework preset.

### Step B: Environment Variables
Add the following production environment variables in the Vercel project settings:

| Variable | Description | Example / Recommended |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase API URL | `https://xyz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key | Get from Supabase API tab |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key | Keep secret! Decrypts RLS. |
| `HMAC_SECRET` | Salt for identity vault | Hex string (64 characters) |
| `COMPLAINT_SALT` | Salt for submitter hashes | Hex string (64 characters) |
| `SUPPORT_SALT` | Salt for support tokens | Hex string (64 characters) |
| `VOTE_SALT` | Salt for vote tokens | Hex string (64 characters) |
| `RATELIMIT_SALT` | Salt for rate limits | Hex string (64 characters) |
| `NEXT_PUBLIC_APP_URL` | Production domain url | `https://compliance.campus.edu` |
| `COLLEGE_DOMAIN` | Institutional email domain | `campus.edu` |
| `DEFAULT_COLLEGE_ID` | Default college UUID | Set to the UUID in `colleges` table |
| `RESEND_API_KEY` | Resend API key | `re_123456789...` |
| `RESEND_FROM_EMAIL` | Verified sender email | `noreply@compliance.campus.edu` |
| `MAX_EVIDENCE_SIZE_BYTES` | Max file size in bytes | `10485760` (10MB) |
| `MAX_EVIDENCE_FILES` | Max files per complaint | `3` |

---

## 4. Cron & Webhook Configurations

### Step A: pg_cron Jobs
The local migrations automatically schedule two cron jobs:
- `campus-escalation-check` (runs hourly to check for neglected complaints)
- `campus-dispute-check` (runs hourly to resolve closed dispute windows)

Verify they are listed in your production instance by querying the cron schema:
```sql
SELECT * FROM cron.job;
```

### Step B: Custom Webhooks (Optional)
If you want real-time email dispatch on escalations (instead of pulling), configure a Supabase Database Webhook:
1. Navigate to **Database** → **Webhooks** → **Create Webhook**.
2. Name: `escalation-email-notification`
3. Table: `escalation_log`
4. Event: `INSERT`
5. Target: Select HTTP Request and send payload to your Next.js route `/api/webhooks/escalate` (secured via secret verification token).
