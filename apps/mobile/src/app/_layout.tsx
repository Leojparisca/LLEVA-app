import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import * as TaskManager from 'expo-task-manager'
import * as Location from 'expo-location'
import { useAuthStore } from '@/store/auth.store'
import { useDriverLocation, BACKGROUND_LOCATION_TASK, registerBackgroundLocationTask } from '@/hooks/useDriverLocation'

registerBackgroundLocationTask()

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, isReady, initialize } = useAuthStore()

  useEffect(() => {
    initialize()
  }, [])

  useEffect(() => {
    const startBackgroundLocation = async () => {
      if (!user || user.role !== 'driver') return

      const isRunning = await TaskManager.isTaskRunningAsync(BACKGROUND_LOCATION_TASK)
      if (isRunning) return

      await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 50,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
      })

      console.log('[RootLayout] Background location started')
    }

    startBackgroundLocation()

    return () => {
      Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK).then((hasStarted) => {
        if (hasStarted) {
          Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK)
        }
      })
    }
  }, [user?.id, user?.role])

  const isDriverActive = user?.role === 'driver'
  useDriverLocation({ isTracking: isDriverActive })

  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return children
}