import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/reservar/[slug]/cita
// Crea la reserva desde el portal público. Toda la validación es de servidor:
// el precio y la duración se leen de la BD (no se confía en lo que mande el
// navegador), se comprueba que el día no esté cerrado y que el hueco siga libre.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  let body: {
    servicioId?: number | string;
    profesionalId?: string;
    fecha?: string;
    hora?: string;
    nombre?: string;
    telefono?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  const { servicioId, profesionalId, fecha, hora, nombre, telefono } = body;

  if (!servicioId || !profesionalId || !fecha || !hora || !nombre?.trim() || !telefono) {
    return NextResponse.json({ error: "Faltan datos de la reserva" }, { status: 400 });
  }

  // 1. Negocio
  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("id")
    .eq("slug", slug)
    .single();

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // 2. Servicio (precio y duración autoritativos desde la BD)
  const { data: servicio } = await supabaseAdmin
    .from("servicios")
    .select("nombre, precio, duracion")
    .eq("id", servicioId)
    .eq("negocio_id", negocio.id)
    .is("fecha_borrado", null)
    .maybeSingle();

  if (!servicio) {
    return NextResponse.json({ error: "Servicio no válido" }, { status: 400 });
  }

  // 3. Profesional (que pertenezca al negocio)
  const { data: profesional } = await supabaseAdmin
    .from("profesionales")
    .select("id")
    .eq("id", profesionalId)
    .eq("negocio_id", negocio.id)
    .is("fecha_borrado", null)
    .maybeSingle();

  if (!profesional) {
    return NextResponse.json({ error: "Profesional no válido" }, { status: 400 });
  }

  const duracion = servicio.duracion || 60;
  const inicio = new Date(`${fecha}T${hora}:00`);
  const fin = new Date(inicio.getTime() + duracion * 60000);

  if (Number.isNaN(inicio.getTime()) || inicio < new Date()) {
    return NextResponse.json({ error: "Fecha u hora no válida" }, { status: 400 });
  }

  // 4. ¿Día cerrado?
  const { data: ajustes } = await supabaseAdmin
    .from("ajustes")
    .select("id")
    .eq("negocio_id", negocio.id)
    .single();

  if (ajustes) {
    const { data: cierre } = await supabaseAdmin
      .from("cierres_negocio")
      .select("id")
      .eq("fecha", fecha)
      .eq("ajustes_id", ajustes.id)
      .is("fecha_borrado", null)
      .maybeSingle();
    if (cierre) {
      return NextResponse.json({ error: "Ese día el negocio está cerrado" }, { status: 409 });
    }
  }

  // 5. ¿El hueco sigue libre? (evita dobles reservas en el mismo instante)
  const { data: citasDia } = await supabaseAdmin
    .from("citas")
    .select("fecha_inicio, fecha_fin")
    .eq("negocio_id", negocio.id)
    .eq("profesional_id", profesionalId)
    .is("fecha_borrado", null)
    .gte("fecha_inicio", `${fecha}T00:00:00Z`)
    .lte("fecha_inicio", `${fecha}T23:59:59Z`);

  const solapa = (citasDia ?? []).some((c) => {
    const exInicio = new Date(c.fecha_inicio);
    const exFin = new Date(c.fecha_fin);
    return inicio < exFin && fin > exInicio;
  });

  if (solapa) {
    return NextResponse.json({ error: "Ese hueco acaba de ocuparse" }, { status: 409 });
  }

  // 6. Cliente: buscar por teléfono o crear
  let clienteId: string | null = null;
  const { data: clienteExistente } = await supabaseAdmin
    .from("clientes")
    .select("id, nombre")
    .eq("negocio_id", negocio.id)
    .eq("telefono", telefono)
    .is("fecha_borrado", null)
    .maybeSingle();

  if (clienteExistente) {
    clienteId = clienteExistente.id;
    if (clienteExistente.nombre !== nombre.trim()) {
      await supabaseAdmin
        .from("clientes")
        .update({ nombre: nombre.trim() })
        .eq("id", clienteId);
    }
  } else {
    const { data: nuevo, error: errCliente } = await supabaseAdmin
      .from("clientes")
      .insert([{ nombre: nombre.trim(), telefono, negocio_id: negocio.id }])
      .select("id")
      .single();
    if (errCliente || !nuevo) {
      return NextResponse.json({ error: "No se pudo registrar el cliente" }, { status: 500 });
    }
    clienteId = nuevo.id;
  }

  // 7. Crear la cita
  const { error: errCita } = await supabaseAdmin.from("citas").insert([
    {
      cliente_nombre: nombre.trim(),
      cliente_id: clienteId,
      servicio: servicio.nombre,
      profesional_id: profesionalId,
      negocio_id: negocio.id,
      fecha_inicio: inicio.toISOString(),
      fecha_fin: fin.toISOString(),
      precio: servicio.precio || 0,
      estado: "pendiente",
    },
  ]);

  if (errCita) {
    return NextResponse.json({ error: "No se pudo crear la cita" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
