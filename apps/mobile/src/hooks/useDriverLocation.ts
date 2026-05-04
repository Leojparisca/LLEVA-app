import { useEffect, useRef } from 'react'
import * as Location from 'expo-location'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

const LOCATION_UPDATE_INTERVAL_MS = 5000

interface UseDriverLocationOptions {
  isActive: boolean
}

export function useDriverLocation({ isActive }: UseDriverLocationOptions) {
  const user = useAuthStore((s) => s.user)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const watchRef = useRef<Location.LocationSubscription | null>(null)
  const lastLocRef = useRef<{ lat: number; lng: number } | null>(null)

  useEffect(() => {
    if (!isActive || !user || user.role !== 'driver') {
      watchRef.current?.remove()
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    let isMounted = true

    const startTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync()
      if (status !== 'granted') {
        console.warn('[useDriverLocation] Location permission denied')
        return
      }

      watchRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: LOCATION_UPDATE_INTERVAL_MS,
          distanceInterval: 10,
        },
        async (location) => {
          if (!isMounted) return

          const { latitude, longitude } = location.coords

          const last = lastLocRef.current
          if (last && Math.abs(last.lat - latitude) < 0.00001 &&
                       Math.abs(last.lng - longitude) < 0.00001) {
            return
          }

          lastLocRef.current = { lat: latitude, lng: longitude }

          const { error } = await supabase
            .from('drivers')
            .update({
              current_lat: latitude,
              current_lng: longitude,
              location_updated_at: new Date().toISOString(),
            })
            .eq('user_id', user.id)

          if (error) {
            console.error('[useDriverLocation] Update failed:', error.message)
          }
        }
      )
    }

    startTracking()

    return () => {
      isMounted = false
      watchRef.current?.remove()
      watchRef.current = null
    }
  }, [isActive, user?.id])
}