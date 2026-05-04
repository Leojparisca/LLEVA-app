import { z } from 'zod'
import { UserRoleSchema } from '../index'

const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/[0-9]/, 'Debe contener al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe contener al menos un carácter especial')

const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{7,14}$/, 'Formato: +58XXXXXXXXX')

export const PassengerRegisterSchema = z.object({
  full_name:        z.string().min(2).max(100).trim(),
  email:            z.string().email().toLowerCase().trim(),
  phone:            phoneSchema,
  password:         passwordSchema,
  confirm_password: z.string(),
  role:             z.literal('passenger'),
}).refine(
  (data) => data.password === data.confirm_password,
  { message: 'Las contraseñas no coinciden', path: ['confirm_password'] }
)

export const DriverRegisterSchema = z.object({
  full_name:        z.string().min(2).max(100).trim(),
  email:            z.string().email().toLowerCase().trim(),
  phone:            phoneSchema,
  password:         passwordSchema,
  confirm_password: z.string(),
  role:             z.literal('driver'),
  license_number:   z.string().min(5).max(20).trim().toUpperCase(),
  license_expiry:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  vehicle_plate:    z.string().min(4).max(10).trim().toUpperCase(),
  vehicle_model:    z.string().min(2).max(50).trim(),
  vehicle_year:     z.number().int().min(2000).max(new Date().getFullYear() + 1),
  vehicle_color:    z.string().min(2).max(30).trim(),
}).refine(
  (data) => data.password === data.confirm_password,
  { message: 'Las contraseñas no coinciden', path: ['confirm_password'] }
).refine(
  (data) => new Date(data.license_expiry) > new Date(),
  { message: 'La licencia está vencida', path: ['license_expiry'] }
)

export const LoginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1, 'Contraseña requerida'),
})

export const StaffRegisterSchema = z.object({
  full_name:   z.string().min(2).max(100).trim(),
  email:       z.string().email().toLowerCase().trim(),
  role:        z.enum(['staff', 'admin']),
  department:  z.string().min(2).max(50).optional(),
  expires_at:  z.string().datetime().optional(),
})

export const RegisterSchema = z.discriminatedUnion('role', [
  PassengerRegisterSchema,
  DriverRegisterSchema,
])

export type PassengerRegisterInput = z.infer<typeof PassengerRegisterSchema>
export type DriverRegisterInput    = z.infer<typeof DriverRegisterSchema>
export type LoginInput             = z.infer<typeof LoginSchema>
export type StaffRegisterInput     = z.infer<typeof StaffRegisterSchema>
export type RegisterInput          = z.infer<typeof RegisterSchema>