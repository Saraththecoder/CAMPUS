// app/error.tsx
'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log the error (in production, send to error monitoring service)
    console.error('[UNHANDLED ERROR]', error.digest ?? error.message)
  }, [error])

  return (
    <main id="main-content" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page)', padding: 'var(--space-8)' }}>
      <div style={{ textAlign: 'center', maxWidth: '380px' }}>
        <p style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⚠️</p>
        <h1 style={{ fontSize: '1.375rem', marginBottom: 'var(--space-3)' }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
          An unexpected error occurred. Please try again.
          {error.digest && (
            <span style={{ display: 'block', marginTop: 'var(--space-2)', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="btn btn-primary">Try Again</button>
          <Link href="/" className="btn btn-secondary">Go Home</Link>
        </div>
      </div>
    </main>
  )
}
