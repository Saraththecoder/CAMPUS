// app/unauthorized/page.tsx
import Link from 'next/link'
import type { Metadata } from 'next'
import { ShieldX } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Unauthorized',
  description: 'You do not have permission to access this page.',
}

export default function UnauthorizedPage() {
  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: 'var(--space-8)' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{
          width: 64, height: 64, borderRadius: '50%', background: 'var(--color-danger-50)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto var(--space-4)', color: 'var(--color-danger-600)'
        }} aria-hidden="true">
          <ShieldX size={30} />
        </div>
        <h1 style={{ fontSize: '1.5rem', marginBottom: 'var(--space-3)' }}>Access Denied</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          You do not have permission to access this page. If you believe this is an error, please contact your administrator.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn btn-secondary">Go Home</Link>
          <Link href="/login" className="btn btn-primary">Sign In</Link>
        </div>
      </div>
    </main>
  )
}
