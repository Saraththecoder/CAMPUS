// app/staff/layout.tsx
// Staff dashboard shell layout with sidebar navigation.

import { requireRole } from '@/lib/auth/session'
import StaffSidebar from '@/components/staff/StaffSidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s | Staff Dashboard', default: 'Staff Dashboard' },
}

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['staff', 'compliance', 'admin'])

  return (
    <div className="page-layout">
      <StaffSidebar role={session.role} departmentId={session.departmentId} />
      <main id="main-content" className="main-content">
        {children}
      </main>
    </div>
  )
}
