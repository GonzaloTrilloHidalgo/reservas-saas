import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { usuarioDeRequest } from "@/lib/auth-server";
import { rateLimit, ipDe } from "@/lib/rate-limit";

// POST /api/stripe/estado
// Devuelve el estado real de la suscripción del negocio (si está programada para
// cancelarse y en qué fecha), consultando a Stripe en vivo.
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ status: "none" });
  }

  if (!(await rateLimit(`stripe-estado:${ipDe(request)}`, 30, 60_000))) {
    return NextResponse.json({ error: "Demasiadas solicitudes." }, { status: 429 });
  }

  const user = await usuarioDeRequest(request);
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { data: negocio } = await supabaseAdmin
    .from("negocios")
    .select("stripe_subscription_id")
    .eq("auth_user_id", user.id)
    .single();

  if (!negocio?.stripe_subscription_id) {
    return NextResponse.json({ status: "none" });
  }

  try {
    const sub = await stripe.subscriptions.retrieve(negocio.stripe_subscription_id);

    // Fecha de cancelación: cancel_at (cancelación programada en fecha concreta)
    // o, si solo está el flag de fin de periodo, el fin del periodo actual.
    const finPeriodoItem = sub.items?.data?.[0]?.current_period_end ?? null;
    const cancelaSegundos = sub.cancel_at ?? (sub.cancel_at_period_end ? finPeriodoItem : null);
    const cancelaEl = cancelaSegundos ? cancelaSegundos * 1000 : null;

    // Está programada para cancelarse si hay fecha futura de cancelación O el flag.
    const programada = sub.cancel_at_period_end || (cancelaEl !== null && cancelaEl > Date.now());

    return NextResponse.json({
      status: sub.status,
      cancelaAlTerminar: programada,
      cancelaEl,
    });
  } catch {
    return NextResponse.json({ status: "none" });
  }
}
