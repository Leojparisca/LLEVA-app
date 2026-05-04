import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://esm.sh/zod@3.22.0'

const TripRequestSchema = z.object({
  origin: z.object({
    latitude:  z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address:   z.string().min(5).max(500),
  }),
  destination: z.object({
    latitude:  z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    address:   z.string().min(5).max(500),
  }),
  fare_config_id: z.string().uuid().optional(),
})

const MAX_DRIVER_SEARCH_RADIUS_METERS = 5000

const corsHeaders = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .eq('role', 'passenger')
      .single()

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Only passengers can request trips' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const validation = TripRequestSchema.safeParse(body)
    if (!validation.success) {
      return new Response(
        JSON.stringify({ error: 'Validation failed', details: validation.error.flatten() }),
        { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { origin, destination, fare_config_id } = validation.data

    const { data: activeTrip } = await supabaseAdmin
      .from('trips')
      .select('id, status')
      .eq('passenger_id', user.id)
      .in('status', ['searching', 'matched', 'arriving', 'in_progress'])
      .single()

    if (activeTrip) {
      return new Response(
        JSON.stringify({
          error:   'Active trip exists',
          code:    'ACTIVE_TRIP',
          trip_id: activeTrip.id,
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fareConfig = await getFareConfig(supabaseAdmin, fare_config_id)
    const distanceKm = calculateDistance(
      origin.latitude, origin.longitude,
      destination.latitude, destination.longitude
    )
    const estimatedFare = calculateFare(fareConfig, distanceKm)

    const { data: trip, error: tripError } = await supabaseAdmin
      .from('trips')
      .insert({
        passenger_id:        user.id,
        status:              'searching',
        origin_address:      origin.address,
        origin_lat:          origin.latitude,
        origin_lng:          origin.longitude,
        destination_address: destination.address,
        destination_lat:     destination.latitude,
        destination_lng:     destination.longitude,
        estimated_fare:      estimatedFare,
        fare_currency:       'USD',
      })
      .select()
      .single()

    if (tripError || !trip) {
      throw new Error('Failed to create trip')
    }

    const { data: nearbyDrivers } = await supabaseAdmin
      .rpc('find_nearby_drivers', {
        origin_lat:    origin.latitude,
        origin_lng:    origin.longitude,
        radius_meters: MAX_DRIVER_SEARCH_RADIUS_METERS,
        limit_count:   5,
      })

    if (nearbyDrivers && nearbyDrivers.length > 0) {
      await supabaseAdmin
        .channel('trip-requests')
        .send({
          type:    'broadcast',
          event:   'new_trip_request',
          payload: {
            trip_id:             trip.id,
            origin_address:      origin.address,
            destination_address: destination.address,
            estimated_fare:      estimatedFare,
            passenger_id:       user.id,
            nearby_driver_ids:  nearbyDrivers.map((d: any) => d.id),
          },
        })
    }

    await supabaseAdmin.from('audit_logs').insert({
      actor_id:    user.id,
      actor_role: 'passenger',
      action:     'trip.created',
      entity_type: 'trip',
      entity_id:  trip.id,
      new_data: {
        origin_address:      origin.address,
        destination_address: destination.address,
        estimated_fare:      estimatedFare,
      },
    })

    return new Response(
      JSON.stringify({
        success:        true,
        trip_id:        trip.id,
        estimated_fare: estimatedFare,
        nearby_drivers: nearbyDrivers?.length ?? 0,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[trips-request] Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function calculateDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R    = 6371
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2)
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

function calculateFare(fareConfig: any, distanceKm: number): number {
  const fare = fareConfig.base_fare +
               (fareConfig.per_km_rate * distanceKm) *
               fareConfig.surge_multiplier
  return Math.max(fareConfig.minimum_fare, Math.round(fare * 100) / 100)
}

async function getFareConfig(supabase: any, configId?: string) {
  const query = supabase
    .from('fare_configs')
    .select('*')
    .eq('is_active', true)

  if (configId) {
    query.eq('id', configId)
  }

  const { data } = await query
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()

  return data ?? {
    base_fare:        2.00,
    per_km_rate:      0.50,
    per_minute_rate:  0.10,
    minimum_fare:     3.00,
    surge_multiplier: 1.00,
  }
}