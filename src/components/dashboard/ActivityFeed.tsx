import { formatDateRelative } from '@/lib/utils'
import type { LogAcceso } from '@/types'
import { Upload, Download, Eye, Trash2, LogIn, LogOut, UserPlus, Pencil, ShieldAlert } from 'lucide-react'

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  UPLOAD:        { icon: Upload,      color: 'text-status-active bg-status-active-bg',   label: 'Subió un archivo' },
  DOWNLOAD:      { icon: Download,    color: 'text-brand-600 bg-brand-100',              label: 'Descargó un archivo' },
  VIEW:          { icon: Eye,         color: 'text-status-info bg-status-info-bg',       label: 'Visualizó un archivo' },
  EDIT:          { icon: Pencil,      color: 'text-amber-600 bg-amber-50',               label: 'Editó metadatos' },
  DELETE:        { icon: Trash2,      color: 'text-status-danger bg-status-danger-bg',   label: 'Eliminó un archivo' },
  LOGIN:         { icon: LogIn,       color: 'text-status-pending bg-status-pending-bg', label: 'Inició sesión' },
  LOGIN_FAILED:  { icon: ShieldAlert, color: 'text-red-600 bg-red-50',                   label: 'Intento fallido de acceso' },
  LOGOUT:        { icon: LogOut,      color: 'text-slate-500 bg-slate-100',              label: 'Cerró sesión' },
  CREATE_USER:   { icon: UserPlus,    color: 'text-purple-600 bg-purple-50',             label: 'Creó un usuario' },
  ACCESS_DENIED: { icon: ShieldAlert, color: 'text-red-600 bg-red-50',                   label: 'Acceso denegado' },
}

interface ActivityFeedProps {
  logs: LogAcceso[]
}

export default function ActivityFeed({ logs }: ActivityFeedProps) {
  if (logs.length === 0) {
    return <p className="text-slate-400 text-sm text-center py-8">Sin actividad reciente</p>
  }

  return (
    <ul className="space-y-3">
      {logs.map((log) => {
        const cfg = EVENT_CONFIG[log.evento] ?? { icon: Eye, color: 'text-slate-500 bg-slate-100', label: log.evento }
        const Icon = cfg.icon

        return (
          <li key={log.id} className="flex items-start gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.color}`}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700">
                <span className="font-medium">{log.usuario?.nombre_usuario ?? 'Sistema'}</span>{' '}
                {cfg.label.toLowerCase()}
              </p>
              {log.detalle && <p className="text-xs text-slate-500 mt-0.5 truncate" title={log.detalle}>{log.detalle}</p>}
              <p className="text-xs text-slate-400 mt-0.5">{formatDateRelative(log.timestamp)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
