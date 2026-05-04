'use server'

import { revalidatePath } from 'next/cache'
import { headers } from 'next/headers'
import { z } from 'zod'

const ApproveDriverSchema = z.object({
  driverId: z.string().uuid(),
})

const RejectDriverSchema = z.object({
  driverId: z.string().uuid(),
  rejection_reason: z.string().min(10).max(500),
})

export async function approveDriver(formData: FormData) {
  const headersList = headers()
  const reviewerId = headersList.get('x-user-id')
  const reviewerRole = headersList.get('x-user-role')

  if (!['staff', 'admin', 'owner'].includes(reviewerRole ?? '')) {
    return { error: 'Insufficient permissions' }
  }

  const validation = ApproveDriverSchema.safeParse({
    driverId: formData.get('driverId'),
  })

  if (!validation.success) {
    return { error: 'Invalid driver ID' }
  }

  const { driverId } = validation.data
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(`${supabaseUrl}/rest/v1/drivers?id=eq.${driverId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      verification_status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: null,
    }),
  })

  if (!res.ok) {
    return { error: 'Failed to approve driver' }
  }

  await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      actor_id: reviewerId,
      actor_role: reviewerRole,
      action: 'driver.kyc.approved',
      entity_type: 'driver',
      entity_id: driverId,
      new_data: { verification_status: 'approved' },
    }),
  })

  revalidatePath(`/dashboard/drivers/${driverId}/documents`)
  revalidatePath('/dashboard/drivers/pending')
  revalidatePath('/dashboard/drivers')

  return { success: true, message: 'Conductor aprobado exitosamente' }
}

export async function rejectDriver(formData: FormData) {
  const headersList = headers()
  const reviewerId = headersList.get('x-user-id')
  const reviewerRole = headersList.get('x-user-role')

  if (!['staff', 'admin', 'owner'].includes(reviewerRole ?? '')) {
    return { error: 'Insufficient permissions' }
  }

  const validation = RejectDriverSchema.safeParse({
    driverId: formData.get('driverId'),
    rejection_reason: formData.get('rejection_reason'),
  })

  if (!validation.success) {
    return { error: 'Validation failed' }
  }

  const { driverId, rejection_reason } = validation.data
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const res = await fetch(`${supabaseUrl}/rest/v1/drivers?id=eq.${driverId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      verification_status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason,
    }),
  })

  if (!res.ok) {
    return { error: 'Failed to reject driver' }
  }

  await fetch(`${supabaseUrl}/rest/v1/audit_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      actor_id: reviewerId,
      actor_role: reviewerRole,
      action: 'driver.kyc.rejected',
      entity_type: 'driver',
      entity_id: driverId,
      new_data: { verification_status: 'rejected', rejection_reason },
    }),
  })

  revalidatePath(`/dashboard/drivers/${driverId}/documents`)
  revalidatePath('/dashboard/drivers/pending')
  revalidatePath('/dashboard/drivers')

  return { success: true, message: 'Conductor rechazado' }
}