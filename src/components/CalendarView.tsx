"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer, View } from "react-big-calendar"; // Añadimos View
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/lib/supabase"; 

const locales = { es: es };

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface CitaCalendario {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export default function CalendarView() {
  const [events, setEvents] = useState<CitaCalendario[]>([]);
  // NUEVO: Estado para controlar la vista (semana o día)
  const [view, setView] = useState<View>("week");

  useEffect(() => {
    cargarCitas();

    // NUEVO: Lógica para detectar móvil al cargar y al redimensionar
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setView("day");
      } else {
        setView("week");
      }
    };

    handleResize(); // Ejecutar al montar el componente
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const cargarCitas = async () => {
    const { data, error } = await supabase.from("citas").select("*");
    if (error) {
      console.error("Error al cargar:", error.message);
      return;
    }
    if (data) {
      const citasFormateadas = data.map((cita) => ({
        id: cita.id,
        title: `${cita.servicio} (${cita.cliente_nombre})`,
        start: new Date(cita.fecha_inicio),
        end: new Date(cita.fecha_fin),
      }));
      setEvents(citasFormateadas);
    }
  };

  const handleSelectEvent = async (eventoSeleccionado: CitaCalendario) => {
    const confirmar = window.confirm(
      `¿Estás seguro de que quieres cancelar la cita: ${eventoSeleccionado.title}?`
    );
    if (confirmar) {
      const { error } = await supabase
        .from("citas")
        .delete()
        .eq("id", eventoSeleccionado.id);

      if (error) {
        alert("Hubo un error al borrar: " + error.message);
      } else {
        setEvents((eventosAnteriores) =>
          eventosAnteriores.filter((cita) => cita.id !== eventoSeleccionado.id)
        );
        alert("Cita cancelada con éxito");
      }
    }
  };

  return (
    <div className="h-full w-full overflow-x-auto">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="es"
        onSelectEvent={handleSelectEvent}
        // NUEVOS AJUSTES PARA MÓVIL:
        view={view} // Controla la vista actual
        onView={(newView) => setView(newView)} // Permite cambiar manualmente
        messages={{
          next: "Sig.",
          previous: "Ant.",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
        style={{ height: "100%", border: "none" }}
      />
    </div>
  );
}