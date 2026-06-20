import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import StatsCard from '@/components/dashboard/StatsCard'
import InfoCarousel from '@/components/dashboard/InfoCarousel'
import MotivationalPanel from '@/components/dashboard/MotivationalPanel'
import { formatBytes } from '@/lib/utils'
import { FileText, Users, HardDrive, FolderLock, LayoutDashboard } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')

  const [totalArchivos, totalUsuarios, totalProyectos, storageAgg] =
    await Promise.all([
      prisma.archivo.count({ where: { estado: 'ACTIVO' } }),
      prisma.usuario.count({ where: { activo: true } }),
      prisma.proyecto.count(),
      prisma.archivo.aggregate({ where: { estado: 'ACTIVO' }, _sum: { tamanio: true } }),
    ])

  const storageBytes = storageAgg._sum.tamanio ?? 0

  const esAdmin = session.rol_nivel >= NIVEL_ROL.ADMIN

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-slate-50">
      <Header title="Dashboard" subtitle="Vista general de la plataforma segura" icon={<LayoutDashboard />} />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* ── Banner ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 text-white shadow-xl border border-slate-800">
          <div className="absolute top-0 right-0 bottom-0 w-1/3 bg-gradient-to-l from-brand-500/10 to-transparent pointer-events-none" />
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-brand-500/20 text-brand-400 border border-brand-500/30">
                Bóveda Cifrada Activa
              </span>
              <h2 className="text-2xl font-bold tracking-tight">¡Bienvenido, {session.usuario}!</h2>
              <p className="text-slate-300 text-sm leading-relaxed">
                Panel de control de la bóveda segura. Monitorea el almacenamiento cifrado,
                audita el historial inmutable de accesos y gestiona los compartimentos.
              </p>
              <div className="flex items-center gap-2 pt-1.5">
                <span className="text-xs text-slate-400">Rol:</span>
                <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-brand-300 rounded text-xs font-mono font-bold tracking-wide uppercase">
                  {session.rol}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 flex-shrink-0">
              <a href="/boveda" className="bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md transition-colors flex items-center gap-1.5">
                Ir a Bóveda →
              </a>
              {esAdmin && (
                <a href="/usuarios" className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Gestionar Usuarios
                </a>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats cards ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Archivos" value={totalArchivos.toLocaleString()} subtitle="Cifrados en la bóveda" icon={FileText} iconColor="text-brand-600" iconBg="bg-brand-50" borderColor="border-t-[#6366F1]" />
          <StatsCard title="Usuarios Activos" value={totalUsuarios.toLocaleString()} subtitle="Con acceso al sistema" icon={Users} iconColor="text-blue-600" iconBg="bg-blue-50" borderColor="border-t-[#3b82f6]" />
          <StatsCard title="Almacenamiento" value={formatBytes(storageBytes)} subtitle="Espacio cifrado" icon={HardDrive} iconColor="text-amber-600" iconBg="bg-amber-50" borderColor="border-t-[#f59e0b]" />
          <StatsCard title="Proyectos" value={totalProyectos.toLocaleString()} subtitle="Compartimentos" icon={FolderLock} iconColor="text-emerald-600" iconBg="bg-emerald-50" borderColor="border-t-[#10b981]" />
        </div>

        {/* ── Carrusel informativo + frase motivacional ──────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <InfoCarousel />
          </div>

          <MotivationalPanel />
        </div>
      </main>
    </div>
  )
}
