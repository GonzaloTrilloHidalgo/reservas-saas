import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { esFecha } from "@/lib/validacion";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// GET /api/reservar/[slug]/disponibilidad?fecha=YYYY-MM-DD&profesionalId=...
// Devuelve si el día está cerrado (festivo/vacaciones) y los tramos ya ocupados
// del profesional para esa fecha. Solo expone marcas de ocupado/libre, sin datos
// personales de quién tiene la cita.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit: máx. 60 consultas por minuto por IP (el portal consulta a menudo).
  if (!rateLimit(`disp:${ipDe(request)}`, 60, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const fecha = request.nextUrl.searchParams.get("fecha");
  const profesionalId = request.nextUrl.searchParams.get("profesionalId");

  if (!esFecha(fecha)) {
    return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
  }

  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // 1. ¿Día cerrado? Los cierres cuelgan de ajustes (ajustes_id), así que primero
  //    localizamos los ajustes de este negocio.
  const { data: ajustes } = await supabaseAdmin
    .from("ajustes")
    .select("id")
    .eq("negocio_id", negocio.id)
    .single();

  let esDiaCerrado = false;
  let motivoCierre = "";

  if (ajustes) {
    const { data: cierre } = await supabaseAdmin
      .from("cierres_negocio")
      .select("motivo")
      .eq("fecha", fecha)
      .eq("ajustes_id", ajustes.id)
      .is("fecha_borrado", null)
      .maybeSingle();

    if (cierre) {
      esDiaCerrado = true;
      motivoCierre = cierre.motivo || "Cierre Total";
    }
  }

  // 2. Citas existentes del profesional ese día (para tachar los huecos ocupados).
  let ocupadas: { fecha_inicio: string; fecha_fin: string }[] = [];
  if (profesionalId) {
    const { data: citas } = await supabaseAdmin
      .from("citas")
      .select("fecha_inicio, fecha_fin")
      .eq("negocio_id", negocio.id)
      .eq("profesional_id", profesionalId)
      .is("fecha_borrado", null)
      .gte("fecha_inicio", `${fecha}T00:00:00Z`)
      .lte("fecha_inicio", `${fecha}T23:59:59Z`);
    ocupadas = citas ?? [];
  }

  return NextResponse.json({ esDiaCerrado, motivoCierre, ocupadas });
}
