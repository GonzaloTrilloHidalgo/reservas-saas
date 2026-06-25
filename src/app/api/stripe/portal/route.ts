import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { usuarioDeRequest } from "@/lib/auth-server";

// POST /api/stripe/portal
// Abre el portal de facturación de Stripe para que el negocio gestione o
// cancele su suscripción.
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Pagos no configurados" }, { status: 503 });
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

  const origin = request.headers.get("origin") ?? process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.billingPortal.sessions.create({
    customer: negocio.stripe_customer_id,
    return_url: `${origin}/configuracion`,
  });

  return NextResponse.json({ url: session.url });
}
