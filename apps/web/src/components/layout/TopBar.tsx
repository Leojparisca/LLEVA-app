'use client'

import { createClientComponentClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import type { UserRole } from '@lleva/shared-types'

interface TopBarProps {
  userId: string
  userRole: UserRole
}

export function TopBar({ userId, userRole }: TopBarProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-6">
      <div className="text-sm text-neutral-500">
        Panel de Administración
      </div>
      <div className="flex items-center gap-4">
        <div className="text-sm">
          <span className="text-neutral-500">Rol: </span>
          <span className="font-medium capitalize">{userRole}</span>
        </div>
        <button
          onClick={handleSignOut}
          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded"
        >
          Cerrar Sesión
        </button>
      </div>
    </header>
  )
}