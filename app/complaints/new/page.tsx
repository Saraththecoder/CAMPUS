// app/complaints/new/page.tsx
// Multi-step complaint submission wizard.
// Student must be authenticated and email-verified to submit.

import PublicNav from '@/components/layout/PublicNav'
import ComplaintWizard from './_components/ComplaintWizard'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Submit Complaint',
  description: 'Submit a new anonymous complaint to the Campus Compliance & Issue Resolution Portal.',
}

export default async function NewComplaintPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/complaints/new')
  }

  return (
    <>
      <PublicNav />
      <ComplaintWizard />
    </>
  )
}
