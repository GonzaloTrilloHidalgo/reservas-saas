"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { 
  Trash2, 
  Plus, 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle 
} from "lucide-react";

interface Profesional {
  id: string;
  nombre: string;
  color: string;
}

export default function StaffPage() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoColor, setNuevoColor] = useState("#6366f1"); 
  const [loading, setLoading] = useState(true);

  // NUEVOS ESTADOS PARA UI PREMIUM
  const [toast, setToast] = useState<{ mensaje: string; tipo: "error" | "exito" } | null>(null);
  const [profesionalAEliminar, setProfesionalAEliminar] = useState<string | null>(null);

  useEffect(() => {
    cargarStaff();
  }, []);

  async function cargarStaff() {
    const { data } = await supabase.from("profesionales").select("*").is("fecha_borrado", null).order("nombre");
    if (data) setProfesionales(data);
    setLoading(false);
  }

  const mostrarNotificacion = (mensaje: string, tipo: "error" | "exito") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  async function añadirProfesional() {
    if (!nuevoNombre.trim()) {
      mostrarNotificacion("Por favor, introduce un nombre válido.", "error");
      return;
    }
    
    const { error } = await supabase.from("profesionales").insert([
      { nombre: nuevoNombre.trim(), color: nuevoColor } 
    ]);

    if (error) {
      mostrarNotificacion(error.message, "error");
    } else {
      setNuevoNombre("");
      setNuevoColor("#6366f1"); // Reset al color por defecto
      cargarStaff();
      mostrarNotificacion("Profesional añadido al equipo", "exito");
    }
  }

  async function confirmarBorrado() {
    if (!profesionalAEliminar) return;

    const { error } = await supabase.from("profesionales").update({ fecha_borrado: new Date().toISOString() }).eq("id", profesionalAEliminar);
    
    if (error) {
      mostrarNotificacion(error.message, "error");
    } else {
      mostrarNotificacion("Profesional eliminado del equipo", "exito");
      cargarStaff();
    }
    setProfesionalAEliminar(null); // Cerramos el modal
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center pl-16 pr-8 lg:px-8 shrink-0">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Configuración de Staff
          </h2>
        </header>

        {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
        {toast && (
          <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.tipo === "error" 
              ? "bg-red-50 text-red-600 border-red-100" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            {toast.tipo === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-bold text-sm">{toast.mensaje}</span>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
        {profesionalAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center flex flex-col items-center">
                <div className="bg-red-50 text-red-500 p-4 rounded-full mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar profesional?</h3>
                <p className="text-slate-500 text-sm">
                  Dejará de aparecer en el calendario. Si tiene citas asignadas, podrían quedarse sin profesional. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex border-t border-slate-100">
                <button 
                  onClick={() => setProfesionalAEliminar(null)}
                  className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <div className="w-px bg-slate-100"></div>
                <button 
                  onClick={confirmarBorrado}
                  className="flex-1 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* CABECERA */}
            <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
              <div className="bg-indigo-600 p-3 rounded-lg text-white shadow-md shadow-indigo-200">
                <Users size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  Equipo de Trabajo
                </h3>
                <p className="text-sm text-slate-500">Añade profesionales y asígnales un color para el calendario.</p>
              </div>
            </div>

            {/* FORMULARIO DE AÑADIR */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Nombre del profesional</label>
                <input 
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && añadirProfesional()}
                  className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm text-slate-900"
                  placeholder="Ej. Laura Gómez"
                />
              </div>
              
              <div className="w-full md:w-24">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block text-center">Color</label>
                <input 
                  type="color" 
                  value={nuevoColor} 
                  onChange={(e) => setNuevoColor(e.target.value)} 
                  className="w-full h-11.5 p-1 rounded-xl border border-slate-200 cursor-pointer bg-white"
                  title="Elegir color para el calendario"
                />
              </div>

              <button 
                onClick={añadirProfesional}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200 w-full md:w-auto h-11.5"
              >
                <Plus size={18} /> Añadir
              </button>
            </div>

            {/* LISTA DE PROFESIONALES */}
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : profesionales.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Users size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-bold text-lg">No hay equipo registrado</p>
                  <p className="text-slate-400 text-sm mt-1">Añade a tu primer profesional usando el formulario superior.</p>
                </div>
              ) : (
                profesionales.map((pro) => (
                  <div key={pro.id} className="flex justify-between p-5 hover:bg-slate-50 items-center transition-colors group">
                    <div className="flex items-center gap-4">
                      {/* Círculo de color más premium con borde */}
                      <div 
                        className="w-4 h-4 rounded-full border-2 border-white shadow-sm ring-1 ring-slate-200" 
                        style={{ backgroundColor: pro.color }} 
                      />
                      <span className="font-bold text-slate-700">{pro.nombre}</span>
                    </div>
                    
                    <button 
                      onClick={() => setProfesionalAEliminar(pro.id)} 
                      className="text-slate-300 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                      title="Eliminar profesional"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}