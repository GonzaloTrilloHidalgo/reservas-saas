import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { esTelefono } from "@/lib/validacion";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// GET /api/reservar/[slug]/cliente?telefono=+34600000000
// Autocompletar para clientes que repiten: devuelve ÚNICAMENTE el nombre, y solo
// si el teléfono pertenece a un cliente de ESTE negocio. Nunca expone la lista
// completa ni datos de otros negocios (eso era la fuga de RLS que cerramos).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit estricto: este endpoint podría usarse para enumerar teléfonos.
  // Máx. 15 consultas por minuto por IP.
  if (!(await rateLimit(`cliente:${ipDe(request)}`, 15, 60_000))) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento." },
      { status: 429 }
    );
  }

  const telefono = request.nextUrl.searchParams.get("telefono");

  if (!esTelefono(telefono)) {
    return NextResponse.json({ nombre: null });
  }

  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  const { data: cliente } = await supabaseAdmin
    .from("clientes")
    .select("nombre")
    .eq("negocio_id", negocio.id)
    .eq("telefono", telefono)
    .is("fecha_borrado", null)
    .maybeSingle();

  return NextResponse.json({ nombre: cliente?.nombre ?? null });
}
