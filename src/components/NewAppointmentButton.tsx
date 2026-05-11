"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, AlertCircle, User, Phone, ChevronDown, CalendarIcon, Clock, Check, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface NewAppointmentProps {
  onAppointmentCreated: () => void;
}

const PREFIJOS = [
  { iso: "es", code: "+34", country: "España", placeholder: "600 123 456" },
  { iso: "mx", code: "+52", country: "México", placeholder: "55 1234 5678" },
  { iso: "ar", code: "+54", country: "Argentina", placeholder: "11 1234 5678" },
  { iso: "co", code: "+57", country: "Colombia", placeholder: "300 123 4567" },
  { iso: "cl", code: "+56", country: "Chile", placeholder: "9 1234 5678" },
  { iso: "pe", code: "+51", country: "Perú", placeholder: "912 345 678" },
  { iso: "us", code: "+1", country: "EE.UU.", placeholder: "202 555 0123" }
];

export default function NewAppointmentButton({ onAppointmentCreated }: NewAppointmentProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [servicios, setServicios] = useState<any[]>([]);
  const [clientesCRM, setClientesCRM] = useState<any[]>([]);

  const [clienteNombre, setClienteNombre] = useState("");
  const [clientePrefijo, setClientePrefijo] = useState("+34"); 
  const [clienteTelefono, setClienteTelefono] = useState("");
  const [clienteIdSeleccionado, setClienteIdSeleccionado] = useState<string | null>(null);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarPrefijos, setMostrarPrefijos] = useState(false);

  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);
  const [duracionMinutos, setDuracionMinutos] = useState(60);
  const [profesionalId, setProfesionalId] = useState("");
  const [servicioId, setServicioId] = useState("");
  const [precioActual, setPrecioActual] = useState<number | string>("");

  const [huecosDisponibles, setHuecosDisponibles] = useState<{ hora: string; ocupado: boolean }[]>([]);
  const [cargandoHuecos, setCargandoHuecos] = useState(false);

  const [horaApertura, setHoraApertura] = useState(9);
  const [horaCierre, setHoraCierre] = useState(20);
  const [tipo, setTipo] = useState<"cita" | "bloqueo">("cita");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sugerenciasRef = useRef<HTMLDivElement>(null);
  const prefijosRef = useRef<HTMLDivElement>(null);

  // FUNCIÓN PARA LIMPIAR EL FORMULARIO (LA CLAVE)
  const resetForm = () => {
    setClienteNombre("");
    setClienteTelefono("");
    setClienteIdSeleccionado(null);
    setClientePrefijo("+34");
    setServicioId("");
    setPrecioActual("");
    setHoraSeleccionada(null);
    setErrorMsg(null);
    setTipo("cita");
    // Opcional: resetear la fecha a hoy
    setFecha(new Date().toISOString().split("T")[0]);
  };

  // EFECTO PARA LIMPIAR CUANDO SE CIERRA EL DIALOG
  useEffect(() => {
    if (!open) {
      resetForm();
    }
  }, [open]);

  useEffect(() => {
    async function cargarDatos() {
      const { data: p } = await supabase.from("profesionales").select("id, nombre").order("nombre");
      const { data: s } = await supabase.from("servicios").select("id, nombre, precio").order("nombre");
      const { data: c } = await supabase.from("clientes").select("id, nombre, telefono").order("nombre");
      const { data: a } = await supabase.from("ajustes").select("hora_apertura, hora_cierre").single();
      
      if (p) { setProfesionales(p); setProfesionalId(p[0]?.id || ""); }
      if (s) setServicios(s);
      if (c) setClientesCRM(c);
      if (a) { setHoraApertura(a.hora_apertura); setHoraCierre(a.hora_cierre); }
    }
    cargarDatos();
  }, []);

  useEffect(() => {
    if (open && fecha && profesionalId && duracionMinutos) {
      calcularHuecosDisponibles();
    }
  }, [open, fecha, profesionalId, duracionMinutos, tipo]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sugerenciasRef.current && !sugerenciasRef.current.contains(event.target as Node)) setMostrarSugerencias(false);
      if (prefijosRef.current && !prefijosRef.current.contains(event.target as Node)) setMostrarPrefijos(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function calcularHuecosDisponibles() {
    setCargandoHuecos(true);
    setHoraSeleccionada(null);

    const inicioDia = `${fecha}T00:00:00Z`;
    const finDia = `${fecha}T23:59:59Z`;

    const { data: citasExistentes } = await supabase
      .from("citas")
      .select("fecha_inicio, fecha_fin")
      .eq("profesional_id", profesionalId)
      .gte("fecha_inicio", inicioDia)
      .lte("fecha_inicio", finDia);

    const slots = [];
    for (let h = horaApertura; h < horaCierre; h++) {
      for (let m of ["00", "15", "30", "45"]) {
        const horaHito = `${String(h).padStart(2, "0")}:${m}`;
        const inicioCita = new Date(`${fecha}T${horaHito}:00`);
        const finCita = new Date(inicioCita.getTime() + duracionMinutos * 60000);

        const horaFinFraccion = finCita.getHours() + (finCita.getMinutes() / 60);
        let ocupado = horaFinFraccion > (horaCierre + 0.01);

        if (!ocupado && citasExistentes) {
          ocupado = citasExistentes.some(cita => {
            const exInicio = new Date(cita.fecha_inicio);
            const exFin = new Date(cita.fecha_fin);
            return (inicioCita < exFin && finCita > exInicio);
          });
        }
        slots.push({ hora: horaHito, ocupado });
      }
    }
    setHuecosDisponibles(slots);
    setCargandoHuecos(false);
  }

  const seleccionarCliente = (cliente: any) => {
    setClienteNombre(cliente.nombre);
    if (cliente.telefono) {
      const pFound = PREFIJOS.find(p => cliente.telefono.startsWith(p.code));
      if (pFound) {
        setClientePrefijo(pFound.code);
        setClienteTelefono(cliente.telefono.slice(pFound.code.length));
      } else {
        setClienteTelefono(cliente.telefono);
      }
    }
    setClienteIdSeleccionado(cliente.id);
    setMostrarSugerencias(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!horaSeleccionada) return setErrorMsg("Selecciona una hora");
    setIsSubmitting(true);
    
    try {
      let finalId = clienteIdSeleccionado;
      let telFinal = clienteTelefono ? `${clientePrefijo}${clienteTelefono.replace(/\s+/g, "")}` : null;

      if (tipo === "cita") {
        if (!finalId) {
          const { data: n } = await supabase.from("clientes").insert([{ nombre: clienteNombre, telefono: telFinal }]).select("id").single();
          if (n) finalId = n.id;
        } else if (telFinal) {
          await supabase.from("clientes").update({ telefono: telFinal }).eq("id", finalId);
        }
      }

      const start = new Date(`${fecha}T${horaSeleccionada}:00`).toISOString();
      const end = new Date(new Date(start).getTime() + duracionMinutos * 60000).toISOString();

      await supabase.from("citas").insert([{
        cliente_nombre: tipo === "cita" ? clienteNombre : "BLOQUEO",
        cliente_id: finalId,
        servicio: tipo === "cita" ? servicios.find(s => s.id == servicioId)?.nombre : "Bloqueo",
        profesional_id: profesionalId,
        fecha_inicio: start,
        fecha_fin: end,
        precio: parseFloat(String(precioActual)) || 0
      }]);

      setOpen(false);
      onAppointmentCreated();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const infoP = PREFIJOS.find(p => p.code === clientePrefijo) || PREFIJOS[0];
  const cliFiltrados = clientesCRM.filter(c => c.nombre.toLowerCase().includes(clienteNombre.toLowerCase()) && c.nombre !== clienteNombre);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95">
          <Plus size={18} /> Nueva Cita
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-3xl bg-white p-0 overflow-visible border-none shadow-2xl">
        <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
          
          {/* PANEL IZQUIERDO: FORMULARIO */}
          <div className="flex-1 p-8 border-r border-slate-100 overflow-y-auto">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-2xl font-black text-slate-800">Agendar Cita</DialogTitle>
            </DialogHeader>

            <div className="flex bg-slate-100 p-1 rounded-xl mb-8 w-fit">
              <button type="button" onClick={() => setTipo("cita")} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${tipo === "cita" ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500"}`}>Cliente</button>
              <button type="button" onClick={() => setTipo("bloqueo")} className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${tipo === "bloqueo" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500"}`}>Bloqueo</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {tipo === "cita" && (
                <>
                  <div className="space-y-2 relative" ref={sugerenciasRef}>
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Nombre del Cliente</Label>
                    <div className="relative">
                      <User className="absolute left-4 top-3.5 text-slate-400" size={18} />
                      <Input value={clienteNombre} onChange={(e) => {setClienteNombre(e.target.value); setMostrarSugerencias(true);}} className="h-12 pl-12 rounded-xl border-slate-200 focus:ring-indigo-500" placeholder="Ej. Juan Pérez" />
                    </div>
                    {mostrarSugerencias && cliFiltrados.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-40 overflow-y-auto">
                        {cliFiltrados.map(c => (
                          <button key={c.id} type="button" onClick={() => seleccionarCliente(c)} className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-50 last:border-none text-sm font-medium">{c.nombre}</button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Teléfono de Contacto</Label>
                    <div className="flex gap-2">
                      <div className="relative" ref={prefijosRef}>
                        <button type="button" onClick={() => setMostrarPrefijos(!mostrarPrefijos)} className="h-12 px-4 border border-slate-200 rounded-xl flex items-center gap-2 bg-slate-50 hover:bg-slate-100 transition-colors text-sm font-bold text-slate-700">
                          <img src={`https://flagcdn.com/w20/${infoP.iso}.png`} className="w-5 rounded-sm" /> {clientePrefijo}
                        </button>
                        {mostrarPrefijos && (
                          <div className="absolute top-14 left-0 z-50 w-48 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1">
                            {PREFIJOS.map(p => (
                              <button key={p.iso} type="button" onClick={() => {setClientePrefijo(p.code); setMostrarPrefijos(false);}} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                                <img src={`https://flagcdn.com/w20/${p.iso}.png`} className="w-4" /> {p.country} ({p.code})
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-3.5 text-slate-400" size={18} />
                        <Input value={clienteTelefono} onChange={(e) => setClienteTelefono(e.target.value)} className="h-12 pl-12 rounded-xl border-slate-200" placeholder={infoP.placeholder} />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Servicio</Label>
                      <select value={servicioId} onChange={(e) => {setServicioId(e.target.value); setPrecioActual(servicios.find(s=>s.id == e.target.value)?.precio || "")}} className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-medium bg-white focus:ring-2 focus:ring-indigo-500 outline-none">
                        <option value="">Seleccionar...</option>
                        {servicios.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Precio (€)</Label>
                      <Input type="number" value={precioActual} onChange={(e) => setPrecioActual(e.target.value)} className="h-12 rounded-xl border-slate-200 font-bold text-indigo-600" />
                    </div>
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Profesional</Label>
                  <select value={profesionalId} onChange={(e) => setProfesionalId(e.target.value)} className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-medium bg-white outline-none">
                    {profesionales.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Duración</Label>
                  <select value={duracionMinutos} onChange={(e) => setDuracionMinutos(parseInt(e.target.value))} className="w-full h-12 border border-slate-200 rounded-xl px-4 text-sm font-medium bg-white outline-none">
                    <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1.5 h</option><option value="120">2 h</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest">Fecha</Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-4 top-3.5 text-slate-400" size={18} />
                  <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="h-12 pl-12 rounded-xl border-slate-200" />
                </div>
              </div>
            </form>
          </div>

          {/* PANEL DERECHO: SELECTOR DE HORAS */}
          <div className="w-full md:w-[320px] bg-slate-50 p-8 flex flex-col">
            <Label className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-4 flex justify-between items-center">
              Horas Disponibles
              {cargandoHuecos && <div className="animate-spin h-3 w-3 border-2 border-indigo-600 border-t-transparent rounded-full" />}
            </Label>
            
            <div className="grid grid-cols-3 gap-2 overflow-y-auto pr-2 mb-6 scrollbar-hide">
              {huecosDisponibles.map((slot) => (
                <button
                  key={slot.hora}
                  disabled={slot.ocupado}
                  onClick={() => setHoraSeleccionada(slot.hora)}
                  className={`
                    py-3 rounded-xl text-xs font-bold transition-all border
                    ${slot.ocupado 
                      ? "bg-slate-200/50 text-slate-400 border-transparent opacity-50 cursor-not-allowed" 
                      : horaSeleccionada === slot.hora
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200 scale-[1.02]"
                        : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:text-indigo-600 shadow-sm"
                    }
                  `}
                >
                  {slot.hora}
                </button>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-200">
              {errorMsg && <p className="text-[10px] text-red-500 font-bold mb-3 text-center">{errorMsg}</p>}
              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || !horaSeleccionada} 
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-xl shadow-indigo-100 transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
              >
                {isSubmitting ? "Procesando..." : "Confirmar Cita"}
              </Button>
            </div>
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}