-- LLEVA Platform - Fase 1: Infraestructura Core
-- Tablas, RLS, RBAC

BEGIN;

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'passenger',
  'driver',
  'staff',
  'admin',
  'owner'
);

CREATE TYPE trip_status AS ENUM (
  'searching',
  'matched',
  'arriving',
  'in_progress',
  'completed',
  'cancelled',
  'disputed'
);

CREATE TYPE driver_status AS ENUM (
  'offline',
  'online',
  'busy',
  'suspended'
);

CREATE TYPE verification_status AS ENUM (
  'pending',
  'in_review',
  'approved',
  'rejected',
  'expired'
);

-- ============================================================
-- PROFILES (Extiende auth.users)
-- ============================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  role user_role DEFAULT 'passenger',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVERS (Info específica de conductores)
-- ============================================================

CREATE TABLE public.drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status driver_status DEFAULT 'offline',
  verification_status verification_status DEFAULT 'pending',
  
  -- Info vehicular
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_year INTEGER,
  vehicle_plate TEXT,
  vehicle_color TEXT,
  vehicle_image_url TEXT,
  
  -- Licencia
  license_number TEXT,
  license_expiry DATE,
  
  -- Rating
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_trips INTEGER DEFAULT 0,
  
  -- Ubicación (actualizada en tiempo real)
  current_lat DECIMAL(10,8),
  current_lng DECIMAL(11,8),
  location_updated_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DRIVER DOCUMENTS (Verificación de documentos)
-- ============================================================

CREATE TABLE public.driver_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES public.drivers(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status verification_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TRIPS (Viajes)
-- ============================================================

CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  driver_id UUID REFERENCES public.drivers(id),
  status trip_status DEFAULT 'searching',
  
  -- Origen
  origin_lat DECIMAL(10,8) NOT NULL,
  origin_lng DECIMAL(11,8) NOT NULL,
  origin_address TEXT NOT NULL,
  origin_place_id TEXT,
  
  -- Destino
  dest_lat DECIMAL(10,8) NOT NULL,
  dest_lng DECIMAL(11,8) NOT NULL,
  dest_address TEXT NOT NULL,
  dest_place_id TEXT,
  
  -- Tarifas
  estimated_fare DECIMAL(10,2) NOT NULL,
  final_fare DECIMAL(10,2),
  distance_km DECIMAL(8,2),
  duration_minutes INTEGER,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  cancellation_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLÍTICAS RLS: PROFILES
-- ============================================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Admins can update all profiles
CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- ============================================================
-- POLÍTICAS RLS: DRIVERS
-- ============================================================

-- Drivers can read their own record
CREATE POLICY "Drivers can read own record"
  ON public.drivers FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- Drivers can update their own status/location
CREATE POLICY "Drivers can update own status"
  ON public.drivers FOR UPDATE
  USING (user_id = auth.uid());

-- Staff/Admins can manage all drivers
CREATE POLICY "Staff can manage all drivers"
  ON public.drivers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- ============================================================
-- POLÍTICAS RLS: DRIVER DOCUMENTS
-- ============================================================

-- Drivers can read their own documents
CREATE POLICY "Drivers can read own documents"
  ON public.driver_documents FOR SELECT
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- Drivers can insert their own documents
CREATE POLICY "Drivers can insert own documents"
  ON public.driver_documents FOR INSERT
  WITH CHECK (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
  );

-- Staff can manage all documents
CREATE POLICY "Staff can manage all documents"
  ON public.driver_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- ============================================================
-- POLÍTICAS RLS: TRIPS
-- ============================================================

-- Passengers can read their own trips
CREATE POLICY "Passengers can read own trips"
  ON public.trips FOR SELECT
  USING (
    passenger_id = auth.uid()
    OR
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- Passengers can create trips
CREATE POLICY "Passengers can create trips"
  ON public.trips FOR INSERT
  WITH CHECK (passenger_id = auth.uid());

-- Drivers can update trips they're assigned to
CREATE POLICY "Drivers can update assigned trips"
  ON public.trips FOR UPDATE
  USING (
    driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- Staff can manage all trips
CREATE POLICY "Staff can manage all trips"
  ON public.trips FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('admin', 'owner', 'staff')
    )
  );

-- ============================================================
-- FUNCIONES UTILITARIAS
-- ============================================================

-- Get user role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Get user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'owner')
  );
$$ LANGUAGE sql STABLE;

-- Get driver id for current user
CREATE OR REPLACE FUNCTION public.get_current_driver_id()
RETURNS UUID AS $$
  SELECT id FROM public.drivers WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE;

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================================

CREATE INDEX idx_drivers_status ON public.drivers(status);
CREATE INDEX idx_drivers_location ON public.drivers(current_lat, current_lng);
CREATE INDEX idx_drivers_user ON public.drivers(user_id);
CREATE INDEX idx_trips_passenger ON public.trips(passenger_id);
CREATE INDEX idx_trips_driver ON public.trips(driver_id);
CREATE INDEX idx_trips_status ON public.trips(status);
CREATE INDEX idx_trips_created ON public.trips(created_at DESC);
CREATE INDEX idx_driver_documents_driver ON public.driver_documents(driver_id);

COMMIT;