'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@lleva/shared-types'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/trips', label: 'Viajes', icon: '🚗' },
  { href: '/dashboard/trips/active', label: 'Viajes Activos', icon: '🗺️' },
  { href: '/dashboard/drivers', label: 'Conductores', icon: '👤' },
  { href: '/dashboard/drivers/pending', label: 'KYC Pendiente', icon: '📋' },
  { href: '/dashboard/users', label: 'Pasajeros', icon: '🚶' },
  { href: '/dashboard/finance', label: 'Finanzas', icon: '💰' },
  { href: '/dashboard/finance/fares', label: 'Tarifas', icon: '💵' },
  { href: '/dashboard/staff', label: 'Staff', icon: '👥', roles: ['admin', 'owner'] as UserRole[] },
  { href: '/dashboard/audit', label: 'Auditoría', icon: '📜', roles: ['admin', 'owner'] as UserRole[] },
  { href: '/dashboard/system', label: 'Sistema', icon: '⚙️', roles: ['owner'] as UserRole[] },
]

interface SidebarProps {
  userRole: UserRole
}

export function Sidebar({ userRole }: SidebarProps) {
  const pathname = usePathname()

  const filteredItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  )

  return (
    <aside className="w-64 bg-neutral-900 text-white flex flex-col">
      <div className="p-4 border-b border-neutral-800">
        <h1 className="text-xl font-bold">LLEVA Admin</h1>
        <p className="text-xs text-neutral-400 mt-1 capitalize">{userRole}</p>
      </div>
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`block px-3 py-2 rounded transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'hover:bg-neutral-800 text-neutral-300'
                  }`}
                >
                  <span className="mr-2">{item.icon}</span>
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}