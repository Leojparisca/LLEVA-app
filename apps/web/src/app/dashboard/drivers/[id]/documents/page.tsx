import { notFound, redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { approveDriver, rejectDriver } from '@/actions/kyc.actions'

interface PageProps {
  params: { id: string }
}

const DOC_TYPE_LABELS: Record<string, string> = {
  national_id: 'Cédula de Identidad',
  driver_license: 'Licencia de Conducir',
  vehicle_registration: 'Registro Vehicular',
  vehicle_insurance: 'Seguro del Vehículo',
  criminal_record: 'Antecedentes Penales',
  profile_photo: 'Foto de Perfil',
}

export default async function DriverDocumentsPage({ params }: PageProps) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} }
  )
  const userRole = headers().get('x-user-role')

  if (!['staff', 'admin', 'owner'].includes(userRole ?? '')) {
    redirect('/dashboard?error=FORBIDDEN')
  }

  const [driverRes, docsRes] = await Promise.all([
    supabase
      .from('drivers')
      .select('*, profiles!drivers_user_id_fkey(full_name, phone, avatar_url)')
      .eq('id', params.id)
      .single(),

    supabase
      .from('driver_documents')
      .select('*')
      .eq('driver_id', params.id)
      .order('created_at', { ascending: false }),
  ])

  if (driverRes.error || !driverRes.data) notFound()

  const driver = driverRes.data
  const documents = docsRes.data ?? []
  const profile = driver.profiles

  const REQUIRED_DOCS = [
    'national_id',
    'driver_license',
    'vehicle_registration',
    'vehicle_insurance',
    'criminal_record',
    'profile_photo',
  ]

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Verificación KYC</h1>
          <p className="text-neutral-500">Conductor: {profile?.full_name || 'N/A'}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[driver.verification_status] || 'bg-gray-100'}`}>
          {driver.verification_status || 'pending'}
        </span>
      </div>

      {driver.rejection_reason && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
          <strong>Motivo de rechazo:</strong> {driver.rejection_reason}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {REQUIRED_DOCS.map((docType) => {
          const doc = documents.find((d: any) => d.document_type === docType)
          return (
            <div key={docType} className="bg-white border rounded-lg p-4">
              <div className="font-medium mb-2">{DOC_TYPE_LABELS[docType]}</div>
              {doc ? (
                <div className="space-y-2">
                  <div className={`text-sm px-2 py-1 rounded inline-block ${statusColors[doc.status] || 'bg-gray-100'}`}>
                    {doc.status}
                  </div>
                  <div className="text-xs text-neutral-500">
                    Subido: {new Date(doc.created_at).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-neutral-400">No subido</div>
              )}
            </div>
          )
        })}
      </div>

      {driver.verification_status !== 'approved' && (
        <div className="flex gap-4">
          <form action={async () => {
            'use server'
            const formData = new FormData()
            formData.append('driverId', params.id)
            await approveDriver(formData)
          }}>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Aprobar Conductor
            </button>
          </form>
          <form action={async () => {
            'use server'
            const formData = new FormData()
            formData.append('driverId', params.id)
            formData.append('rejection_reason', 'Rechazado por staff/admin')
            await rejectDriver(formData)
          }}>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Rechazar
            </button>
          </form>
        </div>
      )}
    </div>
  )
}