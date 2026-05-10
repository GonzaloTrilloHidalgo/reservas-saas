"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import CalendarView from "@/components/CalendarView";
import NewAppointmentButton from "@/components/NewAppointmentButton";

export default function Home() {
  // Estado para forzar el refresco del calendario
  const [refreshKey, setRefreshKey] = useState(0);

  // Esta función se ejecutará cuando el botón de "Nueva Cita" termine con éxito
  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-4">
            {/* Espacio para el botón de menú en móvil */}
            <div className="w-10 lg:hidden" />
            <h2 className="text-xs lg:text-sm font-medium text-slate-500 uppercase tracking-wider truncate">
              Panel de Control
            </h2>
          </div>
          <NewAppointmentButton onAppointmentCreated={handleRefresh} />
        </header>

        <div className="p-4 lg:p-8 flex-1 overflow-hidden">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-2 lg:p-4 h-full overflow-auto">
            <CalendarView key={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  );
}