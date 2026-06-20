'use client'

import { Folder, Pencil, Trash2 } from 'lucide-react'
import type { Proyecto } from '@/types'
import { clasificacionBadge } from '@/lib/utils'

interface FolderCardProps {
  proyecto: Proyecto
  canManage?: boolean
  onClick?:  (id: string) => void
  onEdit?:   (p: Proyecto) => void
  onDelete?: (p: Proyecto) => void
}

/*
  Tarjeta de proyecto / compartimento.
  Muestra nombre, nivel mínimo de clasificación (badge) y nº de archivos.
  Si el usuario puede gestionar, aparecen acciones editar/eliminar al hover.
*/
export default function FolderCard({ proyecto, canManage, onClick, onEdit, onDelete }: FolderCardProps) {
  const nivel = proyecto.nivel_clasificacion_minimo?.nombre ?? 'NORMAL'

  return (
    <div
      onClick={() => onClick?.(proyecto.id)}
      className="group relative bg-white rounded-xl border border-slate-200 shadow-sm p-4
                 cursor-pointer hover:shadow-card-hover hover:border-slate-300
                 transition-all duration-150"
    >
      <div className="flex items-start justify-between mb-3">
        <Folder className="w-10 h-10 text-brand-500" style={{ fill: '#DBEAFE' }} />
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${clasificacionBadge(nivel)}`}>
          {nivel}
        </span>
      </div>

      <p className="font-semibold text-brand-600 text-sm truncate" title={proyecto.nombre_proyecto}>
        {proyecto.nombre_proyecto}
      </p>
      <p className="text-slate-400 text-xs mt-0.5">{proyecto._count?.archivos ?? 0} archivo(s)</p>

      {canManage && (
        <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit?.(proyecto) }}
            title="Editar proyecto"
            className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-white transition-colors shadow-sm"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete?.(proyecto) }}
            title="Eliminar proyecto"
            className="w-7 h-7 rounded-lg bg-white/90 border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-white transition-colors shadow-sm"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  )
}
