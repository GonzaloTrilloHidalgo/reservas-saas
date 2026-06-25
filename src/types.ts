// Tipos del dominio compartidos en la aplicación.
// Reflejan las tablas de Supabase usadas por el panel y el portal de reservas.

export interface Servicio {
  id: number;
  nombre: string;
  precio: number | null;
  duracion: number | null;
}

export interface Profesional {
  id: string;
  nombre: string;
  color?: string | null;
}

export interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
}

export interface Festivo {
  id: string;
  fecha: string;
  motivo: string | null;
}
