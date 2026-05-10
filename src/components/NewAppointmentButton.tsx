"use client";

import { useState, useEffect } from "react";
import { Plus, AlertCircle } from "lucide-react";
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

interface Profesional {
  id: string;
  nombre: string;
}

// NUEVA INTERFAZ PARA LOS SERVICIOS
interface Servicio {
  id: string;
  nombre: string;
  precio: number;
}

export default function NewAppointmentButton({ onAppointmentCreated }: NewAppointmentProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [profesionales, setProfesionales] = useState<Profesional[]>([]);
  // NUEVO: Estado para el catálogo de servicios
  const [servicios, setServicios] = useState<Servicio[]>([]);
  
  const [tipo, setTipo] = useState<"cita" | "bloqueo">("cita");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // NUEVO: Estado para controlar el precio y que se actualice dinámicamente
  const [precioActual, setPrecioActual] = useState<number | string>("");

  useEffect(() => {
    async function cargarDatos() {
      // Cargamos el staff
      const { data: profData } = await supabase.from("profesionales").select("id, nombre").order("nombre");
      if (profData) setProfesionales(profData);

      // Cargamos el catálogo de servicios
      const { data: servData } = await supabase.from("servicios").select("id, nombre, precio").order("nombre");
      if (servData) setServicios(servData);
    }
    cargarDatos();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);
    const fecha = formData.get("date") as string;
    const hora = formData.get("time") as string;
    const profesionalId = formData.get("professional_id") as string;
    const duracionMinutos = parseInt(formData.get("duration") as string, 10);

    // Nombres dependiendo del tipo
    const nombre = tipo === "cita" ? (formData.get("name") as string) : (formData.get("motivo") as string);
    
    // Obtenemos el nombre del servicio basándonos en el ID seleccionado
    const servicioId = formData.get("servicio_id") as string;
    // Añadimos .toString() aquí también
    const servicioSeleccionado = servicios.find(s => s.id.toString() === servicioId);
    
    const precioRaw = formData.get("precio") as string;
    const precio = tipo === "cita" && precioRaw ? parseFloat(precioRaw) : 0;

    const fechaInicio = new Date(`${fecha}T${hora}:00`);
    const fechaFin = new Date(fechaInicio.getTime() + duracionMinutos * 60 * 1000);

    // 1. VALIDACIÓN HORARIO
    const horaInicioFraccion = fechaInicio.getHours() + (fechaInicio.getMinutes() / 60);
    const horaFinFraccion = fechaFin.getHours() + (fechaFin.getMinutes() / 60);

    if (horaInicioFraccion < 9 || horaFinFraccion > 20) {
      setErrorMsg("El horario seleccionado está fuera del horario comercial. El negocio está abierto de 09:00 a 20:00.");
      setIsSubmitting(false);
      return;
    }

    // 2. VALIDACIÓN SOLAPAMIENTO
    const { data: conflictos, error: errorConsulta } = await supabase
      .from('citas')
      .select('id')
      .eq('profesional_id', profesionalId)
      .lt('fecha_inicio', fechaFin.toISOString())
      .gt('fecha_fin', fechaInicio.toISOString());

    if (errorConsulta) {
      setErrorMsg("Error en la base de datos al comprobar la disponibilidad.");
      setIsSubmitting(false);
      return;
    }

    if (conflictos && conflictos.length > 0) {
      setErrorMsg("Este profesional ya tiene una cita o bloqueo asignado en ese tramo horario.");
      setIsSubmitting(false);
      return; 
    }

    // 3. GUARDADO
    // Guardamos el "servicioNombre" como texto para no romper la compatibilidad con el calendario
    const { error } = await supabase.from('citas').insert([{
      cliente_nombre: nombre,
      servicio: nombre, 
      profesional_id: profesionalId,
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
      precio: precio
    }]);

    setIsSubmitting(false);

    if (error) {
      setErrorMsg("Hubo un error al guardar: " + error.message);
    } else {
      setOpen(false);
      // Reseteamos el precio para la próxima cita
      setPrecioActual("");
      onAppointmentCreated();
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setTimeout(() => setErrorMsg(null), 200);
      setPrecioActual(""); // Limpiamos el precio al cerrar
    }
  };

  // Función que se ejecuta cuando eligen un servicio del desplegable
  const handleServicioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Añadimos .toString() al id del servicio para que coincida con el texto del select
    const seleccionado = servicios.find(s => s.id.toString() === e.target.value);
    
    if (seleccionado) {
      setPrecioActual(seleccionado.precio); 
    } else {
      setPrecioActual("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <Plus size={18} />
          Nueva Cita
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-white border border-slate-200 shadow-xl opacity-100! transition-all">
        <DialogHeader>
          <DialogTitle className="text-slate-900">
            {errorMsg ? "Acción denegada" : "Agendar Espacio"}
          </DialogTitle>
        </DialogHeader>

        {errorMsg && (
          <div className="text-center py-4 animate-in fade-in zoom-in duration-200">
            <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <p className="text-slate-800 text-lg mb-2 font-bold">No se puede agendar</p>
            <p className="text-sm text-slate-500 mb-8 px-4">{errorMsg}</p>
            <Button onClick={() => setErrorMsg(null)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-6 rounded-lg transition-colors">
              Revisar datos y cambiar hora
            </Button>
          </div>
        )}

        <div className={errorMsg ? "hidden" : "block"}>
          <div className="flex bg-slate-100 p-1 rounded-lg mt-2">
            <button type="button" onClick={() => setTipo("cita")} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${tipo === "cita" ? "bg-white shadow-sm text-indigo-600" : "text-slate-500 hover:text-slate-700"}`}>Cita de Cliente</button>
            <button type="button" onClick={() => setTipo("bloqueo")} className={`flex-1 py-1.5 text-sm font-bold rounded-md transition-all ${tipo === "bloqueo" ? "bg-white shadow-sm text-slate-800" : "text-slate-500 hover:text-slate-700"}`}>Bloquear Horario</button>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-2 mt-2">
            {tipo === "cita" ? (
              <>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="name" className="text-slate-700 font-medium">Nombre del cliente</Label>
                  <Input id="name" name="name" placeholder="Ej. María García" required className="bg-white border-slate-200" />
                </div>
                
                {/* CAMBIAMOS INPUT POR SELECT DE SERVICIOS */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="servicio_id" className="text-slate-700 font-medium">Servicio</Label>
                    <select 
                      id="servicio_id" 
                      name="servicio_id" 
                      required 
                      onChange={handleServicioChange}
                      className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900"
                    >
                      <option value="">Selecciona...</option>
                      {servicios.map((s) => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="precio" className="text-slate-700 font-medium">Precio (€)</Label>
                    <Input 
                      id="precio" 
                      name="precio" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      required 
                      value={precioActual}
                      onChange={(e) => setPrecioActual(e.target.value)} // Permite modificación manual
                      className="bg-white border-slate-200" 
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2">
                <Label htmlFor="motivo" className="text-slate-700 font-medium">Motivo del bloqueo</Label>
                <Input id="motivo" name="motivo" placeholder="Ej. Hora de comer..." required className="bg-white border-slate-200" />
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="professional_id" className="text-slate-700 font-medium">Profesional</Label>
              <select id="professional_id" name="professional_id" required className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900">
                <option value="">Selecciona un profesional</option>
                {profesionales.map((pro) => (
                  <option key={pro.id} value={pro.id}>{pro.nombre}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-2"><Label htmlFor="date" className="text-slate-700 font-medium">Fecha</Label><Input id="date" name="date" type="date" required className="bg-white border-slate-200" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="time" className="text-slate-700 font-medium">Hora</Label><Input id="time" name="time" type="time" required className="bg-white border-slate-200" /></div>
              <div className="flex flex-col gap-2"><Label htmlFor="duration" className="text-slate-700 font-medium">Duración</Label>
                <select id="duration" name="duration" required defaultValue="60" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-600 text-slate-900">
                  <option value="15">15 min</option><option value="30">30 min</option><option value="45">45 min</option><option value="60">1 hora</option><option value="90">1.5 h</option><option value="120">2 h</option><option value="240">4 h</option>
                </select>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className={`mt-4 text-white font-bold py-6 ${tipo === "cita" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-slate-800 hover:bg-slate-900"}`}>
              {isSubmitting ? "Guardando..." : (tipo === "cita" ? "Confirmar Reserva" : "Confirmar Bloqueo")}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}