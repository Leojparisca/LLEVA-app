import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getPendingDrivers() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} }
  )

  const { data } = await supabase
    .from('drivers')
    .select('*, profiles!drivers_user_id_fkey(full_name, phone)')
    .eq('verification_status', 'pending')
    .order('created_at', { ascending: false })
    .limit(20)

  return data || []
}

export default async function PendingKYCPage() {
  const drivers = await getPendingDrivers()

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">KYC Pendiente</h1>

      {drivers.length === 0 ? (
        <div className="bg-white rounded-lg border p-8 text-center text-neutral-500">
          No hay conductores pendientes de verificación
        </div>
      ) : (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Conductor</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Teléfono</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Vehículo</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Fecha Registro</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Acción</th>
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
                    {driver.vehicle_model} ({driver.vehicle_plate})
                  </td>
                  <td className="px-4 py-3 text-sm text-neutral-500">
                    {new Date(driver.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/drivers/${driver.id}/documents`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      Revisar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}