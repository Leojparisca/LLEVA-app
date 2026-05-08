import { supabase } from '@/lib/supabase'
import {
  PassengerRegisterSchema,
  DriverRegisterSchema,
  LoginSchema,
} from '@lleva/shared-types'
import type {
  PassengerRegisterInput,
  DriverRegisterInput,
  LoginInput,
} from '@lleva/shared-types'

type ServiceResult<T = void> =
  | { success: true; data: T; error: null }
  | { success: false; data: null; error: string }

export async function registerPassenger(
  rawInput: unknown
): Promise<ServiceResult<{ userId: string }>> {
  const validation = PassengerRegisterSchema.safeParse(rawInput)
  if (!validation.success) {
    const firstError = Object.values(
      validation.error.flatten().fieldErrors
    )[0]?.[0] ?? 'Datos de registro inválidos'
    return { success: false, data: null, error: firstError }
  }

  const { email, password, full_name, phone, role } = validation.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
        role,
      },
      emailRedirectTo: 'lleva://auth/callback',
    },
  })

  if (error) {
    const errorMap: Record<string, string> = {
      'User already registered': 'Este email ya está registrado',
      'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos',
      'Password should be at least': 'La contraseña no cumple los requisitos',
    }

    const userMessage = Object.entries(errorMap).find(([key]) =>
      error.message.includes(key)
    )?.[1] ?? 'Error al registrarse. Intenta de nuevo'

    return { success: false, data: null, error: userMessage }
  }

  if (!data.user) {
    return { success: false, data: null, error: 'Registro fallido. Intenta de nuevo' }
  }

  return {
    success: true,
    data: { userId: data.user.id },
    error: null,
  }
}

export async function registerDriver(
  rawInput: unknown
): Promise<ServiceResult<{ userId: string }>> {
  const validation = DriverRegisterSchema.safeParse(rawInput)
  if (!validation.success) {
    const firstError = Object.values(
      validation.error.flatten().fieldErrors
    )[0]?.[0] ?? 'Datos de registro inválidos'
    return { success: false, data: null, error: firstError }
  }

  const {
    email, password, full_name, phone, role,
    license_number, license_expiry,
    vehicle_plate, vehicle_model, vehicle_year, vehicle_color,
  } = validation.data

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name,
        phone,
        role,
      },
      emailRedirectTo: 'lleva://auth/callback',
    },
  })

  if (error) {
    const errorMap: Record<string, string> = {
      'User already registered': 'Este email ya está registrado',
      'Email rate limit exceeded': 'Demasiados intentos. Espera unos minutos',
    }

    const userMessage = Object.entries(errorMap).find(([key]) =>
      error.message.includes(key)
    )?.[1] ?? 'Error al registrarse. Intenta de nuevo'

    return { success: false, data: null, error: userMessage }
  }

  if (!data.user) {
    return { success: false, data: null, error: 'Registro fallido. Intenta de nuevo' }
  }

  const { error: profileError } = await supabase
    .from('driver_profiles')
    .update({
      license_number,
      license_expiry,
      vehicle_plate,
      vehicle_model,
      vehicle_year,
      vehicle_color,
    })
    .eq('id', data.user.id)

  if (profileError) {
    console.error(
      '[registerDriver] driver_profiles update failed:',
      profileError.message,
      '| user_id:', data.user.id
    )
  }

  return {
    success: true,
    data: { userId: data.user.id },
    error: null,
  }
}

export async function loginUser(
  rawInput: unknown
): Promise<ServiceResult<{ userId: string }>> {
  const validation = LoginSchema.safeParse(rawInput)
  if (!validation.success) {
    return { success: false, data: null, error: 'Email o contraseña inválidos' }
  }

  const { email, password } = validation.data

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return {
      success: false,
      data: null,
      error: 'Email o contraseña incorrectos',
    }
  }

  return {
    success: true,
    data: { userId: data.user.id },
    error: null,
  }
}