-- Migration 001: Enable required extensions
-- pgcrypto: cryptographic functions (gen_random_uuid, crypt, gen_salt, hmac)
-- pg_trgm: trigram similarity for duplicate complaint detection

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
