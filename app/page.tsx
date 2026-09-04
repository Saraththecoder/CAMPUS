// app/page.tsx
// Aegis-7 Landing Page — Dark terminal aesthetic with GSAP ScrollTrigger animations

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Shield, Lock, Eye, Zap, CheckCircle2, ArrowRight,
  FileText, Users, TrendingUp, Globe
} from 'lucide-react'

import HeroTextAnimation from '@/components/landing/HeroTextAnimation'
import TypewriterText from '@/components/landing/TypewriterText'
import GSAPAnimationProvider from '@/components/landing/GSAPAnimationProvider'
import PublicNav from '@/components/layout/PublicNav'

export const metadata: Metadata = {
  title: 'Aegis-7 | Campus Compliance Portal',
  description: 'Secure anonymous complaint management for campus communities. Zero identity linkage. Cryptographic privacy. Institutional accountability.',
}

const features = [
  {
    icon: Lock,
    title: 'Zero Identity Linkage',
    desc: 'Cryptographic HMAC hashing isolates student identities at the DB layer. No email or user ID is ever stored in a complaint record.',
  },
  {
    icon: Shield,
    title: 'Row-Level Security',
    desc: 'Postgres RLS enforced at the database level — staff can only access their department&apos;s queue. Compliance officers manage the rest.',
  },
  {
    icon: Eye,
    title: 'Immutable Audit Trail',
    desc: 'Every sensitive action is logged to a write-protected audit table. Updates and deletions are cryptographically blocked.',
  },
  {
    icon: Zap,
    title: 'Auto Escalation Engine',
    desc: 'pg_cron jobs automatically escalate neglected complaints and notify department heads via encrypted Resend notifications.',
  },
  {
    icon: Users,
    title: 'Community Voting',
    desc: '7-day resolution dispute window lets the community confirm or challenge outcomes. Anonymous vote tokens prevent double-voting.',
  },
  {
    icon: TrendingUp,
    title: 'Priority Score Engine',
    desc: 'Composite priority scores account for severity, support count, escalation level, and complaint age — surfacing what matters most.',
  },
]

const stats = [
  { label: 'AES-256 Encrypted', sublabel: 'Session Protocol' },
  { label: 'Zero PII Stored', sublabel: 'On Complaint Records' },
  { label: '7-Day Window', sublabel: 'Community Dispute Period' },
  { label: 'Immutable Logs', sublabel: 'Audit Trail' },
]

export default function HomePage() {
  return (
    <GSAPAnimationProvider>
      <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>

        {/* ── Topbar ───────────────────────────── */}
        <PublicNav />

        {/* ── Hero ─────────────────────────────── */}
        <section
          className="landing-hero"
          style={{ position: 'relative', overflow: 'hidden', paddingTop: '4rem', paddingBottom: '4rem', paddingLeft: '1.25rem', paddingRight: '1.25rem' }}
        >
          {/* Continuous Looping Video Background */}
          <video
            autoPlay
            loop
            muted
            playsInline
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              zIndex: 0,
              opacity: 0.35,
              pointerEvents: 'none',
            }}
          >
            <source src="/video-bg.mp4" type="video/mp4" />
          </video>

          {/* Dark Gradient Mask for contrast */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(180deg, rgba(10, 11, 10, 0.65) 0%, rgba(10, 11, 10, 0.95) 100%)',
            zIndex: 1,
            pointerEvents: 'none',
          }} />

          {/* Hero Content */}
          <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
            <div className="hero-overline gsap-hero-title glitch-hover" style={{ textAlign: 'center', maxWidth: '100%' }}>
              <Globe size={12} className="animate-pulse-dot" />
              <span className="terminal-cursor glitch-text" data-text="Anonymous Submission Protocol · AES-256 Encrypted">
                Anonymous Submission Protocol · AES-256 Encrypted
              </span>
            </div>

            <h1 className="hero-title gsap-hero-title">
              <TypewriterText text="Campus Compliance" /><br />
              <HeroTextAnimation />
            </h1>

            <p className="hero-subtitle gsap-hero-title">
              File anonymous complaints, track institutional responses, and vote on resolutions — with zero identity linkage enforced at the database layer.
            </p>

            <div className="gsap-hero-title" style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
              <Link href="/complaints/new" className="btn btn-terminal btn-lg animate-pulse-glow">
                Initiate Secure Report <ArrowRight size={16} />
              </Link>
              <Link href="/complaints" className="btn btn-secondary btn-lg" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                View Public Feed
              </Link>
            </div>
          </div>
        </section>

        {/* ── Trust Stats ──────────────────────── */}
        <section className="gsap-stats-section" style={{ borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)', background: 'var(--bg-card)', padding: '1.75rem 1.25rem' }}>
          <div style={{ maxWidth: 'var(--max-content)', margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1.5rem' }}>
            {stats.map(({ label, sublabel }) => (
              <div key={label} className="gsap-stat-item" style={{ textAlign: 'center' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--green-bright)', fontSize: '0.925rem', letterSpacing: '0.02em' }}>{label}</p>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.25rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{sublabel}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features Grid ────────────────────── */}
        <section className="gsap-features-section" style={{ maxWidth: 'var(--max-content)', margin: '0 auto', padding: '4rem 1.25rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--green-bright)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              System Architecture
            </p>
            <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
              Security-First by Design
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="card gsap-feature-card"
                style={{ padding: '1.5rem' }}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: 'var(--radius-md)',
                  background: 'var(--green-faint)',
                  border: '1px solid var(--green-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1rem', color: 'var(--green-bright)'
                }}>
                  <Icon size={18} />
                </div>
                <h3 style={{ fontSize: '0.975rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>{title}</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── How it Works ─────────────────────── */}
        <section className="gsap-protocol-section" style={{ background: 'var(--bg-card)', borderTop: '1px solid var(--border-default)', borderBottom: '1px solid var(--border-default)', padding: '4rem 1.25rem' }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
              <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', fontWeight: 700, color: 'var(--green-bright)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Protocol</p>
              <h2 style={{ fontSize: '2rem', fontWeight: 700, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em' }}>How Aegis-7 Works</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
              {[
                { step: '01', title: 'Submit Securely', body: 'File via the wizard. Your identity is HMAC-hashed and never linked to the complaint. Receive a one-time recovery code.' },
                { step: '02', title: 'Routed & Investigated', body: 'Complaints are auto-routed to the correct department. Staff investigate under strict RLS. Sensitive cases go to compliance officers only.' },
                { step: '03', title: 'Verify or Dispute', body: 'When resolved, a 7-day community window opens. You and others can confirm the resolution or dispute it anonymously.' },
              ].map(({ step, title, body }) => (
                <div key={step} className="card gsap-step-card" style={{ padding: '1.5rem', background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)' }}>
                  <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--green-bright)', fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>STEP_{step}</p>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem', fontFamily: 'var(--font-heading)' }}>{title}</h3>
                  <p style={{ fontSize: '0.855rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA ──────────────────────────────── */}
        <section className="gsap-cta-section" style={{ textAlign: 'center', padding: '5rem 2rem' }}>
          <div className="gsap-cta-box" style={{
            maxWidth: 560, margin: '0 auto',
            padding: '3rem 2rem',
            background: 'var(--green-faint)',
            border: '1px solid var(--green-border)',
            borderRadius: 'var(--radius-xl)',
          }}>
            <CheckCircle2 size={32} className="animate-pulse-dot" style={{ color: 'var(--green-bright)', margin: '0 auto 1.25rem' }} />
            <h2 style={{ fontSize: '1.75rem', fontWeight: 700, fontFamily: 'var(--font-heading)', marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>
              Ready to File a Report?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.75rem', fontSize: '0.925rem', lineHeight: 1.65 }}>
              Your identity is protected at the database layer. We don't store who you are — only what you're reporting.
            </p>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/complaints/new" className="btn btn-terminal animate-pulse-glow">
                Initiate Secure Report <ArrowRight size={14} />
              </Link>
              <Link href="/recover" className="btn btn-secondary" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                Recover Existing Report
              </Link>
            </div>
          </div>
        </section>

        {/* ── Footer ───────────────────────────── */}
        <footer style={{
          borderTop: '1px solid var(--border-default)',
          background: 'var(--bg-sidebar)',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
        }}>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.03em' }}>
            © 2024 Aegis-7 Security. Session: Encrypted-AES256
          </p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {['Privacy Policy', 'Compliance Standards', 'Audit Log'].map(label => (
              <Link key={label} href="#" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
        </footer>
      </div>
    </GSAPAnimationProvider>
  )
}
