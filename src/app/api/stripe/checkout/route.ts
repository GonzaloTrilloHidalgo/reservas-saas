import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PRICE_ID } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { usuarioDeRequest } from "@/lib/auth-server";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// POST /api/stripe/checkout
// Crea una sesión de Stripe Checkout (suscripción 30€/mes) para el negocio del
// usuario autenticado y devuelve la URL a la que redirigir.
export async function POST(request: NextRequest) {
  if (!stripe || !STRIPE_PRICE_ID) {
    return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });
  }

  if (!(await rateLimit(`stripe-checkout:${ipDe(request)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const user = await usuarioDeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Negocio del usuario
  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("id, nombre, stripe_customer_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!negocio) {
    return NextResponse.json({ error: "Negocio no encontrado" }, { status: 404 });
  }

  // Reutilizamos el cliente de Stripe si ya existe; si no, lo creamos.
  let customerId = negocio.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email ?? undefined,
      name: negocio.nombre,
      metadata: { negocio_id: negocio.id },
    });
    customerId = customer.id;
    await supabaseAdmin
      .from("negocios")
      .update({ stripe_customer_id: customerId })
      .eq("id", negocio.id);
  }

  // URL oficial de la app (no nos fiamos de la cabecera Origin, manipulable).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? "";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    client_reference_id: negocio.id,
    subscription_data: { metadata: { negocio_id: negocio.id } },
    allow_promotion_codes: true,
    success_url: `${baseUrl}/agenda?suscripcion=ok`,
    cancel_url: `${baseUrl}/bloqueado`,
  });

  return NextResponse.json({ url: session.url });
}
