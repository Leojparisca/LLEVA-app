import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { UserRole } from '@lleva/shared-types'

interface PersistedUser {
  id:         string
  email:      string
  full_name:  string
  phone:      string | null
  avatar_url: string | null
  role:       UserRole
}

interface AuthState {
  user:       PersistedUser | null
  session:    Session | null
  isLoading:  boolean
  isReady:    boolean
  error:      string | null

  initialize:  () => Promise<void>
  setSession:  (session: Session | null) => Promise<void>
  signOut:     () => Promise<void>
  clearError:  () => void
}

async function fetchUserData(userId: string): Promise<PersistedUser | null> {
  const { data, error } = await supabase
    .from('user_roles')
    .select(`
      role,
      profile:profiles!user_id (
        id,
        full_name,
        phone,
        avatar_url
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('granted_at', { ascending: false })
    .limit(1)
    .single()

  if (error || !data || !data.profile) {
    console.error('[fetchUserData] Error:', error?.message ?? 'No profile found')
    return null
  }

  const profile = Array.isArray(data.profile) ? data.profile[0] : data.profile
  if (!profile) return null

  return {
    id:         profile.id,
    email:      '',
    full_name:  profile.full_name,
    phone:      profile.phone ?? null,
    avatar_url: profile.avatar_url ?? null,
    role:       data.role as UserRole,
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:      null,
      session:   null,
      isLoading: false,
      isReady:   false,
      error:     null,

      initialize: async () => {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          await get().setSession(session)
        } else {
          set({ isReady: true })
        }

        supabase.auth.onAuthStateChange(async (_event, session) => {
          await get().setSession(session)
        })
      },

      setSession: async (session) => {
        if (!session) {
          set({
            user:      null,
            session:   null,
            isLoading: false,
            isReady:   true,
            error:     null,
          })
          return
        }

        set({ isLoading: true, error: null })

        try {
          const userData = await fetchUserData(session.user.id)

          if (!userData) {
            throw new Error('User profile not found after registration')
          }

          set({
            session,
            user: {
              ...userData,
              email: session.user.email ?? '',
            },
            isLoading: false,
            isReady:   true,
            error:     null,
          })

        } catch (err) {
          const message = err instanceof Error ? err.message : 'Session error'
          console.error('[useAuthStore][setSession]', message)

          await supabase.auth.signOut()
          set({
            user:      null,
            session:   null,
            isLoading: false,
            isReady:   true,
            error:     'Sesión inválida. Por favor inicia sesión de nuevo.',
          })
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        const { error } = await supabase.auth.signOut()

        if (error) {
          console.error('[useAuthStore][signOut]', error.message)
        }

        set({
          user:      null,
          session:   null,
          isLoading: false,
          error:     null,
        })
      },

      clearError: () => set({ error: null }),
    }),

    {
      name: 'lleva-auth-v2',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): Pick<AuthState, 'user'> => ({
        user: state.user,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error) {
          console.error('[useAuthStore] Rehydration error:', error)
        }
      },
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version === 1) {
          return { user: null }
        }
        return persistedState as Partial<AuthState>
      },
    }
  )
)

export const useAuthUser      = () => useAuthStore((s) => s.user)
export const useAuthSession   = () => useAuthStore((s) => s.session)
export const useIsReady       = () => useAuthStore((s) => s.isReady)
export const useIsLoading     = () => useAuthStore((s) => s.isLoading)
export const useAuthError     = () => useAuthStore((s) => s.error)
export const useUserRole      = () => useAuthStore((s) => s.user?.role ?? null)
export const useIsPassenger   = () => useAuthStore((s) => s.user?.role === 'passenger')
export const useIsDriver      = () => useAuthStore((s) => s.user?.role === 'driver')
export const useIsAdminPanel  = () => useAuthStore((s) =>
  ['admin', 'owner', 'staff'].includes(s.user?.role ?? '')
)