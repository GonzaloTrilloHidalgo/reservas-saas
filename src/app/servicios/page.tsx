"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { 
  Trash2, 
  Plus, 
  Scissors, 
  Euro, 
  AlertCircle, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  Pencil, // <-- Añadimos el icono de editar
  Save,   // <-- Icono para guardar cambios
  X       // <-- Icono para cerrar el modal
} from "lucide-react";

interface Servicio {
  id: string;
  nombre: string;
  precio: number;
  duracion: number;
}

export default function ServiciosPage() {
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(true);

  // ESTADOS PARA CREAR SERVICIO
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState<number | string>("");
  const [nuevaDuracion, setNuevaDuracion] = useState<number | string>(60);

  // ESTADOS PARA EDITAR SERVICIO
  const [servicioAEditar, setServicioAEditar] = useState<Servicio | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editPrecio, setEditPrecio] = useState<number | string>("");
  const [editDuracion, setEditDuracion] = useState<number | string>("");

  // ESTADOS PARA UI PREMIUM
  const [toast, setToast] = useState<{ mensaje: string; tipo: "error" | "exito" } | null>(null);
  const [servicioAEliminar, setServicioAEliminar] = useState<string | null>(null);

  useEffect(() => {
    cargarServicios();
  }, []);

  async function cargarServicios() {
    const { data } = await supabase.from("servicios").select("*").is("fecha_borrado", null).order("nombre");
    if (data) setServicios(data);
    setLoading(false);
  }

  const mostrarNotificacion = (mensaje: string, tipo: "error" | "exito") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  async function añadirServicio() {
    if (!nuevoNombre.trim() || nuevoPrecio === "" || Number(nuevoPrecio) < 0 || nuevaDuracion === "" || Number(nuevaDuracion) <= 0) {
      mostrarNotificacion("Introduce datos válidos (precio >= 0 y duración > 0).", "error");
      return;
    }

    const { error } = await supabase.from("servicios").insert([
      { nombre: nuevoNombre.trim(), precio: Number(nuevoPrecio), duracion: Number(nuevaDuracion) }
    ]);

    if (error) {
      mostrarNotificacion(error.message, "error");
    } else {
      setNuevoNombre("");
      setNuevoPrecio("");
      setNuevaDuracion(60);
      cargarServicios();
      mostrarNotificacion("Servicio añadido al catálogo", "exito");
    }
  }

  async function confirmarBorrado() {
    if (!servicioAEliminar) return;

    const { error } = await supabase.from("servicios").update({ fecha_borrado: new Date().toISOString() }).eq("id", servicioAEliminar);
    
    if (error) {
      mostrarNotificacion(error.message, "error");
    } else {
      mostrarNotificacion("Servicio eliminado correctamente", "exito");
      cargarServicios();
    }
    setServicioAEliminar(null);
  }

  // FUNCIÓN: PREPARAR EL MODAL DE EDICIÓN
  const abrirEdicion = (servicio: Servicio) => {
    setServicioAEditar(servicio);
    setEditNombre(servicio.nombre);
    setEditPrecio(servicio.precio);
    setEditDuracion(servicio.duracion);
  };

  // FUNCIÓN: GUARDAR LOS CAMBIOS EN SUPABASE
  async function guardarEdicion() {
    if (!servicioAEditar) return;
    
    if (!editNombre.trim() || editPrecio === "" || Number(editPrecio) < 0 || editDuracion === "" || Number(editDuracion) <= 0) {
      mostrarNotificacion("Revisa los datos introducidos.", "error");
      return;
    }

    const { error } = await supabase
      .from("servicios")
      .update({
        nombre: editNombre.trim(),
        precio: Number(editPrecio),
        duracion: Number(editDuracion)
      })
      .eq("id", servicioAEditar.id);

    if (error) {
      mostrarNotificacion(error.message, "error");
    } else {
      mostrarNotificacion("Servicio actualizado correctamente", "exito");
      setServicioAEditar(null); // Cierra el modal
      cargarServicios();        // Refresca la lista
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center pl-16 pr-8 lg:px-8 shrink-0">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
            Configuración de Servicios
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

        {/* MODAL DE EDICIÓN */}
        {servicioAEditar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Pencil size={20} className="text-indigo-600" /> Editar Servicio
                </h3>
                <button onClick={() => setServicioAEditar(null)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 p-1.5 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Nombre del servicio</label>
                  <input 
                    value={editNombre} onChange={(e) => setEditNombre(e.target.value)}
                    className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Duración (min)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400"><Clock size={18} /></span>
                      <input 
                        type="number" min="5" step="5"
                        value={editDuracion} onChange={(e) => setEditDuracion(e.target.value)}
                        className="w-full border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Precio (€)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-3 text-slate-400"><Euro size={18} /></span>
                      <input 
                        type="number" min="0" step="0.01"
                        value={editPrecio} onChange={(e) => setEditPrecio(e.target.value)}
                        className="w-full border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-slate-100 flex gap-3">
                <button onClick={() => setServicioAEditar(null)} className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button onClick={guardarEdicion} className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 flex justify-center items-center gap-2 transition-all active:scale-95">
                  <Save size={18} /> Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL DE CONFIRMACIÓN DE BORRADO */}
        {servicioAEliminar && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center flex flex-col items-center">
                <div className="bg-red-50 text-red-500 p-4 rounded-full mb-4">
                  <AlertTriangle size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar servicio?</h3>
                <p className="text-slate-500 text-sm">
                  Dejará de aparecer en el selector al crear nuevas citas. Esta acción no se puede deshacer.
                </p>
              </div>
              <div className="flex border-t border-slate-100">
                <button onClick={() => setServicioAEliminar(null)} className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <div className="w-px bg-slate-100"></div>
                <button onClick={confirmarBorrado} className="flex-1 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 max-w-4xl mx-auto w-full">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* CABECERA DE LA TARJETA */}
            <div className="p-6 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
              <div className="bg-indigo-600 p-3 rounded-lg text-white shadow-md shadow-indigo-200">
                <Scissors size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Catálogo de Servicios</h3>
                <p className="text-sm text-slate-500">Gestiona los tratamientos, duración y precios de tu negocio.</p>
              </div>
            </div>

            {/* FORMULARIO DE AÑADIR */}
            <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-end bg-white">
              <div className="flex-1 w-full">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Nombre del servicio</label>
                <input 
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  className="w-full border border-slate-200 p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                  placeholder="Ej. Corte de pelo"
                />
              </div>
              
              <div className="w-full md:w-32">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Duración (min)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400"><Clock size={18} /></span>
                  <input 
                    type="number" min="5" step="5"
                    value={nuevaDuracion}
                    onChange={(e) => setNuevaDuracion(e.target.value)}
                    className="w-full border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                  />
                </div>
              </div>

              <div className="w-full md:w-36">
                <label className="text-[10px] uppercase font-bold text-slate-400 mb-1.5 block">Precio (€)</label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-slate-400"><Euro size={18} /></span>
                  <input 
                    type="number" min="0" step="0.01"
                    value={nuevoPrecio}
                    onChange={(e) => setNuevoPrecio(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && añadirServicio()}
                    className="w-full border border-slate-200 p-3 pl-10 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm font-medium"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <button 
                onClick={añadirServicio}
                className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md w-full md:w-auto"
              >
                <Plus size={18} /> Añadir
              </button>
            </div>

            {/* LISTA DE SERVICIOS */}
            <div className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-12 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              ) : servicios.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center">
                  <div className="bg-slate-50 p-6 rounded-full mb-4">
                    <Scissors size={32} className="text-slate-300" />
                  </div>
                  <p className="text-slate-600 font-bold text-lg">No hay servicios registrados</p>
                  <p className="text-slate-400 text-sm mt-1">Añade tu primer servicio usando el formulario de arriba.</p>
                </div>
              ) : (
                servicios.map((servicio) => (
                  <div key={servicio.id} className="flex justify-between p-5 hover:bg-slate-50 items-center transition-colors group">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800">{servicio.nombre}</span>
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1 mt-1 md:hidden">
                        <Clock size={12} /> {servicio.duracion || 60} min
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 sm:gap-4">
                      <span className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                        <Clock size={14} /> {servicio.duracion || 60} min
                      </span>
                      
                      <span className="bg-indigo-50 text-indigo-700 px-4 py-1.5 rounded-lg text-sm font-black min-w-17.5 text-center">
                        {servicio.precio.toFixed(2)} €
                      </span>
                      
                      <div className="flex items-center gap-1">
                        {/* BOTÓN EDITAR */}
                        <button 
                          onClick={() => abrirEdicion(servicio)} 
                          className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2.5 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                          title="Editar servicio"
                        >
                          <Pencil size={18} />
                        </button>
                        {/* BOTÓN ELIMINAR */}
                        <button 
                          onClick={() => setServicioAEliminar(servicio.id)} 
                          className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2.5 rounded-lg transition-all md:opacity-0 md:group-hover:opacity-100 focus:opacity-100"
                          title="Eliminar servicio"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
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