"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Trash2, Plus, Scissors, Euro } from "lucide-react";

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState<number | string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {
    const { data } = await supabase.from("servicios").select("*").order("nombre");
    if (data) setServicios(data);
    setLoading(false);
  }

  async function añadirServicio() {
    if (!nuevoNombre.trim() || nuevoPrecio === "" || Number(nuevoPrecio) < 0) {
      alert("Por favor, introduce un nombre válido y un precio mayor o igual a 0.");
      return;
    }

    const { error } = await supabase.from("servicios").insert([
      { nombre: nuevoNombre.trim(), precio: Number(nuevoPrecio) }
    ]);

    if (error) {
      alert(error.message);
    } else {
      setNuevoNombre("");
      setNuevoPrecio("");
      cargarServicios();
    }
  }

  async function borrarServicio(id: string) {
    if (confirm("¿Estás seguro de eliminar este servicio? Dejará de aparecer en el selector al crear nuevas citas.")) {
      await supabase.from("servicios").delete().eq("id", id);
      cargarServicios();
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center px-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Configuración de Servicios
          </h2>
        </header>

        <div className="p-8 max-w-4xl">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* CABECERA DE LA TARJETA */}
            <div className="p-6 border-b border-slate-100 flex items-center gap-4">
              <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                <Scissors size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Catálogo de Servicios</h3>
                <p className="text-sm text-slate-500">Gestiona los tratamientos y precios por defecto de tu negocio.</p>
              </div>
            </div>

            {/* FORMULARIO DE AÑADIR */}
            <div className="p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Nombre del servicio</label>
                <input 
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                  placeholder="Ej. Corte de pelo caballero"
                />
              </div>
              
              <div className="w-full md:w-32">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Precio (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400">
                    <Euro size={16} />
                  </span>
                  <input 
                    type="number"
                    min="0"
                    step="0.01"
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && añadirServicio()}
                    className="w-full border border-slate-200 p-2.5 pl-9 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button 
                onClick={añadirServicio}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all w-full md:w-auto h-11"
              >
                <Plus size={18} /> Añadir
              </button>
            </div>

            {/* LISTA DE SERVICIOS */}
            <div className="divide-y divide-slate-100">
              {loading ? (
                <p className="p-6 text-center text-slate-400 text-sm">Cargando catálogo...</p>
              ) : servicios.length === 0 ? (
                <div className="p-10 text-center flex flex-col items-center">
                  <Scissors size={40} className="text-slate-200 mb-3" />
                  <p className="text-slate-500 font-medium">No hay servicios registrados.</p>
                  <p className="text-slate-400 text-sm mt-1">Añade tu primer servicio en el formulario de arriba.</p>
                </div>
              ) : (
                servicios.map((servicio) => (
                  <div key={servicio.id} className="flex justify-between p-4 hover:bg-slate-50 items-center transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-700">{servicio.nombre}</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-sm font-bold">
                        {servicio.precio.toFixed(2)} €
                      </span>
                      <button 
                        onClick={() => borrarServicio(servicio.id)} 
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                        title="Eliminar servicio"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
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