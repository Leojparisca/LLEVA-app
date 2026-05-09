import { useEffect, useRef, useCallback } from 'react'
import * as Location from 'expo-location'
import * as TaskManager from 'expo-task-manager'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth.store'

export const BACKGROUND_LOCATION_TASK = 'lleva-driver-location-task'

const MIN_DISTANCE_THRESHOLD_METERS = 15
const MIN_UPDATE_INTERVAL_MS = 4_000

const ACCURACY_CONFIG = {
  idle: {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 10_000,
    distanceInterval: 30,
  },
  active: {
    accuracy: Location.Accuracy.BestForNavigation,
    timeInterval: 4_000,
    distanceInterval: MIN_DISTANCE_THRESHOLD_METERS,
  },
} as const

interface UseDriverLocationOptions {
  isTracking: boolean
  haActiveTrip?: boolean
  activeTripId?: string | null
}

interface LocationPoint {
  lat: number
  lng: number
  heading?: number
}

export function useDriverLocation({
  isTracking,
  haActiveTrip = false,
  activeTripId = null,
}: UseDriverLocationOptions): void {
  const user = useAuthStore((s) => s.user)
  const lastLocationRef = useRef<LocationPoint | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)
  const foregroundSubRef = useRef<Location.LocationSubscription | null>(null)
  const isMountedRef = useRef(true)

  const updateLocationInSupabase = useCallback(async (
    point: LocationPoint
  ): Promise<void> => {
    if (!user?.id || !isMountedRef.current) return

    const now = Date.now()

    if (now - lastUpdateTimeRef.current < MIN_UPDATE_INTERVAL_MS) return

    if (lastLocationRef.current) {
      const distance = calculateDistanceMeters(
        lastLocationRef.current.lat, lastLocationRef.current.lng,
        point.lat, point.lng
      )
      if (distance < MIN_DISTANCE_THRESHOLD_METERS) return
    }

    lastLocationRef.current = point
    lastUpdateTimeRef.current = now

    const { error: dbError } = await supabase
      .from('driver_profiles')
      .update({
        current_location: `POINT(${point.lng} ${point.lat})`,
        last_location_at: new Date().toISOString(),
      })
      .eq('id', user.id)

    if (dbError) {
      console.error('[useDriverLocation] DB update error:', dbError.message)
    }

    if (activeTripId && !dbError) {
      await supabase
        .channel(`trip:${activeTripId}`)
        .send({
          type: 'broadcast',
          event: 'driver_location',
          payload: {
            lat: point.lat,
            lng: point.lng,
            heading: point.heading,
            ts: now,
          },
        })
    }
  }, [user?.id, activeTripId])

  const startForegroundTracking = useCallback(async (): Promise<void> => {
    if (!isMountedRef.current) return

    foregroundSubRef.current?.remove()
    foregroundSubRef.current = null

    const config = haActiveTrip ? ACCURACY_CONFIG.active : ACCURACY_CONFIG.idle

    console.debug('[useDriverLocation] Iniciando tracking:', haActiveTrip ? 'ACTIVO' : 'IDLE')

    foregroundSubRef.current = await Location.watchPositionAsync(
      config,
      (location) => {
        if (!isMountedRef.current) return

        updateLocationInSupabase({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          heading: location.coords.heading ?? undefined,
        })
      }
    )
  }, [haActiveTrip, updateLocationInSupabase])

  const startBackgroundTracking = useCallback(async (): Promise<void> => {
    const isTaskDefined = TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)
    if (!isTaskDefined) {
      console.error('[useDriverLocation] Task no definida:', BACKGROUND_LOCATION_TASK)
      return
    }

    const isRunning = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    ).catch(() => false)

    if (isRunning) return

    const config = haActiveTrip ? ACCURACY_CONFIG.active : ACCURACY_CONFIG.idle

    await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
      accuracy: config.accuracy,
      timeInterval: config.timeInterval,
      distanceInterval: config.distanceInterval,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'LLEVA — Conductor activo',
        notificationBody: 'Tu ubicación está siendo compartida.',
        notificationColor: '#007AFF',
      },
      pausesUpdatesAutomatically: !haActiveTrip,
      activityType: haActiveTrip
        ? Location.ActivityType.AutomotiveNavigation
        : Location.ActivityType.Other,
    })

    console.debug('[useDriverLocation] Background started:', haActiveTrip ? 'ACTIVO' : 'IDLE')
  }, [haActiveTrip])

  const stopAllTracking = useCallback(async (): Promise<void> => {
    foregroundSubRef.current?.remove()
    foregroundSubRef.current = null

    const isRunning = await Location.hasStartedLocationUpdatesAsync(
      BACKGROUND_LOCATION_TASK
    ).catch(() => false)

    if (isRunning) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        .catch((err) => console.warn('[useDriverLocation] Stop bg error:', err))
    }

    console.debug('[useDriverLocation] Tracking detenido')
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    if (!isTracking || !user?.id || user.role !== 'driver') {
      stopAllTracking()
      return
    }

    const initialize = async () => {
      const { status: fgStatus } = await Location.requestForegroundPermissionsAsync()
      if (fgStatus !== 'granted') {
        console.warn('[useDriverLocation] Permiso foreground denegado')
        return
      }

      const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync()
      if (bgStatus !== 'granted') {
        await startForegroundTracking()
        return
      }

      await Promise.all([
        startForegroundTracking(),
        startBackgroundTracking(),
      ])
    }

    initialize().catch((err) => {
      console.error('[useDriverLocation] Error init:', err)
    })

    return () => {
      isMountedRef.current = false
      stopAllTracking()
    }
  }, [isTracking, user?.id, stopAllTracking])

  useEffect(() => {
    if (!isTracking || !user?.id) return

    startForegroundTracking().catch(console.error)
    stopAllTracking().then(() => startBackgroundTracking()).catch(console.error)
  }, [haActiveTrip])
}

export function registerBackgroundLocationTask(): void {
  TaskManager.defineTask(
    BACKGROUND_LOCATION_TASK,
    async ({ data, error }: TaskManager.TaskManagerTaskBody<{
      locations: Location.LocationObject[]
    }>) => {
      if (error) {
        console.error('[BackgroundTask] Error:', error.message)
        return
      }

      if (!data?.locations?.length) return

      const location = data.locations[data.locations.length - 1]
      if (!location) return

      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user?.id) return

      const { error: dbError } = await supabase
        .from('driver_profiles')
        .update({
          current_location: `POINT(${location.coords.longitude} ${location.coords.latitude})`,
          last_location_at: new Date().toISOString(),
        })
        .eq('id', session.user.id)

      if (dbError) {
        console.error('[BackgroundTask] DB update error:', dbError.message)
      }
    }
  )
}

function calculateDistanceMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6_371_000
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}