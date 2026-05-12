"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isToday, isSameWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/lib/supabase"; 
import { 
  CalendarDays, Trophy, Clock, User, Calendar as CalendarIcon, 
  Trash2, Ban, Banknote, MessageCircle, ChevronLeft, ChevronRight 
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const locales = { es: es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// INTERFAZ
interface CitaCalendario {
  id: string;
  title: string;
  start: Date;
  end: Date;
  profesional?: string;
  color?: string;
  esBloqueo?: boolean;
  precio?: number; 
  telefono?: string;
  cliente_nombre?: string;
  servicio?: string;
}

// COMPONENTE: HEADER PERSONALIZADO DEL CALENDARIO
const CustomToolbar = (toolbar: any) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');

  const label = () => {
    const date = toolbar.date;
    return <span className="capitalize">{format(date, 'MMMM yyyy', { locale: es })}</span>;
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 bg-white p-2 rounded-2xl">
      <div className="flex items-center gap-2">
        <button onClick={goToCurrent} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-bold transition-all">
          Hoy
        </button>
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={goToBack} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all"><ChevronLeft size={20} /></button>
          <div className="w-px h-5 bg-slate-200"></div>
          <button onClick={goToNext} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all"><ChevronRight size={20} /></button>
        </div>
      </div>

      <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
        <CalendarDays className="text-indigo-600" size={24} />
        {label()}
      </h2>

      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1 gap-1">
        {['day', 'week', 'month'].map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${
              toolbar.view === viewName 
                ? 'bg-white text-indigo-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {viewName === 'day' ? 'Día' : viewName === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>
    </div>
  );
};

export default function CalendarView() {
  const [allEvents, setAllEvents] = useState<CitaCalendario[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CitaCalendario[]>([]);
  const [profesionales, setProfesionales] = useState<string[]>([]);
  const [activeFilter, setActiveFilter] = useState("Todos");
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date()); 

  const [horaApertura, setHoraApertura] = useState<number>(9);
  const [horaCierre, setHoraCierre] = useState<number>(20);

  const [selectedEvent, setSelectedEvent] = useState<CitaCalendario | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false); 
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    cargarDatosIniciales();
    const handleResize = () => { window.innerWidth < 768 ? setView("day") : setView("week") };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (activeFilter === "Todos") setFilteredEvents(allEvents);
    else setFilteredEvents(allEvents.filter(e => e.profesional === activeFilter));
  }, [activeFilter, allEvents]);

  const cargarDatosIniciales = async () => {
    const { data: ajustesData } = await supabase.from("ajustes").select("hora_apertura, hora_cierre").limit(1).single();
    if (ajustesData) { setHoraApertura(ajustesData.hora_apertura); setHoraCierre(ajustesData.hora_cierre); }

    const { data: staffData } = await supabase.from("profesionales").select("nombre");
    if (staffData) setProfesionales(staffData.map(p => p.nombre));

    const { data: citasData, error } = await supabase
      .from("citas")
      .select(`id, servicio, cliente_nombre, fecha_inicio, fecha_fin, precio, profesionales (nombre, color), clientes (telefono)`);
    
    if (error) return console.error("Error al cargar:", error.message);

    if (citasData) {
      const citasFormateadas = citasData.map((cita: any) => {
        const esBloqueo = cita.servicio === "Bloqueo";
        return {
          id: cita.id,
          title: esBloqueo ? `Bloqueado: ${cita.cliente_nombre}` : `${cita.servicio} (${cita.cliente_nombre})`,
          start: new Date(cita.fecha_inicio),
          end: new Date(cita.fecha_fin),
          profesional: cita.profesionales?.nombre || "Sin asignar",
          color: cita.profesionales?.color || "#6366f1",
          esBloqueo: esBloqueo,
          precio: cita.precio || 0,
          telefono: cita.clientes?.telefono || "", 
          cliente_nombre: cita.cliente_nombre,     
          servicio: cita.servicio                  
        };
      });
      setAllEvents(citasFormateadas);
    }
  };

  const handleSelectEvent = (eventoSeleccionado: CitaCalendario) => {
    setSelectedEvent(eventoSeleccionado);
    setShowConfirmDelete(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    setIsDeleting(true);
    const { error } = await supabase.from("citas").delete().eq("id", selectedEvent.id);
    setIsDeleting(false);
    if (!error) {
      setAllEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setIsModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const enviarWhatsApp = () => {
    if (!selectedEvent?.telefono) return alert("Este cliente no tiene número de teléfono registrado.");
    const numeroLimpio = selectedEvent.telefono.replace(/\+/g, "").replace(/\s/g, "");
    const fechaLegible = format(selectedEvent.start, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
    const mensaje = `¡Hola ${selectedEvent.cliente_nombre}! 👋\n\nTe escribo para recordarte tu próxima cita para *${selectedEvent.servicio}* el *${fechaLegible}h*.\n\nPor favor, confírmame si vas a poder asistir. ¡Muchas gracias!`;
    window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const eventPropGetter = (event: CitaCalendario) => {
    const bgColor = event.esBloqueo ? "#94a3b8" : (event.color || "#6366f1");
    return {
      style: {
        backgroundColor: bgColor,
        backgroundImage: event.esBloqueo ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' : 'none',
        borderRadius: "8px",
        opacity: event.esBloqueo ? 0.7 : 0.95,
        color: "white", 
        border: "none", 
        display: "block",
        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
        padding: "4px 8px",
        fontWeight: "600",
      },
      className: "transition-all hover:brightness-110",
    };
  };

  const citasReales = allEvents.filter(c => !c.esBloqueo);
  const arrayCitasHoy = citasReales.filter(cita => isToday(cita.start));
  const citasHoy = arrayCitasHoy.length;
  const ingresosHoy = arrayCitasHoy.reduce((sum, cita) => sum + (cita.precio || 0), 0);
  const arrayCitasSemana = citasReales.filter(cita => isSameWeek(cita.start, new Date(), { weekStartsOn: 1 }));
  const ingresosSemana = arrayCitasSemana.reduce((sum, cita) => sum + (cita.precio || 0), 0);

  const conteoPro = arrayCitasSemana.reduce((acc, cita) => {
    const nombre = cita.profesional || "Sin asignar";
    acc[nombre] = (acc[nombre] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  let topProfesional = "Sin datos";
  let maxCitas = 0;
  Object.entries(conteoPro).forEach(([nombre, cantidad]) => {
    if (nombre !== "Sin asignar" && cantidad > maxCitas) { maxCitas = cantidad; topProfesional = nombre; }
  });

  const minTime = new Date(); minTime.setHours(horaApertura, 0, 0);
  const maxTime = new Date(); maxTime.setHours(horaCierre, 0, 0);

  return (
    <div className="h-full w-full flex flex-col gap-4 relative">
      
      {/* TARJETAS DE ESTADÍSTICAS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><CalendarDays size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Citas Hoy</p><p className="text-2xl font-black text-slate-800">{citasHoy}</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><Banknote size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Ingresos Hoy</p><p className="text-2xl font-black text-slate-800">{ingresosHoy.toFixed(2)}€</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Banknote size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Caja Semanal</p><p className="text-2xl font-black text-slate-800">{ingresosSemana.toFixed(2)}€</p></div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-xl text-amber-500"><Trophy size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Top Pro (Semana)</p><p className="text-lg font-black text-slate-800 truncate">{topProfesional}</p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-white rounded-2xl w-fit border border-slate-200 shadow-sm">
        <button onClick={() => setActiveFilter("Todos")} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === "Todos" ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>Todos</button>
        {profesionales.map((pro) => (
          <button key={pro} onClick={() => setActiveFilter(pro)} className={`px-5 py-2 rounded-xl text-xs font-bold transition-all ${activeFilter === pro ? "bg-slate-900 text-white shadow-md" : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"}`}>{pro}</button>
        ))}
      </div>

      {/* CONTENEDOR DEL CALENDARIO */}
      <div className="flex-1 min-h-175 bg-white rounded-3xl border border-slate-200 p-6 shadow-xl shadow-slate-100/50 calendar-container">
        <Calendar
          localizer={localizer} 
          events={filteredEvents} 
          eventPropGetter={eventPropGetter} 
          startAccessor="start" 
          endAccessor="end" 
          culture="es"
          onSelectEvent={handleSelectEvent} 
          view={view} 
          onView={(newView) => setView(newView)} 
          date={date} 
          onNavigate={(newDate) => setDate(newDate)}
          min={minTime} 
          max={maxTime} 
          components={{
            toolbar: CustomToolbar // <-- AQUÍ INYECTAMOS LA CABECERA MODERNA
          }}
          style={{ height: "100%", border: "none" }}
        />
      </div>

      {/* MODAL DETALLES... (se mantiene igual, ya está modernizado) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-0 overflow-hidden">
          <DialogHeader className="p-6 border-b border-slate-100 bg-slate-50/50">
            <DialogTitle className="text-slate-900 text-xl font-black">
              {showConfirmDelete ? "Confirmar Cancelación" : (selectedEvent?.esBloqueo ? "Detalles del Bloqueo" : "Ficha de Cita")}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="flex flex-col gap-5 p-6">
              {!showConfirmDelete ? (
                <>
                  <div className="flex items-center gap-4 text-slate-700">
                    <div className={`p-3 rounded-xl ${selectedEvent.esBloqueo ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600'}`}>
                      {selectedEvent.esBloqueo ? <Ban size={24} /> : <User size={24} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedEvent.esBloqueo ? "Motivo" : "Servicio y Cliente"}</p>
                      <p className="font-bold text-slate-900 text-lg">{selectedEvent.title}</p>
                    </div>
                  </div>

                  {!selectedEvent.esBloqueo && (
                    <div className="flex items-center gap-4 text-slate-700">
                      <div className="bg-emerald-50 p-3 rounded-xl text-emerald-600"><Banknote size={24} /></div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Precio</p>
                        <p className="font-bold text-slate-900 text-lg">{selectedEvent.precio?.toFixed(2)}€</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><CalendarIcon size={24} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Profesional</p>
                      <p className="font-bold text-slate-900">{format(selectedEvent.start, "EEEE, d 'de' MMMM", { locale: es })}</p>
                      <p className="text-sm font-medium" style={{ color: selectedEvent.color }}>{selectedEvent.profesional}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-slate-700">
                    <div className="bg-indigo-50 p-3 rounded-xl text-indigo-600"><Clock size={24} /></div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Horario</p>
                      <p className="font-bold text-slate-900">{format(selectedEvent.start, "HH:mm")} - {format(selectedEvent.end, "HH:mm")}</p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-3">
                    {!selectedEvent.esBloqueo && selectedEvent.telefono && (
                      <button onClick={enviarWhatsApp} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-200 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95">
                        <MessageCircle size={20} /> Avisar por WhatsApp
                      </button>
                    )}
                    
                    <button onClick={() => setShowConfirmDelete(true)} className="w-full bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all">
                      <Trash2 size={20} /> {selectedEvent.esBloqueo ? "Quitar Bloqueo" : "Cancelar Cita"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-200">
                  <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6"><Trash2 size={32} /></div>
                  <p className="text-slate-900 text-xl mb-2 font-black">¿Eliminar esta cita?</p>
                  <p className="text-sm text-slate-500 mb-8 px-4">Esta acción no se puede deshacer. El cliente desaparecerá del calendario.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConfirmDelete(false)} disabled={isDeleting} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-4 rounded-2xl transition-all">Atrás</button>
                    <button onClick={handleDeleteConfirm} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white shadow-xl shadow-red-200 font-bold py-4 rounded-2xl transition-all flex justify-center items-center gap-2">
                      {isDeleting ? "Borrando..." : "Sí, borrar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}