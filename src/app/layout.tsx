import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

// 1. IMPORTAMOS EL GUARDIÁN
import AuthGuard from "@/components/AuthGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Velo | Sistema Operativo de Negocios", // Actualizado con tu nueva marca
  description: "La mejor herramienta para tu negocio",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {/* 2. ENVOLVEMOS TODA LA APP EN EL GUARDIÁN */}
        <AuthGuard>
          {children}
        </AuthGuard>
      </body>
    </html>
  );
}