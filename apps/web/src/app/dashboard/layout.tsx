import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import type { UserRole } from '@lleva/shared-types'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  const userRole = headersList.get('x-user-role') as UserRole | null

  if (!userId || !userRole) {
    redirect('/auth/login')
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar userRole={userRole} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar userId={userId} userRole={userRole} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}