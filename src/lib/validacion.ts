// Validaciones de entrada para los endpoints públicos de reserva.
// Objetivo: rechazar datos malformados o abusivos (longitudes enormes,
// formatos inválidos) antes de tocar la base de datos.

export const MAX_NOMBRE = 80;

// Fecha en formato YYYY-MM-DD
export function esFecha(valor: unknown): valor is string {
  return typeof valor === "string" && /^\d{4}-\d{2}-\d{2}$/.test(valor);
}

// Hora en formato HH:MM (24h)
export function esHora(valor: unknown): valor is string {
  return typeof valor === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
}

// Teléfono: opcional '+' y entre 6 y 20 dígitos (tras quitar espacios)
export function esTelefono(valor: unknown): valor is string {
  if (typeof valor !== "string") return false;
  return /^\+?[0-9]{6,20}$/.test(valor.replace(/\s+/g, ""));
}

// Nombre saneado: recorta espacios y exige 1..MAX_NOMBRE caracteres.
export function nombreLimpio(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  if (limpio.length < 1 || limpio.length > MAX_NOMBRE) return null;
  return limpio;
}
