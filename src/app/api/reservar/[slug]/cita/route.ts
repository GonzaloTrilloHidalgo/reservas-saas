import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { esFecha, esHora, esTelefono, nombreLimpio } from "@/lib/validacion";
import { rateLimit, ipDe } from "@/lib/rate-limit";

const UN_ANIO_MS = 365 * 24 * 60 * 60 * 1000;

// Verifica el captcha de Cloudflare Turnstile. Si no hay secret configurado,
// no se exige (el captcha está desactivado). Si lo hay, el token debe ser válido.
async function captchaValido(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

// POST /api/reservar/[slug]/cita
// Crea la reserva desde el portal público. Toda la validación es de servidor:
// el precio y la duración se leen de la BD (no se confía en lo que mande el
// navegador), se comprueba formato, horario, cierre y que el hueco siga libre.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  // Rate limit: máx. 5 reservas por minuto por IP (frena spam de citas).
  if (!(await rateLimit(`cita:${ipDe(request)}`, 5, 60_000))) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Espera un momento e inténtalo de nuevo." },
      { status: 429 }
    );
  }

  let body: {
    servicioId?: number | string;
    profesionalId?: string;
    fecha?: string;
    hora?: string;
    nombre?: string;
    telefono?: string;
    captchaToken?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  // Captcha anti-bot (si está configurado en el servidor)
  if (!(await captchaValido(body.captchaToken, ipDe(request)))) {
    return NextResponse.json({ error: "Verificación anti-bot fallida. Recarga e inténtalo de nuevo." }, { status: 403 });
  }

  const { servicioId, profesionalId, fecha, hora, telefono } = body;

  // Validación de formato y saneado de entrada
  const nombre = nombreLimpio(body.nombre);
  if (!servicioId || !profesionalId || !nombre) {
    return NextResponse.json({ error: "Faltan datos de la reserva" }, { status: 400 });
  }
  if (!esFecha(fecha) || !esHora(hora)) {
    return NextResponse.json({ error: "Fecha u hora con formato no válido" }, { status: 400 });
  }
  if (!esTelefono(telefono)) {
    return NextResponse.json({ error: "Teléfono no válido" }, { status: 400 });
  }

  // 1. Negocio
  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("id, trial_ends_at, suscripcion_activa")
    .eq("slug", slug)
    .single();

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // Negocio con la prueba caducada y sin suscripción: no acepta reservas.
  const activo = negocio.suscripcion_activa || new Date(negocio.trial_ends_at).getTime() > Date.now();
  if (!activo) {
    return NextResponse.json({ error: "Las reservas no están disponibles en este momento." }, { status: 403 });
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

  // No permitimos citas en el pasado ni a más de un año vista.
  const ahora = Date.now();
  if (Number.isNaN(inicio.getTime()) || inicio.getTime() < ahora || inicio.getTime() - ahora > UN_ANIO_MS) {
    return NextResponse.json({ error: "Fecha u hora fuera de rango" }, { status: 400 });
  }

  // 4. Ajustes del negocio (horario + base para los cierres)
  const { data: ajustes } = await supabaseAdmin
    .from("ajustes")
    .select("id, hora_apertura, hora_cierre")
    .eq("negocio_id", negocio.id)
    .single();

  // La cita debe caber dentro del horario de apertura del negocio.
  if (ajustes) {
    const [h, m] = hora.split(":").map(Number);
    const inicioFrac = h + m / 60;
    const finFrac = inicioFrac + duracion / 60;
    const horaApertura = ajustes.hora_apertura ?? 0;
    const horaCierre = ajustes.hora_cierre ?? 24;
    if (inicioFrac < horaApertura || finFrac > horaCierre + 0.001) {
      return NextResponse.json({ error: "Esa hora está fuera del horario del negocio" }, { status: 409 });
    }

    // 5. ¿Día cerrado (festivo/vacaciones)?
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

  // 6. ¿El hueco sigue libre? (evita dobles reservas en el mismo instante)
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

  // 7. Cliente: buscar por teléfono o crear
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
    if (clienteExistente.nombre !== nombre) {
      await supabaseAdmin
        .from("clientes")
        .update({ nombre })
        .eq("id", clienteId);
    }
  } else {
    const { data: nuevo, error: errCliente } = await supabaseAdmin
      .from("clientes")
      .insert([{ nombre, telefono, negocio_id: negocio.id }])
      .select("id")
      .single();
    if (errCliente || !nuevo) {
      return NextResponse.json({ error: "No se pudo registrar el cliente" }, { status: 500 });
    }
    clienteId = nuevo.id;
  }

  // 8. Crear la cita
  const { error: errCita } = await supabaseAdmin.from("citas").insert([
    {
      cliente_nombre: nombre,
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
