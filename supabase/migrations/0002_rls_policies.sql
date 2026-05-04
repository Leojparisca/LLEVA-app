-- ============================================================
-- MIGRACIÓN 002: POLÍTICAS RLS COMPLETAS
-- Zero Trust: Default DENY, explicit ALLOW
-- ============================================================

BEGIN;

-- Habilitar RLS en tablas nuevas
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.fare_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS: user_roles
-- ============================================================

DROP POLICY IF EXISTS "user_roles: own read" ON public.user_roles;
CREATE POLICY "user_roles: own read"
  ON public.user_roles FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "user_roles: admin read" ON public.user_roles;
CREATE POLICY "user_roles: admin read"
  ON public.user_roles FOR SELECT
  USING (public.has_role('admin'));

DROP POLICY IF EXISTS "user_roles: admin insert" ON public.user_roles;
CREATE POLICY "user_roles: admin insert"
  ON public.user_roles FOR INSERT
  WITH CHECK (
    CASE
      WHEN role IN ('admin', 'owner') THEN public.current_user_role() = 'owner'
      WHEN role = 'staff'             THEN public.has_role('admin')
      ELSE public.has_role('staff')
    END
  );

DROP POLICY IF EXISTS "user_roles: admin update" ON public.user_roles;
CREATE POLICY "user_roles: admin update"
  ON public.user_roles FOR UPDATE
  USING (
    CASE
      WHEN role IN ('admin', 'owner') THEN public.current_user_role() = 'owner'
      ELSE public.has_role('admin')
    END
  );

-- ============================================================
-- POLÍTICAS: audit_logs (INMUTABLES)
-- ============================================================

DROP POLICY IF EXISTS "audit_logs: staff read" ON public.audit_logs;
CREATE POLICY "audit_logs: staff read"
  ON public.audit_logs FOR SELECT
  USING (public.has_role('staff'));

-- Inserción solo desde Edge Functions (service role) - sin política INSERT
-- No UPDATE, no DELETE → inmutabilidad garantizada

-- ============================================================
-- POLÍTICAS: fare_configs
-- ============================================================

DROP POLICY IF EXISTS "fare_configs: authenticated read active" ON public.fare_configs;
CREATE POLICY "fare_configs: authenticated read active"
  ON public.fare_configs FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND is_active = TRUE
  );

DROP POLICY IF EXISTS "fare_configs: admin manage" ON public.fare_configs;
CREATE POLICY "fare_configs: admin manage"
  ON public.fare_configs FOR ALL
  USING (public.has_role('admin'))
  WITH CHECK (public.has_role('admin'));

-- ============================================================
-- ACTUALIZAR POLÍTICAS EXISTENTES: profiles (usar has_role)
-- ============================================================

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "profiles: admin read all"
  ON public.profiles FOR SELECT
  USING (public.has_role('staff'));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "profiles: admin update"
  ON public.profiles FOR UPDATE
  USING (public.has_role('staff'));

-- ============================================================
-- ACTUALIZAR POLÍTICAS EXISTENTES: drivers
-- ============================================================

DROP POLICY IF EXISTS "Staff/Admins can manage all drivers" ON public.drivers;
CREATE POLICY "drivers: staff manage"
  ON public.drivers FOR ALL
  USING (public.has_role('staff'));

-- ============================================================
-- ACTUALIZAR POLÍTICAS EXISTENTES: driver_documents
-- ============================================================

DROP POLICY IF EXISTS "Staff can manage all documents" ON public.driver_documents;
CREATE POLICY "driver_documents: staff manage"
  ON public.driver_documents FOR ALL
  USING (public.has_role('staff'));

-- ============================================================
-- ACTUALIZAR POLÍTICAS EXISTENTES: trips
-- ============================================================

DROP POLICY IF EXISTS "Staff can manage all trips" ON public.trips;
CREATE POLICY "trips: staff manage"
  ON public.trips FOR ALL
  USING (public.has_role('staff'));

COMMIT;