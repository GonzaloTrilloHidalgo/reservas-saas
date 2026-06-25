import { createClient } from "@supabase/supabase-js";

// CLIENTE DE SERVIDOR (NUNCA debe importarse en componentes "use client").
//
// Usa la SERVICE ROLE KEY, que se salta las políticas RLS. Por eso SOLO puede
// vivir en el backend (Route Handlers / Server Components). Su misión es servir
// el portal público de reservas de forma controlada: el navegador ya no toca
// la base de datos directamente, así no necesitamos políticas abiertas
// (using(true)) que filtrarían datos de todos los negocios.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Faltan variables de entorno: NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
