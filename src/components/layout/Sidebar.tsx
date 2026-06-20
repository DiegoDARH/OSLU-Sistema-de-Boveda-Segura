'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard, Shield, BookOpen, Users,
  Activity, LogOut, ChevronRight, X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSidebar } from './SidebarContext'

// ─── Tipado ───────────────────────────────────────────────────────────────────
interface NavItem {
  href:      string
  label:     string
  icon:      React.ElementType
  badge?:    number
  minNivel?: number   // nivel mínimo de rol requerido para ver el ítem
}

interface SidebarProps {
  userName:      string   // nombre_usuario
  userRole:      string   // nombre del rol (display)
  roleLevel:     number   // nivel numérico del rol
  clearanceName: string   // nivel de clasificación (acreditación)
}

// ─── Estructura de navegación (fiel a image.png) ──────────────────────────────
const NAV_MAIN: NavItem[] = [
  { href: '/dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/boveda',      label: 'Bóveda',        icon: Shield },
  { href: '/informacion', label: 'Información',   icon: BookOpen },
]

const NAV_GESTION: NavItem[] = [
  { href: '/usuarios',   label: 'Usuarios',    icon: Users,    minNivel: 3 },
  { href: '/auditoria',  label: 'Auditoría',   icon: Activity, minNivel: 2 },
]

// ─── Componente ───────────────────────────────────────────────────────────────
export default function Sidebar({ userName, userRole, roleLevel, clearanceName }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const { isOpen, setIsOpen } = useSidebar()

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + '/')
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  function canSee(item: NavItem) {
    if (!item.minNivel) return true
    return roleLevel >= item.minNivel
  }

  const renderItem = (item: NavItem) => {
    if (!canSee(item)) return null
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        className={cn('sidebar-item', isActive(item.href) && 'active')}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1">{item.label}</span>
        {item.badge ? (
          <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-semibold">
            {item.badge}
          </span>
        ) : isActive(item.href) ? (
          <ChevronRight className="w-3.5 h-3.5 opacity-60" />
        ) : null}
      </Link>
    )
  }

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-45 bg-slate-900/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col w-60 h-screen bg-sidebar-bg border-r border-sidebar-border transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* ── Logo ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/LOGO.png" alt="OSLU" className="w-full h-full object-contain" />
            </div>
            <div>
              <p className="text-sidebar-text-active font-semibold text-sm leading-none">OSLU</p>
              <p className="text-sidebar-text-muted text-[10px] mt-0.5">Bóveda Segura</p>
            </div>
          </div>
          {/* Close button for mobile */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1 rounded-lg text-sidebar-text hover:text-sidebar-text-active hover:bg-sidebar-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Navegación principal ─────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV_MAIN.map(renderItem)}

          {/* Sección Gestión */}
          {NAV_GESTION.some(canSee) && (
            <>
              <p className="sidebar-section-label">Gestión</p>
              {NAV_GESTION.map(renderItem)}
            </>
          )}
        </nav>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <div className="px-3 pb-3 border-t border-sidebar-border pt-3 space-y-0.5">
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="sidebar-item w-full text-left text-red-400 hover:text-red-300 hover:bg-red-900/20"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span>Cerrar sesión</span>
          </button>

          {/* User card (fiel a image.png — usuario en la parte inferior) */}
          <div className="flex items-center gap-3 mt-3 px-3 py-2.5 rounded-lg bg-sidebar-hover">
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sidebar-text-active text-xs font-medium truncate">{userName}</p>
              <p className="text-sidebar-text text-[10px] truncate">Acreditación: {clearanceName}</p>
            </div>
            <span className="text-[9px] font-semibold text-brand-400 uppercase tracking-wide">
              {userRole}
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
