import { Calendar, Users, Settings, Home } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 border-r border-slate-200 h-screen bg-white p-6 flex flex-col gap-8">
      <div className="text-xl font-bold text-indigo-600 tracking-tight">
        ReservaSaaS
      </div>

      <nav className="flex flex-col gap-2">
        <NavItem icon={<Home size={20} />} label="Inicio" active />
        <NavItem icon={<Calendar size={20} />} label="Agenda" />
        <NavItem icon={<Users size={20} />} label="Clientes" />
        <NavItem icon={<Settings size={20} />} label="Configuración" />
      </nav>
    </aside>
  );
}

function NavItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <button className={`flex items-center gap-3 px-4 py-2 rounded-lg font-medium transition-all ${
      active 
        ? "bg-indigo-50 text-indigo-700" 
        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
    }`}>
      {icon}
      {label}
    </button>
  );
}