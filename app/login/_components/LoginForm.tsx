'use client'
// app/login/_components/LoginForm.tsx
// Aegis-7 auth form — student OTP and staff password login.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Mail, Lock, Loader2, ArrowRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'

type Mode = 'student' | 'staff'
type StudentAuthMethod = 'password' | 'otp'

export default function LoginForm() {
  const [mode, setMode] = useState<Mode>('student')
  const [studentMethod, setStudentMethod] = useState<StudentAuthMethod>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [otp, setOtp] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/'
  const supabase = createClient()

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: 'var(--bg-input)',
    border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)',
    padding: '0.625rem 0.875rem 0.625rem 2.5rem',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-body)',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 150ms ease',
  }

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (studentMethod === 'password') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        })
        const data = await res.json()
        if (!res.ok) {
          toast.error(data.error ?? 'Invalid email or password')
          return
        }
        toast.success('Access granted — redirecting...')
        router.push(redirectTo)
        router.refresh()
      } else {
        if (!otpSent) {
          const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })
          if (error) { toast.error(error.message); return }
          setOtpSent(true)
          toast.success('Verification code dispatched to your institutional email')
        } else {
          const { error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' })
          if (error) { toast.error('Invalid or expired code. Please try again.'); return }
          toast.success('Identity verified — redirecting...')
          router.push(redirectTo)
          router.refresh()
        }
      }
    } catch {
      toast.error('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStaffLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Invalid credentials')
        return
      }
      toast.success('Access granted — redirecting...')
      router.push(data.redirectTo ?? (redirectTo === '/' ? '/staff' : redirectTo))
      router.refresh()
    } catch {
      toast.error('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '0.5rem',
    background: active ? 'var(--green-faint)' : 'transparent',
    color: active ? 'var(--green-bright)' : 'var(--text-muted)',
    border: 'none',
    borderRadius: 'var(--radius-md)',
    cursor: 'pointer',
    fontFamily: 'var(--font-mono)',
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'all 150ms ease',
  })

  return (
    <div>
      {/* Mode toggle */}
      <div style={{
        display: 'flex',
        background: 'var(--bg-input)',
        borderRadius: 'var(--radius-md)',
        padding: 3,
        marginBottom: '1.25rem',
        gap: 3,
      }} role="tablist" aria-label="Login type">
        {(['student', 'staff'] as Mode[]).map(m => (
          <button
            key={m}
            role="tab"
            aria-selected={mode === m}
            onClick={() => { setMode(m); setOtpSent(false); setEmail(''); setPassword('') }}
            style={tabStyle(mode === m)}
          >
            {m === 'student' ? 'Student Portal' : 'Staff / Admin'}
          </button>
        ))}
      </div>

      {mode === 'student' ? (
        <form onSubmit={handleStudentLogin} aria-label="Student login form">
          {/* Sub-method toggle for Student */}
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => { setStudentMethod('password'); setOtpSent(false) }}
              style={{
                flex: 1,
                padding: '0.4rem',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${studentMethod === 'password' ? 'var(--green-bright)' : 'var(--border-default)'}`,
                background: studentMethod === 'password' ? 'var(--green-faint)' : 'transparent',
                color: studentMethod === 'password' ? 'var(--green-bright)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Password Login
            </button>
            <button
              type="button"
              onClick={() => setStudentMethod('otp')}
              style={{
                flex: 1,
                padding: '0.4rem',
                fontSize: '0.72rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: `1px solid ${studentMethod === 'otp' ? 'var(--green-bright)' : 'var(--border-default)'}`,
                background: studentMethod === 'otp' ? 'var(--green-faint)' : 'transparent',
                color: studentMethod === 'otp' ? 'var(--green-bright)' : 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              Email OTP Code
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="student-email" className="form-label">Institutional Email</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
              <input
                id="student-email"
                type="email"
                style={inputStyle}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@campus.edu"
                required
                disabled={otpSent || loading}
                autoComplete="email"
              />
            </div>
          </div>

          {studentMethod === 'password' ? (
            <div className="form-group">
              <label htmlFor="student-password" className="form-label">Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
                <input
                  id="student-password"
                  type="password"
                  style={inputStyle}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
            </div>
          ) : (
            otpSent && (
              <div className="form-group">
                <label htmlFor="otp-code" className="form-label">Verification Code</label>
                <input
                  id="otp-code"
                  type="text"
                  style={{ ...inputStyle, paddingLeft: '0.875rem', letterSpacing: '0.25em', textAlign: 'center', fontSize: '1.25rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-bright)' }}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="_ _ _ _ _ _"
                  required
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  maxLength={6}
                />
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.375rem' }}>
                  Check your institutional email for a 6-digit code.{' '}
                  <button type="button" onClick={() => setOtpSent(false)} style={{ color: 'var(--green-bright)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 'inherit', fontFamily: 'inherit' }}>
                    Wrong email?
                  </button>
                </p>
              </div>
            )
          )}

          <button
            type="submit"
            className="btn btn-terminal btn-full"
            disabled={loading || !email || (studentMethod === 'password' && !password)}
            style={{ marginTop: '0.5rem' }}
          >
            {loading
              ? <><Loader2 size={14} className="btn-loading" /> Processing...</>
              : studentMethod === 'password'
                ? <><ArrowRight size={14} /> Sign In</>
                : otpSent
                  ? <><ArrowRight size={14} /> Verify & Access</>
                  : <><Mail size={14} /> Dispatch Verification Code</>
            }
          </button>
        </form>
      ) : (
        <form onSubmit={handleStaffLogin} aria-label="Staff login form">
          <div className="form-group">
            <label htmlFor="staff-email" className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
              <input
                id="staff-email"
                type="email"
                style={inputStyle}
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="staff@campus.edu"
                required
                disabled={loading}
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="staff-password" className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} aria-hidden="true" />
              <input
                id="staff-password"
                type="password"
                style={inputStyle}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••"
                required
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-terminal btn-full"
            disabled={loading || !email || !password}
          >
            {loading
              ? <><Loader2 size={14} className="btn-loading" /> Authenticating...</>
              : <><ArrowRight size={14} /> Access Portal</>
            }
          </button>
        </form>
      )}
    </div>
  )
}
