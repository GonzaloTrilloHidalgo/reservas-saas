import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { usuarioDeRequest } from "@/lib/auth-server";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// POST /api/stripe/portal
// Abre el portal de facturación de Stripe para que el negocio gestione o
// cancele su suscripción.
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });
  }

  if (!(await rateLimit(`stripe-portal:${ipDe(request)}`, 10, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const user = await usuarioDeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("stripe_customer_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!negocio?.stripe_customer_id) {
    return NextResponse.json({ error: "Sin suscripción activa" }, { status: 400 });
  }

  // URL oficial de la app (no nos fiamos de la cabecera Origin, manipulable).
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? request.headers.get("origin") ?? "";

  const session = await stripe.billingPortal.sessions.create({
    customer: negocio.stripe_customer_id,
    return_url: `${baseUrl}/configuracion`,
  });

  return NextResponse.json({ url: session.url });
}
