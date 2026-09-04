// app/complaints/page.tsx
// Aegis-7 Public Issue Feed — no authentication required.

import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PublicNav from '@/components/layout/PublicNav'
import ComplaintCard from '@/components/complaints/ComplaintCard'
import FilterBar from '@/components/complaints/FilterBar'
import { Inbox, Plus } from 'lucide-react'
import type { PublicComplaint } from '@/types/database'

export const metadata: Metadata = {
  title: 'Public Transparency Feed | Campus Compliance Portal',
  description: 'Real-time monitoring of campus anomalies and community-reported incidents. All data is verified and timestamped via Aegis-7 protocols.',
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    category?: string
    status?: string
    severity?: string
    sort?: string
  }>
}

export default async function ComplaintsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const pageSize = 20

  const supabase = await createClient()

  let query = supabase.from('public_complaints_feed').select('*')

  if (params.category) query = query.eq('category', params.category)
  if (params.status) query = query.eq('status', params.status)
  if (params.severity) query = query.eq('severity', params.severity)

  const sort = params.sort ?? 'priority'
  if (sort === 'recent') {
    query = query.order('created_at', { ascending: false })
  } else if (sort === 'support') {
    query = query.order('support_count', { ascending: false })
  } else {
    query = query.order('priority_score', { ascending: false })
  }

  const from = (page - 1) * pageSize
  query = query.range(from, from + pageSize - 1)

  const { data: complaints, count, error } = await (query as any)

  const sorted = [...(complaints ?? [])].sort((a: any, b: any) => {
    if (a.status === 'disputed' && b.status !== 'disputed') return -1
    if (b.status === 'disputed' && a.status !== 'disputed') return 1
    return 0
  })

  const totalPages = Math.ceil((count ?? 0) / pageSize)

  return (
    <>
      <PublicNav />
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 52px)' }}>

        {/* Left content */}
        <main id="main-content" style={{ flex: 1, padding: '2rem', maxWidth: 780 }}>
          {/* Page heading */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Public Transparency Feed
            </h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.375rem', fontSize: '0.875rem', lineHeight: 1.6 }}>
              Real-time monitoring of campus infrastructure anomalies and community-reported incidents. All data is verified and timestamped via Aegis-7 protocols.
            </p>
          </div>

          <FilterBar currentParams={params} />

          {error ? (
            <div className="alert alert-danger" role="alert">
              Failed to load complaints. Please refresh the page.
            </div>
          ) : sorted.length === 0 ? (
            <div className="empty-state" role="status">
              <div className="empty-state-icon" aria-hidden="true"><Inbox size={22} /></div>
              <h2 className="empty-state-title">No incidents found</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.375rem', marginBottom: '1.25rem' }}>
                {Object.keys(params).length > 0
                  ? 'Try adjusting your filters to see more results.'
                  : 'No incidents have been reported yet.'}
              </p>
              <Link href="/complaints/new" className="btn btn-terminal btn-sm">
                <Plus size={13} /> Initiate Report
              </Link>
            </div>
          ) : (
            <>
              <div role="list" aria-label="Complaint list">
                {sorted.map((complaint: PublicComplaint) => (
                  <ComplaintCard key={complaint.id} complaint={complaint} />
                ))}
              </div>

              {totalPages > 1 && (
                <nav aria-label="Pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '2rem' }}>
                  {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(p => (
                    <Link
                      key={p}
                      href={{ query: { ...params, page: p.toString() } }}
                      aria-label={`Page ${p}`}
                      aria-current={p === page ? 'page' : undefined}
                      style={{
                        width: 34, height: 34,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: p === page ? 'var(--green-bright)' : 'var(--bg-card)',
                        color: p === page ? '#0c0e0d' : 'var(--text-secondary)',
                        border: '1px solid',
                        borderColor: p === page ? 'var(--green-bright)' : 'var(--border-default)',
                        borderRadius: 'var(--radius-md)',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                      }}
                    >
                      {p}
                    </Link>
                  ))}
                </nav>
              )}
            </>
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-sidebar)', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          © 2024 Aegis-7 Security. Session: Encrypted-AES256
        </p>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          {['Privacy Policy', 'Compliance Standards', 'Audit Log'].map(l => (
            <Link key={l} href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-muted)', textDecoration: 'none' }}>{l}</Link>
          ))}
        </div>
      </footer>
    </>
  )
}
