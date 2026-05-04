import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

async function getDashboardStats() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: {} }
  )

  const [
    tripsToday,
    activeTrips,
    onlineDrivers,
    pendingKYC,
    revenueToday,
    recentTrips,
  ] = await Promise.all([
    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),

    supabase
      .from('trips')
      .select('id', { count: 'exact', head: true })
      .in('status', ['searching', 'matched', 'arriving', 'in_progress']),

    supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'online'),

    supabase
      .from('drivers')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),

    supabase
      .from('trips')
      .select('final_fare')
      .eq('status', 'completed')
      .gte('completed_at', new Date().toISOString().split('T')[0]),

    supabase
      .from('trips')
      .select('*, passenger:profiles!trips_passenger_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  const revenue = revenueToday.data?.reduce(
    (sum, t) => sum + (t.final_fare ?? 0), 0
  ) ?? 0

  return {
    tripsToday: tripsToday.count ?? 0,
    activeTrips: activeTrips.count ?? 0,
    onlineDrivers: onlineDrivers.count ?? 0,
    pendingKYC: pendingKYC.count ?? 0,
    revenueToday: revenue,
    recentTrips: recentTrips.data ?? [],
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  const formatCurrency = (val: number) => `$${val.toFixed(2)}`

  const kpis = [
    { title: 'Viajes Hoy', value: stats.tripsToday, color: 'blue' },
    { title: 'Viajes Activos', value: stats.activeTrips, color: 'green', isLive: true },
    { title: 'Conductores Online', value: stats.onlineDrivers, color: 'violet', isLive: true },
    { title: 'Ingresos Hoy', value: formatCurrency(stats.revenueToday), color: 'emerald' },
  ]

  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    violet: 'bg-violet-50 border-violet-200 text-violet-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-sm text-neutral-500">
          {new Date().toLocaleDateString('es-ES', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      {stats.pendingKYC > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800">
          <span className="font-medium">KYC Pendiente:</span> {stats.pendingKYC} conductor(es) esperando verificación
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <div key={kpi.title} className={`p-6 rounded-lg border ${colorMap[kpi.color]}`}>
            <div className="text-sm text-neutral-600">{kpi.title}</div>
            <div className="text-3xl font-bold mt-2">
              {kpi.value}
              {kpi.isLive && (
                <span className="ml-2 inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 bg-white p-6 rounded-lg border">
          <h2 className="font-semibold mb-4">Mapa de Conductores Activos</h2>
          <div className="h-80 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
            Mapa en tiempo real (próximamente)
          </div>
        </div>

        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="p-4 border-b">
            <h2 className="font-semibold">Viajes Recientes</h2>
          </div>
          <div className="divide-y max-h-80 overflow-y-auto">
            {stats.recentTrips.map((trip: any) => (
              <div key={trip.id} className="p-4 hover:bg-neutral-50">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-sm font-medium">{trip.passenger?.full_name || 'Usuario'}</div>
                    <div className="text-xs text-neutral-500 truncate max-w-[200px]">
                      {trip.origin_address} → {trip.destination_address}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    trip.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                    trip.status === 'in_progress' ? 'bg-green-100 text-green-700' :
                    trip.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {trip.status}
                  </span>
                </div>
                <div className="mt-2 text-sm font-medium">
                  ${trip.estimated_fare}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}