"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import { format, isSameMonth, isSameYear, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Banknote, 
  TrendingUp, 
  Users, 
  Calendar as CalendarIcon, 
  Award, 
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import * as XLSX from "xlsx";

interface CitaIngreso {
  id: string;
  precio: number;
  fecha_inicio: string;
  profesional: string;
  servicio: string;
  cliente: string;
}

export default function IngresosPage() {
  const [citas, setCitas] = useState<CitaIngreso[]>([]);
  const [, setLoading] = useState(true);
  
  // Controlador de notificaciones flotantes (Toasts)
  const [toast, setToast] = useState<{ mensaje: string; tipo: "error" | "exito" } | null>(null);

  useEffect(() => {
    cargarIngresos();
  }, []);

  async function cargarIngresos() {
    const { data, error } = await supabase
      .from("citas")
      .select(`id, precio, fecha_inicio, servicio, cliente_nombre, profesionales (nombre)`)
      .is("fecha_borrado", null)
      .neq("servicio", "Bloqueo")
      .eq("estado", "completada"); // <-- MAGIA FINANCIERA: Solo traemos lo que realmente se ha cobrado

    if (!error && data) {
      const ingresosFormateados = data.map((cita: any) => ({
        id: cita.id,
        precio: Number(cita.precio) || 0,
        fecha_inicio: cita.fecha_inicio,
        servicio: cita.servicio || "Sin servicio",
        cliente: cita.cliente_nombre || "Sin cliente",
        profesional: cita.profesionales?.nombre || "Sin asignar",
      }));
      setCitas(ingresosFormateados);
    }
    setLoading(false);
  }

  // Función para mostrar notificaciones que desaparecen solas
  const mostrarNotificacion = (mensaje: string, tipo: "error" | "exito") => {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  };

  const exportarMesActual = () => {
    const citasFiltradas = citas.filter((cita) => 
      isSameMonth(parseISO(cita.fecha_inicio), new Date())
    );

    if (citasFiltradas.length === 0) {
      mostrarNotificacion("No hay ingresos confirmados este mes para exportar.", "error");
      return;
    }

    const datosExcel = citasFiltradas.map(cita => ({
      "Fecha y Hora": format(parseISO(cita.fecha_inicio), "dd/MM/yyyy HH:mm"),
      "Cliente": cita.cliente,
      "Servicio": cita.servicio,
      "Profesional": cita.profesional,
      "Ingreso (€)": cita.precio
    }));

    const worksheet = XLSX.utils.json_to_sheet(datosExcel);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Facturación");

    worksheet["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 15 }];

    const nombreArchivo = `Facturacion_${format(new Date(), "MMMM_yyyy", { locale: es })}.xlsx`;
    XLSX.writeFile(workbook, nombreArchivo);
    
    // AVISO DE ÉXITO AL DESCARGAR
    mostrarNotificacion("Archivo Excel descargado correctamente.", "exito");
  };

  const hoy = new Date();
  const citasAnioActual = citas.filter((cita) => isSameYear(parseISO(cita.fecha_inicio), hoy));
  const ingresosAnioActual = citasAnioActual.reduce((sum, cita) => sum + cita.precio, 0);
  const citasMesActual = citas.filter((cita) => isSameMonth(parseISO(cita.fecha_inicio), hoy));
  const ingresosMesActual = citasMesActual.reduce((sum, cita) => sum + cita.precio, 0);

  const rankingGlobal = Object.entries(
    citas.reduce((acc, cita) => {
      acc[cita.profesional] = (acc[cita.profesional] || 0) + cita.precio;
      return acc;
    }, {} as Record<string, number>)
  ).map(([nombre, total]) => ({ nombre, total })).sort((a, b) => b.total - a.total);
    
  const maxIngresoGlobal = rankingGlobal.length > 0 ? rankingGlobal[0].total : 0;

  const ingresosPorMes = citas.reduce((acc, cita) => {
    const mesAnio = format(parseISO(cita.fecha_inicio), "MMMM yyyy", { locale: es });
    acc[mesAnio] = (acc[mesAnio] || 0) + cita.precio;
    return acc;
  }, {} as Record<string, number>);

  const historialMeses = Object.entries(ingresosPorMes)
    .map(([mes, total]) => ({ mes, total }))
    .sort((a, b) => b.total - a.total); 

  return (
    <div className="flex min-h-screen bg-slate-50 relative">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
        <header className="h-16 min-h-16 border-b border-slate-200 bg-white flex items-center pl-16 pr-8 lg:px-8 shrink-0">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider">Panel Financiero</h2>
        </header>

        {/* NOTIFICACIÓN FLOTANTE (TOAST) */}
        {toast && (
          <div className={`fixed bottom-8 right-8 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${
            toast.tipo === "error" 
              ? "bg-red-50 text-red-600 border-red-100" 
              : "bg-emerald-50 text-emerald-600 border-emerald-100"
          }`}>
            {toast.tipo === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
            <span className="font-bold text-sm">{toast.mensaje}</span>
          </div>
        )}

        <div className="p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* TARJETA FACTURACIÓN MES */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between relative group overflow-hidden">
              <div className="flex items-center gap-5">
                <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600">
                  <Banknote size={28} />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Facturación del Mes</p>
                  <p className="text-3xl font-black text-slate-800">{ingresosMesActual.toFixed(2)}€</p>
                </div>
              </div>
              
              <button 
                onClick={exportarMesActual}
                title="Exportar este mes a Excel"
                className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-md active:scale-95"
              >
                <FileSpreadsheet size={16} />
                Exportar Excel
              </button>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5">
              <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
                <TrendingUp size={28} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Acumulado {hoy.getFullYear()}</p>
                <p className="text-3xl font-black text-slate-800">{ingresosAnioActual.toFixed(2)}€</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-5 overflow-hidden">
              <div className="bg-amber-50 p-4 rounded-xl text-amber-500">
                <Award size={28} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-wider">Estrella del Mes</p>
                <p className="text-xl font-black text-slate-800 truncate">
                  {rankingGlobal.length > 0 ? rankingGlobal[0].nombre : "Sin datos"}
                </p>
                <p className="text-sm font-medium text-emerald-600">Líder en ventas</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <Users size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-800">Ingresos por Profesional (Global)</h3>
              </div>
              <div className="p-6 flex flex-col gap-6">
                {rankingGlobal.map((pro, index) => (
                  <div key={pro.nombre} className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm font-bold">
                      <span className="text-slate-700">{index + 1}. {pro.nombre}</span>
                      <span className="text-emerald-600">{pro.total.toFixed(2)}€</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 transition-all duration-1000" 
                        style={{ width: `${(pro.total / maxIngresoGlobal) * 100}%` }} 
                      />
                    </div>
                  </div>
                ))}
                {rankingGlobal.length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">Aún no hay ingresos cobrados.</p>}
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center gap-3">
                <CalendarIcon size={20} className="text-indigo-600" />
                <h3 className="text-lg font-bold text-slate-800">Histórico por Meses</h3>
              </div>
              <ul className="divide-y divide-slate-100">
                {historialMeses.map((item) => (
                  <li key={item.mes} className="p-6 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <span className="font-semibold text-slate-700 capitalize">{item.mes}</span>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-sm font-black border border-emerald-100">
                      + {item.total.toFixed(2)}€
                    </span>
                  </li>
                ))}
                {historialMeses.length === 0 && <p className="text-sm text-slate-400 italic text-center py-10">Sin histórico disponible.</p>}
              </ul>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}