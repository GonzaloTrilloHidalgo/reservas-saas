"use client";

import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Users, 
  Layers, 
  Menu, 
  X, 
  Tags, 
  Banknote, 
  Settings,
  LogOut,
  Contact
} from "lucide-react"; 
import Link from "next/link"; 
import { usePathname, useRouter } from "next/navigation"; 
import { supabase } from "@/lib/supabase";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState("Velo");
  const pathname = usePathname(); 
  const router = useRouter();

  useEffect(() => {
    // 1. CARGA INSTANTÁNEA: Buscamos si ya lo teníamos guardado en el navegador
    const nombreGuardado = localStorage.getItem("velo_nombre_negocio");
    if (nombreGuardado) {
      setNombreNegocio(nombreGuardado);
    }

    // 2. VERIFICACIÓN SAAS: Consultamos a Supabase en segundo plano filtrando por usuario
    async function obtenerNombre() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscamos el ID del negocio del usuario actual
      const { data: miNegocio } = await supabase
        .from("negocios")
        .select("id")
        .eq("auth_user_id", user.id)
        .single();

      if (!miNegocio) return;

      // Buscamos los ajustes de ese negocio específico
      const { data, error } = await supabase
        .from("ajustes")
        .select("nombre_negocio")
        .eq("negocio_id", miNegocio.id) // <-- FILTRO MULTI-TENANT
        .single();

      if (data && data.nombre_negocio) {
        setNombreNegocio(data.nombre_negocio);
        // Actualizamos la memoria rápida para la próxima vez
        localStorage.setItem("velo_nombre_negocio", data.nombre_negocio);
      }
    }
    
    obtenerNombre();
  }, []);

  const menuItems = [
    { icon: LayoutDashboard, label: "Agenda", href: "/agenda" },
    { icon: Contact, label: "Clientes", href: "/clientes" },
    { icon: Users, label: "Profesionales", href: "/staff" },
    { icon: Tags, label: "Servicios", href: "/servicios" },
    { icon: Banknote, label: "Finanzas", href: "/ingresos" },
    { icon: Settings, label: "Configuración", href: "/configuracion" },
  ];

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // Limpiamos el caché al salir por seguridad
    localStorage.removeItem("velo_nombre_negocio");
    router.push("/login");
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-slate-200 rounded-md shadow-sm"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col h-screen transition-transform duration-300 ease-in-out
        lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
      `}>
        
        {/* Cabecera Sidebar */}
        <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3 shrink-0">
          <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0">
            <Layers className="text-white" size={20} />
          </div>
          <h1 className="text-lg font-bold text-slate-800 tracking-tight truncate italic">
            {nombreNegocio}
          </h1>
        </div>

        {/* Zona de Menú (Con Scroll) */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <item.icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zona Inferior Fija */}
        <div className="shrink-0 bg-slate-50/50 border-t border-slate-100">
          <div className="p-4">
            <button 
              onClick={handleSignOut}
              className="flex items-center justify-center gap-2 px-4 py-3 w-full rounded-lg text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors border border-red-100"
            >
              <LogOut size={18} />
               Cerrar sesión
            </button>
          </div>

          <div className="pb-4">
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center">
              Powered by Velo Engine
            </p>
          </div>
        </div>
      </aside>

      {/* Overlay para móvil */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
        />
      )}
    </>
  );
}