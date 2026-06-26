// Rate limiting para los endpoints públicos.
//
// Estrategia híbrida:
//  - Si están configuradas las variables de Upstash (UPSTASH_REDIS_REST_URL y
//    UPSTASH_REDIS_REST_TOKEN), usamos un límite REAL y distribuido (compartido
//    entre todas las instancias serverless). Es la protección fuerte.
//  - Si no, caemos a un límite en memoria por instancia (suficiente para local
//    o despliegues sin configurar; frena ráfagas pero no es distribuido).

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const upstashConfigurado = !!(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
);

const redis = upstashConfigurado ? Redis.fromEnv() : null;

// Cacheamos un Ratelimit por cada configuración (límite + ventana) para no
// recrearlos en cada petición.
const limiters = new Map<string, Ratelimit>();

function getLimiter(limit: number, windowSec: number): Ratelimit {
  const clave = `${limit}:${windowSec}`;
  let l = limiters.get(clave);
  if (!l) {
    l = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s` as `${number} s`),
      prefix: "rl",
      analytics: false,
    });
    limiters.set(clave, l);
  }
  return l;
}

// ----- Fallback en memoria -----
interface Ventana {
  count: number;
  reset: number;
}
const store = new Map<string, Ventana>();

function purgar(now: number) {
  if (store.size < 5000) return;
  for (const [k, v] of store) {
    if (now > v.reset) store.delete(k);
  }
}

function rateLimitMemoria(key: string, limit: number, windowMs: number): boolean {
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

/**
 * Devuelve true si la petición está permitida, false si se superó el límite.
 * @param key      identificador (p. ej. `cita:<ip>`)
 * @param limit    nº máximo de peticiones por ventana
 * @param windowMs duración de la ventana en ms
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<boolean> {
  if (redis) {
    try {
      const { success } = await getLimiter(limit, Math.round(windowMs / 1000)).limit(key);
      return success;
    } catch {
      // Si Upstash falla por lo que sea, no bloqueamos al usuario: caemos a memoria.
      return rateLimitMemoria(key, limit, windowMs);
    }
  }
  return rateLimitMemoria(key, limit, windowMs);
}

// Extrae la IP del cliente. Priorizamos x-real-ip, que Vercel fija con la IP
// real de la conexión y el cliente NO puede falsificar. x-forwarded-for solo
// como respaldo (su primer valor sí es manipulable por el visitante).
export function ipDe(request: Request): string {
  const real = request.headers.get("x-real-ip");
  if (real) return real.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return "desconocida";
}
