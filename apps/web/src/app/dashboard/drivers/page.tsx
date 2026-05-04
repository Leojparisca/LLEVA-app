import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getDrivers() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} }
  )

  const { data } = await supabase
    .from('drivers')
    .select('*, profiles!drivers_user_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}

export default async function DriversPage() {
  const drivers = await getDrivers()

  const statusColors: Record<string, string> = {
    offline: 'bg-gray-100 text-gray-700',
    online: 'bg-green-100 text-green-700',
    busy: 'bg-blue-100 text-blue-700',
    suspended: 'bg-red-100 text-red-700',
  }

  const verificationColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    in_review: 'bg-blue-100 text-blue-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Conductores</h1>
        <Link
          href="/dashboard/drivers/pending"
          className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700"
        >
          KYC Pendiente
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Conductor</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Teléfono</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Vehículo</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Verificación</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Rating</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {drivers.map((driver: any) => (
              <tr key={driver.id} className="border-b hover:bg-neutral-50">
                <td className="px-4 py-3">
                  <div className="font-medium">{driver.profiles?.full_name || 'N/A'}</div>
                </td>
                <td className="px-4 py-3 text-sm">{driver.profiles?.phone || '-'}</td>
                <td className="px-4 py-3 text-sm">
                  {driver.vehicle_model} - {driver.vehicle_plate}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[driver.status] || 'bg-gray-100'}`}>
                    {driver.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${verificationColors[driver.verification_status] || 'bg-gray-100'}`}>
                    {driver.verification_status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {driver.rating ? `${driver.rating}/5` : '-'}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/dashboard/drivers/${driver.id}/documents`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    Ver docs
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}