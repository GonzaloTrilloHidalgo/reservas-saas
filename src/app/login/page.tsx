"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Layers, Mail, Lock, ArrowRight, Loader2, CheckCircle2, Building2, Eye, EyeOff } from "lucide-react";
import PasswordStrength from "@/components/PasswordStrength";

// Traduce los errores de Supabase (vienen en inglés) a mensajes claros en español.
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email o contraseña incorrectos.";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ese email ya tiene una cuenta. Inicia sesión.";
  if (m.includes("password should be at least"))
    return "La contraseña es demasiado corta (mínimo 8 caracteres).";
  if (m.includes("at least one character of each") || m.includes("password should contain"))
    return "La contraseña debe incluir minúscula, mayúscula, número y un carácter especial.";
  if (m.includes("password is known to be weak") || m.includes("pwned") || m.includes("compromised"))
    return "Esa contraseña aparece en filtraciones conocidas. Elige otra más segura.";
  if (m.includes("email not confirmed"))
    return "Confirma tu email antes de iniciar sesión (revisa tu bandeja de entrada).";
  if (m.includes("unable to validate email") || m.includes("invalid format"))
    return "El email no tiene un formato válido.";
  if (m.includes("for security purposes") || m.includes("rate limit") || m.includes("only request this after"))
    return "Demasiados intentos. Espera unos segundos e inténtalo de nuevo.";
  return mensaje;
}

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [nombreNegocio, setNombreNegocio] = useState(""); // <-- NUEVO ESTADO
  const [loading, setLoading] = useState(false);

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

        router.push("/agenda");
      } else {
        // REGISTRAR NUEVO NEGOCIO (SaaS Onboarding)
        if (!nombreNegocio.trim()) throw new Error("El nombre del negocio es obligatorio");

        sessionStorage.setItem("is_registering", "true");

        // 1. Generamos un SLUG seguro (ej: "Mi Barbería" -> "mi-barberia-x8f2")
        const baseSlug = nombreNegocio.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        const finalSlug = `${baseSlug}-${randomSuffix}`;

        // 2. Enviamos el registro adjuntando los metadatos ocultos
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre_negocio: nombreNegocio,
              slug: finalSlug
            }
          }
        });
        
        if (error) {
          sessionStorage.removeItem("is_registering");
          throw error;
        }
        
        await supabase.auth.signOut();
        sessionStorage.removeItem("is_registering");
        
        setSuccessMsg("¡Cuenta creada con éxito! Ya puedes iniciar sesión.");
        setIsLogin(true);
        setPassword(""); 
        setNombreNegocio("");
      }
    } catch (error) {
      const mensaje = error instanceof Error ? error.message : "Ocurrió un error de autenticación";
      setErrorMsg(traducirError(mensaje));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
        
        <div className="bg-indigo-600 p-8 text-center flex flex-col items-center">
          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm mb-4">
            <Layers className="text-white" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight italic">Velo</h1>
          <p className="text-indigo-100 text-sm mt-2">
            El sistema operativo para tu negocio
          </p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">
            {isLogin ? "Inicia sesión en tu cuenta" : "Crea tu cuenta de Velo"}
          </h2>

          {errorMsg && (
            <div className="mb-6 bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100 text-center animate-in fade-in duration-300">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-6 bg-emerald-50 text-emerald-600 p-3 rounded-lg text-sm font-medium border border-emerald-100 text-center flex items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
              <CheckCircle2 size={18} />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-5">
            
            {/*NOMBRE DEL NEGOCIO (Solo visible en Registro) */}
            {!isLogin && (
              <div className="animate-in slide-in-from-bottom-2 fade-in duration-300">
                <label className="block text-sm font-bold text-slate-700 mb-2">Nombre de tu Negocio</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Building2 size={18} />
                  </div>
                  <input
                    type="text"
                    required={!isLogin}
                    value={nombreNegocio}
                    onChange={(e) => setNombreNegocio(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all text-slate-900"
                    placeholder="Ej. Barbería X, Clínica X ..."
                  />
                </div>
              </div>
            )}

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
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-600 focus:border-indigo-600 outline-none transition-all text-slate-900"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {!isLogin && <PasswordStrength password={password} />}
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