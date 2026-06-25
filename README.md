# Velo · SaaS de reservas para negocios de cita previa

Software de agenda y reservas multi-negocio (multi-tenant) pensado para
peluquerías, barberías, centros de estética, fisioterapia, clínicas y, en
general, cualquier negocio que trabaje con **cita previa + profesionales**.

Cada negocio gestiona su agenda, clientes, servicios, profesionales y finanzas
desde un panel privado, y comparte con sus clientes un **portal público de
reservas** en `tu-dominio.com/reservar/su-slug`.

## Stack

- **Next.js 16** (App Router, React 19) + **Tailwind 4** + **shadcn/ui**
- **Supabase** (Auth + Postgres con RLS)
- `react-big-calendar`, `date-fns`, `xlsx` (exportación a Excel)

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores de tu proyecto
Supabase (Dashboard → **Project Settings → API**):

| Variable | Dónde se usa | ¿Secreta? | De dónde se saca |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | navegador + servidor | No | **Project URL** (`https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | navegador | No | key **`anon` `public`** |
| `SUPABASE_SERVICE_ROLE_KEY` | **solo servidor** (`/api/reservar/...`) | **Sí** | key **`service_role`** (JWT que empieza por `eyJ…`) |

> ⚠️ La `service_role` key se salta las políticas RLS. **Nunca** la subas al
> repo ni la expongas en el cliente. Solo va en `.env.local` (local) y en las
> variables de entorno de tu hosting (producción).

## Arranque en local

```bash
npm install
cp .env.example .env.local   # y rellena las 3 variables
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

- Panel privado: `/` (requiere registro/login).
- Portal público de un negocio: `/reservar/SU-SLUG` (el `slug` está en la tabla
  `negocios`).

## Base de datos (Supabase)

El esquema y las políticas de seguridad están versionados en
`supabase/migrations/`:

- **`0000_schema_reference.sql`** — referencia de tablas, helper
  `get_mi_negocio_id()` y políticas RLS. Útil para montar un proyecto Supabase
  desde cero. (No hace falta ejecutarlo si tu base de datos ya existe.)
- **`0001_fix_rls.sql`** — corrección de seguridad multi-tenant. **Ejecútalo
  una vez** en Supabase → **SQL Editor**. Cierra dos fugas: lectura pública de
  clientes (PII) y manipulación de cierres entre negocios.

Tras aplicarlo, ninguna política debe tener `qual = true` / `with_check = true`.
Comprobación:

```sql
select tablename, policyname, cmd, qual, with_check
from pg_policies where schemaname = 'public' order by tablename;
```

### Arquitectura de seguridad

El **panel privado** consulta Supabase desde el navegador con la `anon` key, y
RLS aísla cada negocio por su propietario (`get_mi_negocio_id()`).

El **portal público de reservas** NO toca la base de datos desde el navegador:
pasa por Route Handlers de servidor en `/api/reservar/[slug]/...` que usan la
`service_role` key. Así no hace falta ninguna política RLS abierta.

| Endpoint | Método | Función |
|---|---|---|
| `/api/reservar/[slug]` | GET | Datos públicos del negocio (servicios, profesionales, horario) |
| `/api/reservar/[slug]/disponibilidad` | GET | Cierre del día + huecos ocupados del profesional |
| `/api/reservar/[slug]/cliente` | GET | Autocompletar: solo el nombre del cliente de ese negocio |
| `/api/reservar/[slug]/cita` | POST | Crea la reserva validando precio, duración, cierre y solapes |

## Despliegue (Vercel)

1. Importa el repo en Vercel.
2. **Settings → Environment Variables**, añade las 3 variables de arriba
   (marca al menos **Production**):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Asegúrate de haber ejecutado `0001_fix_rls.sql` en Supabase.
4. **Deploy** (o **Redeploy** si añadiste variables después del primer build).

## Scripts

```bash
npm run dev     # desarrollo
npm run build   # build de producción
npm run start   # servir el build
npm run lint    # eslint
```
