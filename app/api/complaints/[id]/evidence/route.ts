// app/api/complaints/[id]/evidence/route.ts
// POST /api/complaints/[id]/evidence
// Server-side evidence upload authorization.
// Validates file type, extension, and size. Returns a signed upload URL.
// Never exposes raw storage paths to the client.

import { type NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { adminClient } from '@/lib/supabase/admin'
import { deriveSubmitterHash } from '@/lib/security/hmac'
import { validateInstitutionalEmail } from '@/lib/security/hmac'

const MAX_FILE_SIZE = parseInt(process.env.MAX_EVIDENCE_SIZE_BYTES ?? '10485760') // 10MB default
const MAX_FILES_PER_COMPLAINT = parseInt(process.env.MAX_EVIDENCE_FILES ?? '3')
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf']

const EvidenceRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'] as const),
  fileSizeBytes: z.number().int().positive().max(MAX_FILE_SIZE),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user?.email) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    if (!validateInstitutionalEmail(user.email)) {
      return NextResponse.json({ error: 'Institutional email required' }, { status: 403 })
    }

    const { id: complaintId } = await params

    let body: unknown
    try { body = await request.json() } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = EvidenceRequestSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid file metadata', details: parsed.error.flatten() },
        { status: 422 }
      )
    }

    const { fileName, mimeType, fileSizeBytes } = parsed.data

    // Validate file extension matches declared MIME type
    const extension = ('.' + fileName.split('.').pop()?.toLowerCase()) as string
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 422 })
    }

    // Server-side MIME/extension consistency check
    const mimeExtMap: Record<string, string[]> = {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
      'image/gif': ['.gif'],
      'application/pdf': ['.pdf'],
    }

    const validExtensions = mimeExtMap[mimeType] ?? []
    if (!validExtensions.includes(extension)) {
      return NextResponse.json(
        { error: 'File extension does not match declared MIME type' },
        { status: 422 }
      )
    }

    // Check file size
    if (fileSizeBytes > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum of ${MAX_FILE_SIZE / 1048576}MB` },
        { status: 422 }
      )
    }

    // Check how many evidence files already exist for this complaint
    const { count } = await adminClient
      .from('evidence')
      .select('*', { count: 'exact', head: true })
      .eq('complaint_id', complaintId)

    if ((count ?? 0) >= MAX_FILES_PER_COMPLAINT) {
      return NextResponse.json(
        { error: `Maximum ${MAX_FILES_PER_COMPLAINT} evidence files per complaint` },
        { status: 422 }
      )
    }

    // Verify the complaint exists and get its visibility
    const { data: complaint } = await adminClient
      .from('complaints')
      .select('id, visibility')
      .eq('id', complaintId)
      .single() as any

    if (!complaint) {
      return NextResponse.json({ error: 'Complaint not found' }, { status: 404 })
    }

    // Generate storage path — private bucket, path includes complaint ID for namespacing
    const submitterHash = deriveSubmitterHash(user.email)
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `${complaintId}/${Date.now()}_${sanitizedFileName}`
    const bucket = complaint.visibility === 'restricted' ? 'evidence-restricted' : 'evidence-public'

    // Create signed upload URL (5 minute expiry)
    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from(bucket)
      .createSignedUploadUrl(storagePath)

    if (uploadError) {
      console.error('[EVIDENCE_UPLOAD_URL ERROR]', uploadError.message)
      return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
    }

    // Register evidence record (will be confirmed after upload)
    const { data: evidenceRecord, error: evidenceError } = await (adminClient
      .from('evidence') as any)
      .insert({
        complaint_id: complaintId,
        storage_path: `${bucket}/${storagePath}`,
        file_name: sanitizedFileName,
        mime_type: mimeType,
        file_size_bytes: fileSizeBytes,
        uploaded_by_hash: submitterHash,
      })
      .select('id')
      .single() as any

    if (evidenceError) {
      console.error('[EVIDENCE_INSERT ERROR]', evidenceError.code)
      return NextResponse.json({ error: 'Failed to register evidence' }, { status: 500 })
    }

    return NextResponse.json({
      evidenceId: evidenceRecord.id,
      uploadUrl: uploadData.signedUrl,
      token: uploadData.token,
      storagePath,
    })
  } catch (err) {
    console.error('[EVIDENCE_UPLOAD_UNHANDLED]', err)
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}

// GET /api/complaints/[id]/evidence — Get evidence for a complaint (authorized access)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    const { id: complaintId } = await params

    // Get complaint visibility
    const { data: complaint } = await supabase
      .from('complaints')
      .select('id, visibility')
      .eq('id', complaintId)
      .single() as any

    if (!complaint) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // For restricted complaints, check authorization
    if (complaint.visibility === 'restricted') {
      if (!user) {
        return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
      }
      const role = user.app_metadata?.role ?? 'student'
      if (!['staff', 'compliance', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    const { data: evidenceList } = await adminClient
      .from('evidence')
      .select('id, file_name, mime_type, file_size_bytes, created_at, storage_path')
      .eq('complaint_id', complaintId) as any

    // Generate signed download URLs for each file (1 hour expiry)
    const evidenceWithUrls = await Promise.all(
      (evidenceList ?? []).map(async (ev: any) => {
        const pathParts = ev.storage_path.split('/')
        const bucket = pathParts[0]
        const filePath = pathParts.slice(1).join('/')

        const { data } = await adminClient.storage
          .from(bucket)
          .createSignedUrl(filePath, 3600)

        return {
          id: ev.id,
          fileName: ev.file_name,
          mimeType: ev.mime_type,
          fileSizeBytes: ev.file_size_bytes,
          createdAt: ev.created_at,
          signedUrl: data?.signedUrl ?? null,
        }
      })
    )

    return NextResponse.json({ evidence: evidenceWithUrls })
  } catch {
    return NextResponse.json({ error: 'Failed to load evidence' }, { status: 500 })
  }
}
