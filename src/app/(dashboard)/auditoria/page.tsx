'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import {
  ShieldCheck, ShieldAlert, ShieldOff, RefreshCw, Fingerprint,
  Upload, Download, Eye, Trash2, LogIn, LogOut, UserPlus, UserMinus,
  Pencil, FolderPlus, FolderOpen, FolderMinus, KeyRound,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { LogAcceso } from '@/types'

interface LogRow extends LogAcceso {
  firma_digital: string
}

type SortKey = 'evento' | 'timestamp'
type SortDir = 'asc' | 'desc'
type Verify  = { ok: boolean; brokenAtId?: string } | null

const EVENT_CFG: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  LOGIN:          { icon: LogIn,       color: 'text-status-pending bg-status-pending-bg', label: 'Inicio de sesión' },
  LOGIN_FAILED:   { icon: ShieldAlert, color: 'text-red-600 bg-red-50',                  label: 'Intento fallido' },
  LOGOUT:         { icon: LogOut,      color: 'text-slate-500 bg-slate-100',             label: 'Cierre de sesión' },
  UPLOAD:         { icon: Upload,      color: 'text-status-active bg-status-active-bg',  label: 'Subida de archivo' },
  DOWNLOAD:       { icon: Download,    color: 'text-brand-600 bg-brand-100',             label: 'Descarga de archivo' },
  VIEW:           { icon: Eye,         color: 'text-status-info bg-status-info-bg',      label: 'Visualización' },
  EDIT:           { icon: Pencil,      color: 'text-amber-600 bg-amber-50',              label: 'Edición de archivo' },
  DELETE:         { icon: Trash2,      color: 'text-status-danger bg-status-danger-bg',  label: 'Eliminación de archivo' },
  CREATE_USER:    { icon: UserPlus,    color: 'text-purple-600 bg-purple-50',            label: 'Crear usuario' },
  EDIT_USER:      { icon: Pencil,      color: 'text-amber-600 bg-amber-50',              label: 'Editar usuario' },
  DELETE_USER:    { icon: UserMinus,   color: 'text-status-danger bg-status-danger-bg',  label: 'Eliminar usuario' },
  CREATE_PROJECT: { icon: FolderPlus,  color: 'text-emerald-600 bg-emerald-50',          label: 'Crear proyecto' },
  EDIT_PROJECT:   { icon: FolderOpen,  color: 'text-amber-600 bg-amber-50',              label: 'Editar proyecto' },
  DELETE_PROJECT: { icon: FolderMinus, color: 'text-status-danger bg-status-danger-bg',  label: 'Eliminar proyecto' },
  GRANT_ACCESS:   { icon: KeyRound,    color: 'text-brand-600 bg-brand-100',             label: 'Acceso concedido' },
  REVOKE_ACCESS:  { icon: ShieldOff,   color: 'text-orange-600 bg-orange-50',            label: 'Acceso revocado' },
  ACCESS_DENIED:  { icon: ShieldAlert, color: 'text-red-600 bg-red-50',                  label: 'Acceso denegado' },
}

const ALL_EVENTS = Object.keys(EVENT_CFG)

export default function AuditoriaPage() {
  const [logs,      setLogs]      = useState<LogRow[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [verify,    setVerify]    = useState<Verify>(null)
  const [verifying, setVerifying] = useState(false)

  const [search,  setSearch]  = useState('')
  const [perPage, setPerPage] = useState(10)
  const [page,    setPage]    = useState(1)
  const [evento,  setEvento]  = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('timestamp')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({
      page:    String(page),
      limit:   String(perPage),
      sortBy:  sortKey,
      sortDir: sortDir,
      ...(evento ? { evento } : {}),
      ...(search ? { search } : {}),
    })
    const res  = await fetch(`/api/auditoria?${params}`)
    const json = await res.json()
    if (json.ok) {
      setLogs(json.data.items)
      setTotal(json.data.total)
    }
    setLoading(false)
  }, [page, perPage, sortKey, sortDir, evento, search])

  useEffect(() => { load() }, [load])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortKey(key); setSortDir('asc') }
    setPage(1)
  }

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronsUpDown className="w-3 h-3 ml-1 text-slate-400 inline" />
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 ml-1 text-brand-500 inline" />
      : <ChevronDown className="w-3 h-3 ml-1 text-brand-500 inline" />
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const rangeStart = total === 0 ? 0 : (page - 1) * perPage + 1
  const rangeEnd   = Math.min(page * perPage, total)

  async function runVerify() {
    setVerifying(true)
    setVerify(null)
    const res  = await fetch('/api/auditoria/verify')
    const json = await res.json()
    if (json.ok) setVerify(json.data)
    setVerifying(false)
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Auditoría"
        subtitle="Bitácora inmutable de accesos y operaciones"
        icon={<ShieldCheck />}
        actions={
          <button onClick={runVerify} disabled={verifying} className="btn-primary gap-1.5">
            <Fingerprint className="w-4 h-4" />
            {verifying ? 'Verificando...' : 'Verificar integridad'}
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* ── Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card border-t-4 border-t-purple-500">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Total eventos</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{total}</p>
            <p className="text-slate-400 text-xs mt-1">acciones registradas en la bitácora de auditoría</p>
          </div>
          <div className="card border-t-4 border-t-brand-500">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Página actual</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{page}</p>
            <p className="text-slate-400 text-xs mt-1">de un total de {totalPages} páginas de registros</p>
          </div>
          <div className="card border-t-4 border-t-emerald-500">
            <p className="text-slate-500 text-xs font-semibold uppercase tracking-wide">Estado de auditoría</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">Activo</p>
            <p className="text-slate-400 text-xs mt-1">monitoreo de seguridad y accesos activo</p>
          </div>
        </div>

        {verify && (
          <div className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            verify.ok
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {verify.ok
              ? <ShieldCheck className="w-5 h-5" />
              : <ShieldAlert className="w-5 h-5" />}
            {verify.ok
              ? 'Cadena íntegra: ninguna entrada fue alterada ni eliminada.'
              : `¡Integridad comprometida! La cadena se rompe en el registro ${verify.brokenAtId}.`}
          </div>
        )}

        <div className="card">
          {/* ── Controles ── */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Mostrar
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                  className="border border-slate-200 rounded px-1.5 py-0.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  {[5, 10, 25, 50, 100].map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
                registros
              </div>

              <select
                value={evento}
                onChange={(e) => { setEvento(e.target.value); setPage(1) }}
                className="border border-slate-200 rounded px-2 py-0.5 text-sm text-slate-700 bg-white focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Todos los eventos</option>
                {ALL_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>{EVENT_CFG[ev].label}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                Buscar:
                <input
                  type="search"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  className="border border-slate-200 rounded px-2 py-0.5 text-sm bg-slate-50 text-slate-700 w-44 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>
              <button onClick={load} disabled={loading} title="Actualizar" className="text-slate-400 hover:text-slate-600 transition-colors">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* ── Tabla ── */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('evento')}
                  >
                    Evento <SortIcon k="evento" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Detalle</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">IP</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 cursor-pointer select-none hover:text-slate-700"
                    onClick={() => toggleSort('timestamp')}
                  >
                    Fecha <SortIcon k="timestamp" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500">Firma</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                      Cargando...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="bg-slate-50 px-4 py-4 text-center text-slate-400 text-sm border-b border-slate-100">
                      {search || evento ? 'No se encontraron resultados' : 'Sin registros de auditoría'}
                    </td>
                  </tr>
                ) : logs.map((l) => {
                  const cfg  = EVENT_CFG[l.evento] ?? { icon: Eye, color: 'text-slate-500 bg-slate-100', label: l.evento }
                  const Icon = cfg.icon
                  return (
                    <tr key={l.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                          </div>
                          <span className="font-mono text-xs font-semibold text-slate-700 whitespace-nowrap">
                            {l.evento}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {l.usuario?.nombre_usuario ?? 'Sistema'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm max-w-xs truncate" title={l.detalle ?? ''}>
                        {l.detalle ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                        {l.ip_address ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-sm whitespace-nowrap">
                        {formatDate(l.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-slate-300 font-mono text-[10px]" title={l.firma_digital}>
                        {l.firma_digital.slice(0, 10)}…
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pie de tabla ── */}
          <div className="flex flex-wrap items-center justify-between mt-3 gap-2">
            <span className="text-slate-400 text-sm">
              Mostrando registros del {rangeStart} al {rangeEnd} de un total de {total} registros
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="border border-slate-200 text-slate-600 text-sm px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="border border-slate-200 text-slate-600 text-sm px-4 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
