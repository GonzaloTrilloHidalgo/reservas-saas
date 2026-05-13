"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Sidebar from "@/components/Sidebar";
import {
    Trash2, Plus, Search, Phone, Mail, FileText, User,
    AlertCircle, CheckCircle2, AlertTriangle, X,
    History, TrendingUp, Calendar as CalendarIcon, Clock, ArrowRight, Save
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import 'react-phone-number-input/style.css';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';

interface Cliente {
    id: string;
    nombre: string;
    telefono: string;
    email: string;
    notas: string;
}

interface CitaHistorial {
    id: string;
    fecha_inicio: string;
    servicio: string;
    precio: number;
    profesionales: { nombre: string };
    estado: string;
}

export default function ClientesPage() {
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [busqueda, setBusqueda] = useState("");
    const [loading, setLoading] = useState(true);

    const [toast, setToast] = useState<{ mensaje: string; tipo: "error" | "exito" } | null>(null);
    const [clienteAEliminar, setClienteAEliminar] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [clienteDetalle, setClienteDetalle] = useState<Cliente | null>(null);
    const [historialCitas, setHistorialCitas] = useState<CitaHistorial[]>([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);
    const [notasEditables, setNotasEditables] = useState("");

    const [nombre, setNombre] = useState("");
    const [telefono, setTelefono] = useState<string | undefined>("");
    const [email, setEmail] = useState("");
    const [notas, setNotas] = useState("");

    useEffect(() => {
        cargarClientes();
    }, []);

    async function cargarClientes() {
        const { data } = await supabase.from("clientes").select("*").is("fecha_borrado", null).order("nombre");
        if (data) setClientes(data);
        setLoading(false);
    }

    const mostrarNotificacion = (mensaje: string, tipo: "error" | "exito") => {
        setToast({ mensaje, tipo });
        setTimeout(() => setToast(null), 3000);
    };

    async function abrirHistorial(cliente: Cliente) {
        setClienteDetalle(cliente);
        setNotasEditables(cliente.notas || "");
        setCargandoHistorial(true);
        const { data } = await supabase.from("citas").select(`id, fecha_inicio, servicio, precio, profesionales (nombre), estado`).eq("cliente_id", cliente.id).order("fecha_inicio", { ascending: false });
        if (data) setHistorialCitas(data as any);
        setCargandoHistorial(false);
    }

    // NUEVA FUNCIÓN PARA REVERTIR ESTADOS DESDE EL CRM
    async function cambiarEstadoCita(id: string, nuevoEstado: string) {
        const { error } = await supabase.from("citas").update({ estado: nuevoEstado }).eq("id", id);
        if (!error && clienteDetalle) {
            abrirHistorial(clienteDetalle); // Recarga el historial lateral automáticamente
        }
    }

    async function guardarNotas() {
        if (!clienteDetalle) return;
        const { error } = await supabase.from("clientes").update({ notas: notasEditables }).eq("id", clienteDetalle.id);
        if (!error) { mostrarNotificacion("Notas actualizadas", "exito"); cargarClientes(); }
    }

    async function guardarCliente() {
        if (!nombre.trim()) return mostrarNotificacion("El nombre es obligatorio", "error");

        if (telefono && !isValidPhoneNumber(telefono)) {
            return mostrarNotificacion("El número de teléfono no es válido para el país seleccionado", "error");
        }

        if (telefono) {
            const { data: existente } = await supabase.from("clientes").select("nombre").eq("telefono", telefono).maybeSingle();
            if (existente) return mostrarNotificacion(`El teléfono ya pertenece a ${existente.nombre}.`, "error");
        }

        const { error } = await supabase.from("clientes").insert([{ nombre: nombre.trim(), telefono: telefono || null, email: email.trim() || null, notas: notas.trim() || null }]);
        if (error) mostrarNotificacion(error.message, "error");
        else {
            setNombre(""); setTelefono(""); setEmail(""); setNotas("");
            setIsModalOpen(false); cargarClientes(); mostrarNotificacion("Cliente guardado", "exito");
        }
    }

    async function confirmarBorrado() {
        if (!clienteAEliminar) return;
        const { error } = await supabase.from("clientes").update({ fecha_borrado: new Date().toISOString() }).eq("id", clienteAEliminar);
        if (!error) { mostrarNotificacion("Cliente eliminado", "exito"); cargarClientes(); }
        setClienteAEliminar(null);
    }

    const clientesFiltrados = clientes.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()) || (c.telefono && c.telefono.includes(busqueda)));
    const totalInvertido = historialCitas.reduce((acc, cita) => {
        if (cita.estado === 'completada') {
            return acc + (cita.precio || 0);
        }
        return acc;
    }, 0);

    return (
        <div className="flex min-h-screen bg-slate-50 relative overflow-hidden">
            <Sidebar />
            <main className="flex-1 flex flex-col h-screen overflow-y-auto relative">
                <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
                    <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Directorio de Clientes</h2>
                    <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-indigo-100 transition-all active:scale-95">
                        <Plus size={16} /> Nuevo Cliente
                    </button>
                </header>

                {toast && (
                    <div className={`fixed bottom-8 right-8 z-150 p-4 rounded-xl shadow-2xl border flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300 ${toast.tipo === "error"
                        ? "bg-white text-red-600 border-red-100 shadow-red-100/50"
                        : "bg-white text-emerald-600 border-emerald-100 shadow-emerald-100/50"
                        }`}>
                        <div className={`p-2 rounded-lg ${toast.tipo === "error" ? "bg-red-50" : "bg-emerald-50"}`}>
                            {toast.tipo === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
                        </div>
                        <span className="font-bold text-sm pr-2">{toast.mensaje}</span>
                    </div>
                )}

                {isModalOpen && (
                    <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <h3 className="text-xl font-black text-slate-800">Ficha de Cliente</h3>
                                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-full transition-all"><X size={20} /></button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Nombre Completo *</label>
                                    <div className="relative">
                                        <User className="absolute left-4 top-3.5 text-slate-300" size={18} />
                                        <input value={nombre} onChange={(e) => setNombre(e.target.value)} type="text" className="w-full border border-slate-200 p-3.5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all" placeholder="Ej. Juan Pérez" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Teléfono Móvil</label>
                                    <PhoneInput
                                        international
                                        defaultCountry="ES"
                                        value={telefono}
                                        onChange={setTelefono}
                                        className="flex h-12 w-full border border-slate-200 px-4 rounded-2xl outline-none focus-within:ring-2 focus-within:ring-indigo-500 text-sm font-medium bg-white transition-all phone-input-style"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-3.5 text-slate-300" size={18} />
                                        <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-full border border-slate-200 p-3.5 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all" placeholder="juan@ejemplo.com" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-slate-400 tracking-widest block">Notas</label>
                                    <div className="relative">
                                        <FileText className="absolute left-4 top-4 text-slate-300" size={18} />
                                        <textarea value={notas} onChange={(e) => setNotas(e.target.value)} className="w-full border border-slate-200 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium h-28 resize-none transition-all" placeholder="Preferencias, alergias o detalles..." />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-3">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-sm font-black text-slate-500 bg-white border border-slate-200 rounded-2xl hover:bg-slate-100 transition-all active:scale-95 uppercase tracking-widest">Cancelar</button>
                                <button onClick={guardarCliente} className="flex-1 py-4 text-sm font-black text-white bg-indigo-600 rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all active:scale-95 uppercase tracking-widest">Guardar Ficha</button>
                            </div>
                        </div>
                    </div>
                )}

                {clienteAEliminar && (
                    <div className="fixed inset-0 z-200 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-6 text-center flex flex-col items-center">
                                <div className="bg-red-50 text-red-500 p-4 rounded-full mb-4">
                                    <AlertTriangle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar cliente?</h3>
                                <p className="text-slate-500 text-sm">
                                    Se borrará al cliente de tu directorio. Sus citas asociadas podrían quedarse sin nombre. Esta acción no se puede deshacer.
                                </p>
                            </div>
                            <div className="flex border-t border-slate-100">
                                <button
                                    onClick={() => setClienteAEliminar(null)}
                                    className="flex-1 py-4 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <div className="w-px bg-slate-100"></div>
                                <button
                                    onClick={confirmarBorrado}
                                    className="flex-1 py-4 text-sm font-bold text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    Sí, eliminar
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* HISTORIAL SLIDE-OVER */}
                <div className={`fixed inset-y-0 right-0 w-full md:w-112.5 bg-white shadow-2xl z-60 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col ${clienteDetalle ? "translate-x-0" : "translate-x-full"}`}>
                    {clienteDetalle && (
                        <>
                            <header className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold text-xl">
                                        {clienteDetalle.nombre.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 text-lg leading-tight">{clienteDetalle.nombre}</h3>
                                        <p className="text-xs text-slate-500">Miembro desde {format(parseISO(historialCitas[historialCitas.length - 1]?.fecha_inicio || new Date().toISOString()), "MMMM yyyy", { locale: es })}</p>
                                    </div>
                                </div>
                                <button onClick={() => setClienteDetalle(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                            </header>

                            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                                        <TrendingUp className="text-emerald-600 mb-2" size={20} />
                                        <p className="text-xs font-bold text-emerald-800 uppercase">Total Gastado</p>
                                        <p className="text-2xl font-black text-emerald-700">{totalInvertido.toFixed(2)}€</p>
                                    </div>
                                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                        <History className="text-indigo-600 mb-2" size={20} />
                                        <p className="text-xs font-bold text-indigo-800 uppercase">Visitas</p>
                                        <p className="text-2xl font-black text-indigo-700">{historialCitas.filter(c => c.estado !== 'cancelada').length}</p>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                            <FileText size={14} /> Notas e Historial Técnico
                                        </label>
                                        <button onClick={guardarNotas} className="text-indigo-600 text-xs font-bold hover:underline flex items-center gap-1">
                                            <Save size={12} /> Guardar notas
                                        </button>
                                    </div>
                                    <textarea
                                        value={notasEditables}
                                        onChange={(e) => setNotasEditables(e.target.value)}
                                        className="w-full bg-amber-50/50 border border-amber-100 p-4 rounded-xl text-sm text-slate-800 outline-none focus:ring-2 focus:ring-amber-200 min-h-25 resize-none italic"
                                        placeholder="Añade aquí detalles importantes sobre el cliente..."
                                    />
                                </div>

                                <div className="flex flex-col gap-4">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase flex items-center gap-2">
                                        <Clock size={14} /> Actividad Reciente
                                    </h4>
                                    <div className="space-y-4">
                                        {cargandoHistorial ? (
                                            <p className="text-center py-10 text-slate-400">Cargando historial...</p>
                                        ) : historialCitas.length === 0 ? (
                                            <p className="text-center py-10 text-slate-400 italic">No hay citas registradas.</p>
                                        ) : (
                                            historialCitas.map((cita) => (
                                                <div key={cita.id} className="relative pl-6 border-l-2 border-slate-100 pb-2">
                                                    <div className={`absolute -left-2.25 top-0 w-4 h-4 bg-white border-2 rounded-full ${cita.estado === 'cancelada' ? 'border-red-400' : 'border-indigo-500'}`} />
                                                    <div className={`bg-white border p-3 rounded-xl shadow-sm ${cita.estado === 'cancelada' ? 'border-red-100 bg-red-50/30' : 'border-slate-100'}`}>
                                                        <div className="flex justify-between items-start mb-1">
                                                            
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-sm font-bold ${cita.estado === 'cancelada' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                                    {cita.servicio}
                                                                </span>
                                                                
                                                                {/* BOTONES DE REVERSIÓN EN EL CRM */}
                                                                {cita.estado === 'cancelada' && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-red-100 text-red-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest">Cancelada</span>
                                                                        <button onClick={() => cambiarEstadoCita(cita.id, 'pendiente')} className="text-[10px] text-indigo-500 hover:text-indigo-700 font-bold underline transition-colors">Restaurar</button>
                                                                    </div>
                                                                )}
                                                                {cita.estado === 'completada' && (
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="bg-emerald-100 text-emerald-600 text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest">Cobrada</span>
                                                                        <button onClick={() => cambiarEstadoCita(cita.id, 'pendiente')} className="text-[10px] text-amber-500 hover:text-amber-700 font-bold underline transition-colors">Deshacer</button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            
                                                            <span className={`text-xs font-black ${cita.estado === 'cancelada' ? 'text-slate-300 line-through' : 'text-emerald-600'}`}>
                                                                {cita.precio}€
                                                            </span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium mt-2">
                                                            <span className="flex items-center gap-1"><CalendarIcon size={10} /> {format(parseISO(cita.fecha_inicio), "d MMM, yyyy - HH:mm'h'", { locale: es })}</span>
                                                            <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600 uppercase">{cita.profesionales?.nombre}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-8 w-full max-w-7xl mx-auto flex flex-col gap-6">
                    <div className="relative">
                        <Search className="absolute left-4 top-3.5 text-slate-400" size={20} />
                        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por nombre o teléfono..." className="w-full bg-white border border-slate-200 p-4 pl-12 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm text-slate-800" />
                    </div>

                    {loading ? (
                        <div className="py-20 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {clientesFiltrados.map((cliente) => (
                                <div
                                    key={cliente.id}
                                    onClick={() => abrirHistorial(cliente)}
                                    className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <button onClick={(e) => { e.stopPropagation(); setClienteAEliminar(cliente.id); }} className="absolute top-4 right-4 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg">{cliente.nombre.charAt(0).toUpperCase()}</div>
                                        <div className="min-w-0"><h3 className="font-bold text-slate-800 truncate">{cliente.nombre}</h3></div>
                                    </div>
                                    <div className="space-y-2 text-sm text-slate-500">
                                        <div className="flex items-center gap-2"><Phone size={14} /> {cliente.telefono || "Sin teléfono"}</div>
                                        <div className="flex items-center gap-2"><Mail size={14} /> {cliente.email || "Sin email"}</div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between text-indigo-600 font-bold text-xs uppercase tracking-wider">
                                        Ver historial completo <ArrowRight size={14} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {clienteDetalle && (
                <div onClick={() => setClienteDetalle(null)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-50 animate-in fade-in" />
            )}
        </div>
    );
}