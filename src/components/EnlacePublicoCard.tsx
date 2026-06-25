"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Globe, Copy, Check, Pencil, Loader2, ExternalLink } from "lucide-react";

// Tarjeta de Configuración: muestra el enlace público de reservas, permite
// copiarlo/abrirlo y editar el slug personalizado (validado en el servidor).
export default function EnlacePublicoCard() {
  const [slug, setSlug] = useState("");
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState(false);
  const [nuevoSlug, setNuevoSlug] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    async function cargar() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("negocios")
        .select("slug")
        .eq("auth_user_id", user.id)
        .single();
      if (data?.slug) {
        setSlug(data.slug);
        setNuevoSlug(data.slug);
      }
      setCargando(false);
    }
    cargar();
  }, []);

  const enlace = `${typeof window !== "undefined" ? window.location.origin : ""}/reservar/${slug}`;

  const copiar = async () => {
    await navigator.clipboard.writeText(enlace);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/negocio/slug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ slug: nuevoSlug }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "No se pudo guardar el enlace.");
        return;
      }
      setSlug(data.slug);
      setNuevoSlug(data.slug);
      setEditando(false);
    } catch {
      setError("No se pudo guardar el enlace.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <Globe size={20} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Tu página de reservas</h3>
          <p className="text-xs text-slate-500">Comparte este enlace con tus clientes</p>
        </div>
      </div>

      {!editando ? (
        <>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
            <span className="flex-1 text-sm font-medium text-slate-700 truncate">{enlace}</span>
            <button onClick={copiar} title="Copiar" className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors">
              {copiado ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
            </button>
            <a href={enlace} target="_blank" rel="noopener noreferrer" title="Abrir" className="shrink-0 p-2 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-white transition-colors">
              <ExternalLink size={18} />
            </a>
          </div>
          <button
            onClick={() => { setEditando(true); setError(null); }}
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            <Pencil size={14} /> Personalizar enlace
          </button>
        </>
      ) : (
        <div>
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Personaliza tu enlace</label>
          <div className="mt-2 flex items-stretch gap-2">
            <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 overflow-hidden">
              <span className="text-sm text-slate-400 whitespace-nowrap hidden sm:inline">/reservar/</span>
              <input
                value={nuevoSlug}
                onChange={(e) => setNuevoSlug(e.target.value)}
                placeholder="mi-barberia"
                className="flex-1 bg-transparent py-3 px-1 text-sm font-medium text-slate-800 outline-none min-w-0"
              />
            </div>
            <button
              onClick={guardar}
              disabled={guardando}
              className="shrink-0 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all disabled:opacity-60"
            >
              {guardando ? <Loader2 size={16} className="animate-spin" /> : "Guardar"}
            </button>
            <button
              onClick={() => { setEditando(false); setNuevoSlug(slug); setError(null); }}
              className="shrink-0 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all"
            >
              Cancelar
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">Solo letras, números y guiones. Se convierten los acentos y espacios automáticamente.</p>
          {error && <p className="mt-2 text-xs font-bold text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
