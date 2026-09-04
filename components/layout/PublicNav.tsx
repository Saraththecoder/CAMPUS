'use client'
// components/layout/PublicNav.tsx
// Aegis-7 dark topbar for public-facing pages with mobile drawer & real-time auth sync.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Bell, Menu, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export default function PublicNav() {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<string>('student')
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setRole(data.user?.app_metadata?.role ?? 'student')
      setLoading(false)
    })

    // Listen for real-time auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setRole(currentUser?.app_metadata?.role ?? 'student')
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Close mobile menu on page navigation
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    router.push('/login')
    router.refresh()
  }

  const staffRoute = role === 'admin' ? '/admin'
    : role === 'compliance' ? '/compliance'
    : '/staff'

  return (
    <header className="aegis-topbar" role="banner">
      {/* Logo */}
      <Link href="/" className="aegis-topbar-logo" aria-label="Campus Compliance home">
        <img src="/logo.png" alt="Campus Compliance Logo" style={{ width: 24, height: 24, borderRadius: 4, objectFit: 'contain' }} />
        <span>Campus Compliance</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="desktop-nav" aria-label="Main navigation">
        <ul style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', listStyle: 'none', margin: 0, padding: 0 }}>
          {user && ['staff', 'compliance', 'admin'].includes(role) ? (
            <>
              <li><Link href={staffRoute} className={`aegis-topbar-link ${pathname === staffRoute ? 'active' : ''}`}>Dashboard</Link></li>
              <li><Link href="/complaints" className={`aegis-topbar-link ${pathname === '/complaints' ? 'active' : ''}`}>Issue Feed</Link></li>
              <li><Link href="/staff/queue" className={`aegis-topbar-link ${pathname === '/staff/queue' ? 'active' : ''}`}>Triage Queue</Link></li>
              {['compliance', 'admin'].includes(role) && (
                <li><Link href="/compliance" className={`aegis-topbar-link ${pathname === '/compliance' ? 'active' : ''}`}>Secure Vault</Link></li>
              )}
            </>
          ) : (
            <>
              <li><Link href="/complaints" className={`aegis-topbar-link ${pathname === '/complaints' ? 'active' : ''}`}>Issue Feed</Link></li>
              <li><Link href="/complaints/new" className={`aegis-topbar-link ${pathname === '/complaints/new' ? 'active' : ''}`}>Submit Report</Link></li>
              <li><Link href="/recover" className={`aegis-topbar-link ${pathname === '/recover' ? 'active' : ''}`}>Recover Status</Link></li>
            </>
          )}
        </ul>
      </nav>

      {/* Right actions */}
      <div className="aegis-topbar-actions">
        <button
          aria-label="Search"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.375rem' }}
        >
          <Search size={17} />
        </button>
        <button
          aria-label="Notifications"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '0.375rem' }}
        >
          <Bell size={17} />
        </button>

        {!loading && (
          user ? (
            <div className="user-profile-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--green-bright)',
                background: 'var(--green-faint)',
                border: '1px solid var(--green-border)',
                padding: '0.2rem 0.5rem',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                maxWidth: '160px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {user.email}
              </span>
              <button
                type="button"
                onClick={handleSignOut}
                className="btn btn-ghost btn-sm"
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '0.25rem 0.4rem',
                }}
                aria-label="Sign out"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              style={{
                padding: '0.35rem 0.875rem',
                background: 'var(--green-bright)',
                color: '#0c0e0d',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8rem',
                fontWeight: 700,
                fontFamily: 'var(--font-mono)',
                textDecoration: 'none',
                letterSpacing: '0.03em',
              }}
            >
              LOGIN
            </Link>
          )
        )}

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="mobile-menu-toggle"
          aria-label="Toggle navigation menu"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.375rem',
            display: 'none',
          }}
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <nav
          className="mobile-drawer animate-fade-down"
          style={{
            position: 'fixed',
            top: '54px',
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-default)',
            padding: '1.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
            zIndex: 999,
            overflowY: 'auto',
          }}
        >
          {user && (
            <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)', marginBottom: '0.5rem' }}>
              <p style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.25rem' }}>Signed in as</p>
              <p style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--green-bright)', fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</p>
            </div>
          )}

          {user && ['staff', 'compliance', 'admin'].includes(role) ? (
            <>
              <Link href={staffRoute} className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Dashboard</Link>
              <Link href="/complaints" className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Issue Feed</Link>
              <Link href="/staff/queue" className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Triage Queue</Link>
              {['compliance', 'admin'].includes(role) && (
                <Link href="/compliance" className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Secure Vault</Link>
              )}
            </>
          ) : (
            <>
              <Link href="/complaints" className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Issue Feed</Link>
              <Link href="/complaints/new" className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Submit Report</Link>
              <Link href="/recover" className="aegis-topbar-link" style={{ fontSize: '1rem', padding: '0.5rem 0' }}>Recover Status</Link>
            </>
          )}

          {user ? (
            <button
              type="button"
              onClick={handleSignOut}
              className="btn btn-secondary"
              style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/login"
              className="btn btn-primary"
              style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
            >
              Staff Login
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}
