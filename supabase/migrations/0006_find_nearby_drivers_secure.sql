-- ============================================================
-- MIGRACIÓN 0006: find_nearby_drivers SEGURA
-- ============================================================

DROP FUNCTION IF EXISTS public.find_nearby_drivers;

CREATE FUNCTION public.find_nearby_drivers(
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
BEGIN
    v_radius := GREATEST(100, LEAST(p_radius_meters, 50000));
    v_limit := GREATEST(1, LEAST(p_limit, 20));

    IF p_origin_lat NOT BETWEEN -90 AND 90 OR p_origin_lng NOT BETWEEN -180 AND 180 THEN
        RAISE EXCEPTION 'Coordenadas inválidas';
    END IF;

    RETURN QUERY
    SELECT
        dp.id,
        (6371000 * acos(cos(radians(p_origin_lat)) * cos(radians((dp.current_location::POINT)[1])) * cos(radians((dp.current_location::POINT)[2]) - radians(p_origin_lng)) + sin(radians(p_origin_lat)) * sin(radians((dp.current_location::POINT)[1]))))::FLOAT,
        dp.driver_status,
        dp.vehicle_plate,
        dp.vehicle_model,
        dp.vehicle_color,
        dp.rating_average
    FROM public.driver_profiles dp
    WHERE dp.driver_status = 'online' AND dp.verification_status = 'approved' AND dp.current_location IS NOT NULL
    ORDER BY 2 ASC
    LIMIT v_limit;
END;
$$;

REVOKE ALL ON FUNCTION public.find_nearby_drivers FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.find_nearby_drivers TO authenticated;

DO $$
DECLARE v INT;
BEGIN
    SELECT COUNT(*) INTO v FROM pg_proc WHERE proname = 'find_nearby_drivers' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
    RAISE NOTICE '[LLEVA] find_nearby_drivers: % firmas', v;
END;
$$;