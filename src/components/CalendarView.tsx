"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isToday, isSameWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/lib/supabase"; 
import { CalendarDays, Trophy, Clock, User, Calendar as CalendarIcon, Trash2, Ban, Banknote, MessageCircle } from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const locales = { es: es };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

// 1. AÑADIMOS DATOS EXTRA A LA INTERFAZ
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

    // 2. PEDIMOS EL TELÉFONO DEL CLIENTE EN LA CONSULTA
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
          telefono: cita.clientes?.telefono || "", // Guardamos el teléfono
          cliente_nombre: cita.cliente_nombre,     // Guardamos el nombre limpio
          servicio: cita.servicio                  // Guardamos el servicio limpio
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

  // 3. FUNCIÓN PARA ENVIAR EL WHATSAPP
  const enviarWhatsApp = () => {
    if (!selectedEvent?.telefono) {
      alert("Este cliente no tiene número de teléfono registrado.");
      return;
    }

    const numeroLimpio = selectedEvent.telefono.replace(/\+/g, "").replace(/\s/g, "");
    const fechaLegible = format(selectedEvent.start, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
    
    const mensaje = `¡Hola ${selectedEvent.cliente_nombre}! 👋\n\nTe escribo para recordarte tu próxima cita para *${selectedEvent.servicio}* el *${fechaLegible}h*.\n\nPor favor, confírmame si vas a poder asistir. ¡Muchas gracias!`;
    
    window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const eventPropGetter = (event: CitaCalendario) => {
    const bgColor = event.esBloqueo ? "#64748b" : (event.color || "#6366f1");
    return {
      style: {
        backgroundColor: bgColor,
        backgroundImage: event.esBloqueo ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.15) 10px, rgba(255,255,255,0.15) 20px)' : 'none',
        borderRadius: "6px",
        opacity: event.esBloqueo ? 0.8 : 0.9,
        color: "white", border: "none", display: "block",
        boxShadow: event.esBloqueo ? 'none' : `inset 0 0 0 1000px ${bgColor}`,
      },
      className: "border-none shadow-none text-xs p-1",
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
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600"><CalendarDays size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Citas Hoy</p><p className="text-2xl font-bold text-slate-800">{citasHoy}</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg text-emerald-600"><Banknote size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Ingresos Hoy</p><p className="text-2xl font-bold text-slate-800">{ingresosHoy.toFixed(2)}€</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><Banknote size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Caja Semanal</p><p className="text-2xl font-bold text-slate-800">{ingresosSemana.toFixed(2)}€</p></div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 p-3 rounded-lg text-amber-500"><Trophy size={24} /></div>
          <div><p className="text-sm font-medium text-slate-500">Top Pro (Semana)</p><p className="text-lg font-bold text-slate-800 truncate">{topProfesional} <span className="text-sm text-slate-400 font-normal">({maxCitas})</span></p></div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1 bg-slate-100 rounded-xl w-fit border border-slate-200">
        <button onClick={() => setActiveFilter("Todos")} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === "Todos" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Todos</button>
        {profesionales.map((pro) => (
          <button key={pro} onClick={() => setActiveFilter(pro)} className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === pro ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>{pro}</button>
        ))}
      </div>

      {/* CALENDARIO */}
      <div className="flex-1 overflow-x-auto min-h-150 bg-white rounded-xl border border-slate-200 p-2 shadow-sm">
        <Calendar
          localizer={localizer} events={filteredEvents} eventPropGetter={eventPropGetter} startAccessor="start" endAccessor="end" culture="es"
          onSelectEvent={handleSelectEvent} view={view} onView={(newView) => setView(newView)} date={date} onNavigate={(newDate) => setDate(newDate)}
          min={minTime} max={maxTime} messages={{ next: "Sig.", previous: "Ant.", today: "Hoy", month: "Mes", week: "Semana", day: "Día", agenda: "Agenda" }}
          style={{ height: "100%", border: "none" }}
        />
      </div>

      {/* MODAL DE DETALLES */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl opacity-100 transition-all">
          <DialogHeader>
            <DialogTitle className="text-slate-900 text-xl border-b pb-2">
              {showConfirmDelete ? "Confirmar Cancelación" : (selectedEvent?.esBloqueo ? "Detalles del Bloqueo" : "Detalles de la Reserva")}
            </DialogTitle>
          </DialogHeader>

          {selectedEvent && (
            <div className="flex flex-col gap-5 py-4">
              {!showConfirmDelete ? (
                <>
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className={`p-2 rounded-md ${selectedEvent.esBloqueo ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600'}`}>
                      {selectedEvent.esBloqueo ? <Ban size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">{selectedEvent.esBloqueo ? "Motivo" : "Servicio y Cliente"}</p>
                      <p className="font-medium text-slate-900">{selectedEvent.title}</p>
                    </div>
                  </div>

                  {!selectedEvent.esBloqueo && (
                    <div className="flex items-center gap-3 text-slate-700">
                      <div className="bg-emerald-50 p-2 rounded-md text-emerald-600"><Banknote size={20} /></div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase">Precio del Servicio</p>
                        <p className="font-medium text-slate-900">{selectedEvent.precio?.toFixed(2)}€</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="bg-indigo-50 p-2 rounded-md text-indigo-600"><CalendarIcon size={20} /></div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Fecha y Profesional</p>
                      <p className="font-medium text-slate-900">{format(selectedEvent.start, "EEEE, d 'de' MMMM", { locale: es })} — <span style={{ color: selectedEvent.color }}>{selectedEvent.profesional}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="bg-indigo-50 p-2 rounded-md text-indigo-600"><Clock size={20} /></div>
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Horario</p>
                      <p className="font-medium text-slate-900">{format(selectedEvent.start, "HH:mm")} - {format(selectedEvent.end, "HH:mm")}</p>
                    </div>
                  </div>

                  {/* 4. BOTONES DE ACCIÓN (WHATSAPP + BORRAR) */}
                  <div className="mt-4 flex flex-col gap-2">
                    {!selectedEvent.esBloqueo && selectedEvent.telefono && (
                      <button 
                        onClick={enviarWhatsApp} 
                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200 font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
                      >
                        <MessageCircle size={18} /> Avisar por WhatsApp
                      </button>
                    )}
                    
                    <button 
                      onClick={() => setShowConfirmDelete(true)} 
                      className="w-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-bold py-3 rounded-lg flex justify-center items-center gap-2 transition-colors"
                    >
                      <Trash2 size={18} /> {selectedEvent.esBloqueo ? "Quitar Bloqueo" : "Cancelar esta cita"}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 animate-in fade-in zoom-in duration-200">
                  <div className="mx-auto w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4"><Trash2 size={24} /></div>
                  <p className="text-slate-800 text-lg mb-2 font-bold">¿Estás completamente seguro?</p>
                  <p className="text-sm text-slate-500 mb-8 px-4">Se eliminará: <strong>{selectedEvent.title}</strong>. Esta acción no se puede deshacer.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowConfirmDelete(false)} disabled={isDeleting} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-lg transition-colors disabled:opacity-50">Atrás</button>
                    <button onClick={handleDeleteConfirm} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50">
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