// app/compliance/layout.tsx
import { requireRole } from '@/lib/auth/session'
import StaffSidebar from '@/components/staff/StaffSidebar'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { template: '%s | Compliance Dashboard', default: 'Compliance Dashboard' },
}

export default async function ComplianceLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['compliance', 'admin'])

  return (
    <div className="page-layout">
      <StaffSidebar role={session.role} departmentId={session.departmentId} />
      <main id="main-content" className="main-content" style={{ padding: 0 }}>
        {children}
      </main>
    </div>
  )
}
