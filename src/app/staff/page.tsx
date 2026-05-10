"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Trash2, Plus, Users } from "lucide-react";

// Actualizamos la interfaz para incluir el color
interface Profesional {
  id: string;
  nombre: string;
  color: string;
}

export default function StaffPage() {
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  // NUEVO: Estado para el color (por defecto indigo)
  const [nuevoColor, setNuevoColor] = useState("#6366f1"); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarStaff();
  }, []);

  async function cargarStaff() {
    const { data } = await supabase.from("profesionales").select("*").order("nombre");
    if (data) setProfesionales(data);
    setLoading(false);
  }

  async function añadirProfesional() {
    if (!nuevoNombre.trim()) return;
    
    // NUEVO: Enviamos nombre Y color
    const { error } = await supabase.from("profesionales").insert([
      { nombre: nuevoNombre, color: nuevoColor } 
    ]);

    if (error) alert(error.message);
    else {
      setNuevoNombre("");
      setNuevoColor("#6366f1"); // Reset al color por defecto
      cargarStaff();
    }
  }

  async function borrarProfesional(id: string) {
    if (confirm("¿Estás seguro de eliminar a este profesional?")) {
      await supabase.from("profesionales").delete().eq("id", id);
      cargarStaff();
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Configuración de Staff
          </h2>
        </header>

        <div className="p-8 max-w-4xl">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Users size={20} className="text-indigo-600" />
                Equipo de Trabajo
              </h3>
              <p className="text-sm text-slate-500">Añade profesionales y asígnales un color para el calendario.</p>
            </div>

            <div className="p-6 bg-slate-50 border-b border-slate-100 flex gap-3 items-center">
              <input 
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && añadirProfesional()}
                className="flex-1 border border-slate-200 p-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                placeholder="Nombre completo..."
              />
              
              {/* Selector de Color */}
              <div className="flex flex-col items-center gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Color</label>
                <input 
                  type="color" 
                  value={nuevoColor} 
                  onChange={(e) => setNuevoColor(e.target.value)} 
                  className="w-12 h-10 p-1 rounded-lg border border-slate-200 cursor-pointer bg-white"
                />
              </div>

              <button 
                onClick={añadirProfesional}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 h-10 self-end rounded-lg font-semibold flex items-center gap-2 transition-all"
              >
                <Plus size={18} /> Añadir
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {loading ? (
                <p className="p-6 text-center text-slate-400 text-sm">Cargando equipo...</p>
              ) : profesionales.length === 0 ? (
                <p className="p-10 text-center text-slate-400 text-sm italic">No hay profesionales registrados.</p>
              ) : (
                profesionales.map((pro) => (
                  <div key={pro.id} className="flex justify-between p-4 hover:bg-slate-50 items-center transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Muestra el círculo del color al lado del nombre */}
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: pro.color }} 
                      />
                      <span className="font-medium text-slate-700">{pro.nombre}</span>
                    </div>
                    <button 
                      onClick={() => borrarProfesional(pro.id)} 
                      className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all"
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