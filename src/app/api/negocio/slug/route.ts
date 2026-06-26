import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { usuarioDeRequest } from "@/lib/auth-server";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// Normaliza un texto a un slug seguro: sin acentos, minúsculas, solo
// letras/números/guiones, sin guiones al principio/final.
function sanitizarSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // quita acentos
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
}

// POST /api/negocio/slug  { slug: "mi-barberia" }
// Cambia el slug público del negocio del usuario, validando que sea único.
export async function POST(request: NextRequest) {
  if (!(await rateLimit(`negocio-slug:${ipDe(request)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const user = await usuarioDeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const slug = sanitizarSlug(body.slug ?? "");
  if (slug.length < 3 || slug.length > 40) {
    return NextResponse.json(
      { error: "El enlace debe tener entre 3 y 40 caracteres (letras, números y guiones)." },
      { status: 400 }
    );
  }

  // Negocio del usuario
  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // ¿Lo tiene ya OTRO negocio? (service_role ve todos, salta RLS)
  const { data: ocupado } = await supabaseAdmin
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .neq("id", negocio.id)
    .maybeSingle();

  if (ocupado) {
    return NextResponse.json({ error: "Ese enlace ya está en uso. Prueba con otro." }, { status: 409 });
  }

  const { error } = await supabaseAdmin
    .from("negocios")
    .update({ slug })
    .eq("id", negocio.id);

  if (error) {
    return NextResponse.json({ error: "No se pudo guardar el enlace." }, { status: 500 });
  }

  return NextResponse.json({ slug });
}
