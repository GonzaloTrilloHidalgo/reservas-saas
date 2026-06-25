"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { Festivo } from "@/types";
import { 
  Settings, Clock, Building2, Save, CheckCircle2, 
  AlertCircle, Coffee, CalendarOff, Trash2, Plus 
} from "lucide-react";

export default function ConfiguracionPage() {
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ mensaje: string; tipo: "error" | "exito" } | null>(null);

  // Estados de Ajustes Generales
  const [ajustesId, setAjustesId] = useState<number | string | null>(null);
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [apertura, setApertura] = useState(9);
  const [cierre, setCierre] = useState(20);
  const [inicioDescanso, setInicioDescanso] = useState(14);
  const [finDescanso, setFinDescanso] = useState(15);
  const [negocioId, setNegocioId] = useState<string | null>(null);

  // Estados de Festivos
  const [festivos, setFestivos] = useState<Festivo[]>([]);
  const [nuevaFechaCierre, setNuevaFechaCierre] = useState("");
  const [nuevoMotivo, setNuevoMotivo] = useState("");

  useEffect(() => {
    cargarDatos(); // se declara abajo y se reutiliza tras guardar/eliminar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarDatos() {
  // 1. Obtener el usuario que tiene la sesión iniciada actualmente
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return;

  // 2. Buscar el ID del negocio que pertenece a este usuario
  const { data: miNegocio } = await supabase
    .from("negocios")
    .select("id")
    .eq("auth_user_id", user.id)
    .single();

  if (!miNegocio) return;

  // 3. Ahora sí, cargar los Ajustes filtrando por ESE negocio específico
  const { data: adj, error: errorAjustes } = await supabase
    .from("ajustes")
    .select("*")
    .eq("negocio_id", miNegocio.id) // <-- EL FILTRO MÁGICO
    .single();

  if (adj && !errorAjustes) {
    setAjustesId(adj.id);
    setNegocioId(adj.negocio_id);
    setNombreNegocio(adj.nombre_negocio);
    setApertura(adj.hora_apertura);
    setCierre(adj.hora_cierre);
    setInicioDescanso(adj.hora_inicio_descanso || 14);
    setFinDescanso(adj.hora_fin_descanso || 15);
    
    // Una vez tenemos el ajustesId, cargamos sus festivos
    cargarFestivos(adj.id);
  }

  setLoading(false);
}

// Separar la carga de festivos para que sea más limpio
async function cargarFestivos(currentAjustesId: number) {
  const { data: fes } = await supabase
    .from("cierres_negocio")
    .select("*")
    .eq("ajustes_id", currentAjustesId)
    .is("fecha_borrado", null)
    .order("fecha", { ascending: true });
    
  if (fes) setFestivos(fes);
}
  const mostrarNotificacion = (mensaje: string, tipo: "error" | "exito") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  async function guardarAjustes() {
  if (!negocioId) return; // ajustesId puede ser nulo la primera vez si usamos upsert
  setIsSaving(true);

  try {
    // .upsert detecta si la fila existe por la Primary Key (id) o una Unique Constraint
    const { error: errorAjustes } = await supabase
      .from("ajustes")
      .upsert({
        // Si ajustesId existe, lo usamos para actualizar la fila exacta
        // Si es nulo, Supabase creará una nueva vinculada al negocioId
        ...(ajustesId ? { id: ajustesId } : {}), 
        negocio_id: negocioId,
        nombre_negocio: nombreNegocio,
        hora_apertura: Number(apertura),
        hora_cierre: Number(cierre),
        hora_inicio_descanso: Number(inicioDescanso),
        hora_fin_descanso: Number(finDescanso),
      });

    if (errorAjustes) throw errorAjustes;

    const { error: errorNegocio } = await supabase
      .from("negocios")
      .update({ nombre: nombreNegocio })
      .eq("id", negocioId);

    if (errorNegocio) throw errorNegocio;

    mostrarNotificacion("Configuración guardada correctamente", "exito");
    
    // Volvemos a cargar los datos para obtener el ajustesId si era nuevo
    cargarDatos();

  } catch (error) {
    mostrarNotificacion(error instanceof Error ? error.message : "Error al guardar", "error");
  } finally {
    setIsSaving(false);
  }
}

  async function añadirFestivo() {
    if (!nuevaFechaCierre || !ajustesId) return; // Nos aseguramos de tener el ID del negocio
    
    const { error } = await supabase.from("cierres_negocio").insert([
      { 
        fecha: nuevaFechaCierre, 
        motivo: nuevoMotivo,
        ajustes_id: ajustesId // <-- GUARDAMOS EL FESTIVO VINCULADO AL NEGOCIO
      }
    ]);

    if (error) mostrarNotificacion(error.message, "error");
    else {
      setNuevaFechaCierre(""); setNuevoMotivo("");
      cargarDatos();
      mostrarNotificacion("Día de cierre añadido", "exito");
    }
  }

  async function eliminarFestivo(id: string) {
    const { error } = await supabase
      .from("cierres_negocio")
      .update({ fecha_borrado: new Date().toISOString() })
      .eq("id", id);
    if (!error) cargarDatos();
  }

  if (loading) return <div className="flex min-h-screen bg-slate-50"><Sidebar /><div className="flex-1 flex items-center justify-center">Cargando...</div></div>;

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center pl-16 pr-4 lg:px-8 shrink-0">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Configuración General</h2>
        </header>

        {toast && (
          <div className={`fixed bottom-8 right-4 md:right-8 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 ${toast.tipo === "error" ? "bg-red-50 text-red-600 border-red-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"}`}>
            {toast.tipo === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-bold text-sm">{toast.mensaje}</span>
          </div>
        )}

        <div className="p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6 md:space-y-8 pb-24 overflow-x-hidden">
          
          {/* SECCIÓN 1: HORARIOS Y NEGOCIO */}
          <section className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <Settings className="text-indigo-600" size={20} />
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Ajustes del Establecimiento</h3>
            </div>
            
            <div className="p-4 md:p-8 space-y-6 md:space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Building2 size={14}/> Nombre Comercial</label>
                  <input value={nombreNegocio} onChange={(e) => setNombreNegocio(e.target.value)} className="w-full border border-slate-200 p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-700 transition-all block min-w-0" />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> Jornada Laboral</label>
                   <div className="flex items-center gap-2 w-full">
                      <select value={apertura} onChange={(e) => setApertura(Number(e.target.value))} className="flex-1 border border-slate-200 p-3.5 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-w-0">
                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00h</option>)}
                      </select>
                      <span className="text-slate-400 font-bold text-xs uppercase shrink-0">a</span>
                      <select value={cierre} onChange={(e) => setCierre(Number(e.target.value))} className="flex-1 border border-slate-200 p-3.5 rounded-xl bg-slate-50 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 min-w-0">
                        {[...Array(24)].map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00h</option>)}
                      </select>
                   </div>
                </div>
              </div>

              {/* BLOQUE DE DESCANSO */}
              <div className="bg-indigo-50/50 p-4 md:p-6 rounded-2xl border border-indigo-100 space-y-4">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-[10px] uppercase tracking-widest">
                  <Coffee size={16} /> Horario de Descanso / Cierre Temporal
                </div>
                <div className="grid grid-cols-2 gap-3 md:gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-indigo-400 uppercase block mb-1.5">Inicio Descanso</label>
                    <select value={inicioDescanso} onChange={(e) => setInicioDescanso(Number(e.target.value))} className="w-full border-none p-3.5 rounded-xl bg-white shadow-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 min-w-0">
                      {[...Array(24)].map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00h</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-indigo-400 uppercase block mb-1.5">Fin Descanso</label>
                    <select value={finDescanso} onChange={(e) => setFinDescanso(Number(e.target.value))} className="w-full border-none p-3.5 rounded-xl bg-white shadow-sm font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500 min-w-0">
                      {[...Array(24)].map((_, i) => <option key={i} value={i}>{i.toString().padStart(2, '0')}:00h</option>)}
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-400 font-medium leading-relaxed italic">
                  Las horas comprendidas en este rango no estarán disponibles para reservar citas en la web pública.
                </p>
              </div>

              <button onClick={guardarAjustes} disabled={isSaving} className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]">
                {isSaving ? "Guardando..." : <><Save size={20} /> Guardar Preferencias</>}
              </button>
            </div>
          </section>

          {/* SECCIÓN 2: FESTIVOS Y CIERRES */}
          <section className="bg-white rounded-2xl md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
              <CalendarOff className="text-red-500" size={20} />
              <h3 className="font-black text-slate-800 uppercase text-xs tracking-widest">Días de Cierre Totales</h3>
            </div>
            
            <div className="p-4 md:p-8 space-y-6">
              
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end bg-red-50/30 p-4 md:p-5 rounded-2xl border border-red-100 w-full">
                
                <div className="w-full md:flex-1 space-y-2 min-w-0">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Fecha</label>
                  <input 
                    type="date" 
                    value={nuevaFechaCierre} 
                    onChange={(e) => setNuevaFechaCierre(e.target.value)} 
                    className="w-full block min-w-0 appearance-none bg-white p-3.5 rounded-xl border border-red-100 outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-900" 
                  />
                </div>
                
                <div className="w-full md:flex-1 space-y-2 min-w-0">
                  <label className="text-[10px] font-black text-red-500 uppercase tracking-widest block">Motivo del cierre</label>
                  <input 
                    type="text" 
                    value={nuevoMotivo} 
                    onChange={(e) => setNuevoMotivo(e.target.value)} 
                    placeholder="Ej. Festivo Nacional" 
                    className="w-full block min-w-0 appearance-none bg-white p-3.5 rounded-xl border border-red-100 outline-none focus:ring-2 focus:ring-red-400 font-bold text-red-900 placeholder:text-red-200" 
                  />
                </div>

                <button onClick={añadirFestivo} className="w-full md:w-auto shrink-0 flex justify-center bg-red-500 hover:bg-red-600 text-white p-3.5 rounded-xl transition-all shadow-lg shadow-red-200 active:scale-95 mt-2 md:mt-0">
                  <Plus size={20} /> <span className="md:hidden font-bold ml-2">Añadir Día</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {festivos.length === 0 ? (
                  <div className="col-span-full py-8 md:py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">No hay cierres programados</p>
                  </div>
                ) : (
                  festivos.map((f) => (
                    <div key={f.id} className="flex justify-between items-center p-4 md:p-5 bg-white border border-slate-100 rounded-2xl group hover:border-red-200 transition-all shadow-sm">
                      <div>
                        <p className="font-black text-slate-800">{new Date(f.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                        <p className="text-[10px] text-red-400 uppercase font-black tracking-tighter">{f.motivo || 'Cierre Total'}</p>
                      </div>
                      <button onClick={() => eliminarFestivo(f.id)} className="text-slate-300 hover:text-red-500 p-2 transition-colors rounded-lg hover:bg-red-50"><Trash2 size={18} /></button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}