// app/not-found.tsx
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: '404 — Not Found' }

export default function NotFound() {
  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: 'var(--space-8)' }}>
      <div style={{ textAlign: 'center', maxWidth: '380px' }}>
        <p style={{ fontSize: '5rem', fontWeight: 800, color: 'var(--color-neutral-200)', lineHeight: 1 }}>404</p>
        <h1 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-3)', marginTop: 'var(--space-2)' }}>Page Not Found</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link href="/" className="btn btn-secondary">Go Home</Link>
          <Link href="/complaints" className="btn btn-primary">View Complaints</Link>
        </div>
      </div>
    </main>
  )
}
