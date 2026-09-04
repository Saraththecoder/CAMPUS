// app/admin/layout.tsx
import { requireRole } from '@/lib/auth/session'
import StaffSidebar from '@/components/staff/StaffSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['admin', 'compliance'])

  return (
    <div className="page-layout">
      <StaffSidebar role={session.role} departmentId={session.departmentId} />
      <main id="main-content" className="main-content">
        {children}
      </main>
    </div>
  )
}
