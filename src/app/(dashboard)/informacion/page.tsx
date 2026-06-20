import { getSessionFromCookies } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import {
  BookOpen, ShieldCheck, Lock, ScanFace, FileLock2,
  History, Layers, KeyRound, Target, UserCheck,
} from 'lucide-react'

export const metadata = { title: 'Información' }

// ─── Propósitos del sistema ────────────────────────────────────────────────
const PROPOSITOS = [
  {
    icon: Lock,
    title: 'Confidencialidad',
    desc: 'Resguardar la información sensible mediante cifrado de extremo a extremo, de modo que solo el personal autorizado pueda acceder a ella.',
  },
  {
    icon: ShieldCheck,
    title: 'Control de acceso',
    desc: 'Garantizar que cada usuario solo vea lo que su nivel de acreditación y necesidad de saber le permiten, siguiendo el principio de mínimo privilegio.',
  },
  {
    icon: History,
    title: 'Trazabilidad',
    desc: 'Registrar de forma inmutable cada acción realizada sobre la bóveda, permitiendo auditar el historial y detectar cualquier alteración.',
  },
]

// ─── Características de seguridad ───────────────────────────────────────────
const CARACTERISTICAS = [
  {
    icon: FileLock2,
    title: 'Cifrado por archivo',
    desc: 'Cada documento se cifra con una clave AES-256-GCM única, protegida a su vez por una clave maestra (cifrado de sobre). Los archivos nunca se sirven en texto plano.',
  },
  {
    icon: ScanFace,
    title: 'Autenticación facial (MFA)',
    desc: 'El inicio de sesión exige un segundo factor biométrico: el reconocimiento facial valida la identidad del usuario antes de emitir la sesión.',
  },
  {
    icon: Layers,
    title: 'Niveles de clasificación',
    desc: 'Los archivos se clasifican (Normal, Confidencial, Top Secret) y un usuario solo accede a aquellos iguales o por debajo de su acreditación: "no leer hacia arriba".',
  },
  {
    icon: UserCheck,
    title: 'Necesidad de saber',
    desc: 'Además del nivel, se requiere una autorización explícita sobre el proyecto al que pertenece el archivo, reforzando la compartimentación.',
  },
  {
    icon: History,
    title: 'Auditoría inmutable',
    desc: 'Cada evento se encadena con una firma HMAC sobre el registro anterior. Cualquier intento de modificar el historial rompe la cadena y queda en evidencia.',
  },
  {
    icon: KeyRound,
    title: 'Gestión de claves',
    desc: 'Las claves de cifrado se almacenan envueltas y separadas de los datos, de forma que comprometer el almacenamiento no expone el contenido.',
  },
]

// ─── Jerarquía de roles ────────────────────────────────────────────────────
const ROLES = [
  { rol: 'Administrador', nivel: 'Acceso total a la gestión de usuarios, roles y auditoría.' },
  { rol: 'Gestor',        nivel: 'Administra compartimentos y archivos según su acreditación.' },
  { rol: 'Analista / Lector', nivel: 'Consulta los archivos a los que tiene acceso autorizado.' },
]

export default async function InformacionPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Información" subtitle="Descripción y propósitos del sistema" icon={<BookOpen />} />

      <main className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* ── Descripción general ─────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-8 text-white shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 max-w-3xl space-y-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30">
              OSLU · Bóveda Segura
            </span>
            <h2 className="text-2xl font-bold tracking-tight">¿Qué es este sistema?</h2>
            <p className="text-slate-300 text-sm leading-relaxed">
              La Bóveda Segura es una plataforma de almacenamiento y gestión documental diseñada para
              custodiar información sensible bajo estrictos controles de seguridad. Combina cifrado
              robusto, autenticación multifactor con reconocimiento facial, control de acceso por niveles
              de clasificación y un registro de auditoría inmutable, garantizando que cada documento sea
              accesible únicamente por quien está autorizado y que toda actividad quede debidamente registrada.
            </p>
          </div>
        </section>

        {/* ── Propósitos ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-slate-900 text-lg">Propósitos del sistema</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {PROPOSITOS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card">
                <div className="w-10 h-10 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 mb-3">
                  <Icon className="w-5 h-5" />
                </div>
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="text-slate-500 text-sm mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Características de seguridad ──────────────────────────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-slate-900 text-lg">Características de seguridad</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {CARACTERISTICAS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="card card-hover">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-surface border border-surface-border flex items-center justify-center text-slate-600 flex-shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{title}</p>
                    <p className="text-slate-500 text-sm mt-1 leading-relaxed">{desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Roles y acreditación ─────────────────────────────────────────── */}
        <section className="card">
          <div className="flex items-center gap-2 mb-4">
            <UserCheck className="w-5 h-5 text-brand-500" />
            <h3 className="font-semibold text-slate-900 text-lg">Roles del sistema</h3>
          </div>
          <div className="space-y-3">
            {ROLES.map(({ rol, nivel }) => (
              <div key={rol} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-3 px-4 rounded-lg bg-surface">
                <span className="badge-info text-xs font-semibold w-fit">{rol}</span>
                <span className="text-slate-600 text-sm">{nivel}</span>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
