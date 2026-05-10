"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Settings, Clock, Building2, Save, CheckCircle2 } from "lucide-react";

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // NUEVO: Estado para recordar cuál es tu ID real en la tabla de ajustes
  const [ajustesId, setAjustesId] = useState<number | string | null>(null);

  // Estados de los ajustes
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [apertura, setApertura] = useState(9);
  const [cierre, setCierre] = useState(20);

  useEffect(() => {
    cargarAjustes();
  }, []);

  async function cargarAjustes() {
    const { data, error } = await supabase
      .from("ajustes")
      .select("*")
      .limit(1) // Cogemos tu única configuración
      .single();

    if (data) {
      setAjustesId(data.id); // <-- Aquí guardamos tu ID secreto
      setNombreNegocio(data.nombre_negocio);
      setApertura(data.hora_apertura);
      setCierre(data.hora_cierre);
    }
    setLoading(false);
  }

  async function guardarAjustes() {
    // Si por algún motivo no tenemos ID, no hacemos nada para evitar errores
    if (!ajustesId) return; 

    setIsSaving(true);
    const { error } = await supabase
      .from("ajustes")
      .update({
        nombre_negocio: nombreNegocio,
        hora_apertura: apertura,
        hora_cierre: cierre,
      })
      .eq("id", ajustesId); // <-- Ahora actualizamos tu ID específico, no el 1

    setIsSaving(false);
    
    if (error) {
      alert("Error al guardar: " + error.message);
    } else {
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center text-slate-400">Cargando configuración...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-8 shrink-0">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ajustes del Sistema</h2>
        </header>

        <div className="p-8 max-w-2xl mx-auto w-full">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <Settings className="text-indigo-600" size={20} />
                <h3 className="text-lg font-bold text-slate-800">Preferencias de Velo</h3>
              </div>
              {showSuccess && (
                <div className="flex items-center gap-2 text-emerald-600 text-sm font-bold animate-in fade-in slide-in-from-right-4">
                  <CheckCircle2 size={16} /> Guardado con éxito
                </div>
              )}
            </div>

            <div className="p-8 flex flex-col gap-8">
              
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wide">
                  <Building2 size={16} /> Nombre del Negocio
                </div>
                <input 
                  type="text"
                  value={nombreNegocio}
                  onChange={(e) => setNombreNegocio(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900"
                  placeholder="Ej. Clínica Dental Velo"
                />
                <p className="text-xs text-slate-400">Este nombre aparecerá en los reportes y en la interfaz.</p>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-slate-700 font-bold text-sm uppercase tracking-wide">
                  <Clock size={16} /> Horario Comercial
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Hora de Apertura</label>
                    <select 
                      value={apertura}
                      onChange={(e) => setApertura(parseInt(e.target.value))}
                      className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00h</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1.5 block">Hora de Cierre</label>
                    <select 
                      value={cierre}
                      onChange={(e) => setCierre(parseInt(e.target.value))}
                      className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900"
                    >
                      {[...Array(24)].map((_, i) => (
                        <option key={i} value={i}>{i.toString().padStart(2, '0')}:00h</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button 
                onClick={guardarAjustes}
                disabled={isSaving}
                className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-indigo-200"
              >
                {isSaving ? "Guardando..." : <><Save size={20} /> Guardar Cambios</>}
              </button>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}