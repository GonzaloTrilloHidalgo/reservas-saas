import Sidebar from "@/components/Sidebar";
import CalendarView from "@/components/CalendarView";
import { Plus } from "lucide-react";
import NewAppointmentButton from "@/components/NewAppointmentButton";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8">
          <div>
            <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">
              Panel de Control
            </h2>
          </div>
          
          <NewAppointmentButton />
        </header>

        <div className="p-8 flex-1">
          {/* Contenedor del calendario */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-[calc(100vh-8rem)]">
            <CalendarView />
          </div>
        </div>
      </main>
    </div>
  );
}