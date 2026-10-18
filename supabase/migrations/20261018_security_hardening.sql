-- ==============================================================================
-- Migration: 20261018_security_hardening.sql
-- Project: Lost & Found Hotel (Supabase AppSec Hardening)
-- ==============================================================================

-- 1. FIX CRITICAL CREDENTIAL LEAK ON public.usuarios
-- Issue: The policy "Login usuarios" previously allowed public unauthenticated
-- SELECT access to plain text credentials, emails, and staff roles.
DROP POLICY IF EXISTS "Login usuarios" ON public.usuarios;
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to only read their own profile record by email
DROP POLICY IF EXISTS "authenticated_users_read_self" ON public.usuarios;
CREATE POLICY "authenticated_users_read_self" ON public.usuarios
FOR SELECT TO authenticated
USING (email = auth.jwt() ->> 'email');

-- 2. AUDIT TRAIL LOGGING (A09: Security Logging & Monitoring)
-- Table to record who created, modified, or deleted lost & found items
CREATE TABLE IF NOT EXISTS public.auditoria_olvidos (
    id BIGSERIAL PRIMARY KEY,
    accion TEXT NOT NULL,
    olvido_id BIGINT,
    usuario_email TEXT,
    usuario_id UUID,
    detalles JSONB,
    fecha TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.auditoria_olvidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_audit_view" ON public.auditoria_olvidos;
CREATE POLICY "authenticated_audit_view" ON public.auditoria_olvidos
FOR SELECT TO authenticated
USING (true);

-- Trigger function to automatically log UPDATE and DELETE actions
CREATE OR REPLACE FUNCTION public.registrar_cambio_olvido()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.auditoria_olvidos (accion, olvido_id, usuario_email, usuario_id, detalles)
    VALUES (
        TG_OP,
        COALESCE(OLD.id, NEW.id),
        auth.jwt() ->> 'email',
        auth.uid(),
        json_build_object('anterior', OLD, 'nuevo', NEW)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_olvidos_trigger ON public.olvidos;
CREATE TRIGGER audit_olvidos_trigger
AFTER UPDATE OR DELETE ON public.olvidos
FOR EACH ROW EXECUTE FUNCTION public.registrar_cambio_olvido();

-- 3. SECURE PUBLIC QR LOOKUP RPC (A01: Broken Access Control)
-- Exposes only a single item by ID with curated fields for QR verification,
-- without allowing unauthorized users to dump or list the olvidos table.
CREATE OR REPLACE FUNCTION public.get_public_olvido(target_id BIGINT)
RETURNS TABLE (
    id BIGINT,
    objeto TEXT,
    habitacion TEXT,
    sector TEXT,
    prioridad TEXT,
    entregado BOOLEAN,
    imagen TEXT,
    created_at TIMESTAMPTZ,
    fecha_entrega TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT id, objeto, habitacion, sector, prioridad, entregado, imagen, created_at, fecha_entrega
    FROM public.olvidos
    WHERE id = target_id
    LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_olvido(BIGINT) TO anon, authenticated;

-- 4. ADVISOR REMEDIATIONS
-- Recommended: Run in Supabase SQL editor if permissions permit:
-- ALTER EXTENSION "pg_walinspect" SET SCHEMA extensions;
