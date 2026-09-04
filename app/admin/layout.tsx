// app/admin/layout.tsx
import { requireRole } from '@/lib/auth/session'
import StaffSidebar from '@/components/staff/StaffSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireRole(['admin', 'compliance'])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <StaffSidebar role={session.role} departmentId={session.departmentId} />
      <main id="main-content" style={{ flex: 1, padding: '2rem 2.5rem', minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}
