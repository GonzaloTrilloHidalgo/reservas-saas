"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { CreditCard, Loader2, CheckCircle2 } from "lucide-react";

// Tarjeta de estado de suscripción para la página de Configuración.
// Muestra si está suscrito o en prueba y permite contratar/gestionar el pago.
export default function SuscripcionCard() {
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [activa, setActiva] = useState(false);
  const [tieneCliente, setTieneCliente] = useState(false);
  const [diasPrueba, setDiasPrueba] = useState<number | null>(null);
  const [cancelaEl, setCancelaEl] = useState<number | null>(null);

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("negocios")
        .select("trial_ends_at, suscripcion_activa, stripe_customer_id")
        .eq("auth_user_id", user.id)
        .single();
      if (data) {
        setActiva(!!data.suscripcion_activa);
        setTieneCliente(!!data.stripe_customer_id);
        if (!data.suscripcion_activa && data.trial_ends_at) {
          const ms = new Date(data.trial_ends_at).getTime() - Date.now();
          setDiasPrueba(Math.max(0, Math.ceil(ms / 86_400_000)));
        }

        // Si está suscrito, consultamos a Stripe si está programada la cancelación.
        if (data.suscripcion_activa) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch("/api/stripe/estado", {
              method: "POST",
              headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
            });
            const est = await res.json().catch(() => ({}));
            if (est?.cancelaAlTerminar && est?.cancelaEl) setCancelaEl(est.cancelaEl);
          } catch {
            // si falla, simplemente no mostramos el aviso de cancelación
          }
        }
      }
      setCargando(false);
    }
    cargar();
  }, []);

  const fechaCancela = cancelaEl
    ? new Date(cancelaEl).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
    : null;

  async function llamar(endpoint: "checkout" | "portal") {
    setProcesando(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/stripe/${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token ?? ""}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        window.location.href = data.url;
        return;
      }
      alert(data.error === "Pagos no configurados"
        ? "Los pagos aún no están configurados."
        : "No se pudo abrir el pago. Inténtalo de nuevo.");
    } catch {
      alert("No se pudo abrir el pago. Inténtalo de nuevo.");
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <CreditCard size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Suscripción</h3>
          <p className="text-xs text-slate-500">Plan Velo · 30€/mes</p>
        </div>
        {activa && (
          <span className={`ml-auto inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full border ${
            fechaCancela
              ? "text-amber-600 bg-amber-50 border-amber-100"
              : "text-emerald-600 bg-emerald-50 border-emerald-100"
          }`}>
            <CheckCircle2 size={14} /> {fechaCancela ? "Se cancela pronto" : "Activa"}
          </span>
        )}
      </div>

      {!activa && diasPrueba !== null && (
        <p className="text-sm text-slate-600 mb-3">
          Estás en el periodo de prueba: te quedan <strong>{diasPrueba} {diasPrueba === 1 ? "día" : "días"}</strong>. Suscríbete para no perder el acceso.
        </p>
      )}

      {activa && fechaCancela && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-3">
          <p className="text-sm text-amber-700">
            Tu suscripción seguirá <strong>activa hasta el {fechaCancela}</strong>. Ese día se cancelará y perderás el acceso. Puedes reactivarla antes desde &quot;Gestionar suscripción&quot;.
          </p>
        </div>
      )}

      {activa || tieneCliente ? (
        <button
          onClick={() => llamar("portal")}
          disabled={procesando}
          className="inline-flex items-center justify-center gap-2 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl transition-all disabled:opacity-60"
        >
          {procesando ? <Loader2 size={16} className="animate-spin" /> : "Gestionar suscripción"}
        </button>
      ) : (
        <button
          onClick={() => llamar("checkout")}
          disabled={procesando}
          className="inline-flex items-center justify-center gap-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all disabled:opacity-60"
        >
          {procesando ? <Loader2 size={16} className="animate-spin" /> : "Suscribirme · 30€/mes"}
        </button>
      )}
    </div>
  );
}
