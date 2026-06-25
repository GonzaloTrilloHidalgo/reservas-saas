"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Layers, Lock, LogOut, Loader2 } from "lucide-react";

// Email de contacto para activar la cuenta (cámbialo por el tuyo).
const EMAIL_CONTACTO = "hola@velo.app";

export default function BloqueadoPage() {
  const [cargando, setCargando] = useState(true);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function comprobar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data } = await supabase
        .from("negocios")
        .select("nombre, trial_ends_at, suscripcion_activa")
        .eq("auth_user_id", user.id)
        .single();

      // Si en realidad sigue activo, lo devolvemos al panel.
      if (data && (data.suscripcion_activa || new Date(data.trial_ends_at).getTime() > Date.now())) {
        router.replace("/agenda");
        return;
      }

      if (data) setNombreNegocio(data.nombre);
      setCargando(false);
    }
    comprobar();
  }, [router]);

  const cerrarSesion = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem("velo_nombre_negocio");
    router.push("/login");
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden text-center">
        <div className="bg-indigo-600 p-8 flex flex-col items-center">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-4">
            <Layers className="text-white" size={28} />
          </div>
          <h1 className="text-xl font-black text-white italic">Velo</h1>
        </div>

        <div className="p-8">
          <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Lock size={30} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">Tu prueba ha terminado</h2>
          <p className="text-slate-500 mb-1">
            {nombreNegocio ? <>El periodo de prueba gratuito de <strong>{nombreNegocio}</strong> ha finalizado.</> : "El periodo de prueba gratuito ha finalizado."}
          </p>
          <p className="text-slate-500 mb-8">
            Para seguir usando Velo y recuperar el acceso a tu agenda, activa tu suscripción.
          </p>

          <a
            href={`mailto:${EMAIL_CONTACTO}?subject=Quiero activar mi cuenta de Velo`}
            className="w-full inline-flex items-center justify-center gap-2 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-7 py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all"
          >
            Activar mi suscripción
          </a>

          <p className="text-xs text-slate-400 mt-4">
            Tus datos están a salvo. Al activar la cuenta los recuperas tal cual los dejaste.
          </p>

          <button
            onClick={cerrarSesion}
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors"
          >
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  );
}
