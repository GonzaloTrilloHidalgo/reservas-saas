-- =============================================================================
-- 0003_trial.sql  ·  Periodo de prueba de 30 días por negocio
-- =============================================================================
--
-- Cada negocio tiene 30 días de acceso completo desde su alta. Al expirar, la
-- BASE DE DATOS le deja de dar acceso a sus datos (no solo el frontend), así el
-- bloqueo no se puede esquivar llamando a la API directamente.
--
-- Palanca manual: para dar acceso a un negocio que te pague (aunque aún no haya
-- Stripe), basta con:
--     update public.negocios set suscripcion_activa = true where slug = '...';
-- Y para alargar la prueba:
--     update public.negocios set trial_ends_at = now() + interval '30 days' where slug = '...';
--
-- Idempotente. Ejecutar en Supabase → SQL Editor.
-- =============================================================================

-- 1. Columnas de prueba/suscripción.
--    Las filas existentes reciben 30 días desde AHORA (el default se aplica al
--    añadir la columna). Ajústalo a mano si quieres otra fecha.
alter table public.negocios
  add column if not exists trial_ends_at timestamptz not null default (now() + interval '30 days'),
  add column if not exists suscripcion_activa boolean not null default false;

-- 2. get_mi_negocio_id() ahora solo devuelve el negocio si el acceso es válido:
--    suscripción activa O prueba aún vigente. Como TODAS las políticas del panel
--    usan esta función, un negocio con la prueba caducada deja de ver/editar sus
--    datos automáticamente.
create or replace function public.get_mi_negocio_id()
returns uuid
language sql
security definer
stable
as $$
  select id from public.negocios
  where auth_user_id = auth.uid()
    and (suscripcion_activa = true or trial_ends_at > now())
  limit 1;
$$;

-- 3. Helper para los endpoints públicos (service_role): ¿este negocio está activo?
create or replace function public.negocio_activo(p_negocio_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.negocios
    where id = p_negocio_id
      and (suscripcion_activa = true or trial_ends_at > now())
  );
$$;
