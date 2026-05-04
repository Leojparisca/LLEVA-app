-- ============================================================
-- MIGRACIÓN 0005: TRIGGER ATÓMICO DE REGISTRO DE USUARIOS
-- Estándar: Senior Production-Grade
-- Reemplaza: Edge Function auth-register (eliminada)
-- Autor: Ingeniero Principal LLEVA
-- ============================================================

-- ------------------------------------------------------------
-- BLOQUE 1: VERIFICACIÓN Y CREACIÓN DE TABLAS DEPENDIENTES
-- Garantiza idempotencia: la migración es segura de re-ejecutar
-- ------------------------------------------------------------

-- Tabla: public.profiles
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT        NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 100),
    phone       TEXT,
    avatar_url  TEXT,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: public.user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role        TEXT        NOT NULL,
    granted_by  UUID        REFERENCES auth.users(id),
    granted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ,
    is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (user_id, role),
    CONSTRAINT valid_role CHECK (
        role IN ('passenger', 'driver', 'staff', 'admin', 'owner')
    )
);

-- Tabla: public.driver_profiles
CREATE TABLE IF NOT EXISTS public.driver_profiles (
    id                  UUID    PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    license_number      TEXT,
    license_expiry     DATE,
    vehicle_plate      TEXT,
    vehicle_model      TEXT,
    vehicle_year       INTEGER,
    vehicle_color      TEXT,
    verification_status TEXT    NOT NULL DEFAULT 'pending'
        CONSTRAINT valid_verification CHECK (
            verification_status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')
        ),
    driver_status       TEXT    NOT NULL DEFAULT 'offline'
        CONSTRAINT valid_driver_status CHECK (
            driver_status IN ('offline', 'online', 'busy', 'suspended')
        ),
    current_location    GEOGRAPHY(POINT, 4326),
    last_location_at   TIMESTAMPTZ,
    rating_average    DECIMAL(3, 2) DEFAULT 5.00
        CONSTRAINT valid_rating CHECK (rating_average BETWEEN 1.00 AND 5.00),
    total_trips        INTEGER NOT NULL DEFAULT 0,
    reviewed_by        UUID    REFERENCES auth.users(id),
    reviewed_at        TIMESTAMPTZ,
    rejection_reason   TEXT,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabla: audit_logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_role     TEXT,
    action        TEXT        NOT NULL,
    entity_type   TEXT,
    entity_id     UUID,
    old_data      JSONB,
    new_data     JSONB,
    ip_address    TEXT,
    user_agent    TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_status ON public.driver_profiles (driver_status, verification_status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

-- ------------------------------------------------------------
-- BLOQUE 2: LIMPIEZA DE VERSIONES ANTERIORES
-- ------------------------------------------------------------

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ------------------------------------------------------------
-- BLOQUE 3: FUNCIÓN PRINCIPAL DEL TRIGGER
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
    v_role      TEXT;
    v_full_name TEXT;
    v_phone    TEXT;
    v_context  TEXT;

BEGIN
    -- Extract and sanitize full_name with fallback chain
    v_full_name := COALESCE(
        NULLIF(TRIM(NEW.raw_user_meta_data->>'full_name'), ''),
        NULLIF(TRIM(NEW.email), ''),
        'Usuario LLEVA'
    );

    -- Extract phone (optional)
    v_phone := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data->>'phone', '')), '');

    -- Extract and validate role - only passenger/driver allowed
    v_role := LOWER(TRIM(COALESCE(NEW.raw_user_meta_data->>'role', 'passenger')));

    IF v_role NOT IN ('passenger', 'driver') THEN
        RAISE WARNING '[LLEVA][handle_new_user] Intento de rol inválido "%" para user_id=%. Asignando passenger.',
            v_role, NEW.id;
        v_role := 'passenger';
    END IF;

    -- Insert into profiles
    INSERT INTO public.profiles (id, full_name, phone)
    VALUES (NEW.id, v_full_name, v_phone);

    -- Insert role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, v_role);

    -- Extended profile for drivers
    IF v_role = 'driver' THEN
        INSERT INTO public.driver_profiles (id, verification_status, driver_status)
        VALUES (NEW.id, 'pending', 'offline');
    END IF;

    -- Audit log
    INSERT INTO public.audit_logs (actor_id, actor_role, action, entity_type, entity_id, new_data)
    VALUES (NEW.id, v_role, 'auth.user.registered', 'user', NEW.id,
        jsonb_build_object('role', v_role, 'provider', NEW.raw_app_meta_data->>'provider', 'created_at', NOW()));

    RETURN NEW;

EXCEPTION
    WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_context = PG_EXCEPTION_CONTEXT;
        RAISE LOG '[LLEVA][handle_new_user][unique_violation] user_id=% | CONTEXTO: %', NEW.id, v_context;
        RAISE;

    WHEN not_null_violation OR check_violation THEN
        GET STACKED DIAGNOSTICS v_context = PG_EXCEPTION_CONTEXT;
        RAISE LOG '[LLEVA][handle_new_user][constraint_violation] user_id=% | CONTEXTO: %', NEW.id, v_context;
        RAISE;

    WHEN foreign_key_violation THEN
        GET STACKED DIAGNOSTICS v_context = PG_EXCEPTION_CONTEXT;
        RAISE LOG '[LLEVA][handle_new_user][fk_violation] user_id=% | CONTEXTO: %', NEW.id, v_context;
        RAISE;

    WHEN OTHERS THEN
        GET STACKED DIAGNOSTICS v_context = PG_EXCEPTION_CONTEXT;
        RAISE LOG '[LLEVA][handle_new_user][unexpected_error] user_id=% | SQLSTATE=% | CONTEXTO: %',
            NEW.id, SQLSTATE, v_context;
        RAISE;

END;
$$;

COMMENT ON FUNCTION public.handle_new_user() IS
'Trigger SECURITY DEFINER que aprovisiona de forma atómica el perfil,
rol y perfil extendido (si es driver). SET search_path = public previene search path hijacking.
Reemplaza la Edge Function auth-register.';


-- ------------------------------------------------------------
-- BLOQUE 4: REGISTRO DEL TRIGGER
-- ------------------------------------------------------------

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verificación final
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.triggers
        WHERE trigger_name = 'on_auth_user_created'
          AND event_object_table = 'users'
    ) THEN
        RAISE EXCEPTION '[LLEVA] CRÍTICO: Trigger no creado correctamente.';
    ELSE
        RAISE NOTICE '[LLEVA] OK: Trigger registered.';
    END IF;
END;
$$;