"use client";

import { Check, X } from "lucide-react";

// Requisitos que exige la política de contraseñas de Supabase.
const REQUISITOS = [
  { label: "Al menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Una letra minúscula (a-z)", test: (p: string) => /[a-z]/.test(p) },
  { label: "Una letra mayúscula (A-Z)", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Un número (0-9)", test: (p: string) => /[0-9]/.test(p) },
  { label: "Un carácter especial (!@#$…)", test: (p: string) => /[^a-zA-Z0-9]/.test(p) },
];

const NIVELES = [
  { label: "", color: "bg-slate-200", text: "text-slate-400" },
  { label: "Muy débil", color: "bg-red-500", text: "text-red-500" },
  { label: "Débil", color: "bg-orange-500", text: "text-orange-500" },
  { label: "Media", color: "bg-amber-500", text: "text-amber-500" },
  { label: "Buena", color: "bg-lime-500", text: "text-lime-600" },
  { label: "Fuerte", color: "bg-emerald-500", text: "text-emerald-600" },
];

export default function PasswordStrength({ password }: { password: string }) {
  const cumplidos = REQUISITOS.filter((r) => r.test(password)).length;
  const nivel = password ? cumplidos : 0;
  const info = NIVELES[nivel];

  return (
    <div className="mt-3 space-y-3 animate-in fade-in duration-200">
      {/* Barra de seguridad (5 segmentos) */}
      <div>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-colors ${i <= nivel ? info.color : "bg-slate-200"}`}
            />
          ))}
        </div>
        {password && (
          <p className={`text-xs font-bold mt-1.5 ${info.text}`}>Seguridad: {info.label}</p>
        )}
      </div>

      {/* Checklist de requisitos */}
      <ul className="space-y-1.5">
        {REQUISITOS.map((r) => {
          const ok = r.test(password);
          return (
            <li key={r.label} className={`flex items-center gap-2 text-xs font-medium transition-colors ${ok ? "text-emerald-600" : "text-slate-400"}`}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${ok ? "bg-emerald-100" : "bg-slate-100"}`}>
                {ok ? <Check size={11} strokeWidth={3} /> : <X size={11} strokeWidth={3} />}
              </span>
              {r.label}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
