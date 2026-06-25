import Link from "next/link";
import {
  Layers, CalendarDays, Globe, Users, MessageCircle,
  BarChart3, Contact, Check, ArrowRight, Clock, ShieldCheck, Sparkles,
} from "lucide-react";

export const metadata = {
  title: "Velo · Software de reservas para tu negocio",
  description:
    "Agenda, reservas online 24/7, clientes y finanzas para peluquerías, barberías, centros de estética y cualquier negocio de cita previa.",
};

const features = [
  { icon: CalendarDays, title: "Agenda inteligente", desc: "Calendario por profesional con horarios, descansos, festivos y vacaciones. Adiós al cuaderno." },
  { icon: Globe, title: "Reservas online 24/7", desc: "Tu propio enlace para que los clientes reserven solos, a cualquier hora, sin llamadas ni WhatsApp constante." },
  { icon: Contact, title: "Ficha de clientes (CRM)", desc: "Historial de citas, notas y datos de contacto. Reconoce a quien repite automáticamente." },
  { icon: MessageCircle, title: "Recordatorios por WhatsApp", desc: "Avisa a tus clientes con un toque y reduce las ausencias que te cuestan dinero." },
  { icon: BarChart3, title: "Control de ingresos", desc: "Mira cuánto facturas en tiempo real y exporta a Excel cuando lo necesites." },
  { icon: Users, title: "Varios profesionales", desc: "Cada miembro del equipo con su color, sus horarios y su propia disponibilidad." },
];

const pasos = [
  { n: "1", title: "Crea tu cuenta", desc: "Regístrate con el nombre de tu negocio en menos de un minuto." },
  { n: "2", title: "Configura tu negocio", desc: "Añade tus servicios, precios, profesionales y horarios de apertura." },
  { n: "3", title: "Comparte tu enlace", desc: "Pásalo a tus clientes o ponlo en tu Instagram y empieza a recibir reservas." },
];

const incluye = [
  "Reservas online ilimitadas",
  "Profesionales y servicios ilimitados",
  "Agenda y gestión de clientes (CRM)",
  "Recordatorios por WhatsApp",
  "Control de ingresos y export a Excel",
  "Tu enlace de reservas personalizado",
  "Soporte por email",
  "Sin permanencia, cancela cuando quieras",
];

const faqs = [
  { q: "¿Para qué tipo de negocios sirve?", a: "Para cualquier negocio de cita previa: peluquerías, barberías, centros de estética, uñas, fisioterapia, tatuajes, entrenadores personales, clínicas… Si trabajas con citas y profesionales, encaja." },
  { q: "¿Mis clientes necesitan instalar algo?", a: "No. Reservan desde el navegador con tu enlace, sin apps ni registros complicados. En el móvil funciona perfecto." },
  { q: "¿Necesito conocimientos técnicos?", a: "Ninguno. Te registras, configuras tus servicios y horarios, y ya tienes tu página de reservas lista para compartir." },
  { q: "¿Puedo cancelar cuando quiera?", a: "Sí. No hay permanencia. Si decides dejarlo, cancelas y listo." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-800">
      {/* NAV */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Layers className="text-white" size={20} />
            </div>
            <span className="text-xl font-black tracking-tight italic">Velo</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">Funciones</a>
            <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Cómo funciona</a>
            <a href="#precio" className="hover:text-slate-900 transition-colors">Precio</a>
            <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex text-sm font-bold text-slate-600 hover:text-slate-900 px-4 py-2 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl shadow-lg shadow-indigo-200 transition-all">
              Empieza gratis <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-5 pt-16 pb-20 lg:pt-24 lg:pb-28 text-center">
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full mb-6">
            <Sparkles size={14} /> El sistema operativo para tu negocio
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.05]">
            Llena tu agenda mientras tú trabajas
          </h1>
          <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto">
            Velo es el software de reservas para peluquerías, barberías y centros de estética.
            Tus clientes reservan online 24/7 y tú gestionas todo desde un único panel.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/login" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-7 py-4 rounded-2xl shadow-xl shadow-indigo-200 transition-all">
              Empieza gratis <ArrowRight size={18} />
            </Link>
            <a href="#como-funciona" className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-7 py-4 rounded-2xl transition-all">
              Ver cómo funciona
            </a>
          </div>
          <p className="mt-4 text-sm text-slate-400 font-medium">Sin tarjeta de crédito · Listo en minutos</p>

          {/* Mockup decorativo */}
          <div className="mt-16 max-w-4xl mx-auto">
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-2xl shadow-slate-300/40 p-2">
              <div className="rounded-xl bg-white border border-slate-100 overflow-hidden">
                <div className="h-10 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 px-4">
                  <span className="w-3 h-3 rounded-full bg-red-300" />
                  <span className="w-3 h-3 rounded-full bg-amber-300" />
                  <span className="w-3 h-3 rounded-full bg-emerald-300" />
                  <span className="ml-3 text-xs font-bold text-slate-400">velo.app/reservar/tu-negocio</span>
                </div>
                <div className="p-6 grid sm:grid-cols-3 gap-4 text-left">
                  {["Corte de pelo · 30 min", "Color · 90 min", "Barba · 20 min"].map((s, i) => (
                    <div key={i} className="rounded-xl border-2 border-slate-100 p-4">
                      <div className="flex items-center gap-2 text-indigo-600 mb-2"><Clock size={14} /></div>
                      <p className="font-bold text-sm text-slate-800">{s.split(" · ")[0]}</p>
                      <p className="text-xs text-slate-400 font-medium">{s.split(" · ")[1]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEGMENTOS */}
      <section className="border-y border-slate-100 bg-slate-50">
        <div className="max-w-6xl mx-auto px-5 py-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-5">
            Pensado para negocios de cita previa
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-slate-500 font-bold">
            {["Peluquerías", "Barberías", "Estética", "Uñas", "Fisioterapia", "Tatuajes", "Entrenadores"].map((t) => (
              <span key={t} className="text-sm sm:text-base">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Todo tu negocio, en un sitio</h2>
          <p className="mt-4 text-slate-600 text-lg">Deja el cuaderno y las llamadas. Velo reúne agenda, reservas y clientes en una herramienta simple.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-200 p-6 hover:border-indigo-200 hover:shadow-lg hover:shadow-slate-200/50 transition-all">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                <f.icon size={22} />
              </div>
              <h3 className="font-bold text-lg text-slate-900 mb-1.5">{f.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" className="bg-slate-900 text-white">
        <div className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight">Empieza en 3 pasos</h2>
            <p className="mt-4 text-slate-300 text-lg">De cero a recibir reservas online esta misma tarde.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {pasos.map((p) => (
              <div key={p.n} className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-xl font-black mb-5">{p.n}</div>
                <h3 className="font-bold text-xl mb-2">{p.title}</h3>
                <p className="text-slate-400 leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRECIO */}
      <section id="precio" className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Un precio simple y honesto</h2>
          <p className="mt-4 text-slate-600 text-lg">Todo incluido. Sin sorpresas, sin permanencia.</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="rounded-3xl border-2 border-indigo-600 bg-white shadow-2xl shadow-indigo-200/40 overflow-hidden">
            <div className="bg-indigo-600 text-white text-center text-xs font-bold uppercase tracking-widest py-2">
              Todo lo que necesitas
            </div>
            <div className="p-8">
              <h3 className="font-black text-2xl text-slate-900">Plan Velo</h3>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-5xl font-black text-slate-900">30€</span>
                <span className="text-slate-500 font-bold mb-1.5">/mes</span>
              </div>
              <p className="text-sm text-slate-500 mt-1 font-medium">Por negocio · IVA no incluido</p>

              <Link href="/login" className="mt-7 w-full inline-flex items-center justify-center gap-2 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-7 py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all">
                Empieza gratis <ArrowRight size={18} />
              </Link>

              <ul className="mt-8 space-y-3">
                {incluye.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check size={13} strokeWidth={3} />
                    </span>
                    <span className="font-medium">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-500 font-medium">
            <ShieldCheck size={16} className="text-emerald-500" /> Tus datos seguros y aislados por negocio
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-slate-50 border-y border-slate-100">
        <div className="max-w-3xl mx-auto px-5 py-20 lg:py-24">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 text-center mb-12">Preguntas frecuentes</h2>
          <div className="space-y-4">
            {faqs.map((f) => (
              <div key={f.q} className="rounded-2xl bg-white border border-slate-200 p-6">
                <h3 className="font-bold text-slate-900 mb-2">{f.q}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="max-w-6xl mx-auto px-5 py-20 lg:py-28">
        <div className="rounded-3xl bg-indigo-600 px-8 py-16 text-center text-white relative overflow-hidden">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight max-w-2xl mx-auto">
            Empieza a recibir reservas hoy mismo
          </h2>
          <p className="mt-4 text-indigo-100 text-lg max-w-xl mx-auto">
            Únete a los negocios que ya gestionan su agenda con Velo.
          </p>
          <Link href="/login" className="mt-8 inline-flex items-center justify-center gap-2 text-base font-bold text-indigo-700 bg-white hover:bg-indigo-50 px-8 py-4 rounded-2xl shadow-xl transition-all">
            Crear mi cuenta gratis <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-5 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-600 p-1.5 rounded-lg">
              <Layers className="text-white" size={18} />
            </div>
            <span className="text-lg font-black tracking-tight italic">Velo</span>
          </div>
          <p className="text-sm text-slate-400 font-medium">© {new Date().getFullYear()} Velo · El sistema operativo para tu negocio</p>
          <Link href="/login" className="text-sm font-bold text-indigo-600 hover:text-indigo-800">Iniciar sesión</Link>
        </div>
      </footer>
    </div>
  );
}
