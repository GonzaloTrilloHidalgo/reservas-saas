"use client";

import { useState } from "react";
// Importamos 'Tags' para los servicios
import { LayoutDashboard, Users, Scissors, Menu, X, Tags, Banknote } from "lucide-react";
import Link from "next/link"; 
import { usePathname } from "next/navigation"; 

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); 

  // Añadimos la nueva ruta al array
  const menuItems = [
    { icon: LayoutDashboard, label: "Agenda", href: "/" },
    { icon: Users, label: "Profesionales", href: "/staff" },
    { icon: Tags, label: "Servicios", href: "/servicios" },
    { icon: Banknote, label: "Finanzas", href: "/ingresos" }, 
  ];

  return (
    <>
      {/* Botón Móvil */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-md shadow-sm"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
          <div className="bg-indigo-600 p-1.5 rounded-lg">
            <Scissors className="text-white" size={20} />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">PeluSaaS</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)} // Cierra el menú en móvil al hacer clic
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Overlay Móvil */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
        />
      )}
    </>
  );
}