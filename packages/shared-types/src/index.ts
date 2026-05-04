import { z } from 'zod'

export const UserRoleSchema = z.enum([
  'passenger',
  'driver',
  'staff',
  'admin',
  'owner',
])

export type UserRole = z.infer<typeof UserRoleSchema>

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  passenger: 0,
  driver:    1,
  staff:     2,
  admin:     3,
  owner:     4,
} as const

export const TripStatusSchema = z.enum([
  'searching',
  'matched',
  'arriving',
  'in_progress',
  'completed',
  'cancelled',
  'disputed',
])

export const DriverStatusSchema = z.enum([
  'offline',
  'online',
  'busy',
  'suspended',
])

export const VerificationStatusSchema = z.enum([
  'pending',
  'in_review',
  'approved',
  'rejected',
  'expired',
])

export const CoordinatesSchema = z.object({
  latitude:  z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
})

export const LocationSchema = z.object({
  coordinates: CoordinatesSchema,
  address:     z.string().min(5).max(500),
  place_id:    z.string().optional(),
})

export const TripSchema = z.object({
  id:              z.string().uuid(),
  passenger_id:    z.string().uuid(),
  driver_id:       z.string().uuid().nullable(),
  status:          TripStatusSchema,
  origin:          LocationSchema,
  destination:     LocationSchema,
  estimated_fare:  z.number().positive(),
  final_fare:      z.number().positive().nullable(),
  created_at:      z.string().datetime(),
  updated_at:      z.string().datetime(),
})

export type Trip         = z.infer<typeof TripSchema>
export type TripStatus   = z.infer<typeof TripStatusSchema>
export type DriverStatus = z.infer<typeof DriverStatusSchema>
export type Coordinates  = z.infer<typeof CoordinatesSchema>
export type Location     = z.infer<typeof LocationSchema>