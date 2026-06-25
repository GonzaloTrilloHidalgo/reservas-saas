import Stripe from "stripe";

// Cliente de Stripe (solo servidor). Gated: si no hay STRIPE_SECRET_KEY, queda
// null y los endpoints de pago responden "no configurado" en vez de romper.
const secret = process.env.STRIPE_SECRET_KEY;

export const stripe = secret ? new Stripe(secret) : null;
export const stripeConfigurado = !!secret;

// Price ID del plan de 30€/mes (lo creas en el dashboard de Stripe).
export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID ?? "";
