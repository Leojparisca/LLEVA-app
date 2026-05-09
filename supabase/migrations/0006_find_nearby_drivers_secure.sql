-- ============================================================
-- MIGRACIÓN 0006: find_nearby_drivers + PostGIS
-- Production-Ready: esquema limpio sin parches
-- ============================================================

-- 1. Habilitar PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Refactor limpio de driver_profiles.current_location
ALTER TABLE public.driver_profiles DROP COLUMN IF EXISTS location;
ALTER TABLE public.driver_profiles DROP COLUMN IF EXISTS location_var;
ALTER TABLE public.driver_profiles DROP COLUMN IF EXISTS current_location;
ALTER TABLE public.driver_profiles ADD COLUMN current_location GEOGRAPHY(POINT, 4326);

-- 3. Índice GIST partial para búsqueda geospatial
DROP INDEX IF EXISTS idx_driver_profiles_location;
CREATE INDEX idx_driver_profiles_location 
ON public.driver_profiles USING GIST (current_location)
WHERE driver_status = 'online' AND verification_status = 'approved';

-- 4. Función RPC: búsqueda de conductores cercanos
CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
    p_origin_lat FLOAT,
    p_origin_lng FLOAT,
    p_radius_meters FLOAT DEFAULT 5000,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    driver_id UUID,
    distance_meters FLOAT,
    driver_status TEXT,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    vehicle_color TEXT,
    rating_average DECIMAL(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_radius FLOAT;
    v_limit INTEGER;
    v_origin geography;
BEGIN
    v_radius := GREATEST(100, LEAST(p_radius_meters, 50000));
    v_limit := GREATEST(1, LEAST(p_limit, 20));

    IF p_origin_lat NOT BETWEEN -90 AND 90 OR p_origin_lng NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'Coordenadas inválidas';
    END IF;

    v_origin := ST_SetSRID(ST_MakePoint(p_origin_lng, p_origin_lat), 4326)::GEOGRAPHY;

    RETURN QUERY
    SELECT
        dp.id,
        ST_Distance(dp.current_location, v_origin)::FLOAT,
        dp.driver_status,
        dp.vehicle_plate,
        dp.vehicle_model,
        dp.vehicle_color,
        dp.rating_average
    FROM public.driver_profiles dp
    WHERE dp.driver_status = 'online'
      AND dp.verification_status = 'approved'
      AND dp.current_location IS NOT NULL
      AND ST_DWithin(dp.current_location, v_origin, v_radius)
    ORDER BY dp.current_location <-> v_origin
    LIMIT v_limit;
END;
$$;

-- 5. Permisos
REVOKE ALL ON FUNCTION public.find_nearby_drivers FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_drivers TO authenticated;

-- 6. Verificación
DO $$
DECLARE
    v_coltype TEXT;
    v_idxexists TEXT;
    v_funcdef BOOL;
BEGIN
    SELECT data_type INTO v_coltype FROM information_schema.columns 
    WHERE table_name = 'driver_profiles' AND column_name = 'current_location';
    
    SELECT 'OK' INTO v_idxexists FROM pg_indexes 
    WHERE indexname = 'idx_driver_profiles_location';
    
    SELECT prosecdef INTO v_funcdef FROM pg_proc p 
    JOIN pg_namespace n ON n.oid = p.pronamespace 
    WHERE p.proname = 'find_nearby_drivers';

    RAISE NOTICE '══════════════════════════';
    RAISE NOTICE '[LLEVA] Verificación:';
    RAISE NOTICE '  current_location: %', v_coltype;
    RAISE NOTICE ' Índice GIST: %', v_idxexists;
    RAISE NOTICE ' SECURITY DEFINER: %', v_funcdef;
    RAISE NOTICE '══════════════════════════';
END;
$$;