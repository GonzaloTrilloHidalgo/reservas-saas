"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Rutas públicas: no requieren sesión iniciada.
  //  - "/"          → landing comercial
  //  - "/login"     → registro / inicio de sesión
  //  - "/reservar/*"→ portal público de reservas que el negocio comparte
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/reservar");

  // En rutas públicas renderizamos al instante (sin "comprobando credenciales").
  const [isLoading, setIsLoading] = useState(!isPublicRoute);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !isPublicRoute) {
        // No hay sesión y la ruta es privada → al login
        router.replace("/login");
      } else if (session && pathname === "/login") {
        // Ya tiene sesión y entra al login → al panel
        router.replace("/agenda");
      } else {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Escuchamos cambios de sesión (logout / login)
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublicRoute) {
        router.push("/login");
      } else if (event === "SIGNED_IN" && pathname === "/login") {
        // Solo redirigimos si NO estamos en medio de un registro
        if (!sessionStorage.getItem("is_registering")) {
          router.push("/agenda");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router, isPublicRoute]);

  // Pantalla de carga solo en rutas privadas mientras comprobamos la sesión
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

  return <>{children}</>;
}
