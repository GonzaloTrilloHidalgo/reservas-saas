// Utilidades de fecha/hora con zona horaria del negocio.
//
// El servidor de Vercel corre en UTC, así que NO se puede usar `new Date("...")`
// para interpretar la hora que elige el cliente: saldría desfasada. Aquí
// convertimos la hora "de pared" (la que ve el usuario) al instante UTC correcto,
// teniendo en cuenta el horario de verano/invierno.

// Zona del negocio. Hoy la app es para España; si en el futuro hay negocios en
// otras zonas, esto debería venir de los ajustes del negocio.
export const ZONA_NEGOCIO = "Europe/Madrid";

/**
 * Convierte una fecha (YYYY-MM-DD) y hora (HH:mm) interpretadas en la zona del
 * negocio al instante UTC en formato ISO. Maneja el cambio horario (CEST/CET).
 */
export function horaLocalAUtcISO(fecha: string, hora: string, zona = ZONA_NEGOCIO): string {
  // 1. Tomamos la hora de pared como si fuera UTC (punto de partida).
  const comoSiUTC = new Date(`${fecha}T${hora}:00Z`).getTime();

  // 2. Vemos qué hora de pared representa ese instante EN la zona del negocio.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const partes = dtf.formatToParts(new Date(comoSiUTC));
  const m: Record<string, string> = {};
  for (const p of partes) m[p.type] = p.value;

  const horaZona = m.hour === "24" ? "00" : m.hour;
  const enZonaComoUTC = Date.UTC(+m.year, +m.month - 1, +m.day, +horaZona, +m.minute, +m.second);

  // 3. La diferencia es el desfase de la zona; lo restamos para obtener el UTC real.
  const offset = enZonaComoUTC - comoSiUTC;
  return new Date(comoSiUTC - offset).toISOString();
}
