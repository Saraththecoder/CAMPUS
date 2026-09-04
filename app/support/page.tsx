// app/support/page.tsx
// Aegis-7 Institutional Support & Emergency Assistance Desk

import type { Metadata } from 'next'
import Link from 'next/link'
import PublicNav from '@/components/layout/PublicNav'
import {
  ShieldAlert, PhoneCall, Mail, HelpCircle, FileText,
  Lock, ArrowRight, LifeBuoy, AlertTriangle, CheckCircle2
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Institutional Support & Emergency Helpdesk | Aegis-7',
  description: 'Emergency contacts, compliance guidelines, and system support for Campus Compliance Portal.',
}

export default function SupportPage() {
  return (
    <>
      <PublicNav />
      <div style={{ minHeight: 'calc(100vh - 52px)', background: 'var(--bg-primary)', padding: '2rem 1.5rem' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* Header Banner */}
          <div style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem 2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <LifeBuoy style={{ color: 'var(--green-bright)' }} size={26} />
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Institutional Support &amp; Emergency Helpdesk
              </h1>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: '720px' }}>
              If you are in immediate danger or facing urgent campus safety issues, contact security emergency contacts directly. For reporting complaints anonymously or tracking existing reports, use the self-service links below.
            </p>
          </div>

          {/* Urgent Emergency Contacts */}
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <ShieldAlert style={{ color: 'var(--red-bright)' }} size={18} /> Emergency Contacts &amp; Committees
            </h2>
            <div className="grid-3" style={{ gap: '1.25rem' }}>
              {[
                { title: 'Campus Security Control', phone: '+91 877 223 7234', note: '24/7 Patrol & Control Room', color: 'var(--red-bright)', bg: 'var(--red-faint)' },
                { title: 'Anti-Ragging Squad', phone: '+91 877 223 7250', note: 'Strict Confidential Hotline', color: 'var(--amber-bright)', bg: 'var(--amber-faint)' },
                { title: 'Internal Complaints (ICC)', phone: 'icc@aits-tpt.edu.in', note: 'Gender Equity & Safety', color: 'var(--purple-bright)', bg: 'var(--purple-faint)' },
              ].map(c => (
                <div key={c.title} className="card" style={{ padding: '1.25rem' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: c.bg, color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <PhoneCall size={18} />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{c.title}</p>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', fontWeight: 700, color: c.color, marginBottom: '0.25rem' }}>{c.phone}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.note}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Self-Service Actions */}
          <div className="grid-2" style={{ gap: '1.25rem' }}>
            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <FileText size={20} style={{ color: 'var(--green-bright)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Initiate Anonymous Report</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                File a new infrastructure anomaly, academic concern, or conduct issue. Encrypted end-to-end with cryptographic anonymity.
              </p>
              <Link href="/complaints/new" className="btn btn-terminal">
                Initiate Report <ArrowRight size={14} />
              </Link>
            </div>

            <div className="card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <Lock size={20} style={{ color: 'var(--purple-bright)' }} />
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700 }}>Track via Recovery Code</h3>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                Have a 16-character recovery key from a previous submission? Enter your recovery key to view resolution updates.
              </p>
              <Link href="/recover" className="btn btn-secondary">
                Lookup Report <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Frequently Asked Questions */}
          <div className="card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle size={18} style={{ color: 'var(--green-bright)' }} /> System FAQs &amp; Confidentiality Protocols
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {[
                { q: 'How is my anonymity guaranteed?', a: 'Submissions generate a one-way SHA-256 hash stored in isolated tables. IP addresses and identity logs are never bound to public incident reports.' },
                { q: 'What are Restricted Complaints?', a: 'Sensitive matters involving harassment or discrimination are tagged as Restricted. Access requires Level 4 Compliance clearance and is audit-logged.' },
                { q: 'What if I lost my Recovery Code?', a: 'Because Aegis-7 uses zero-knowledge recovery keys, lost codes cannot be recovered by administrators. You will need to file a follow-up report.' },
              ].map(faq => (
                <div key={faq.q} style={{ padding: '1rem', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-default)' }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--green-bright)', marginBottom: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <CheckCircle2 size={14} /> {faq.q}
                  </p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
