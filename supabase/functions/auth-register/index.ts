import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.0'

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PasswordSchema = z
  .string()
  .min(8)
  .max(72)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/)

const RegisterSchema = z.discriminatedUnion('role', [
  z.object({
    role:             z.literal('passenger'),
    full_name:        z.string().min(2).max(100).trim(),
    email:            z.string().email().toLowerCase(),
    phone:            z.string().regex(/^\+[1-9]\d{7,14}$/),
    password:         PasswordSchema,
    confirm_password: z.string(),
  }).refine(d => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  }),
  z.object({
    role:             z.literal('driver'),
    full_name:        z.string().min(2).max(100).trim(),
    email:            z.string().email().toLowerCase(),
    phone:            z.string().regex(/^\+[1-9]\d{7,14}$/),
    password:         PasswordSchema,
    confirm_password: z.string(),
    license_number:   z.string().min(5).max(20),
    license_expiry:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    vehicle_plate:    z.string().min(4).max(10),
    vehicle_model:    z.string().min(2).max(50),
    vehicle_year:     z.number().int().min(2000).max(2030),
    vehicle_color:    z.string().min(2).max(30),
  }).refine(d => d.password === d.confirm_password, {
    path: ['confirm_password'],
    message: 'Passwords do not match',
  }).refine(d => new Date(d.license_expiry) > new Date(), {
    path: ['license_expiry'],
    message: 'License is expired',
  }),
])

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    let body: unknown
    try {
      body = await req.json()
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validation = RegisterSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error:   'Validation failed',
          details: validation.error.flatten().fieldErrors,
        }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const data = validation.data

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email:             data.email,
      password:          data.password,
      email_confirm:     false,
      user_metadata: {
        full_name: data.full_name,
        phone:     data.phone,
        role:      data.role,
      },
    })

    if (authError || !authData.user) {
      const isEmailTaken = authError?.message?.includes('already registered')
      return new Response(
        JSON.stringify({
          error: isEmailTaken ? 'Email already in use' : 'Registration failed',
          code:  isEmailTaken ? 'EMAIL_TAKEN' : 'AUTH_ERROR',
        }),
        { status: isEmailTaken ? 409 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (data.role === 'driver') {
      const { error: profileError } = await supabase
        .from('driver_profiles')
        .update({
          license_number: data.license_number.toUpperCase(),
          license_expiry: data.license_expiry,
          vehicle_plate:  data.vehicle_plate.toUpperCase(),
          vehicle_model:  data.vehicle_model,
          vehicle_year:   data.vehicle_year,
          vehicle_color:  data.vehicle_color,
        })
        .eq('id', authData.user.id)

      if (profileError) {
        await supabase.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: 'Profile creation failed', code: 'PROFILE_ERROR' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    await supabase.from('audit_logs').insert({
      actor_id:   authData.user.id,
      actor_role: data.role,
      action:    'auth.register',
      entity_type: 'user',
      entity_id:  authData.user.id,
      new_data:   { role: data.role, email: data.email },
      ip_address: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
      user_agent: req.headers.get('user-agent'),
    })

    return new Response(
      JSON.stringify({
        success:  true,
        message:  'Registration successful. Please verify your email.',
        user_id:  authData.user.id,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[auth-register] Unhandled error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})