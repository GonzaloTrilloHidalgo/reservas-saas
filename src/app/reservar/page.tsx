"use client";

import { useState, useEffect, useRef } from "react";
import { format, addMinutes, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { 
  Scissors, CalendarDays, Clock, User, Phone, 
  ChevronRight, ArrowLeft, CheckCircle2, Ban 
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// PREFIJOS INTERNACIONALES
const PREFIJOS = [
  { iso: "es", code: "+34", country: "España" },
  { iso: "mx", code: "+52", country: "México" },
  { iso: "ar", code: "+54", country: "Argentina" },
  { iso: "co", code: "+57", country: "Colombia" },
  { iso: "cl", code: "+56", country: "Chile" },
  { iso: "pe", code: "+51", country: "Perú" },
  { iso: "us", code: "+1", country: "EE.UU." }
];

export default function PaginaReservaPublica() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // DATOS DE LA BASE DE DATOS
  const [servicios, setServicios] = useState<any[]>([]);
  const [profesionales, setProfesionales] = useState<any[]>([]);
  const [ajustesIdActual, setAjustesIdActual] = useState<number | null>(null); // <-- Estado para el ID del negocio
  const [horaApertura, setHoraApertura] = useState(9);
  const [horaCierre, setHoraCierre] = useState(20);
  const [inicioDescanso, setInicioDescanso] = useState(14);
  const [finDescanso, setFinDescanso] = useState(15);

  // SELECCIONES DEL CLIENTE
  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null);
  const [profesionalSeleccionado, setProfesionalSeleccionado] = useState<any>(null);
  const [fecha, setFecha] = useState("");
  const [horaSeleccionada, setHoraSeleccionada] = useState<string | null>(null);

  // DATOS DEL CLIENTE
  const [nombre, setNombre] = useState("");
  const [prefijo, setPrefijo] = useState("+34");
  const [telefono, setTelefono] = useState("");
  const [mostrarPrefijos, setMostrarPrefijos] = useState(false);
  const prefijosRef = useRef<HTMLDivElement>(null);
  
  // ESTADOS PARA AUTOCOMPLETAR Y FESTIVOS
  const [telefonoVerificado, setTelefonoVerificado] = useState(false);
  const [buscandoCliente, setBuscandoCliente] = useState(false);
  const [clienteConocido, setClienteConocido] = useState(false);
  const [esDiaCerrado, setEsDiaCerrado] = useState(false);
  const [motivoCierre, setMotivoCierre] = useState("");

  // ESTADO DE DISPONIBILIDAD
  const [huecosDisponibles, setHuecosDisponibles] = useState<{ hora: string; ocupado: boolean; motivo?: string }[]>([]);
  const [cargandoHuecos, setCargandoHuecos] = useState(false);

  // CERRAR DROPDOWN AL HACER CLICK FUERA
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (prefijosRef.current && !prefijosRef.current.contains(event.target as Node)) {
        setMostrarPrefijos(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // CARGAR DATOS INICIALES
  useEffect(() => {
    async function cargarDatos() {
      const { data: s } = await supabase.from("servicios").select("*").is("fecha_borrado", null).order("nombre");
      const { data: p } = await supabase.from("profesionales").select("*").is("fecha_borrado", null).order("nombre");
      const { data: a } = await supabase.from("ajustes").select("*").limit(1).single();
      
      if (s) setServicios(s);
      if (p) setProfesionales(p);
      if (a) { 
        setAjustesIdActual(a.id); // <-- Guardamos el ID del negocio
        setHoraApertura(a.hora_apertura); 
        setHoraCierre(a.hora_cierre); 
        setInicioDescanso(a.hora_inicio_descanso || 14);
        setFinDescanso(a.hora_fin_descanso || 15);
      }
      
      // Poner la fecha de hoy por defecto (formato YYYY-MM-DD)
      setFecha(new Date().toISOString().split("T")[0]);
    }
    cargarDatos();
  }, []);

  // COMPROBAR FESTIVOS CADA VEZ QUE CAMBIA LA FECHA (MULTI-TENANT)
  useEffect(() => {
    async function comprobarCierre() {
      if (!fecha || !ajustesIdActual) return; // <-- Esperamos a tener el ID del negocio
      
      const { data } = await supabase
        .from("cierres_negocio")
        .select("motivo")
        .eq("fecha", fecha)
        .eq("ajustes_id", ajustesIdActual) // <-- FILTRO MULTI-TENANT
        .is("fecha_borrado", null)
        .maybeSingle();

      if (data) {
        setEsDiaCerrado(true);
        setMotivoCierre(data.motivo || "Cierre Total");
      } else {
        setEsDiaCerrado(false);
        setMotivoCierre("");
      }
    }
    comprobarCierre();
  }, [fecha, ajustesIdActual]); // <-- Añadimos dependencias

  // RECALCULAR HUECOS CUANDO CAMBIA LA FECHA O EL PROFESIONAL
  useEffect(() => {
    if (fecha && profesionalSeleccionado && servicioSeleccionado) {
      calcularHuecos();
    }
  }, [fecha, profesionalSeleccionado, servicioSeleccionado, esDiaCerrado]);

  const calcularHuecos = async () => {
    setCargandoHuecos(true);
    setHoraSeleccionada(null);

    const duracion = servicioSeleccionado.duracion || 60;
    const inicioDia = `${fecha}T00:00:00Z`;
    const finDia = `${fecha}T23:59:59Z`;

    const { data: citasExistentes } = await supabase
      .from("citas")
      .select("fecha_inicio, fecha_fin")
      .eq("profesional_id", profesionalSeleccionado.id)
      .is("fecha_borrado", null)
      .gte("fecha_inicio", inicioDia)
      .lte("fecha_inicio", finDia);

    const slots = [];
    const ahora = new Date();
    const esHoy = fecha === ahora.toISOString().split("T")[0];

    for (let h = horaApertura; h < horaCierre; h++) {
      for (let m of ["00", "30"]) { // Intervalos de 30 mins
        const horaHito = `${String(h).padStart(2, "0")}:${m}`;
        const inicioCita = new Date(`${fecha}T${horaHito}:00`);
        const finCita = new Date(inicioCita.getTime() + duracion * 60000);

        // Si es hoy, ocultamos las horas que ya han pasado
        if (esHoy && inicioCita < ahora) continue;

        const horaFinFraccion = finCita.getHours() + (finCita.getMinutes() / 60);
        const esDescanso = h >= inicioDescanso && h < finDescanso;

        let ocupado = esDiaCerrado || esDescanso || horaFinFraccion > (horaCierre + 0.01);
        let motivo = "";
        
        if (esDiaCerrado) motivo = "FESTIVO";
        else if (esDescanso) motivo = "DESCANSO";

        if (!ocupado && citasExistentes) {
          ocupado = citasExistentes.some(cita => {
            const exInicio = new Date(cita.fecha_inicio);
            const exFin = new Date(cita.fecha_fin);
            return (inicioCita < exFin && finCita > exInicio);
          });
        }
        slots.push({ hora: horaHito, ocupado, motivo });
      }
    }
    setHuecosDisponibles(slots);
    setCargandoHuecos(false);
  };

  const verificarTelefono = async () => {
    if (!telefono || telefono.length < 6) return;
    setBuscandoCliente(true);

    try {
      const telFinal = `${prefijo}${telefono.replace(/\s+/g, "")}`;
      
      const { data, error } = await supabase
        .from("clientes")
        .select("nombre")
        .is("fecha_borrado", null)
        .eq("telefono", telFinal);

      if (data && data.length > 0) {
        setNombre(data[0].nombre);
        setClienteConocido(true);
      } else {
        setNombre("");
        setClienteConocido(false);
      }
      
      setTelefonoVerificado(true);
    } catch (error) {
      console.error("Error al verificar teléfono", error);
      setTelefonoVerificado(true); 
    } finally {
      setBuscandoCliente(false);
    }
  };

  const confirmarReserva = async () => {
    if (!nombre || !telefono || !horaSeleccionada) return;
    setIsSubmitting(true);

    try {
      const telFinal = `${prefijo}${telefono.replace(/\s+/g, "")}`;
      let clienteId = null;

      const { data: clientesExistentes, error: errorBusqueda } = await supabase
        .from("clientes")
        .select("id, telefono, nombre")
        .is("fecha_borrado", null)
        .eq("telefono", telFinal);

      if (errorBusqueda) throw errorBusqueda;

      if (clientesExistentes && clientesExistentes.length > 0) {
        clienteId = clientesExistentes[0].id;
        
        if (clientesExistentes[0].nombre !== nombre.trim()) {
          await supabase
            .from("clientes")
            .update({ nombre: nombre.trim() })
            .eq("id", clienteId);
        }
      } else {
        const { data: nuevoCliente, error: errorCreacion } = await supabase
          .from("clientes")
          .insert([{ nombre: nombre.trim(), telefono: telFinal }])
          .select("id"); 

        if (errorCreacion) throw errorCreacion;
        if (nuevoCliente && nuevoCliente.length > 0) {
          clienteId = nuevoCliente[0].id;
        }
      }

      if (!clienteId) throw new Error("No se pudo obtener ni crear el ID del cliente.");

      const duracionFinal = servicioSeleccionado.duracion || 60;
      const start = new Date(`${fecha}T${horaSeleccionada}:00`).toISOString();
      const end = new Date(new Date(start).getTime() + duracionFinal * 60000).toISOString();

      const { error: errorCita } = await supabase.from("citas").insert([{
        cliente_nombre: nombre.trim(),
        cliente_id: clienteId,
        servicio: servicioSeleccionado.nombre,
        profesional_id: profesionalSeleccionado.id,
        fecha_inicio: start,
        fecha_fin: end,
        precio: servicioSeleccionado.precio || 0,
        estado: 'pendiente' // <-- Aseguramos que la cita nazca como 'pendiente'
      }]);

      if (errorCita) throw errorCita;

      setStep(4); 
    } catch (error) {
      console.error("Error GENERAL en confirmarReserva:", error);
      alert("Hubo un problema al confirmar tu reserva. Inténtalo de nuevo. Revisa la consola.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden flex flex-col">
        
        {/* CABECERA WIZARD */}
        {step < 4 && (
          <div className="bg-indigo-600 p-6 text-white text-center relative">
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} className="absolute left-4 top-6 p-1 hover:bg-white/20 rounded-lg transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <h1 className="text-xl font-black mb-1">Reserva tu cita</h1>
            <p className="text-indigo-100 text-sm font-medium">
              Paso {step} de 3: {step === 1 ? "Servicio" : step === 2 ? "Fecha y Hora" : "Tus Datos"}
            </p>
            <div className="absolute bottom-0 left-0 h-1 bg-white/20 w-full">
              <div className="h-full bg-emerald-400 transition-all duration-500" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
          </div>
        )}

        <div className="p-6 flex-1 overflow-y-auto">
          
          {/* PASO 1: SELECCIONAR SERVICIO Y PROFESIONAL */}
          {step === 1 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">¿Qué necesitas?</h3>
                <div className="space-y-2">
                  {servicios.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setServicioSeleccionado(s)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex justify-between items-center ${
                        servicioSeleccionado?.id === s.id 
                          ? "border-indigo-600 bg-indigo-50" 
                          : "border-slate-100 hover:border-indigo-200"
                      }`}
                    >
                      <div>
                        <span className="font-bold text-slate-800 block">{s.nombre}</span>
                        <span className="text-xs font-medium text-slate-500 flex items-center gap-1 mt-1">
                          <Clock size={12} /> {s.duracion || 60} min
                        </span>
                      </div>
                      <span className="font-black text-indigo-600 text-lg">{s.precio}€</span>
                    </button>
                  ))}
                </div>
              </div>

              {servicioSeleccionado && (
                <div className="animate-in fade-in duration-300">
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Elige profesional</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {profesionales.map(p => (
                      <button
                        key={p.id}
                        onClick={() => setProfesionalSeleccionado(p)}
                        className={`p-4 rounded-xl border-2 text-center transition-all ${
                          profesionalSeleccionado?.id === p.id 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                            : "border-slate-100 text-slate-600 hover:border-indigo-200"
                        }`}
                      >
                        <div className="mx-auto w-10 h-10 rounded-full mb-2 flex items-center justify-center text-white font-bold" style={{ backgroundColor: p.color || "#6366f1" }}>
                          {p.nombre.charAt(0)}
                        </div>
                        <span className="font-bold text-sm">{p.nombre}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button 
                onClick={() => setStep(2)} 
                disabled={!servicioSeleccionado || !profesionalSeleccionado}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                Continuar <ChevronRight size={18} />
              </Button>
            </div>
          )}

          {/* PASO 2: FECHA Y HORA */}
          {step === 2 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3">Selecciona un día</h3>
                <div className="relative">
                  <CalendarDays className="absolute left-4 top-4 text-indigo-600" size={20} />
                  <Input 
                    type="date" 
                    min={new Date().toISOString().split("T")[0]}
                    value={fecha} 
                    onChange={(e) => setFecha(e.target.value)} 
                    className="h-14 pl-12 rounded-xl border-2 border-slate-200 font-bold text-slate-700 focus:border-indigo-600 focus:ring-0" 
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 flex justify-between items-center">
                  Horas disponibles
                  {cargandoHuecos && <div className="animate-spin h-4 w-4 border-2 border-indigo-600 border-t-transparent rounded-full" />}
                </h3>
                
                {esDiaCerrado ? (
                  <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center flex flex-col items-center gap-2 border border-red-100 animate-in zoom-in-95">
                    <Ban size={32} className="opacity-80" />
                    <p className="font-black text-lg">Día Cerrado</p>
                    <p className="text-sm font-medium">{motivoCierre}</p>
                  </div>
                ) : huecosDisponibles.length === 0 && !cargandoHuecos ? (
                  <div className="bg-amber-50 text-amber-700 p-4 rounded-xl text-sm font-bold text-center">
                    No hay citas disponibles para este día. Prueba con otra fecha.
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2 max-h-62.5 overflow-y-auto pr-1 scrollbar-hide">
                    {huecosDisponibles.map(slot => (
                      <button
                        key={slot.hora}
                        disabled={slot.ocupado}
                        onClick={() => setHoraSeleccionada(slot.hora)}
                        className={`
                          relative py-3 rounded-xl text-sm font-bold transition-all border-2 flex flex-col items-center justify-center gap-0.5
                          ${slot.ocupado 
                            ? "border-slate-100 bg-slate-50 text-slate-300 opacity-50 cursor-not-allowed" 
                            : horaSeleccionada === slot.hora
                              ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
                              : "border-slate-200 text-slate-600 hover:border-indigo-300"
                          }
                        `}
                      >
                        {slot.hora}
                        {slot.motivo && <span className="text-[9px] font-black opacity-60 leading-none tracking-tighter">{slot.motivo}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button 
                onClick={() => setStep(3)} 
                disabled={!horaSeleccionada || esDiaCerrado}
                className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                Siguiente paso <ChevronRight size={18} />
              </Button>
            </div>
          )}

          {/* PASO 3: DATOS DE CONTACTO */}
          {step === 3 && (
            <div className="space-y-6 animate-in slide-in-from-right-4">
              
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mb-6 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase">{format(parseISO(fecha), "EEEE, d 'de' MMMM", { locale: es })}</p>
                  <p className="text-lg font-black text-slate-800">{horaSeleccionada}h</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase">{servicioSeleccionado?.nombre}</p>
                  <p className="text-lg font-black text-indigo-600">{servicioSeleccionado?.precio}€</p>
                </div>
              </div>

              {!telefonoVerificado ? (
                <div className="space-y-4 animate-in fade-in">
                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest">Tu Teléfono</Label>
                    <div className="flex gap-2">
                      <div className="relative" ref={prefijosRef}>
                        <button type="button" onClick={() => setMostrarPrefijos(!mostrarPrefijos)} className="h-14 px-3 border-2 border-slate-200 rounded-xl flex items-center gap-2 bg-slate-50 text-sm font-bold">
                          <img src={`https://flagcdn.com/w20/${PREFIJOS.find(p => p.code === prefijo)?.iso}.png`} className="w-5 rounded-sm" alt="flag" /> 
                          {prefijo}
                        </button>
                        {mostrarPrefijos && (
                          <div className="absolute top-16 left-0 z-50 w-52 bg-white border border-slate-100 rounded-xl shadow-xl max-h-48 overflow-y-auto p-1">
                            {PREFIJOS.map(p => (
                              <button key={p.iso} type="button" onClick={() => {setPrefijo(p.code); setMostrarPrefijos(false);}} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 rounded-lg text-xs font-bold text-slate-600">
                                <img src={`https://flagcdn.com/w20/${p.iso}.png`} className="w-4" alt={p.country} /> <span className="truncate">{p.country}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="relative flex-1">
                        <Phone className="absolute left-4 top-4 text-slate-400" size={20} />
                        <Input 
                          value={telefono} 
                          onChange={(e) => setTelefono(e.target.value)} 
                          onKeyDown={(e) => e.key === 'Enter' && verificarTelefono()}
                          type="tel" 
                          className="h-14 pl-12 rounded-xl border-2 border-slate-200 bg-white font-bold" 
                          placeholder="600 000 000" 
                        />
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={verificarTelefono} 
                    disabled={!telefono || buscandoCliente}
                    className="w-full h-14 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
                  >
                    {buscandoCliente ? "Buscando..." : "Continuar"} <ChevronRight size={18} />
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex justify-between items-center p-4 bg-slate-100 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><Phone size={16} /></div>
                      <span className="font-bold text-slate-700">{prefijo} {telefono}</span>
                    </div>
                    <button 
                      onClick={() => { setTelefonoVerificado(false); setNombre(""); }} 
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors uppercase tracking-wider"
                    >
                      Modificar
                    </button>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-black text-slate-400 uppercase tracking-widest flex justify-between">
                      <span>Tu Nombre</span>
                      {clienteConocido && <span className="text-emerald-500 font-bold normal-case text-xs">¡Hola de nuevo! ✨</span>}
                    </Label>
                    <div className="relative">
                      <User className="absolute left-4 top-4 text-slate-400" size={20} />
                      <Input 
                        value={nombre} 
                        onChange={(e) => setNombre(e.target.value)} 
                        className={`h-14 pl-12 rounded-xl border-2 bg-white font-bold ${clienteConocido ? 'border-emerald-200 focus-visible:ring-emerald-500' : 'border-slate-200 focus-visible:ring-indigo-500'}`} 
                        placeholder={clienteConocido ? "" : "Dinos cómo te llamas"} 
                      />
                    </div>
                    {!clienteConocido && <p className="text-xs text-slate-500 font-medium">Parece que es tu primera reserva. Introduce tu nombre.</p>}
                  </div>

                  <Button 
                    onClick={confirmarReserva} 
                    disabled={!nombre || isSubmitting}
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl flex items-center justify-center gap-2 mt-8 shadow-xl shadow-indigo-200 disabled:opacity-50 transition-all active:scale-95"
                  >
                    {isSubmitting ? "Procesando..." : "Confirmar Reserva"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* PASO 4: ÉXITO */}
          {step === 4 && (
            <div className="text-center py-10 animate-in zoom-in duration-500">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">¡Cita Confirmada!</h2>
              <p className="text-slate-500 mb-8 px-4">
                Te esperamos el <strong>{format(parseISO(fecha), "EEEE, d 'de' MMMM", { locale: es })}</strong> a las <strong>{horaSeleccionada}h</strong> para tu {servicioSeleccionado?.nombre.toLowerCase()}.
              </p>
              
              <button onClick={() => window.location.reload()} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                Hacer otra reserva
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}