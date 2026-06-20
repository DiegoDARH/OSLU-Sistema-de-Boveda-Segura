/*
  BovedaView — repositorio seguro.
  · Izquierda: navegación "Mi Unidad" + estadísticas de almacenamiento.
  · Derecha: "Proyectos" (compartimentos) + tabla "Archivos".
  Gestiona modales (subir, crear/editar proyecto, editar archivo), confirmaciones
  y notificaciones toast para toda acción de la bóveda.
*/
'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import {
  LayoutList, Clock, FileText, Image as ImgIcon,
  Film, Music, Archive, Plus, ChevronDown, RefreshCw,
  Upload, FolderPlus,
} from 'lucide-react'
import FolderCard from './FolderCard'
import DocumentTable from './DocumentTable'
import StorageStats from './StorageStats'
import UploadModal from './UploadModal'
import ProjectModal from './ProjectModal'
import EditFileModal from './EditFileModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useToasts, ToastContainer } from '@/components/ui/Toast'
import type { Proyecto, Archivo } from '@/types'
import { cn, extOf } from '@/lib/utils'

const NAV_ITEMS = [
  { key: 'all',    label: 'Todos',               icon: LayoutList },
  { key: 'recent', label: 'Recientes',            icon: Clock      },
  { key: 'docs',   label: 'Documentos',           icon: FileText   },
  { key: 'images', label: 'Imágenes',             icon: ImgIcon    },
  { key: 'videos', label: 'Videos',               icon: Film       },
  { key: 'audio',  label: 'Audios',               icon: Music      },
  { key: 'zip',    label: 'Archivos Comprimidos', icon: Archive    },
]

const NAV_EXT_MAP: Record<string, string[]> = {
  docs:   ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv'],
  images: ['png', 'jpg', 'jpeg', 'webp'],
  videos: ['mp4', 'avi', 'mov'],
  audio:  ['mp3', 'wav'],
  zip:    ['zip', 'rar', '7z'],
}

interface BovedaViewProps {
  initialArchivos:  Archivo[]
  initialProyectos: Proyecto[]
  canUpload:        boolean
}

export default function BovedaView({
  initialArchivos, initialProyectos, canUpload,
}: BovedaViewProps) {
  const [archivos,     setArchivos]     = useState(initialArchivos)
  const [proyectos,    setProyectos]    = useState(initialProyectos)
  const [navKey,       setNavKey]       = useState('all')
  const [activeProyId, setActiveProyId] = useState<string | null>(null)
  const [loading,      setLoading]      = useState(false)

  // Menús y modales
  const [menuOpen,     setMenuOpen]     = useState(false)
  const [showUpload,   setShowUpload]   = useState(false)
  const [projectModal, setProjectModal] = useState<{ open: boolean; proyecto: Proyecto | null }>({ open: false, proyecto: null })
  const [editFile,     setEditFile]     = useState<Archivo | null>(null)
  const [confirmDel,   setConfirmDel]   = useState<{ kind: 'archivo' | 'proyecto'; target: Archivo | Proyecto } | null>(null)
  const [deleting,     setDeleting]     = useState(false)
  const deletingRef = useRef(false)

  const { toasts, toast, dismiss } = useToasts()
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar el menú "Agregar" al hacer clic fuera.
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const filtered = archivos.filter((a) => {
    if (activeProyId && a.proyecto_id !== activeProyId) return false
    if (navKey === 'all')    return true
    if (navKey === 'recent') return Date.now() - new Date(a.fecha_subida).getTime() < 7 * 86400_000
    const exts = NAV_EXT_MAP[navKey]
    return exts ? exts.includes(extOf(a.nombre_archivo)) : true
  })

  // Estadísticas de almacenamiento derivadas del estado actual de `archivos`,
  // de modo que se actualizan automáticamente al subir, editar o eliminar.
  const storageStats = useMemo(() => {
    const byExtMap = new Map<string, { count: number; bytes: number }>()
    let usedBytes = 0
    for (const a of archivos) {
      const ext = extOf(a.nombre_archivo) || 'otro'
      const cur = byExtMap.get(ext) ?? { count: 0, bytes: 0 }
      byExtMap.set(ext, { count: cur.count + 1, bytes: cur.bytes + a.tamanio })
      usedBytes += a.tamanio
    }
    return {
      total: archivos.length,
      usedBytes,
      byExtension: [...byExtMap.entries()].map(([extension, v]) => ({ extension, ...v })),
    }
  }, [archivos])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [ar, pr] = await Promise.all([fetch('/api/archivos'), fetch('/api/proyectos')])
      const [aj, pj] = await Promise.all([ar.json(), pr.json()])
      if (aj.ok) setArchivos(aj.data.items)
      if (pj.ok) setProyectos(pj.data)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleDownload(a: Archivo) {
    const link = window.document.createElement('a')
    link.href = `/api/archivos/${a.id}/download`
    link.download = a.nombre_archivo
    link.click()
    toast('info', `Descargando "${a.nombre_archivo}"`)
  }

  function handleView(a: Archivo) {
    window.open(`/api/archivos/${a.id}/download?view=1`, '_blank')
  }

  // ── Confirmación de borrado (archivo o proyecto) ────────────────────────────
  async function confirmDelete() {
    if (!confirmDel || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    try {
      if (confirmDel.kind === 'archivo') {
        const a = confirmDel.target as Archivo
        const res = await fetch(`/api/archivos/${a.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al eliminar')
        setArchivos((prev) => prev.filter((x) => x.id !== a.id))
        toast('success', `Archivo "${a.nombre_archivo}" eliminado`)
      } else {
        const p = confirmDel.target as Proyecto
        const res = await fetch(`/api/proyectos/${p.id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error((await res.json()).error ?? 'Error al eliminar')
        const { data } = await res.json()
        setProyectos((prev) => prev.filter((x) => x.id !== p.id))
        setArchivos((prev) => prev.filter((x) => x.proyecto_id !== p.id))
        if (activeProyId === p.id) setActiveProyId(null)
        const msg = data?.archivosEliminados
          ? `Proyecto "${p.nombre_proyecto}" y ${data.archivosEliminados} archivo(s) eliminados`
          : `Proyecto "${p.nombre_proyecto}" eliminado`
        toast('success', msg)
      }
      setConfirmDel(null)
    } catch (e) {
      toast('error', (e as Error).message)
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  const activeProy = proyectos.find((p) => p.id === activeProyId)

  return (
    <>
      <div className="flex flex-col lg:flex-row flex-1 overflow-y-auto lg:overflow-hidden bg-slate-50">
        {/* ── Columna izquierda ──────────────────────────────────────────── */}
        <div className="w-full lg:w-[300px] flex-shrink-0 p-4 space-y-3 lg:overflow-y-auto">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {canUpload && (
              <div className="p-4 pb-3 relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="w-full flex items-center justify-center gap-2
                             bg-[#1a2744] hover:bg-[#243355] active:bg-[#111d35]
                             text-white font-medium text-sm rounded-lg py-2.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                  <ChevronDown className={cn('w-4 h-4 transition-transform', menuOpen && 'rotate-180')} />
                </button>

                {menuOpen && (
                  <div className="absolute left-4 right-4 mt-1 bg-white rounded-lg border border-slate-200 shadow-lg overflow-hidden z-20 animate-slide-up">
                    <button
                      onClick={() => { setMenuOpen(false); setShowUpload(true) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <Upload className="w-4 h-4 text-brand-500" /> Subir archivo
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setProjectModal({ open: true, proyecto: null }) }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100"
                    >
                      <FolderPlus className="w-4 h-4 text-brand-500" /> Crear proyecto
                    </button>
                  </div>
                )}
              </div>
            )}

            <div className={cn('px-4 pb-4', canUpload ? '' : 'pt-4')}>
              <h3 className="font-bold text-slate-800 mb-2 text-[15px]">Mi Unidad</h3>
              <ul className="space-y-0.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon
                  const active = navKey === item.key && !activeProyId
                  return (
                    <li key={item.key}>
                      <button
                        onClick={() => { setNavKey(item.key); setActiveProyId(null) }}
                        className={cn(
                          'w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-sm transition-colors',
                          active ? 'bg-brand-50 text-brand-600 font-medium' : 'text-slate-600 hover:bg-slate-50',
                        )}
                      >
                        <Icon className={cn('w-4 h-4 flex-shrink-0', active ? 'text-brand-500' : 'text-slate-500')} />
                        {item.label}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
            <StorageStats total={storageStats.total} usedBytes={storageStats.usedBytes} byExtension={storageStats.byExtension} />
          </div>
        </div>

        {/* ── Área principal ─────────────────────────────────────────────── */}
        <div className="flex-1 p-4 space-y-5 lg:overflow-y-auto">
          {!activeProyId && (
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-slate-800 text-lg">Proyectos</h2>
                <button onClick={refresh} disabled={loading} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
                </button>
              </div>

              {proyectos.length === 0 ? (
                <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center">
                  <FolderPlus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">No tiene acceso a ningún proyecto todavía.</p>
                  {canUpload && (
                    <button onClick={() => setProjectModal({ open: true, proyecto: null })} className="btn-primary mt-3 text-sm">
                      Crear el primero
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {proyectos.map((p) => (
                    <FolderCard
                      key={p.id}
                      proyecto={p}
                      canManage={canUpload}
                      onClick={(id) => { setActiveProyId(id); setNavKey('all') }}
                      onEdit={(proy) => setProjectModal({ open: true, proyecto: proy })}
                      onDelete={(proy) => setConfirmDel({ kind: 'proyecto', target: proy })}
                    />
                  ))}
                </div>
              )}
            </section>
          )}

          {activeProyId && (
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-lg">{activeProy?.nombre_proyecto}</h2>
              <button onClick={() => setActiveProyId(null)} className="text-brand-500 hover:text-brand-700 text-sm font-medium">
                ← Volver
              </button>
            </div>
          )}

          <section className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between px-4 pt-4 pb-0">
              <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                Archivos
                {!activeProyId && navKey !== 'all' &&
                  <span className="text-xs font-medium text-brand-600 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                    {NAV_ITEMS.find((n) => n.key === navKey)?.label}
                  </span>
                }
              </h2>
              <button onClick={refresh} className="border border-slate-300 text-slate-500 text-sm px-3 py-1 rounded-lg hover:bg-slate-50 transition-colors">
                Actualizar
              </button>
            </div>

            <DocumentTable
              archivos={filtered}
              loading={loading}
              canModify={canUpload}
              onDownload={handleDownload}
              onView={handleView}
              onEdit={(a) => setEditFile(a)}
              onDelete={(a) => setConfirmDel({ kind: 'archivo', target: a })}
            />
          </section>
        </div>
      </div>

      {/* ── Modales ──────────────────────────────────────────────────────── */}
      {showUpload && (
        <UploadModal
          proyectos={proyectos}
          onClose={() => setShowUpload(false)}
          onSuccess={() => { refresh(); toast('success', 'Archivo(s) subido(s) y cifrado(s)') }}
        />
      )}

      {projectModal.open && (
        <ProjectModal
          proyecto={projectModal.proyecto}
          onClose={() => setProjectModal({ open: false, proyecto: null })}
          onSaved={(kind, message) => { toast(kind, message); refresh() }}
        />
      )}

      {editFile && (
        <EditFileModal
          archivo={editFile}
          proyectos={proyectos}
          onClose={() => setEditFile(null)}
          onSaved={(updated, message) => {
            const prevProyId = editFile?.proyecto_id
            setArchivos((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
            if (prevProyId && prevProyId !== updated.proyecto_id) {
              setProyectos((prev) => prev.map((p) => {
                if (p.id === prevProyId && p._count)
                  return { ...p, _count: { archivos: Math.max(0, p._count.archivos - 1) } }
                if (p.id === updated.proyecto_id && p._count)
                  return { ...p, _count: { archivos: p._count.archivos + 1 } }
                return p
              }))
            }
            toast('success', message)
          }}
          onError={(message) => toast('error', message)}
        />
      )}

      {confirmDel && (
        <ConfirmDialog
          title={confirmDel.kind === 'archivo' ? 'Eliminar archivo' : 'Eliminar proyecto'}
          message={
            confirmDel.kind === 'archivo'
              ? `¿Eliminar "${(confirmDel.target as Archivo).nombre_archivo}"? El archivo cifrado se purgará del disco. Esta acción no se puede deshacer.`
              : `¿Eliminar el proyecto "${(confirmDel.target as Proyecto).nombre_proyecto}"? Se eliminarán también todos sus archivos. Esta acción no se puede deshacer.`
          }
          confirmLabel="Eliminar"
          loading={deleting}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </>
  )
}
