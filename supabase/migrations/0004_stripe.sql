-- =============================================================================
-- 0004_stripe.sql  ·  Vinculación con Stripe para la suscripción
-- =============================================================================
--
-- Guarda en cada negocio su cliente y su suscripción de Stripe, para que el
-- webhook pueda activar/desactivar el acceso (suscripcion_activa) cuando el
-- pago se completa, renueva, falla o se cancela.
--
-- Requiere haber ejecutado antes 0003_trial.sql (columna suscripcion_activa).
-- Idempotente. Ejecutar en Supabase → SQL Editor.
-- =============================================================================

alter table public.negocios
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text;

-- Para que el webhook encuentre rápido el negocio a partir del cliente de Stripe.
create index if not exists negocios_stripe_customer_idx
  on public.negocios (stripe_customer_id);
