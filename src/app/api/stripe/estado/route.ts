import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { usuarioDeRequest } from "@/lib/auth-server";

// POST /api/stripe/estado
// Devuelve el estado real de la suscripción del negocio (si está programada para
// cancelarse y en qué fecha), consultando a Stripe en vivo.
export async function POST(request: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ status: "none" });
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

    // Fecha de cancelación: cancel_at si existe; si no, el fin del periodo actual
    // (en esta versión de la API el periodo vive en los items de la suscripción).
    const finPeriodoItem = sub.items?.data?.[0]?.current_period_end ?? null;
    const cancelaSegundos = sub.cancel_at ?? (sub.cancel_at_period_end ? finPeriodoItem : null);

    return NextResponse.json({
      status: sub.status,
      cancelaAlTerminar: sub.cancel_at_period_end,
      cancelaEl: cancelaSegundos ? cancelaSegundos * 1000 : null, // ms
    });
  } catch {
    return NextResponse.json({ status: "none" });
  }
}
