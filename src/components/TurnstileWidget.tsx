"use client";

import { useEffect, useRef } from "react";

// Widget de Cloudflare Turnstile (captcha invisible/no intrusivo).
// Solo se renderiza si existe NEXT_PUBLIC_TURNSTILE_SITE_KEY. Si no, devuelve
// null y el flujo de reserva sigue exactamente igual que antes.

interface TurnstileAPI {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
    }
  ) => string;
  reset: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileAPI;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

export default function TurnstileWidget({ onToken }: { onToken: (token: string) => void }) {
  const contenedor = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    if (!siteKey) return;

    const pintar = () => {
      if (!window.turnstile || !contenedor.current || widgetId.current) return;
      widgetId.current = window.turnstile.render(contenedor.current, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        "expired-callback": () => onToken(""),
        "error-callback": () => onToken(""),
      });
    };

    if (window.turnstile) {
      pintar();
      return;
    }

    if (!document.getElementById(SCRIPT_ID)) {
      const s = document.createElement("script");
      s.id = SCRIPT_ID;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.onload = pintar;
      document.head.appendChild(s);
      return;
    }

    // El script existe pero la API aún no está lista: esperamos.
    const intervalo = setInterval(() => {
      if (window.turnstile) {
        clearInterval(intervalo);
        pintar();
      }
    }, 200);
    return () => clearInterval(intervalo);
  }, [siteKey, onToken]);

  if (!siteKey) return null;
  return <div ref={contenedor} className="flex justify-center my-2" />;
}
