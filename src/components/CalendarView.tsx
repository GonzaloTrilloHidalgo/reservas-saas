"use client";

import { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { supabase } from "@/lib/supabase"; // <-- Importamos la conexión

// Configuración del idioma español
const locales = {
  es: es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Interfaz para definir cómo es una Cita en nuestro calendario
interface CitaCalendario {
  id: string;
  title: string;
  start: Date;
  end: Date;
}

export default function CalendarView() {
  // Empezamos con un array vacío de eventos
  const [events, setEvents] = useState<CitaCalendario[]>([]);

  // useEffect hace que esta función se ejecute nada más cargar la página
  useEffect(() => {
    cargarCitas();
  }, []);

  const cargarCitas = async () => {
    // 1. Pedimos todas las citas a Supabase
    const { data, error } = await supabase
      .from("citas")
      .select("*");

    if (error) {
      console.error("Error al cargar las citas:", error.message);
      return;
    }

    // 2. Transformamos los datos al formato que exige el calendario
    if (data) {
      const citasFormateadas = data.map((cita) => ({
        id: cita.id,
        title: `${cita.servicio} (${cita.cliente_nombre})`, // Ej: Corte Clásico (Juan)
        start: new Date(cita.fecha_inicio),
        end: new Date(cita.fecha_fin),
      }));

      // 3. Guardamos las citas en el estado para que se dibujen
      setEvents(citasFormateadas);
    }
  };

  return (
    <div className="h-full w-full">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        culture="es"
        messages={{
          next: "Siguiente",
          previous: "Anterior",
          today: "Hoy",
          month: "Mes",
          week: "Semana",
          day: "Día",
          agenda: "Agenda",
        }}
        defaultView="week"
        style={{ height: "100%", border: "none" }}
      />
    </div>
  );
}