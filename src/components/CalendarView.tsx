"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isToday, isSameWeek } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/lib/supabase";
import {
  CalendarDays, Trophy, Clock, User, Calendar as CalendarIcon,
  Trash2, Ban, Banknote, MessageCircle, ChevronLeft, ChevronRight,
  CheckCircle2, RotateCcw
} from "lucide-react";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const locales = { es: es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

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
  isBackground?: boolean;
  isFestivo?: boolean;
  estado?: string; 
}

const CustomToolbar = (toolbar: any) => {
  const goToBack = () => toolbar.onNavigate('PREV');
  const goToNext = () => toolbar.onNavigate('NEXT');
  const goToCurrent = () => toolbar.onNavigate('TODAY');

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

      <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2 capitalize">
        <CalendarDays className="text-indigo-600" size={24} />
        {toolbar.label}
      </h2>

      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl overflow-hidden p-1 gap-1">
        {['day', 'week', 'month'].map((viewName) => (
          <button
            key={viewName}
            onClick={() => toolbar.onView(viewName)}
            className={`px-4 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${toolbar.view === viewName
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
  const [backgroundEvents, setBackgroundEvents] = useState<CitaCalendario[]>([]);
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
    // 1. IDENTIFICAR AL USUARIO Y SU NEGOCIO
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: miNegocio } = await supabase
      .from("negocios")
      .select("id")
      .eq("auth_user_id", user.id)
      .single();

    if (!miNegocio) return;
    const negocioId = miNegocio.id;

    // 2. CARGAR AJUSTES DE ESTE NEGOCIO
    const { data: ajustesData } = await supabase
      .from("ajustes")
      .select("*")
      .eq("negocio_id", negocioId)
      .single();

    let apertura = 9, cierre = 20, iniDescanso = 14, finDescanso = 15;
    let currentAjustesId = null;

    if (ajustesData) {
      currentAjustesId = ajustesData.id;
      apertura = ajustesData.hora_apertura;
      cierre = ajustesData.hora_cierre;
      iniDescanso = ajustesData.hora_inicio_descanso;
      finDescanso = ajustesData.hora_fin_descanso;
      setHoraApertura(apertura);
      setHoraCierre(cierre);
    }

    // 3. CARGAR PROFESIONALES DE ESTE NEGOCIO
    const { data: staffData } = await supabase
      .from("profesionales")
      .select("nombre")
      .eq("negocio_id", negocioId)
      .is("fecha_borrado", null)
      .order("nombre");
      
    if (staffData) setProfesionales(staffData.map(p => p.nombre));

    // 4. CARGAR CITAS DE ESTE NEGOCIO
    const { data: citasData, error } = await supabase
      .from("citas")
      .select(`id, servicio, cliente_nombre, fecha_inicio, fecha_fin, precio, profesionales (nombre, color), clientes (telefono), estado`)
      .eq("negocio_id", negocioId)
      .is("fecha_borrado", null);

    if (error) return console.error("Error al cargar:", error.message);

    if (citasData) {
      const citasFormateadas = citasData
        .filter((cita: any) => cita.estado !== 'cancelada')
        .map((cita: any) => {
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
            servicio: cita.servicio,
            estado: cita.estado 
          };
        });
      setAllEvents(citasFormateadas);
    }

    // 5. CARGAR FESTIVOS DE ESTE NEGOCIO (vinculado a ajustes_id)
    const generadorFondos: CitaCalendario[] = [];

    if (currentAjustesId) {
      const { data: festivosData } = await supabase
        .from("cierres_negocio")
        .select("*")
        .eq("ajustes_id", currentAjustesId)
        .is("fecha_borrado", null);

      const hoy = new Date();
      for (let i = -30; i < 60; i++) {
        const diaAct = new Date(hoy);
        diaAct.setDate(hoy.getDate() + i);
        const diaString = diaAct.toISOString().split("T")[0];

        const festivoEncontrado = festivosData?.find(f => f.fecha === diaString);

        if (festivoEncontrado) {
          const start = new Date(diaAct); start.setHours(apertura, 0, 0);
          const end = new Date(diaAct); end.setHours(cierre, 0, 0);
          generadorFondos.push({
            id: `bg-fest-${diaString}`,
            title: festivoEncontrado.motivo || "FESTIVO",
            start, end, isBackground: true, isFestivo: true
          });
        } else {
          const start = new Date(diaAct); start.setHours(iniDescanso, 0, 0);
          const end = new Date(diaAct); end.setHours(finDescanso, 0, 0);
          generadorFondos.push({
            id: `bg-desc-${diaString}`,
            title: "DESCANSO",
            start, end, isBackground: true, isFestivo: false
          });
        }
      }
    }
    setBackgroundEvents(generadorFondos);
  };

  const handleSelectEvent = (eventoSeleccionado: CitaCalendario) => {
    setSelectedEvent(eventoSeleccionado);
    setShowConfirmDelete(false);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEvent) return;
    setIsDeleting(true);
    const { error } = await supabase
      .from("citas")
      .update({ fecha_borrado: new Date().toISOString() })
      .eq("id", selectedEvent.id);

    setIsDeleting(false);
    if (!error) {
      setAllEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      setIsModalOpen(false);
      setSelectedEvent(null);
    }
  };

  const cambiarEstadoCita = async (id: string, nuevoEstado: string) => {
    setAllEvents(prev => {
        if (nuevoEstado === 'cancelada') return prev.filter(e => e.id !== id);
        return prev.map(e => e.id === id ? { ...e, estado: nuevoEstado } : e);
    });

    setIsModalOpen(false);

    await supabase
      .from("citas")
      .update({ estado: nuevoEstado })
      .eq("id", id);
  };

  const enviarWhatsApp = () => {
    if (!selectedEvent?.telefono) return alert("Este cliente no tiene número de teléfono registrado.");
    const numeroLimpio = selectedEvent.telefono.replace(/\+/g, "").replace(/\s/g, "");
    const fechaLegible = format(selectedEvent.start, "EEEE d 'de' MMMM 'a las' HH:mm", { locale: es });
    const mensaje = `¡Hola ${selectedEvent.cliente_nombre}!\n\nTe escribo para recordarte tu próxima cita para *${selectedEvent.servicio}* el *${fechaLegible}h*.\n\nPor favor, confírmame si vas a poder asistir. ¡Muchas gracias!`;
    window.open(`https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`, "_blank");
  };

  const eventPropGetter = (event: CitaCalendario) => {
    if (event.isBackground) {
      return {
        style: {
          backgroundColor: event.isFestivo ? "rgba(239, 68, 68, 0.08)" : "rgba(99, 102, 241, 0.08)",
          color: event.isFestivo ? "#ef4444" : "#6366f1",
          border: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: "900",
          fontSize: "11px",
          pointerEvents: "none" as "none",
          textTransform: "uppercase" as "uppercase",
        }
      };
    }

    const bgColor = event.esBloqueo ? "#94a3b8" : (event.color || "#6366f1");
    return {
      style: {
        backgroundColor: bgColor,
        backgroundImage: event.esBloqueo ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)' : 'none',
        borderRadius: "8px",
        opacity: event.esBloqueo ? 0.7 : (event.estado === 'completada' ? 0.5 : 0.95),
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

  const dayPropGetter = (date: Date) => {
    const day = date.getDay();
    if (day === 0 || day === 6) {
      return { style: { backgroundColor: '#f8fafc' } };
    }
    return {};
  };

  const citasReales = allEvents.filter(c => !c.esBloqueo);
  const arrayCitasHoy = citasReales.filter(cita => isToday(cita.start));
  const citasHoy = arrayCitasHoy.length; 
  
  const ingresosHoy = arrayCitasHoy.reduce((sum, cita) => {
    return cita.estado === 'completada' ? sum + (cita.precio || 0) : sum;
  }, 0);
  
  const arrayCitasSemana = citasReales.filter(cita => isSameWeek(cita.start, new Date(), { weekStartsOn: 1 }));
  
  const ingresosSemana = arrayCitasSemana.reduce((sum, cita) => {
    return cita.estado === 'completada' ? sum + (cita.precio || 0) : sum;
  }, 0);

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

      <div className="flex-1 min-h-[700px] bg-white rounded-3xl border border-slate-200 p-6 shadow-xl shadow-slate-100/50 calendar-container">
        <Calendar
          localizer={localizer}
          events={filteredEvents}
          backgroundEvents={backgroundEvents}
          dayLayoutAlgorithm="no-overlap"
          eventPropGetter={eventPropGetter}
          dayPropGetter={dayPropGetter}
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
          components={{ toolbar: CustomToolbar }}
          style={{ height: "100%", border: "none" }}
        />
      </div>

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
                    <div className="flex-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        {selectedEvent.esBloqueo ? "Motivo" : "Servicio y Cliente"}
                        {selectedEvent.estado === 'completada' && (
                          <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full text-[9px]">COBRADA</span>
                        )}
                      </p>
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
                      <button onClick={enviarWhatsApp} className="w-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-600 font-bold py-3.5 rounded-2xl flex justify-center items-center gap-2 transition-all">
                        <MessageCircle size={20} /> Avisar por WhatsApp
                      </button>
                    )}
                    
                    {!selectedEvent.esBloqueo && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        {selectedEvent.estado === 'completada' ? (
                          <button 
                            onClick={() => cambiarEstadoCita(selectedEvent.id, 'pendiente')} 
                            className="col-span-full bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95"
                          >
                            <RotateCcw size={20} /> Deshacer cobro (Volver a pendiente)
                          </button>
                        ) : (
                          <>
                            <button 
                              onClick={() => cambiarEstadoCita(selectedEvent.id, 'completada')} 
                              className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl shadow-emerald-200 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all active:scale-95"
                            >
                              <CheckCircle2 size={20} /> Cobrada
                            </button>
                            <button 
                              onClick={() => cambiarEstadoCita(selectedEvent.id, 'cancelada')} 
                              className="bg-white hover:bg-red-50 text-red-600 border border-red-100 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all"
                            >
                              <Ban size={20} /> Cancelar Cita
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {selectedEvent.esBloqueo && (
                      <button onClick={() => setShowConfirmDelete(true)} className="w-full bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 transition-all">
                        <Trash2 size={20} /> Quitar Bloqueo
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-6 animate-in fade-in zoom-in duration-200">
                  <div className="mx-auto w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6"><Trash2 size={32} /></div>
                  <p className="text-slate-900 text-xl mb-2 font-black">¿Eliminar este bloqueo?</p>
                  <p className="text-sm text-slate-500 mb-8 px-4">Esta acción liberará el espacio en el calendario.</p>
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