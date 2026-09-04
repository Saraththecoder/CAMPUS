// lib/supabase/admin.ts
// Service-role Supabase client for privileged server-side operations.
// NEVER import this in client components or expose to the browser.
// Used ONLY in API routes and server actions for sensitive operations.

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Validate that we're on the server
if (typeof window !== 'undefined') {
  throw new Error('lib/supabase/admin.ts must only be used on the server')
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'

if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('Warning: Missing Supabase service role environment variables during build.')
}

// Singleton admin client — bypasses RLS
// All authorization must be handled explicitly in the calling code
export const adminClient = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
