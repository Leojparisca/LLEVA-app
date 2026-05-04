import type { TripStatus } from '@lleva/shared-types'

const TRIP_STATUS_CONFIG: Record<TripStatus, { label: string; color: string }> = {
  searching:   { label: 'Buscando',      color: 'bg-amber-100 text-amber-800 border-amber-200' },
  matched:     { label: 'Asignado',       color: 'bg-blue-100 text-blue-800 border-blue-200' },
  arriving:    { label: 'En camino',      color: 'bg-violet-100 text-violet-800 border-violet-200' },
  in_progress: { label: 'En trayecto',    color: 'bg-green-100 text-green-800 border-green-200' },
  completed:   { label: 'Completado',     color: 'bg-gray-100 text-gray-700 border-gray-200' },
  cancelled:   { label: 'Cancelado',     color: 'bg-red-100 text-red-800 border-red-200' },
  disputed:    { label: 'En Disputa',    color: 'bg-orange-100 text-orange-800 border-orange-200' },
}

const VERIFICATION_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:    { label: 'Pendiente',    color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
  in_review:  { label: 'En Revisión',  color: 'bg-blue-100 text-blue-800 border-blue-200' },
  approved:   { label: 'Aprobado',     color: 'bg-green-100 text-green-800 border-green-200' },
  rejected:   { label: 'Rechazado',    color: 'bg-red-100 text-red-800 border-red-200' },
  expired:    { label: 'Vencido',      color: 'bg-gray-100 text-gray-600 border-gray-200' },
}

interface TripStatusBadgeProps {
  status: TripStatus
}

export function TripStatusBadge({ status }: TripStatusBadgeProps) {
  const config = TRIP_STATUS_CONFIG[status]
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}

interface VerificationBadgeProps {
  status: string
}

export function VerificationBadge({ status }: VerificationBadgeProps) {
  const config = VERIFICATION_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'bg-gray-100 text-gray-600 border-gray-200'
  }
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  )
}