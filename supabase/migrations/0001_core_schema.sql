-- ============================================================
-- MIGRACIÓN 001: ESQUEMA CORE DE LLEVA (Adicional)
-- Añade: user_roles, audit_logs, fare_configs, funciones RBAC
-- ============================================================

BEGIN;

-- Extensiones ya disponibles en Supabase managed
-- uuid-ossp y pgcrypto vienen incluidas por defecto

-- ============================================================
-- TABLA: user_roles (Sistema RBAC avanzado)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('passenger', 'driver', 'staff', 'admin', 'owner')),
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(user_id, role)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles(role);

-- ============================================================
-- TABLA: audit_logs (Logs de seguridad y auditoría)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    UUID REFERENCES auth.users(id),
  actor_role  TEXT,
  action      TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- ============================================================
-- TABLA: fare_configs (Tarifas configurables)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.fare_configs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL UNIQUE,
  base_fare         DECIMAL(10, 2) NOT NULL CHECK (base_fare >= 0),
  per_km_rate       DECIMAL(10, 4) NOT NULL CHECK (per_km_rate >= 0),
  per_minute_rate   DECIMAL(10, 4) NOT NULL CHECK (per_minute_rate >= 0),
  minimum_fare      DECIMAL(10, 2) NOT NULL CHECK (minimum_fare >= 0),
  surge_multiplier  DECIMAL(4, 2) NOT NULL DEFAULT 1.00 CHECK (surge_multiplier >= 1.00),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until   TIMESTAMPTZ,
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tarifa default inicial
INSERT INTO public.fare_configs (name, base_fare, per_km_rate, per_minute_rate, minimum_fare)
VALUES ('Default', 2.50, 1.20, 0.25, 5.00)
ON CONFLICT (name) DO NOTHING;

-- ============================================================
-- FUNCIONES: Sistema RBAC avanzado
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = user_uuid
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY
    CASE role
      WHEN 'owner'     THEN 5
      WHEN 'admin'     THEN 4
      WHEN 'staff'     THEN 3
      WHEN 'driver'    THEN 2
      WHEN 'passenger' THEN 1
    END DESC
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    public.get_user_role(auth.uid())::TEXT,
    (SELECT role::TEXT FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  );
$$;

CREATE OR REPLACE FUNCTION public.has_role(required_role TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE public.current_user_role()
    WHEN 'owner'     THEN required_role IN ('owner', 'admin', 'staff', 'driver', 'passenger')
    WHEN 'admin'     THEN required_role IN ('admin', 'staff', 'driver', 'passenger')
    WHEN 'staff'     THEN required_role IN ('staff', 'driver', 'passenger')
    WHEN 'driver'    THEN required_role IN ('driver', 'passenger')
    WHEN 'passenger' THEN required_role = 'passenger'
    ELSE FALSE
  END;
$$;

-- ============================================================
-- Función helper para auditoría
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit(
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID DEFAULT NULL,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, old_data, new_data)
  VALUES (
    auth.uid(),
    public.current_user_role(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_data,
    p_new_data
  );
END;
$$;

COMMIT;