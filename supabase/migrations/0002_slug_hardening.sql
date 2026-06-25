-- =============================================================================
-- 0002_slug_hardening.sql  ·  Saneado del slug del negocio en la base de datos
-- =============================================================================
--
-- CONTEXTO
-- El slug (la parte pública de la URL de reservas: /reservar/<slug>) se genera
-- en el navegador y llega al servidor por los metadatos del registro. Eso
-- significa que un registro manipulado podría enviar un slug arbitrario
-- (caracteres raros, intentos de colisión, etc.).
--
-- SOLUCIÓN
-- Un trigger BEFORE INSERT/UPDATE en `negocios` que SIEMPRE normaliza el slug,
-- pase lo que pase y venga de donde venga. Es additivo: no toca tu trigger de
-- alta existente, solo añade una capa de saneado por encima.
--
-- Garantiza que el slug:
--   - solo contiene minúsculas, números y guiones
--   - no empieza/termina por guion
--   - si queda vacío o inválido, se regenera desde el nombre + sufijo aleatorio
--
-- Idempotente. Ejecutar en Supabase → SQL Editor.
-- =============================================================================

create or replace function public.sanitizar_negocio_slug()
returns trigger
language plpgsql
as $$
begin
  -- Normaliza el slug recibido
  new.slug := lower(coalesce(new.slug, ''));
  new.slug := regexp_replace(new.slug, '[^a-z0-9-]+', '-', 'g');
  new.slug := regexp_replace(new.slug, '(^-+|-+$)', '', 'g');

  -- Si tras limpiar no queda nada usable, lo regeneramos desde el nombre
  if new.slug is null or length(new.slug) = 0 then
    new.slug :=
      regexp_replace(lower(coalesce(new.nombre, 'negocio')), '[^a-z0-9]+', '-', 'g')
      || '-' || substr(md5(random()::text), 1, 4);
    new.slug := regexp_replace(new.slug, '(^-+|-+$)', '', 'g');
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sanitizar_slug on public.negocios;
create trigger trg_sanitizar_slug
  before insert or update on public.negocios
  for each row
  execute function public.sanitizar_negocio_slug();

-- Asegura que no puede haber dos negocios con el mismo slug.
create unique index if not exists negocios_slug_unico on public.negocios (slug);
