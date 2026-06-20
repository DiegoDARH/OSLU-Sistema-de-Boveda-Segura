'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Upload, File, AlertCircle, CheckCircle } from 'lucide-react'
import { formatBytes } from '@/lib/utils'
import type { Proyecto, ClasificacionSeguridad } from '@/types'

const ALLOWED_EXTS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'mp4', 'zip', 'rar']
const MAX_MB = 50

interface UploadModalProps {
  proyectos: Proyecto[]
  onClose:   () => void
  onSuccess: () => void
}

interface FileItem {
  file:     File
  status:   'pending' | 'uploading' | 'done' | 'error'
  error?:   string
}

export default function UploadModal({ proyectos, onClose, onSuccess }: UploadModalProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [files,     setFiles]     = useState<FileItem[]>([])
  const [proyId,    setProyId]    = useState('')
  const [niveles,   setNiveles]   = useState<Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>[]>([])
  const [nivelId,   setNivelId]   = useState('')
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)

  // Errores generados en cliente que no se pueden corregir cambiando proyecto/nivel.
  const isClientError = (err?: string) =>
    !!err && (err.includes('no permitida') || err.includes('Excede'))

  function resetServerErrors() {
    setFiles((prev) => prev.map((f) =>
      f.status === 'error' && !isClientError(f.error)
        ? { ...f, status: 'pending', error: undefined }
        : f,
    ))
  }

  const proyectoSeleccionado = proyectos.find((p) => p.id === proyId)
  const nivelMinProy = proyectoSeleccionado?.nivel_clasificacion_minimo?.nivel_numerico ?? 0
  const nivelSelNum  = niveles.find((n) => n.id === nivelId)?.nivel_numerico ?? 0
  const nivelInvalido = nivelSelNum > 0 && nivelSelNum < nivelMinProy

  // Cargar los niveles de clasificación que el usuario puede asignar.
  useEffect(() => {
    fetch('/api/clasificaciones')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setNiveles(j.data)
        }
      })
      .catch(() => {})
  }, [])

  const addFiles = useCallback((raw: FileList | File[]) => {
    const arr = Array.from(raw).map<FileItem>((f) => {
      const ext = f.name.split('.').pop()?.toLowerCase() ?? ''
      if (!ALLOWED_EXTS.includes(ext)) return { file: f, status: 'error', error: `Extensión .${ext} no permitida` }
      if (f.size > MAX_MB * 1024 * 1024) return { file: f, status: 'error', error: `Excede ${MAX_MB}MB` }
      return { file: f, status: 'pending' }
    })
    setFiles((prev) => [...prev, ...arr])
  }, [])

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  async function handleUpload() {
    const pending = files.filter((f) => f.status === 'pending')
    if (!pending.length || !proyId || !nivelId) return
    setUploading(true)
    let successCount = 0

    for (const item of pending) {
      setFiles((prev) => prev.map((f) => (f.file === item.file ? { ...f, status: 'uploading' } : f)))

      const form = new FormData()
      form.append('file', item.file)
      form.append('proyectoId', proyId)
      form.append('nivelClasificacionId', nivelId)

      try {
        const res = await fetch('/api/archivos', { method: 'POST', body: form })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error ?? 'Error al subir')
        }
        setFiles((prev) => prev.map((f) => (f.file === item.file ? { ...f, status: 'done' } : f)))
        successCount++
      } catch (e) {
        setFiles((prev) => prev.map((f) => (f.file === item.file ? { ...f, status: 'error', error: (e as Error).message } : f)))
      }
    }

    setUploading(false)
    // Solo cerrar y notificar si al menos un archivo fue subido con éxito.
    // Si todos fallaron el modal se mantiene abierto para que el usuario corrija.
    if (successCount > 0) {
      setTimeout(() => { onSuccess(); onClose() }, 800)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-card rounded-2xl shadow-modal w-full max-w-lg animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-slate-900">Subir Archivos</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInput.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragging ? 'border-brand-500 bg-brand-50' : 'border-surface-border hover:border-brand-400 hover:bg-brand-50/50'
            }`}
          >
            <Upload className={`w-8 h-8 mx-auto mb-2 ${dragging ? 'text-brand-500' : 'text-slate-400'}`} />
            <p className="text-sm font-medium text-slate-700">Arrastra archivos aquí o haz clic para seleccionar</p>
            <p className="text-xs text-slate-400 mt-1">
              Se cifran con AES-256 al subir · máx. {MAX_MB}MB
            </p>
            <input
              ref={fileInput}
              type="file"
              multiple
              accept={ALLOWED_EXTS.map((e) => `.${e}`).join(',')}
              className="hidden"
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {files.length > 0 && (
            <ul className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {files.map((item, idx) => (
                <li key={idx} className="flex items-center gap-3 text-sm">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    item.status === 'done' ? 'bg-status-active-bg text-status-active' :
                    item.status === 'error' ? 'bg-status-danger-bg text-status-danger' :
                    item.status === 'uploading' ? 'bg-brand-50 text-brand-500' :
                    'bg-surface-hover text-slate-500'
                  }`}>
                    {item.status === 'done' ? <CheckCircle className="w-3.5 h-3.5" /> :
                     item.status === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> :
                     <File className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium text-slate-700">{item.file.name}</p>
                    <p className="text-[11px] text-slate-400">{formatBytes(item.file.size)}</p>
                    {item.error && <p className="text-[11px] text-status-danger">{item.error}</p>}
                  </div>
                  <button onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-slate-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Proyecto</label>
              <select value={proyId} onChange={(e) => { setProyId(e.target.value); resetServerErrors() }} className="input py-1.5">
                {proyectos.length === 0
                  ? <option value="">Sin proyectos disponibles</option>
                  : <option value="" disabled>Selecciona un proyecto</option>}
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre_proyecto}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nivel de clasificación</label>
              <select value={nivelId} onChange={(e) => { setNivelId(e.target.value); resetServerErrors() }} className={`input py-1.5 ${nivelInvalido ? 'border-red-400 focus:ring-red-400' : ''}`}>
                <option value="" disabled>Selecciona un nivel</option>
                {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
              {nivelInvalido && (
                <p className="text-[11px] text-red-500 mt-1">
                  Mínimo requerido: {proyectoSeleccionado?.nivel_clasificacion_minimo?.nombre}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={handleUpload}
            disabled={uploading || !proyId || !nivelId || nivelInvalido || files.filter((f) => f.status === 'pending').length === 0}
            className="btn-primary"
          >
            {uploading ? 'Cifrando y subiendo...' : `Subir ${files.filter((f) => f.status === 'pending').length} archivo(s)`}
          </button>
        </div>
      </div>
    </div>
  )
}
