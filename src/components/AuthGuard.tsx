"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Rutas públicas: no requieren sesión iniciada (ej. la página de reserva
  // que el negocio comparte con sus clientes finales).
  const isPublicRoute = pathname === "/login" || pathname.startsWith("/reservar");

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Miramos si hay una sesión activa
      const { data: { session } } = await supabase.auth.getSession();

      // 2. Lógica de redirección
      if (!session && !isPublicRoute) {
        // Si no hay sesión y NO es una ruta pública, lo echamos al login
        router.replace("/login");
      } else if (session && pathname === "/login") {
        // Si ya hay sesión y entra al login por error, lo mandamos a la agenda
        router.replace("/");
      } else {
        // Si todo está bien, dejamos de cargar y mostramos la página
        setIsLoading(false);
      }
    };

    checkAuth();

    // 3. Nos quedamos "escuchando" por si el usuario cierra sesión
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" && !isPublicRoute) {
        router.push("/login");
      } else if (event === "SIGNED_IN" && pathname === "/login") {
        // NUEVO: Solo redirigimos si NO estamos en medio de un registro
        if (!sessionStorage.getItem("is_registering")) {
          router.push("/");
        }
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router, isPublicRoute]);

  // Pantalla de carga mientras comprobamos las llaves
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
          <p className="text-slate-500 font-medium animate-pulse">Comprobando credenciales...</p>
        </div>
      </div>
    );
  }

  // Si todo es correcto, renderizamos la página (children)
  return <>{children}</>;
}