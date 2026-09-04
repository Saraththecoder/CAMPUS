import { type NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { adminClient } from '@/lib/supabase/admin'
import * as XLSX from 'xlsx'

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session || !['admin', 'compliance'].includes(session.role)) {
      return NextResponse.json({ error: 'Unauthorized — Admin role required' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })

    const firstSheetName = workbook.SheetNames[0]
    if (!firstSheetName) {
      return NextResponse.json({ error: 'Excel file is empty' }, { status: 400 })
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet)

    if (!rawData.length) {
      return NextResponse.json({ error: 'No data rows found in Excel sheet' }, { status: 400 })
    }

    const created: string[] = []
    const errors: { row: number; email: string; reason: string }[] = []

    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i]
      const email = String(row.email || row.Email || row['Email Address'] || '').trim().toLowerCase()
      const password = String(row.password || row.Password || 'CampusPass2026!').trim()
      const role = String(row.role || row.Role || 'student').trim().toLowerCase()
      const department = String(row.department || row.Department || '').trim()

      if (!email || !email.includes('@')) {
        errors.push({ row: i + 2, email: email || 'N/A', reason: 'Invalid email address' })
        continue
      }

      try {
        const validRoles = ['student', 'staff', 'compliance', 'admin']
        const assignedRole = validRoles.includes(role) ? role : 'student'

        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: {
            role: assignedRole,
            department: department || undefined,
            verified: true,
          },
        })

        if (createError) {
          if (createError.message.includes('already registered')) {
            errors.push({ row: i + 2, email, reason: 'Already registered' })
          } else {
            errors.push({ row: i + 2, email, reason: createError.message })
          }
        } else if (newUser.user) {
          created.push(email)
        }
      } catch (err) {
        errors.push({ row: i + 2, email, reason: err instanceof Error ? err.message : 'Upload error' })
      }
    }

    return NextResponse.json({
      message: `Batch processing complete. ${created.length} accounts created.`,
      successCount: created.length,
      errorCount: errors.length,
      created,
      errors,
    })
  } catch (err) {
    console.error('[BATCH_UPLOAD_ERROR]', err)
    return NextResponse.json({ error: 'Failed to process Excel file' }, { status: 500 })
  }
}
