'use client'

import { useState } from 'react'
import { PenLine, UserX, UserCheck, Trash2 } from 'lucide-react'
import { formatDate, clasificacionBadge } from '@/lib/utils'
import type { Usuario } from '@/types'

function rolBadge(nivel: number): string {
  if (nivel >= 3) return 'badge-danger'
  if (nivel === 2) return 'badge-pending'
  return 'badge-info'
}

interface UsersTableProps {
  usuarios: Usuario[]
  onEdit:   (u: Usuario) => void
  onToggle: (u: Usuario) => void
  onDelete: (u: Usuario) => void
}

export default function UsersTable({ usuarios, onEdit, onToggle, onDelete }: UsersTableProps) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const perPage = 10

  const filtered = usuarios.filter((u) =>
    u.nombre_usuario.toLowerCase().includes(search.toLowerCase()),
  )

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)
  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="card mt-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-sm text-slate-500">{total} usuario(s) encontrado(s)</p>
        <input
          type="search"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por nombre de usuario..."
          className="input w-64 py-1.5"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-surface-border">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="table-header-cell">#</th>
              <th className="table-header-cell">Usuario</th>
              <th className="table-header-cell">Rol</th>
              <th className="table-header-cell">Acreditación</th>
              <th className="table-header-cell">Estado</th>
              <th className="table-header-cell">Creado</th>
              <th className="table-header-cell">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr><td colSpan={7} className="table-cell text-center text-slate-400 py-10">Sin resultados</td></tr>
            ) : paginated.map((u, i) => (
              <tr key={u.id} className="table-row">
                <td className="table-cell text-slate-400 font-mono text-xs">{(page - 1) * perPage + i + 1}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                      {u.nombre_usuario.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{u.nombre_usuario}</span>
                  </div>
                </td>
                <td className="table-cell">
                  <span className={rolBadge(u.rol?.nivel_numerico ?? 1)}>{u.rol?.nombre_rol ?? '—'}</span>
                </td>
                <td className="table-cell">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${clasificacionBadge(u.nivel_clasificacion?.nombre ?? '')}`}>
                    {u.nivel_clasificacion?.nombre ?? '—'}
                  </span>
                </td>
                <td className="table-cell">
                  <span className={u.activo ? 'badge-active' : 'badge-inactive'}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                </td>
                <td className="table-cell text-slate-500">{formatDate(u.fecha_creacion)}</td>
                <td className="table-cell">
                  <div className="flex items-center gap-1">
                    <button onClick={() => onEdit(u)} title="Editar" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-brand-500 hover:bg-brand-50 transition-colors">
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => onToggle(u)} title={u.activo ? 'Desactivar' : 'Activar'} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-status-pending hover:bg-status-pending-bg transition-colors">
                      {u.activo ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => onDelete(u)} title="Desactivar" className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-status-danger hover:bg-status-danger-bg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-slate-500">
        <span>Mostrando {Math.min((page - 1) * perPage + 1, total)} – {Math.min(page * perPage, total)} de {total}</span>
        <div className="flex gap-1">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Anterior</button>
          <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary py-1.5 px-3 disabled:opacity-40">Siguiente</button>
        </div>
      </div>
    </div>
  )
}
