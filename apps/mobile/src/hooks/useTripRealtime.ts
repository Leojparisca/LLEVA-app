import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface TripDriver {
  id: string
  vehicle_plate: string
  vehicle_model: string
  vehicle_color: string
  rating_average: number
  profile: {
    full_name: string
    avatar_url: string | null
    phone: string | null
  }
}

export interface TripWithDriver {
  id: string
  passenger_id: string
  driver_id: string | null
  status: string
  origin_address: string
  origin_lat: number
  origin_lng: number
  destination_address: string
  destination_lat: number
  destination_lng: number
  estimated_fare: number
  final_fare: number | null
  fare_currency: string
  requested_at: string
  matched_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  driver: TripDriver | null
}

type TripUpdatePayload = {
  id: string
  status: string
  driver_id: string | null
  final_fare: number | null
  matched_at: string | null
  started_at: string | null
  completed_at: string | null
  cancelled_at: string | null
  [key: string]: unknown
}

type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'error' | 'closed'

interface UseTripRealtimeOptions {
  tripId: string | null
  onStatusChange?: (trip: TripWithDriver) => void
  onDriverAssigned?: (driver: TripDriver) => void
  onTripCompleted?: (trip: TripWithDriver) => void
  onTripCancelled?: (trip: TripWithDriver) => void
}

interface UseTripRealtimeReturn {
  trip: TripWithDriver | null
  isLoading: boolean
  error: string | null
  realtimeStatus: RealtimeStatus
  refetch: () => Promise<void>
}

const TRIP_WITH_DRIVER_QUERY = `
  id,
  passenger_id,
  driver_id,
  status,
  origin_address,
  origin_lat,
  origin_lng,
  destination_address,
  destination_lat,
  destination_lng,
  estimated_fare,
  final_fare,
  fare_currency,
  requested_at,
  matched_at,
  started_at,
  completed_at,
  cancelled_at,
  cancellation_reason,
  driver:driver_profiles!driver_id (
    id,
    vehicle_plate,
    vehicle_model,
    vehicle_color,
    rating_average,
    profile:profiles!id (
      full_name,
      avatar_url,
      phone
    )
  )
` as const

const FIELDS_REQUIRING_REFETCH = new Set(['driver_id', 'status'])

const MAX_RETRY_DELAY_MS = 30_000
const BASE_RETRY_DELAY_MS = 1_000

export function useTripRealtime({
  tripId,
  onStatusChange,
  onDriverAssigned,
  onTripCompleted,
  onTripCancelled,
}: UseTripRealtimeOptions): UseTripRealtimeReturn {
  const [trip, setTrip] = useState<TripWithDriver | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeStatus>('connecting')

  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isMountedRef = useRef(true)
  const retryCountRef = useRef(0)
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const currentTripRef = useRef<TripWithDriver | null>(null)
  currentTripRef.current = trip

  const fetchTripFull = useCallback(async (): Promise<void> => {
    if (!tripId) return

    setIsLoading(true)
    setError(null)

    const { data, error: fetchError } = await supabase
      .from('trips')
      .select(TRIP_WITH_DRIVER_QUERY)
      .eq('id', tripId)
      .single()

    if (!isMountedRef.current) return

    if (fetchError || !data) {
      setError('No se pudo cargar el viaje')
      setIsLoading(false)
      console.error('[useTripRealtime][fetchTripFull]', fetchError?.message)
      return
    }

    const tripData = data as TripWithDriver
    setTrip(tripData)
    setIsLoading(false)
  }, [tripId])

  const handleRealtimeUpdate = useCallback(async (
    payload: { new: TripUpdatePayload; old: TripUpdatePayload }
  ) => {
    if (!isMountedRef.current) return

    const newPayload = payload.new
    const oldPayload = payload.old

    const requiresRefetch = Array.from(FIELDS_REQUIRING_REFETCH).some(
      (field) => newPayload[field] !== oldPayload[field]
    )

    if (requiresRefetch) {
      console.debug('[useTripRealtime] Campo crítico modificado. Re-fetch.', {
        status_changed: newPayload.status !== oldPayload.status,
        driver_id_changed: newPayload.driver_id !== oldPayload.driver_id,
      })

      await fetchTripFull()

      const updatedTrip = currentTripRef.current
      if (!updatedTrip || !isMountedRef.current) return

      onStatusChange?.(updatedTrip)

      if (!oldPayload.driver_id && newPayload.driver_id && updatedTrip.driver) {
        onDriverAssigned?.(updatedTrip.driver)
      }

      if (newPayload.status === 'completed') {
        onTripCompleted?.(updatedTrip)
      }

      if (newPayload.status === 'cancelled') {
        onTripCancelled?.(updatedTrip)
      }
    } else {
      setTrip((prevTrip) => {
        if (!prevTrip) return prevTrip

        const mergedTrip: TripWithDriver = {
          ...prevTrip,
          final_fare: newPayload.final_fare ?? prevTrip.final_fare,
          matched_at: newPayload.matched_at ?? prevTrip.matched_at,
          started_at: newPayload.started_at ?? prevTrip.started_at,
          completed_at: newPayload.completed_at ?? prevTrip.completed_at,
          cancelled_at: newPayload.cancelled_at ?? prevTrip.cancelled_at,
          cancellation_reason: newPayload.cancellation_reason ?? prevTrip.cancellation_reason,
        }

        return mergedTrip
      })

      console.debug('[useTripRealtime] Actualización de campos escalares.')
    }
  }, [fetchTripFull, onStatusChange, onDriverAssigned, onTripCompleted, onTripCancelled])

  const setupChannel = useCallback(() => {
    if (!tripId || !isMountedRef.current) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setRealtimeStatus('connecting')

    const channel = supabase.channel(`trip:${tripId}`)

    channel
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'trips',
          filter: `id=eq.${tripId}`,
        },
        (payload) => {
          handleRealtimeUpdate(payload as { new: TripUpdatePayload; old: TripUpdatePayload })
        }
      )
      .on(
        'broadcast',
        { event: 'driver_location' },
        (payload: { payload: { lat: number; lng: number; heading?: number } }) => {
          if (!isMountedRef.current) return
          console.debug('[useTripRealtime] Driver location:', payload.payload)
        }
      )
      .subscribe((status, err) => {
        if (!isMountedRef.current) return

        switch (status) {
          case 'SUBSCRIBED':
            setRealtimeStatus('connected')
            retryCountRef.current = 0
            break
          case 'CHANNEL_ERROR':
            setRealtimeStatus('error')
            console.error('[useTripRealtime] Channel error:', err)
            scheduleRetry()
            break
          case 'TIMED_OUT':
            setRealtimeStatus('reconnecting')
            scheduleRetry()
            break
          case 'CLOSED':
            setRealtimeStatus('closed')
            break
        }
      })

    channelRef.current = channel
  }, [tripId, handleRealtimeUpdate])

  const scheduleRetry = useCallback(() => {
    if (!isMountedRef.current) return

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current)
    }

    retryCountRef.current += 1

    const delay = Math.min(
      BASE_RETRY_DELAY_MS * Math.pow(2, retryCountRef.current - 1),
      MAX_RETRY_DELAY_MS
    )

    console.debug(`[useTripRealtime] Retry ${retryCountRef.current} in ${delay}ms`)

    setRealtimeStatus('reconnecting')

    retryTimerRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setupChannel()
      }
    }, delay)
  }, [setupChannel])

  useEffect(() => {
    isMountedRef.current = true

    if (!tripId) {
      setTrip(null)
      setRealtimeStatus('closed')
      return
    }

    fetchTripFull().then(() => {
      if (isMountedRef.current) {
        setupChannel()
      }
    })

    return () => {
      isMountedRef.current = false

      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current)
      }

      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [tripId])

  return { trip, isLoading, error, realtimeStatus, refetch: fetchTripFull }
}