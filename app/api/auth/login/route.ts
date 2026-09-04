import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    const envAdminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
    const envAdminPassword = process.env.ADMIN_PASSWORD

    // Check if provided credentials match environment variable admin credentials
    const isAdminEnvMatch = envAdminEmail && envAdminPassword &&
      email.toLowerCase().trim() === envAdminEmail &&
      password === envAdminPassword

    if (isAdminEnvMatch) {
      // Ensure admin user exists in Supabase Auth with admin role metadata
      const { data: usersData } = await adminClient.auth.admin.listUsers()
      const existingUser = usersData?.users?.find(u => u.email?.toLowerCase() === envAdminEmail)

      if (!existingUser) {
        const { error: createError } = await adminClient.auth.admin.createUser({
          email: envAdminEmail,
          password: envAdminPassword,
          email_confirm: true,
          app_metadata: { role: 'admin', verified: true },
        })
        if (createError) {
          console.error('[ADMIN_CREATE_ERROR]', createError.message)
        }
      } else {
        // Synchronize password and role
        await adminClient.auth.admin.updateUserById(existingUser.id, {
          password: envAdminPassword,
          app_metadata: { ...existingUser.app_metadata, role: 'admin', verified: true },
        })
      }
    }

    // Authenticate via Supabase Auth
    const supabase = await createClient()
    let { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // If user does not exist yet, create account and auto-confirm
    if (error && (error.message.includes('Invalid login credentials') || error.message.includes('User not found'))) {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { email_verified: true },
        app_metadata: { role: 'student', verified: true, college_id: process.env.DEFAULT_COLLEGE_ID },
      })
      if (!createError && newUser.user) {
        // Retry sign in
        const retry = await supabase.auth.signInWithPassword({ email, password })
        data = retry.data
        error = retry.error
      }
    }

    if (error || !data.user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
    }

    const role = data.user.app_metadata?.role ?? 'student'

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
      },
      redirectTo: role === 'admin' ? '/compliance' : role === 'staff' ? '/staff' : '/',
    })
  } catch (err) {
    console.error('[AUTH_LOGIN_ERROR]', err)
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again.' }, { status: 500 })
  }
}
