// app/admin/users/page.tsx
import { requireRole } from '@/lib/auth/session'
import UserManagementView from './_components/UserManagementView'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'User Management | Admin Portal' }

export default async function AdminUsersPage() {
  await requireRole(['admin', 'compliance'])
  return <UserManagementView />
}
