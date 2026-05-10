"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

// Definimos que este componente ahora espera una función de aviso
interface NewAppointmentProps {
  onAppointmentCreated: () => void;
}

export default function NewAppointmentButton({ onAppointmentCreated }: NewAppointmentProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const nombre = formData.get("name") as string;
    const servicio = formData.get("service") as string;
    const fecha = formData.get("date") as string;
    const hora = formData.get("time") as string;

    const fechaInicio = new Date(`${fecha}T${hora}:00`);
    const fechaFin = new Date(fechaInicio.getTime() + 60 * 60 * 1000);

    const { error } = await supabase
      .from('citas')
      .insert([
        {
          cliente_nombre: nombre,
          servicio: servicio,
          fecha_inicio: fechaInicio.toISOString(),
          fecha_fin: fechaFin.toISOString(),
        }
      ]);

    setIsSubmitting(false);

    if (error) {
      alert("Hubo un error al guardar: " + error.message);
    } else {
      setOpen(false);
      // ¡AQUÍ ESTÁ LA MAGIA!: Avisamos al padre que ya puede refrescar
      onAppointmentCreated(); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm">
          <Plus size={18} />
          Nueva Cita
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Añadir nueva cita</DialogTitle>
          <DialogDescription>
            Introduce los detalles del cliente y la hora de la reserva.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 py-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">Nombre del cliente</Label>
            <Input id="name" name="name" placeholder="Ej. María García" required />
          </div>
          
          <div className="flex flex-col gap-2">
            <Label htmlFor="service">Servicio</Label>
            <Input id="service" name="service" placeholder="Ej. Corte y Tinte" required />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" name="date" type="date" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="time">Hora</Label>
              <Input id="time" name="time" type="time" required />
            </div>
          </div>
          
          <Button type="submit" disabled={isSubmitting} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
            {isSubmitting ? "Guardando..." : "Guardar Cita"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}