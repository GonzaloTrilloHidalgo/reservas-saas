import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase-admin";

// POST /api/stripe/webhook
// Stripe nos avisa de los cambios de la suscripción. Verificamos la firma y
// actualizamos suscripcion_activa en el negocio correspondiente.
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Webhook no configurado" }, { status: 503 });
  }

  const firma = request.headers.get("stripe-signature");
  if (!firma) {
    return NextResponse.json({ error: "Falta la firma" }, { status: 400 });
  }

  // El cuerpo debe leerse en crudo para verificar la firma.
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, firma, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Firma inválida" }, { status: 400 });
  }

  // Marca un negocio como activo/inactivo a partir de su cliente de Stripe.
  async function fijarEstado(customerId: string, activa: boolean, subId?: string) {
    await supabaseAdmin
      .from("negocios")
      .update({
        suscripcion_activa: activa,
        ...(subId ? { stripe_subscription_id: subId } : {}),
      })
      .eq("stripe_customer_id", customerId);
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const s = event.data.object as Stripe.Checkout.Session;
      const negocioId = s.client_reference_id;
      const customerId = typeof s.customer === "string" ? s.customer : s.customer?.id;
      const subId = typeof s.subscription === "string" ? s.subscription : s.subscription?.id;
      // Actualizamos por negocio_id (más fiable en el primer pago).
      if (negocioId) {
        await supabaseAdmin
          .from("negocios")
          .update({
            suscripcion_activa: true,
            stripe_customer_id: customerId ?? null,
            stripe_subscription_id: subId ?? null,
          })
          .eq("id", negocioId);
      } else if (customerId) {
        await fijarEstado(customerId, true, subId);
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      const activa = sub.status === "active" || sub.status === "trialing";
      await fijarEstado(customerId, activa, sub.id);
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
      await fijarEstado(customerId, false, sub.id);
      break;
    }

    default:
      // Otros eventos no nos interesan.
      break;
  }

  return NextResponse.json({ received: true });
}
