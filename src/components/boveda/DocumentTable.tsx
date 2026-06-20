'use client'

/*
  DocumentTable — tabla de archivos cifrados.
  Columnas: Nombre | Proyecto | Clasificación | Tamaño | Fecha de Subida | Acciones
  Ordenamiento, filtrado y paginación 100% en cliente.
*/

import { useState } from 'react'
import { Download, Eye, Pencil, Trash2, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { formatBytes, formatDate, getExtensionColor, clasificacionBadge, extOf } from '@/lib/utils'
import type { Archivo } from '@/types'

type SortKey = 'nombre_archivo' | 'tamanio' | 'fecha_subida'
type SortDir = 'asc' | 'desc'

interface DocumentTableProps {
  archivos:   Archivo[]
  onDownload: (a: Archivo) => void
  onView:     (a: Archivo) => void
  onEdit:     (a: Archivo) => void
  onDelete:   (a: Archivo) => void
  canModify?: boolean
  loading?:   boolean
}

export default function DocumentTable({
  archivos, onDownload, onView, onEdit, onDelete, canModify, loading,
}: DocumentTableProps) {
  const [search,  setSearch]  = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page,    setPage]    = useState(1)
  const [sortKey, setSortKey] = useState<SortKey>('fecha_subida')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const filtered = archivos.filter((a) =>
    a.nombre_archivo.toLowerCase().includes(search.toLowerCase()) ||
    (a.proyecto?.nombre_proyecto ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey] as string | number
    const bv = b[sortKey] as string | number
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ?  1 : -1
    return 0
  })

  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const safePage   = Math.min(page, totalPages)
  const paginated  = sorted.slice((safePage - 1) * perPage, safePage * perPage)
  const rangeStart = sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const rangeEnd   = Math.min(safePage * perPage, sorted.length)

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-400 inline" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 ml-1 text-brand-500 inline" />
      : <ChevronDown className="w-3 h-3 ml-1 text-brand-500 inline" />
  }

  return (
    <div className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          Mostrar
          <select
            value={perPage}
            onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
            className="border border-slate-200 rounded px-1.5 py-0.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {[5, 10, 25, 50].map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          registros
        </div>

        <div className="flex items-center gap-2 text-sm text-slate-500">
          Buscar:
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded px-2 py-0.5 text-sm bg-slate-50 text-slate-700 w-44 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      <div className="border border-slate-200 rounded-lg overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => toggleSort('nombre_archivo')}>
                Nombre <SortIcon k="nombre_archivo" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Proyecto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Clasificación</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => toggleSort('tamanio')}>
                Tamaño <SortIcon k="tamanio" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700" onClick={() => toggleSort('fecha_subida')}>
                Fecha de Subida <SortIcon k="fecha_subida" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 select-none">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">Cargando...</td></tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="bg-slate-50 px-4 py-4 text-center text-slate-400 text-sm border-b border-slate-100">
                  {search ? 'No se encontraron resultados' : 'Ningún archivo disponible'}
                </td>
              </tr>
            ) : paginated.map((a) => {
              const ext = extOf(a.nombre_archivo)
              const nivel = a.nivel_clasificacion?.nombre ?? 'NORMAL'
              return (
                <tr key={a.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 max-w-xs">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getExtensionColor(ext)}`}>
                        {ext || '—'}
                      </span>
                      <span className="font-medium text-slate-800 truncate" title={a.nombre_archivo}>
                        {a.nombre_archivo}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm">{a.proyecto?.nombre_proyecto ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${clasificacionBadge(nivel)}`}>
                      {nivel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">{formatBytes(a.tamanio)}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">{formatDate(a.fecha_subida)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <Btn icon={Eye}      title="Vista previa" hover="hover:text-brand-500" onClick={() => onView(a)} />
                      <Btn icon={Download} title="Descargar"    hover="hover:text-green-600" onClick={() => onDownload(a)} />
                      {canModify && <Btn icon={Pencil} title="Editar" hover="hover:text-amber-600" onClick={() => onEdit(a)} />}
                      {canModify && <Btn icon={Trash2} title="Eliminar"  hover="hover:text-red-600"   onClick={() => onDelete(a)} />}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between mt-3 gap-2">
        <span className="text-slate-400 text-sm">
          Mostrando registros del {rangeStart} al {rangeEnd} de un total de {sorted.length} registros
        </span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={safePage <= 1}
            className="border border-slate-200 text-slate-600 text-sm px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Anterior
          </button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={safePage >= totalPages}
            className="border border-slate-200 text-slate-600 text-sm px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Siguiente
          </button>
        </div>
      </div>
    </div>
  )
}

function Btn({ icon: Icon, title, hover, onClick }: {
  icon: React.ElementType; title: string; hover: string; onClick: () => void
}) {
  return (
    <button onClick={onClick} title={title}
      className={`w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 ${hover} hover:bg-slate-100 transition-colors`}>
      <Icon className="w-3.5 h-3.5" />
    </button>
  )
}
