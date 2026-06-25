import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// GET /api/reservar/[slug]
// Devuelve los datos públicos necesarios para pintar el portal de reservas de
// un negocio concreto: nombre, horario y catálogo de servicios/profesionales.
// No expone nada sensible (ni clientes, ni citas de otros, ni ajustes ajenos).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit anti-scraping: máx. 30 cargas por minuto por IP.
  if (!(await rateLimit(`portal:${ipDe(request)}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const { data: negocio, error } = await supabaseAdmin
    .from("negocios")
    .select("id, nombre, trial_ends_at, suscripcion_activa")
    .eq("slug", slug)
    .single();

  if (error || !negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // Negocio con la prueba caducada y sin suscripción: reservas no disponibles.
  const activo = negocio.suscripcion_activa || new Date(negocio.trial_ends_at).getTime() > Date.now();
  if (!activo) {
    return NextResponse.json({ error: "inactivo" }, { status: 403 });
  }

  const [{ data: ajustes }, { data: servicios }, { data: profesionales }] =
    await Promise.all([
      supabaseAdmin
        .from("ajustes")
        .select("hora_apertura, hora_cierre, hora_inicio_descanso, hora_fin_descanso")
        .eq("negocio_id", negocio.id)
        .single(),
      supabaseAdmin
        .from("servicios")
        .select("id, nombre, precio, duracion")
        .eq("negocio_id", negocio.id)
        .is("fecha_borrado", null)
        .order("nombre"),
      supabaseAdmin
        .from("profesionales")
        .select("id, nombre, color")
        .eq("negocio_id", negocio.id)
        .is("fecha_borrado", null)
        .order("nombre"),
    ]);

  return NextResponse.json({
    negocio: { id: negocio.id, nombre: negocio.nombre },
    ajustes: {
      horaApertura: ajustes?.hora_apertura ?? 9,
      horaCierre: ajustes?.hora_cierre ?? 20,
      inicioDescanso: ajustes?.hora_inicio_descanso ?? 14,
      finDescanso: ajustes?.hora_fin_descanso ?? 15,
    },
    servicios: servicios ?? [],
    profesionales: profesionales ?? [],
  });
}
