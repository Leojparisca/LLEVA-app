-- ============================================================
-- MIGRACIÓN 0006: FUNCIÓN find_nearby_drivers — VERSIÓN SEGURA
-- Versión: 2.0 (Corregida)
-- ============================================================

-- Eliminar versión anterior insegura
DROP FUNCTION IF EXISTS public.find_nearby_drivers(FLOAT, FLOAT, FLOAT);
DROP FUNCTION IF EXISTS public.find_nearby_drivers(FLOAT, FLOAT, INTEGER);

-- ============================================================
-- FUNCIÓN PRINCIPAL
-- ============================================================

CREATE OR REPLACE FUNCTION public.find_nearby_drivers(
    origin_lat     FLOAT,
    origin_lng     FLOAT,
    radius_meters  FLOAT   DEFAULT 5000,
    limit_count    INTEGER DEFAULT 10
)
RETURNS TABLE (
    driver_id        UUID,
    distance_meters  FLOAT,
    driver_status    TEXT,
    vehicle_plate    TEXT,
    vehicle_model    TEXT,
    vehicle_color   TEXT,
    rating_average  DECIMAL(3,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public

AS $$
DECLARE
    v_max_radius  CONSTANT FLOAT   := 50000;
    v_max_limit   CONSTANT INTEGER := 20;
    v_min_radius  CONSTANT FLOAT   := 100;

    v_radius  FLOAT;
    v_limit   INTEGER;
    v_origin  GEOGRAPHY;

BEGIN
    v_radius := GREATEST(v_min_radius, LEAST(radius_meters, v_max_radius));
    v_limit  := GREATEST(1, LEAST(limit_count, v_max_limit));

    IF origin_lat NOT BETWEEN -90 AND 90 THEN
        RAISE EXCEPTION 'origin_lat fuera de rango: %. Debe estar entre -90 y 90.', origin_lat
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    IF origin_lng NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'origin_lng fuera de rango: %. Debe estar entre -180 y 180.', origin_lng
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    v_origin := ST_SetSRID(ST_MakePoint(origin_lng, origin_lat), 4326)::GEOGRAPHY;

    RETURN QUERY
    SELECT
        dp.id                           AS driver_id,
        ST_Distance(dp.current_location, v_origin) AS distance_meters,
        dp.driver_status,
        dp.vehicle_plate,
        dp.vehicle_model,
        dp.vehicle_color,
        dp.rating_average

    FROM public.driver_profiles dp

    WHERE
        dp.driver_status       = 'online'
        AND dp.verification_status = 'approved'
        AND dp.current_location IS NOT NULL
        AND ST_DWithin(dp.current_location, v_origin, v_radius)

    ORDER BY dp.current_location <-> v_origin
    LIMIT v_limit;

EXCEPTION
    WHEN invalid_parameter_value THEN
        RAISE;
    WHEN OTHERS THEN
        RAISE LOG '[LLEVA][find_nearby_drivers] Error: SQLSTATE=% SQLERRM=%', SQLSTATE, SQLERRM;
        RAISE;
END;
$$;

-- ============================================================
-- PERMISOS
-- ============================================================

REVOKE ALL ON FUNCTION public.find_nearby_drivers(FLOAT, FLOAT, FLOAT, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.find_nearby_drivers(FLOAT, FLOAT, FLOAT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.find_nearby_drivers IS
'Busca conductores cercanos con SECURITY DEFINER + search_path = public.
Parámetros: origin_lat [-90,90], origin_lng [-180,180], radius_meters [100,50000], limit [1,20].';

-- ============================================================
-- VERIFICACIÓN
-- ============================================================

DO $$
DECLARE
    v_func_exists BOOLEAN;
    v_is_sec_definer BOOLEAN;
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'find_nearby_drivers' AND n.nspname = 'public') INTO v_func_exists;
    SELECT prosecdef INTO v_is_sec_definer FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE p.proname = 'find_nearby_drivers' AND n.nspname = 'public';

    RAISE NOTICE '[LLEVA] find_nearby_drivers: función=%, SECURITY DEFINER=%',
        CASE WHEN v_func_exists THEN 'OK' ELSE 'FALLO' END,
        CASE WHEN v_is_sec_definer THEN 'OK' ELSE 'FALLO' END;

    IF NOT (v_func_exists AND v_is_sec_definer) THEN
        RAISE EXCEPTION '[LLEVA] Migración fallida';
    END IF;
END;
$$;