import { createServerClient } from '@supabase/ssr'
import Link from 'next/link'

async function getTrips() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} }
  )

  const { data } = await supabase
    .from('trips')
    .select('*, passenger:profiles!trips_passenger_id_fkey(full_name), driver:drivers(id, vehicle_plate)')
    .order('created_at', { ascending: false })
    .limit(50)

  return data || []
}

export default async function TripsPage() {
  const trips = await getTrips()

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Viajes</h1>
        <Link
          href="/dashboard/trips/active"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Ver Mapa en Vivo
        </Link>
      </div>

      <div className="bg-white rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-neutral-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Pasajero</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Origen</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Destino</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Tarifa</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Fecha</th>
            </tr>
          </thead>
          <tbody>
            {trips.map((trip: any) => (
              <tr key={trip.id} className="border-b hover:bg-neutral-50">
                <td className="px-4 py-3 text-sm font-mono">{trip.id.slice(0, 8)}...</td>
                <td className="px-4 py-3 text-sm">{trip.passenger?.full_name || '-'}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate">{trip.origin_address}</td>
                <td className="px-4 py-3 text-sm max-w-xs truncate">{trip.destination_address}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                    trip.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    trip.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                    trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {trip.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">${trip.estimated_fare}</td>
                <td className="px-4 py-3 text-sm text-neutral-500">
                  {new Date(trip.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}