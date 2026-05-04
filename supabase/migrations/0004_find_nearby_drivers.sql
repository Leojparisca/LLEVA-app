-- ============================================================
-- MIGRACIÓN 004: Función para buscar conductores cercanos
-- Fallback sin PostGIS (usa current_lat/lng)
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
  origin_lat    FLOAT,
  origin_lng    FLOAT,
  radius_meters INTEGER DEFAULT 5000,
  limit_count   INTEGER DEFAULT 5
)
RETURNS TABLE(id UUID, distance_meters FLOAT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    dp.id,
    (
      6371000 * ACOS(
        COS(RADIANS(origin_lat)) * COS(RADIANS(dp.current_lat)) *
        COS(RADIANS(dp.current_lng) - RADIANS(origin_lng)) +
        SIN(RADIANS(origin_lat)) * SIN(RADIANS(dp.current_lat))
      )
    ) AS distance_meters
  FROM public.drivers dp
  WHERE
    dp.status = 'online'
    AND dp.verification_status = 'approved'
    AND dp.current_lat IS NOT NULL
    AND dp.current_lng IS NOT NULL
    AND (
      6371000 * ACOS(
        COS(RADIANS(origin_lat)) * COS(RADIANS(dp.current_lat)) *
        COS(RADIANS(dp.current_lng) - RADIANS(origin_lng)) +
        SIN(RADIANS(origin_lat)) * SIN(RADIANS(dp.current_lat))
      )
    ) <= radius_meters
  ORDER BY distance_meters ASC
  LIMIT limit_count;
$$;

COMMIT;