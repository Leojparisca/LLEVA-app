import { createServerClient } from '@supabase/ssr'
import { ActiveTripsMonitor } from '@/components/dashboard/ActiveTripsMonitor'

export const dynamic = 'force-dynamic'

async function getActiveTrips() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} }
  )

  const { data } = await supabase
    .from('trips')
    .select(`
      id, status, origin_address, destination_address,
      estimated_fare, created_at,
      passenger:profiles!passenger_id(full_name)
    `)
    .in('status', ['searching', 'matched', 'arriving', 'in_progress'])
    .order('created_at', { ascending: false })
    .limit(20)

  return (data || []).map((t: any) => ({
    ...t,
    passenger_name: t.passenger?.full_name ?? 'N/A',
  }))
}

export default async function ActiveTripsPage() {
  const initialTrips = await getActiveTrips()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Viajes Activos</h1>
        <p className="text-neutral-500">Monitoreo en tiempo real</p>
      </div>

      <ActiveTripsMonitor initialTrips={initialTrips} />

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-amber-700">
            {initialTrips.filter(t => t.status === 'searching').length}
          </div>
          <div className="text-sm text-amber-600">Buscando</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-700">
            {initialTrips.filter(t => t.status === 'matched').length}
          </div>
          <div className="text-sm text-blue-600">Asignados</div>
        </div>
        <div className="bg-violet-50 border border-violet-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-violet-700">
            {initialTrips.filter(t => t.status === 'arriving').length}
          </div>
          <div className="text-sm text-violet-600">En camino</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-700">
            {initialTrips.filter(t => t.status === 'in_progress').length}
          </div>
          <div className="text-sm text-green-600">En trayecto</div>
        </div>
      </div>
    </div>
  )
}