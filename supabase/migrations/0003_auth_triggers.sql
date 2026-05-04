-- ============================================================
-- MIGRACIÓN 003: TRIGGERS DE AUTENTICACIÓN
-- Auto-provisioning de perfil al registrarse
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_full_name TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'passenger');
  v_full_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );

  IF v_role NOT IN ('passenger', 'driver') THEN
    v_role := 'passenger';
  END IF;

  INSERT INTO public.profiles (id, full_name, phone)
  VALUES (
    NEW.id,
    v_full_name,
    NEW.raw_user_meta_data->>'phone'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role);

  IF v_role = 'driver' THEN
    INSERT INTO public.driver_profiles (
      id,
      license_number,
      license_expiry,
      vehicle_plate,
      vehicle_model,
      vehicle_year,
      vehicle_color
    ) VALUES (
      NEW.id,
      'PENDING-' || NEW.id,
      CURRENT_DATE + INTERVAL '1 year',
      'PENDING',
      'PENDING',
      EXTRACT(YEAR FROM NOW())::INTEGER,
      'PENDING'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;