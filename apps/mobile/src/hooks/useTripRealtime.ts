import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Trip } from '@lleva/shared-types'

interface UseTripRealtimeOptions {
  tripId: string | null
  onStatusChange?: (trip: Trip) => void
}

interface UseTripRealtimeReturn {
  trip: Trip | null
  isLoading: boolean
  error: string | null
}

export function useTripRealtime({
  tripId,
  onStatusChange,
}: UseTripRealtimeOptions): UseTripRealtimeReturn {
  const [trip, setTrip] = useState<Trip | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!tripId) {
      setTrip(null)
      return
    }

    let isMounted = true
    setLoading(true)
    setError(null)

    const fetchTrip = async () => {
      const { data, error: fetchError } = await supabase
        .from('trips')
        .select('*')
        .eq('id', tripId)
        .single()

      if (!isMounted) return

      if (fetchError) {
        setError('No se pudo cargar el viaje')
        setLoading(false)
        return
      }

      setTrip(data as Trip)
      setLoading(false)
    }

    fetchTrip()

    channelRef.current = supabase
      .channel(`trip:${tripId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        async (payload) => {
          if (!isMounted) return
          const updatedTrip = payload.new as Trip
          setTrip(updatedTrip)
          onStatusChange?.(updatedTrip)
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError('Error de conexión en tiempo real')
        }
      })

    return () => {
      isMounted = false
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tripId])

  return { trip, isLoading, error }
}