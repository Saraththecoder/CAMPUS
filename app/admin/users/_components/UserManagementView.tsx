'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  UserPlus, Upload, Users, Shield, Loader2, CheckCircle2,
  AlertTriangle, Search, FileSpreadsheet, Key, Trash2
} from 'lucide-react'

interface UserItem {
  id: string
  email: string
  role: string
  created_at: string
  last_sign_in_at?: string
}

export default function UserManagementView() {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null)

  // Manual User Creation State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('student')
  const [creatingUser, setCreatingUser] = useState(false)

  // Excel Upload State
  const [file, setFile] = useState<File | null>(null)
  const [uploadingBatch, setUploadingBatch] = useState(false)
  const [batchResults, setBatchResults] = useState<{ successCount?: number; errorCount?: number; errors?: any[] } | null>(null)

  const fetchUsers = async () => {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (res.ok) {
        setUsers(data.users ?? [])
      }
    } catch {
      toast.error('Failed to load user list')
    } finally {
      setLoadingUsers(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    setUpdatingUserId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update user role')
        return
      }
      toast.success(`Role updated to ${newRole}`)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
    } catch {
      toast.error('Error updating user role')
    } finally {
      setUpdatingUserId(null)
    }
  }

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`Are you sure you want to permanently delete user ${userEmail}?`)) return

    setUpdatingUserId(userId)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to delete user account')
        return
      }
      toast.success(`Account deleted: ${userEmail}`)
      setUsers(prev => prev.filter(u => u.id !== userId))
    } catch {
      toast.error('Error deleting user account')
    } finally {
      setUpdatingUserId(null)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Email and password are required')
      return
    }
    setCreatingUser(true)
    try {
      const res = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to create user')
        return
      }
      toast.success(`Account created: ${email} (${role})`)
      setEmail('')
      setPassword('')
      fetchUsers()
    } catch {
      toast.error('Error creating user account')
    } finally {
      setCreatingUser(false)
    }
  }

  const handleBatchUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      toast.error('Please select an Excel (.xlsx, .xls) or CSV file')
      return
    }
    setUploadingBatch(true)
    setBatchResults(null)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/users/batch-upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Batch upload failed')
        return
      }
      toast.success(data.message)
      setBatchResults(data)
      setFile(null)
      fetchUsers()
    } catch {
      toast.error('Error processing batch upload')
    } finally {
      setUploadingBatch(false)
    }
  }

  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Top Header */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.375rem' }}>
          <Shield style={{ color: 'var(--green-bright)' }} size={22} />
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
            User Account Management
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}>
          Create student &amp; staff accounts manually or bulk upload via Excel / CSV (.xlsx, .csv)
        </p>
      </div>

      <div className="grid-2" style={{ gap: '1.5rem' }}>
        {/* Manual Account Creation */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <UserPlus size={16} style={{ color: 'var(--green-bright)' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Manual Account Creation</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleManualCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label form-label-required">Institutional Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="student@aits-tpt.edu.in"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Account Password</label>
                <input
                  type="text"
                  className="form-input"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Set initial password..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label form-label-required">Assigned Role</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '0.5rem' }}>
                  {['student', 'staff', 'compliance', 'admin'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        padding: '0.45rem 0.5rem',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${role === r ? 'var(--green-bright)' : 'var(--border-default)'}`,
                        background: role === r ? 'var(--green-faint)' : 'var(--bg-input)',
                        color: role === r ? 'var(--green-bright)' : 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        textTransform: 'capitalize',
                        cursor: 'pointer',
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-terminal"
                disabled={creatingUser}
                style={{ marginTop: '0.5rem', justifyContent: 'center' }}
              >
                {creatingUser ? <><Loader2 size={14} className="btn-loading" /> Creating...</> : <><UserPlus size={14} /> Create Account</>}
              </button>
            </form>
          </div>
        </div>

        {/* Excel / CSV Bulk Upload */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileSpreadsheet size={16} style={{ color: 'var(--green-bright)' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Excel / CSV Batch Upload</h2>
          </div>
          <div className="card-body">
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Upload an Excel sheet (.xlsx, .xls) or CSV containing columns: <code style={{ color: 'var(--green-bright)', fontFamily: 'var(--font-mono)' }}>email</code>, <code style={{ color: 'var(--green-bright)', fontFamily: 'var(--font-mono)' }}>password</code>, <code style={{ color: 'var(--green-bright)', fontFamily: 'var(--font-mono)' }}>role</code>.
            </p>

            <form onSubmit={handleBatchUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <label style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '1.75rem 1rem', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-lg)',
                background: 'var(--bg-elevated)', cursor: 'pointer', textAlign: 'center', gap: '0.5rem',
              }}>
                <Upload size={22} style={{ color: 'var(--green-bright)' }} />
                <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {file ? file.name : 'Click to select Excel (.xlsx) or CSV file'}
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  style={{ display: 'none' }}
                />
              </label>

              <button
                type="submit"
                className="btn btn-terminal"
                disabled={uploadingBatch || !file}
                style={{ justifyContent: 'center' }}
              >
                {uploadingBatch ? <><Loader2 size={14} className="btn-loading" /> Processing Excel...</> : <><Upload size={14} /> Upload &amp; Create Accounts</>}
              </button>
            </form>

            {batchResults && (
              <div style={{ marginTop: '1rem', padding: '0.875rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--green-bright)' }}>
                  ✓ {batchResults.successCount} accounts created
                </p>
                {batchResults.errorCount ? (
                  <p style={{ fontSize: '0.78rem', color: 'var(--red-bright)', marginTop: 4 }}>
                    ⚠ {batchResults.errorCount} rows skipped
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users size={16} style={{ color: 'var(--green-bright)' }} />
            <h2 style={{ fontSize: '1rem', fontWeight: 700 }}>Existing User Accounts ({users.length})</h2>
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: 260, flex: '1 1 200px' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: 'var(--text-muted)' }} />
            <input
              type="text"
              className="form-input"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search accounts..."
              style={{ paddingLeft: '2rem', height: 34, fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div className="card-body" style={{ padding: 0 }}>
          {loadingUsers ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Loader2 className="btn-loading" size={20} /> Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No user accounts found.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th>Email Address</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th>Last Sign In</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {u.email}
                      </td>
                      <td>
                        <select
                          value={u.role}
                          disabled={updatingUserId === u.id}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          style={{
                            background: 'var(--bg-input)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '0.2rem 0.5rem',
                            color: u.role === 'admin' ? 'var(--red-bright)' : u.role === 'compliance' ? 'var(--purple-bright)' : u.role === 'staff' ? 'var(--amber-bright)' : 'var(--green-bright)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          <option value="student">Student</option>
                          <option value="staff">Staff</option>
                          <option value="compliance">Compliance</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDeleteUser(u.id, u.email)}
                          disabled={updatingUserId === u.id}
                          className="btn btn-ghost btn-sm"
                          style={{ color: 'var(--red-bright)', gap: '0.25rem', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}
                          title="Delete User Account"
                        >
                          <Trash2 size={13} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}
