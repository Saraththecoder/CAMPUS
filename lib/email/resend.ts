// lib/email/resend.ts
// Resend email integration for staff notifications.
// Students NEVER receive emails from this system.
// Falls back to console.log in dev mode when RESEND_API_KEY is not set.

import { Resend } from 'resend'

const RESEND_API_KEY = process.env.RESEND_API_KEY
const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@campus.edu'
const APP_NAME = 'Campus Compliance Portal'

// Dev mode fallback
const isDev = !RESEND_API_KEY || RESEND_API_KEY === 'dev'

let resend: Resend | null = null
if (!isDev) {
  resend = new Resend(RESEND_API_KEY)
}

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

async function sendEmail(options: EmailOptions): Promise<{ success: boolean; id?: string }> {
  if (isDev) {
    console.log('[DEV EMAIL - Not Sent]', {
      to: options.to,
      subject: options.subject,
      preview: options.text?.slice(0, 100) ?? '(html only)',
    })
    return { success: true, id: 'dev-mock-id' }
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: `${APP_NAME} <${SENDER_EMAIL}>`,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    })

    if (error) {
      console.error('[EMAIL ERROR]', error)
      return { success: false }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[EMAIL SEND FAILED]', err)
    return { success: false }
  }
}

// ============================================================
// Staff Notification Templates
// ============================================================

export async function sendEscalationNotification({
  to,
  complaintId,
  complaintTitle,
  escalationLevel,
  daysSinceAssigned,
}: {
  to: string
  complaintId: string
  complaintTitle: string
  escalationLevel: number
  daysSinceAssigned: number
}) {
  const levelText = {
    1: 'Reminder',
    2: 'Department Head Escalation',
    3: 'Administration Escalation',
  }[escalationLevel] ?? 'Alert'

  return sendEmail({
    to,
    subject: `[Level ${escalationLevel}] Escalation Alert: ${complaintTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">⚠️ Escalation Alert — Level ${escalationLevel}: ${levelText}</h2>
        <p>A complaint assigned to your department requires urgent attention.</p>
        <table style="border-collapse: collapse; width: 100%;">
          <tr><td style="padding: 8px; font-weight: bold;">Complaint:</td><td style="padding: 8px;">${complaintTitle}</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Days since assignment:</td><td style="padding: 8px;">${daysSinceAssigned} days</td></tr>
          <tr><td style="padding: 8px; font-weight: bold;">Escalation level:</td><td style="padding: 8px;">Level ${escalationLevel} — ${levelText}</td></tr>
        </table>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/staff/complaints/${complaintId}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Complaint</a></p>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="font-size: 12px; color: #6b7280;">This is an automated message from the ${APP_NAME}. Do not reply to this email.</p>
      </div>
    `,
    text: `Escalation Alert — Level ${escalationLevel}: ${levelText}\n\nComplaint: ${complaintTitle}\nDays since assignment: ${daysSinceAssigned}\n\nView: ${process.env.NEXT_PUBLIC_APP_URL}/staff/complaints/${complaintId}`,
  })
}

export async function sendTriageAlert({
  to,
  complaintId,
  complaintTitle,
  daysWaiting,
}: {
  to: string
  complaintId: string
  complaintTitle: string
  daysWaiting: number
}) {
  return sendEmail({
    to,
    subject: `[Triage Alert] Complaint Awaiting Review: ${complaintTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #d97706;">⚠️ Triage Alert</h2>
        <p>A complaint has been waiting for triage for <strong>${daysWaiting} days</strong>.</p>
        <p><strong>Complaint:</strong> ${complaintTitle}</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/staff/complaints/${complaintId}" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Complaint</a></p>
      </div>
    `,
    text: `Triage Alert: "${complaintTitle}" has been waiting ${daysWaiting} days.\nView: ${process.env.NEXT_PUBLIC_APP_URL}/staff/complaints/${complaintId}`,
  })
}

export async function sendNewComplaintNotification({
  to,
  complaintId,
  category,
  severity,
}: {
  to: string
  complaintId: string
  category: string
  severity: string
}) {
  return sendEmail({
    to,
    subject: `New ${severity.toUpperCase()} complaint: ${category}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Complaint Submitted</h2>
        <p>A new <strong>${severity}</strong> severity complaint in category <strong>${category}</strong> has been submitted.</p>
        <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/staff/queue" style="background: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">View Queue</a></p>
      </div>
    `,
    text: `New ${severity} complaint in ${category}. View queue: ${process.env.NEXT_PUBLIC_APP_URL}/staff/queue`,
  })
}
