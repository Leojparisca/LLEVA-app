import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@lleva/shared-types'
import type { Session } from '@supabase/supabase-js'

interface AuthUser {
  id:        string
  email:     string
  full_name: string
  role:      UserRole
  avatar_url?: string
}

interface AuthState {
  user:        AuthUser | null
  session:     Session | null
  isLoading:   boolean
  isHydrated:  boolean
  error:       string | null

  setSession:  (session: Session | null) => Promise<void>
  signOut:    () => Promise<void>
  clearError:  () => void
  setHydrated: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:       null,
      session:    null,
      isLoading:  false,
      isHydrated: false,
      error:      null,

      setSession: async (session) => {
        if (!session) {
          set({ user: null, session: null, isLoading: false })
          return
        }

        set({ isLoading: true, error: null })

        try {
          const [profileRes, roleRes] = await Promise.all([
            supabase
              .from('profiles')
              .select('full_name, avatar_url')
              .eq('id', session.user.id)
              .single(),
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('is_active', true)
              .order('granted_at', { ascending: false })
              .limit(1)
              .single(),
          ])

          if (profileRes.error || roleRes.error) {
            throw new Error('Failed to fetch user data')
          }

          set({
            session,
            user: {
              id:         session.user.id,
              email:      session.user.email!,
              full_name:  profileRes.data.full_name,
              role:       roleRes.data.role as UserRole,
              avatar_url: profileRes.data.avatar_url,
            },
            isLoading: false,
          })
        } catch (error) {
          await supabase.auth.signOut()
          set({
            user:      null,
            session:   null,
            isLoading: false,
            error:     'Session error. Please sign in again.',
          })
        }
      },

      signOut: async () => {
        set({ isLoading: true })
        await supabase.auth.signOut()
        set({ user: null, session: null, isLoading: false, error: null })
      },

      clearError:   () => set({ error: null }),
      setHydrated:  () => set({ isHydrated: true }),
    }),
    {
      name:    'lleva-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user
          ? {
              id:         state.user.id,
              email:      state.user.email,
              full_name:  state.user.full_name,
              role:       state.user.role,
              avatar_url: state.user.avatar_url,
            }
          : null,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated()
      },
    }
  )
)

export const useAuthUser    = () => useAuthStore((s) => s.user)
export const useUserRole    = () => useAuthStore((s) => s.user?.role ?? null)
export const useIsDriver    = () => useAuthStore((s) => s.user?.role === 'driver')
export const useIsPassenger = () => useAuthStore((s) => s.user?.role === 'passenger')
export const useIsAdmin     = () => useAuthStore((s) =>
  ['admin', 'owner', 'staff'].includes(s.user?.role ?? '')
)