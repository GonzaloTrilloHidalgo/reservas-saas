// Rate limiting en memoria para los endpoints públicos.
//
// NOTA: en serverless (Vercel) la memoria es por instancia y se reinicia con los
// cold starts, así que esto frena ráfagas desde una misma instancia pero NO es
// una protección distribuida fuerte. Para eso haría falta un store externo
// (Upstash Redis). Aun así, levanta una barrera básica contra spam/enumeración.

interface Ventana {
  count: number;
  reset: number;
}

const store = new Map<string, Ventana>();

// Limpieza perezosa para que el Map no crezca sin control.
function purgar(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) {
    if (now > v.reset) store.delete(k);
  }
}

/**
 * Devuelve true si la petición está permitida, false si se ha superado el límite.
 * @param key    identificador (p. ej. `cita:<ip>`)
 * @param limit  nº máximo de peticiones por ventana
 * @param windowMs duración de la ventana en ms
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  purgar(now);

  const actual = store.get(key);
  if (!actual || now > actual.reset) {
    store.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (actual.count >= limit) return false;
  actual.count++;
  return true;
}

// Extrae la IP del cliente de las cabeceras que pone el proxy (Vercel).
export function ipDe(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
