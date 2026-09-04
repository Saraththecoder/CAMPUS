// app/login/page.tsx
// Aegis-7 authentication portal.

import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Shield, Lock, Key } from 'lucide-react'
import LoginForm from './_components/LoginForm'

export const metadata: Metadata = {
  title: 'Portal Access | Aegis-7',
  description: 'Sign in to the Aegis-7 Campus Compliance Portal.',
}

export default function LoginPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Top bar */}
      <header style={{
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-default)',
        height: 52,
        display: 'flex',
        alignItems: 'center',
        padding: '0 2rem',
        gap: '0.5rem',
      }}>
        <img src="/logo.png" alt="Campus Compliance Logo" style={{ width: 20, height: 20, borderRadius: 4, objectFit: 'contain' }} />
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green-bright)', fontFamily: 'var(--font-heading)' }}>
          Campus Compliance
        </span>
      </header>

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem 2rem' }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Icon badge */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{
              width: 56, height: 56,
              borderRadius: 'var(--radius-xl)',
              background: 'var(--green-faint)',
              border: '1px solid var(--green-border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1rem',
              color: 'var(--green-bright)',
            }}>
              <Lock size={24} />
            </div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.375rem' }}>
              Secure Authentication Protocol
            </p>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Portal Access
            </h1>
          </div>

          {/* Form card */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.75rem',
          }}>
            <Suspense fallback={
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', padding: '1rem 0', textAlign: 'center' }}>
                Loading authentication module...
              </div>
            }>
              <LoginForm />
            </Suspense>
          </div>

          {/* Footer link */}
          <div style={{ marginTop: '1.5rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontSize: '0.825rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            <Key size={13} style={{ color: 'var(--green-bright)' }} />
            <span>Have a recovery code?</span>
            <Link href="/recover" style={{ color: 'var(--green-bright)', fontWeight: 700, textDecoration: 'underline', fontSize: '0.825rem' }}>
              Recover report
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-sidebar)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          © 2024 Aegis-7 Security. Session: Encrypted-AES256
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy Policy', 'Compliance Standards', 'Audit Log'].map(l => (
            <Link key={l} href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </div>
  )
}
