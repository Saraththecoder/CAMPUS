'use client'
// components/staff/StaffSidebar.tsx
// Aegis-7 sidebar navigation for staff, compliance, and admin roles with mobile drawer support.

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Shield, LayoutDashboard, Rss, SlidersHorizontal,
  Lock, Settings, HelpCircle, Plus, BookOpen, ExternalLink, Users, Menu, X
} from 'lucide-react'
import type { UserRole } from '@/lib/auth/session'

interface Props {
  role: UserRole
  departmentId: string | null
}

const clearanceLevels: Record<string, number> = {
  student: 1,
  staff: 2,
  compliance: 4,
  admin: 5,
}

export default function StaffSidebar({ role }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isCompliance = ['compliance', 'admin'].includes(role)
  const isAdmin = role === 'admin'
  const clearance = clearanceLevels[role] ?? 2

  // Auto-close drawer on navigation
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  return (
    <>
      {/* Mobile Topbar header for staff layout */}
      <header className="staff-mobile-topbar" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.75rem 1rem',
        background: 'var(--bg-sidebar)',
        borderBottom: '1px solid var(--border-default)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <img src="/logo.png" alt="Campus Compliance Logo" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'contain' }} />
          <span className="sidebar-logo-text" style={{ fontSize: '0.9rem' }}>Campus Compliance</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--green-bright)', background: 'var(--green-faint)', border: '1px solid var(--green-border)', padding: '0.1rem 0.4rem', borderRadius: 'var(--radius-sm)' }}>
            Lvl {clearance}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle staff menu"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            padding: '0.25rem',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Main Sidebar (Desktop fixed sidebar & Mobile toggle drawer) */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`} aria-label="Staff navigation">
        {/* Logo */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <img src="/logo.png" alt="Campus Compliance Logo" style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'contain' }} />
            <span className="sidebar-logo-text">Campus Compliance</span>
          </div>
          <p className="sidebar-logo-sub">Clearance Lvl: {clearance}</p>
        </div>

        {/* Initiate Report CTA */}
        <Link href="/complaints/new" className="sidebar-cta" aria-label="Initiate a new report">
          <Plus size={14} />
          Initiate Report
        </Link>

        {/* Navigation */}
        <nav className="sidebar-nav" aria-label="Dashboard navigation">
          <p className="sidebar-section-label">Operations</p>

          <Link href="/staff" className={`sidebar-item ${pathname === '/staff' ? 'active' : ''}`}>
            <LayoutDashboard size={15} aria-hidden="true" />
            Dashboard
          </Link>

          <Link href="/complaints" className={`sidebar-item ${pathname === '/complaints' ? 'active' : ''}`}>
            <Rss size={15} aria-hidden="true" />
            Issue Feed
          </Link>

          <Link href="/staff/queue" className={`sidebar-item ${pathname === '/staff/queue' ? 'active' : ''}`}>
            <SlidersHorizontal size={15} aria-hidden="true" />
            Triage Queue
          </Link>

          {isCompliance && (
            <>
              <p className="sidebar-section-label" style={{ marginTop: '0.75rem' }}>Secure Vault</p>
              <Link href="/compliance" className={`sidebar-item ${pathname === '/compliance' ? 'active' : ''}`}>
                <Lock size={15} aria-hidden="true" />
                Secure Vault
              </Link>
              <Link href="/compliance/restricted" className={`sidebar-item ${pathname === '/compliance/restricted' ? 'active' : ''}`}>
                <Shield size={15} aria-hidden="true" />
                Restricted Files
              </Link>
              <Link href="/compliance/audit" className={`sidebar-item ${pathname === '/compliance/audit' ? 'active' : ''}`}>
                <BookOpen size={15} aria-hidden="true" />
                Audit Log
              </Link>
            </>
          )}

          {isAdmin && (
            <>
              <p className="sidebar-section-label" style={{ marginTop: '0.75rem' }}>Admin</p>
              <Link href="/admin" className={`sidebar-item ${pathname === '/admin' ? 'active' : ''}`}>
                <Settings size={15} aria-hidden="true" />
                Admin Panel
              </Link>
              <Link href="/admin/users" className={`sidebar-item ${pathname === '/admin/users' ? 'active' : ''}`}>
                <Users size={15} aria-hidden="true" />
                User Accounts
              </Link>
            </>
          )}

          <p className="sidebar-section-label" style={{ marginTop: '0.75rem' }}>Public</p>
          <Link href="/complaints" className="sidebar-item">
            <ExternalLink size={15} aria-hidden="true" />
            Public Feed
          </Link>
        </nav>

        {/* Bottom actions */}
        <div className="sidebar-bottom">
          <Link href="/support" className="sidebar-item">
            <HelpCircle size={15} aria-hidden="true" />
            Support
          </Link>
          <form action="/api/auth/signout" method="post">
            <button
              type="submit"
              className="sidebar-item"
              style={{ width: '100%', cursor: 'pointer', background: 'none', border: 'none', textAlign: 'left', color: 'var(--red-bright)', fontSize: '0.85rem', fontWeight: 500 }}
            >
              Sign Out
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}

