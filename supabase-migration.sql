-- =====================================================
-- MrGlass - Migracion Supabase
-- Ejecuta este script en: Supabase Dashboard > SQL Editor
-- =====================================================

-- 1. Crear tabla de trabajos (si no existe)
CREATE TABLE IF NOT EXISTS public.trabajos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       TEXT NOT NULL,
  descripcion  TEXT,
  categoria    TEXT NOT NULL DEFAULT 'otros'
                CHECK (categoria IN ('vidrios', 'aluminio', 'mamparas', 'espejos', 'otros')),
  image_path   TEXT,
  image_url    TEXT NOT NULL,
  orden        BIGINT DEFAULT 0,
  activo       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

-- 2. Si la tabla ya existe sin columna categoria, agregarla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trabajos' AND column_name = 'categoria'
  ) THEN
    ALTER TABLE public.trabajos
      ADD COLUMN categoria TEXT NOT NULL DEFAULT 'otros'
      CHECK (categoria IN ('vidrios', 'aluminio', 'mamparas', 'espejos', 'otros'));
  END IF;
END $$;

-- 3. Indice por orden y activo para acelerar la consulta principal
CREATE INDEX IF NOT EXISTS idx_trabajos_orden_activo
  ON public.trabajos (activo, orden, created_at DESC);

-- 4. Habilitar Row Level Security (OBLIGATORIO)
ALTER TABLE public.trabajos ENABLE ROW LEVEL SECURITY;

-- 5. Politicas RLS
-- a) Lectura publica: cualquiera puede ver trabajos activos
DROP POLICY IF EXISTS "trabajos_select_publico" ON public.trabajos;
CREATE POLICY "trabajos_select_publico"
  ON public.trabajos FOR SELECT
  TO anon, authenticated
  USING (activo = true);

-- b) Escritura solo para autenticados (admin)
DROP POLICY IF EXISTS "trabajos_insert_admin" ON public.trabajos;
CREATE POLICY "trabajos_insert_admin"
  ON public.trabajos FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "trabajos_update_admin" ON public.trabajos;
CREATE POLICY "trabajos_update_admin"
  ON public.trabajos FOR UPDATE
  TO authenticated
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trabajos_delete_admin" ON public.trabajos;
CREATE POLICY "trabajos_delete_admin"
  ON public.trabajos FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- 6. Storage Bucket
-- =====================================================
-- Crear bucket publico 'galeria-trabajos' (tambien se puede hacer desde la UI)
INSERT INTO storage.buckets (id, name, public)
VALUES ('galeria-trabajos', 'galeria-trabajos', true)
ON CONFLICT (id) DO NOTHING;

-- Politicas de Storage:
-- Lectura publica del bucket
DROP POLICY IF EXISTS "bucket_select_publico" ON storage.objects;
CREATE POLICY "bucket_select_publico"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'galeria-trabajos');

-- Upload solo autenticado
DROP POLICY IF EXISTS "bucket_insert_admin" ON storage.objects;
CREATE POLICY "bucket_insert_admin"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'galeria-trabajos');

-- Delete solo autenticado
DROP POLICY IF EXISTS "bucket_delete_admin" ON storage.objects;
CREATE POLICY "bucket_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'galeria-trabajos');

-- =====================================================
-- 7. Funcion trigger para updated_at automatico
-- =====================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_trabajos_updated_at ON public.trabajos;
CREATE TRIGGER trg_trabajos_updated_at
  BEFORE UPDATE ON public.trabajos
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- =====================================================
-- 8. Crear usuario administrador (opcional, solo si no tienes uno)
-- =====================================================
-- Cambia el correo y contrasena antes de ejecutar.
-- INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, role)
-- VALUES (
--   'admin@mrglass.cl',
--   crypt('TU_PASSWORD_AQUI', gen_salt('bf')),
--   now(),
--   'authenticated'
-- );
-- Nota: en Supabase moderno es mejor crear el usuario desde
-- Dashboard > Authentication > Users > Add user

-- =====================================================
-- Verificacion
-- =====================================================
-- SELECT * FROM public.trabajos LIMIT 5;
-- SELECT * FROM pg_policies WHERE tablename = 'trabajos';
