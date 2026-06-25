import { supabaseAdmin } from "@/lib/supabase-admin";

// La app usa auth de Supabase en el cliente (localStorage), así que el servidor
// no conoce al usuario por cookie. El frontend envía su access token en la
// cabecera Authorization y aquí lo validamos para obtener el usuario.
export async function usuarioDeRequest(request: Request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
