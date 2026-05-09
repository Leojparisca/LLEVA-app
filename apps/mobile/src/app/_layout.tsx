import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { useAuthStore } from '@/store/auth.store'
import { useDriverLocation } from '@/hooks/useDriverLocation'

const LOCATION_TASK_NAME = 'background-location-task'

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('[BackgroundLocation] Error:', error.message)
    return
  }

  const { locations } = data as { locations: Location.LocationObject[] }
  if (!locations || locations.length === 0) return

  const location = locations[0]
  const { latitude, longitude } = location.coords

  console.log('[BackgroundLocation]', latitude, longitude)
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isReady, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    const startBackgroundLocation = async () => {
      if (!user || user.role !== 'driver') return

      const isRunning = await TaskManager.isTaskRunningAsync(LOCATION_TASK_NAME)
      if (isRunning) return

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      })

      console.log('[RootLayout] Background location started')
    }

    startBackgroundLocation()

    return () => {
      Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).then((hasStarted) => {
        if (hasStarted) {
          Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME)
        }
      })
    }
  }, [user?.id, user?.role])

  const isDriverActive = user?.role === 'driver'
  useDriverLocation({ isActive: isDriverActive })

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return children
}