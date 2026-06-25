"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

// ¿El negocio del usuario tiene la prueba caducada y sin suscripción activa?
async function estaBloqueado(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("negocios")
    .select("trial_ends_at, suscripcion_activa")
    .eq("auth_user_id", userId)
    .single();
  if (!data) return false;
  if (data.suscripcion_activa) return false;
  return new Date(data.trial_ends_at).getTime() < Date.now();
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Rutas públicas: no requieren sesión iniciada.
  const isPublicRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/reservar");

  const [isLoading, setIsLoading] = useState(!isPublicRoute);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session && !isPublicRoute) {
        router.replace("/login");
        return;
      }
      if (session && pathname === "/login") {
        router.replace("/agenda");
        return;
      }

      // En rutas privadas, comprobamos que la prueba/suscripción sigue válida.
      if (session && !isPublicRoute && pathname !== "/bloqueado") {
        if (await estaBloqueado(session.user.id)) {
          router.replace("/bloqueado");
          return;
        }
      }

      setIsLoading(false);
    };

    checkAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublicRoute) {
        router.push("/login");
      } else if (event === "SIGNED_IN" && pathname === "/login") {
        if (!sessionStorage.getItem("is_registering")) {
          router.push("/agenda");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [pathname, router, isPublicRoute]);

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
