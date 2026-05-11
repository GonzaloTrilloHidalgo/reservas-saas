"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Layers, Mail, Lock, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Estados para manejar los mensajes (adiós alerts)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const router = useRouter();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isLogin) {
        // INICIAR SESIÓN
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        router.push("/");
      } else {
        // REGISTRAR NUEVO NEGOCIO
        // 1. Avisamos al guardián de que estamos registrando
        sessionStorage.setItem("is_registering", "true");

        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        
        if (error) {
          sessionStorage.removeItem("is_registering");
          throw error;
        }
        
        // 2. Cerramos la sesión automática al instante
        await supabase.auth.signOut();
        sessionStorage.removeItem("is_registering");
        
        // MOSTRAR MENSAJE DE ÉXITO ELEGANTE
        setSuccessMsg("¡Cuenta creada con éxito! Ya puedes iniciar sesión.");
        setIsLogin(true);
        setPassword(""); // Limpiamos la contraseña
      }
    } catch (error: any) {
      setErrorMsg(error.message || "Ocurrió un error de autenticación");
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar entre Login/Registro y limpiar los mensajes
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        {/* Cabecera del Login */}
        <div className="bg-indigo-600 p-8 text-center flex flex-col items-center">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-4">
            <Layers className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight italic">Velo</h1>
          <p className="text-indigo-100 text-sm mt-2">
            El sistema operativo para tu negocio
          </p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta de Velo"}
          </h2>

          {/* BANNER DE ERROR (Rojo) */}
          {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 text-center animate-in fade-in duration-300">
              {errorMsg === "Invalid login credentials" ? "Email o contraseña incorrectos" : errorMsg}
            </div>
          )}

          {/* BANNER DE ÉXITO (Verde) */}
          {successMsg && (
            <div className="mb-6 bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm font-medium border border-emerald-100 text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={18} />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all text-slate-900"
                  placeholder="tu@negocio.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all text-slate-900"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 mt-4"
            >
              {loading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <>
                  {isLogin ? "Entrar al Panel" : "Comenzar ahora"} <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Toggle entre Login y Registro */}
          <div className="mt-8 text-center text-sm text-slate-500">
            {isLogin ? "¿Aún no tienes cuenta?" : "¿Ya tienes tu negocio registrado?"}
            <button
              type="button"
              onClick={toggleMode}
              className="ml-2 font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              {isLogin ? "Regístrate gratis" : "Inicia sesión"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}