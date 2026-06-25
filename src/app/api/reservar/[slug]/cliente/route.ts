import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// GET /api/reservar/[slug]/cliente?telefono=+34600000000
// Autocompletar para clientes que repiten: devuelve ÚNICAMENTE el nombre, y solo
// si el teléfono pertenece a un cliente de ESTE negocio. Nunca expone la lista
// completa ni datos de otros negocios (eso era la fuga de RLS que cerramos).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const telefono = request.nextUrl.searchParams.get("telefono");

  if (!telefono || telefono.length < 6) {
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
