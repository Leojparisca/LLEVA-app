'use client'

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { TripStatusBadge } from '@/components/ui/StatusBadge'

interface ActiveTrip {
  id: string
  status: string
  origin_address: string
  destination_address: string
  estimated_fare: number
  created_at: string
  passenger_name: string
}

interface ActiveTripsMonitorProps {
  initialTrips: ActiveTrip[]
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'hace un momento'
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} h`
  return `hace ${Math.floor(seconds / 86400)} días`
}

export function ActiveTripsMonitor({ initialTrips }: ActiveTripsMonitorProps) {
  const [trips, setTrips] = useState<ActiveTrip[]>(initialTrips)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const channel = supabase
      .channel('active-trips-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trips',
          filter: 'status=in.(searching,matched,arriving,in_progress)',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('trips')
              .select(`
                id, status, origin_address, destination_address,
                estimated_fare, created_at,
                passenger:profiles!passenger_id(full_name)
              `)
              .eq('id', (payload.new as any).id)
              .single()

            if (data) {
              setTrips(prev => [{
                ...data,
                passenger_name: (data as any).passenger?.full_name ?? 'N/A',
              }, ...prev])
            }
          }

          if (payload.eventType === 'UPDATE') {
            const updated = payload.new as any
            setTrips(prev => {
              if (!['searching', 'matched', 'arriving', 'in_progress'].includes(updated.status)) {
                return prev.filter(t => t.id !== updated.id)
              }
              return prev.map(t =>
                t.id === updated.id ? { ...t, status: updated.status } : t
              )
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  if (trips.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-xl border border-dashed">
        <p className="text-sm text-neutral-500">No hay viajes activos en este momento</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-white">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="font-semibold text-neutral-900">Viajes Activos</h3>
        <span className="flex items-center gap-1.5 text-xs text-green-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          En vivo · {trips.length} activos
        </span>
      </div>

      <div className="divide-y max-h-96 overflow-y-auto">
        {trips.map((trip) => (
          <div key={trip.id} className="flex items-center gap-4 px-4 py-3 hover:bg-neutral-50">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <TripStatusBadge status={trip.status as any} />
                <span className="text-xs text-neutral-400">
                  {formatTimeAgo(trip.created_at)}
                </span>
              </div>
              <p className="mt-1 truncate text-sm font-medium text-neutral-800">
                {trip.origin_address}
              </p>
              <p className="truncate text-xs text-neutral-500">
                → {trip.destination_address}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm font-semibold text-neutral-900">
                ${trip.estimated_fare.toFixed(2)}
              </p>
              <p className="text-xs text-neutral-500">{trip.passenger_name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}