-- =============================================================================
-- 0001_fix_rls.sql  ·  Corrección de seguridad multi-tenant (RLS)
-- =============================================================================
--
-- CONTEXTO
-- El portal público de reservas pasaba a operar contra la base de datos
-- directamente desde el navegador (anon key). Para que funcionara, había
-- políticas abiertas `using(true)` que provocaban DOS fugas:
--
--   1) clientes: cualquiera con la anon key podía leer la lista COMPLETA de
--      clientes de TODOS los negocios (nombre, teléfono, email, notas). Fuga
--      de datos personales (RGPD).
--   2) cierres_negocio: cualquier negocio autenticado podía leer/editar/borrar
--      los cierres de CUALQUIER otro negocio (brecha entre inquilinos).
--
-- SOLUCIÓN
-- El portal público ahora va por endpoints de servidor (service_role), que se
-- saltan RLS de forma controlada. Por tanto eliminamos TODAS las políticas
-- abiertas y dejamos solo las que aíslan cada negocio por su propietario.
--
-- Idempotente: se puede ejecutar varias veces sin error.
-- Ejecutar en: Supabase Dashboard → SQL Editor.
-- =============================================================================

begin;

-- -----------------------------------------------------------------------------
-- 1. clientes — quitar lectura/inserción públicas (fuga de PII)
-- -----------------------------------------------------------------------------
drop policy if exists "Permitir leer clientes al reservar" on public.clientes;
drop policy if exists "Permitir crear clientes al reservar" on public.clientes;
-- Se mantiene "Acceso clientes" (ALL · negocio_id = get_mi_negocio_id()),
-- que aísla a cada negocio en su panel privado.

-- -----------------------------------------------------------------------------
-- 2. cierres_negocio — quitar acceso total y lectura pública; aislar por dueño
-- -----------------------------------------------------------------------------
drop policy if exists "Permitir todo a usuarios autenticados" on public.cierres_negocio;
drop policy if exists "Permitir lectura pública de cierres" on public.cierres_negocio;

-- cierres_negocio no tiene negocio_id: cuelga de ajustes (ajustes_id). El dueño
-- solo puede tocar los cierres cuyos ajustes pertenecen a su negocio.
drop policy if exists "Acceso cierres propios" on public.cierres_negocio;
create policy "Acceso cierres propios" on public.cierres_negocio
  for all
  using (
    ajustes_id in (
      select a.id from public.ajustes a
      where a.negocio_id = public.get_mi_negocio_id()
    )
  )
  with check (
    ajustes_id in (
      select a.id from public.ajustes a
      where a.negocio_id = public.get_mi_negocio_id()
    )
  );

-- -----------------------------------------------------------------------------
-- 3. ajustes — quitar lectura pública (ya no hace falta; la sirve el backend)
-- -----------------------------------------------------------------------------
drop policy if exists "Permitir lectura publica de ajustes" on public.ajustes;
-- Se mantienen "Acceso ajustes", "Permitir insert a dueños" y
-- "Permitir update a dueños", todas acotadas al negocio del usuario.

commit;

-- =============================================================================
-- RESULTADO
-- Tras esta migración NINGUNA tabla tiene políticas `using(true)`. Todo el
-- acceso público va por los Route Handlers de /api/reservar/[slug], que usan
-- la service_role key en el servidor. Comprueba con:
--
--   select tablename, policyname, cmd, qual, with_check
--   from pg_policies where schemaname = 'public' order by tablename;
--
-- No debería aparecer ninguna política con qual = 'true' o with_check = 'true'.
-- =============================================================================
