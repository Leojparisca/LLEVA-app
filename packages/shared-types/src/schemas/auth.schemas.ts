import { z } from 'zod'

const fullNameSchema = z
  .string({ required_error: 'El nombre es obligatorio' })
  .min(2, 'Mínimo 2 caracteres')
  .max(100, 'Máximo 100 caracteres')
  .trim()
  .regex(
    /^[a-zA-ZÀ-ÿ\u00f1\u00d1\s'-]+$/,
    'Solo letras, espacios, guiones y apóstrofes'
  )

const phoneSchema = z
  .string({ required_error: 'El teléfono es obligatorio' })
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    'Formato internacional requerido: +58XXXXXXXXX'
  )

const emailSchema = z
  .string({ required_error: 'El email es obligatorio' })
  .email('Email inválido')
  .toLowerCase()
  .trim()

const passwordSchema = z
  .string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'Mínimo 8 caracteres')
  .max(72, 'Máximo 72 caracteres — límite bcrypt')
  .regex(/[A-Z]/, 'Debe incluir al menos una mayúscula')
  .regex(/[0-9]/, 'Debe incluir al menos un número')
  .regex(/[^A-Za-z0-9]/, 'Debe incluir al menos un carácter especial')

const confirmPasswordSchema = z
  .string({ required_error: 'Confirma tu contraseña' })

export const PassengerRegisterSchema = z
  .object({
    full_name:        fullNameSchema,
    phone:            phoneSchema,
    email:            emailSchema,
    password:         passwordSchema,
    confirm_password: confirmPasswordSchema,
    role: z.literal('passenger'),
    terms_accepted: z
      .boolean()
      .refine((v) => v === true, 'Debes aceptar los términos de servicio'),
  })
  .refine(
    (data) => data.password === data.confirm_password,
    {
      message: 'Las contraseñas no coinciden',
      path:    ['confirm_password'],
    }
  )

export const DriverRegisterSchema = z
  .object({
    full_name:        fullNameSchema,
    phone:            phoneSchema,
    email:            emailSchema,
    password:         passwordSchema,
    confirm_password: confirmPasswordSchema,
    role: z.literal('driver'),
    license_number: z
      .string({ required_error: 'Número de licencia obligatorio' })
      .min(5, 'Mínimo 5 caracteres')
      .max(20, 'Máximo 20 caracteres')
      .trim()
      .toUpperCase(),
    license_expiry: z
      .string({ required_error: 'Fecha de vencimiento obligatoria' })
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato requerido: YYYY-MM-DD')
      .refine(
        (date) => new Date(date) > new Date(),
        'La licencia de conducir está vencida'
      ),
    vehicle_plate: z
      .string({ required_error: 'Placa del vehículo obligatoria' })
      .min(4, 'Mínimo 4 caracteres')
      .max(10, 'Máximo 10 caracteres')
      .trim()
      .toUpperCase(),
    vehicle_model: z
      .string({ required_error: 'Modelo del vehículo obligatorio' })
      .min(2, 'Mínimo 2 caracteres')
      .max(50, 'Máximo 50 caracteres')
      .trim(),
    vehicle_year: z
      .number({
        required_error:  'Año del vehículo obligatorio',
        invalid_type_error: 'Debe ser un número',
      })
      .int('Debe ser un año completo')
      .min(2000, 'Año mínimo: 2000')
      .max(new Date().getFullYear() + 1, `Año máximo: ${new Date().getFullYear() + 1}`),
    vehicle_color: z
      .string({ required_error: 'Color del vehículo obligatorio' })
      .min(2, 'Mínimo 2 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .trim(),
    terms_accepted: z
      .boolean()
      .refine((v) => v === true, 'Debes aceptar los términos de servicio'),
  })
  .refine(
    (data) => data.password === data.confirm_password,
    {
      message: 'Las contraseñas no coinciden',
      path:    ['confirm_password'],
    }
  )

export const LoginSchema = z.object({
  email:    emailSchema,
  password: z.string({ required_error: 'La contraseña es obligatoria' })
             .min(1, 'Contraseña requerida'),
})

export type PassengerRegisterInput = z.infer<typeof PassengerRegisterSchema>
export type DriverRegisterInput    = z.infer<typeof DriverRegisterSchema>
export type LoginInput             = z.infer<typeof LoginSchema>
export type RegisterInput = PassengerRegisterInput | DriverRegisterInput