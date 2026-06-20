'use client'

import { Menu } from 'lucide-react'
import { useSidebar } from './SidebarContext'

interface HeaderProps {
  title:    string
  subtitle?: string
  icon?:    React.ReactNode
  actions?: React.ReactNode
}

export default function Header({ title, subtitle, icon, actions }: HeaderProps) {
  const { toggle } = useSidebar()

  return (
    <header className="flex items-center justify-between h-16 px-6 bg-surface-card border-b border-surface-border flex-shrink-0">
      {/* ── Título + Hamburger ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:bg-surface-hover hover:text-slate-700 transition-colors"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0 text-brand-600 [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
        )}
        <div>
          <h1 className="text-slate-900 font-semibold text-lg leading-none">{title}</h1>
          {subtitle && <p className="text-slate-400 text-xs mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {/* ── Acciones custom pasadas por prop ────────────────────────────── */}
      <div className="flex items-center gap-3">
        {actions}
      </div>
    </header>
  )
}
