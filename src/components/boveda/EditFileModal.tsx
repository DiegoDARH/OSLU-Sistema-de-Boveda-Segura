'use client'

import { useState, useEffect } from 'react'
import { X, FilePenLine } from 'lucide-react'
import type { Archivo, Proyecto, ClasificacionSeguridad } from '@/types'

interface EditFileModalProps {
  archivo:   Archivo
  proyectos: Proyecto[]
  onClose:   () => void
  onSaved:   (updated: Archivo, message: string) => void
  onError:   (message: string) => void
}

/**
 * Modal de edición de metadatos de un archivo: nombre, proyecto, clasificación
 * y descripción. Reemplaza el antiguo prompt() de renombrado.
 */
export default function EditFileModal({ archivo, proyectos, onClose, onSaved, onError }: EditFileModalProps) {
  const [nombre, setNombre] = useState(archivo.nombre_archivo)
  const [proyectoId, setProyectoId] = useState(archivo.proyecto_id)
  const [nivelId, setNivelId] = useState(archivo.nivel_clasificacion_id)
  const [descripcion, setDescripcion] = useState(archivo.descripcion ?? '')
  const [niveles, setNiveles] = useState<Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>[]>([])
  const [saving, setSaving] = useState(false)

  const proyectoSeleccionado = proyectos.find((p) => p.id === proyectoId)
  const nivelMinProy = proyectoSeleccionado?.nivel_clasificacion_minimo?.nivel_numerico ?? 0
  const nivelArchivoNum = niveles.find((n) => n.id === nivelId)?.nivel_numerico ?? 0
  const nivelInvalido = nivelArchivoNum > 0 && nivelArchivoNum < nivelMinProy

  useEffect(() => {
    fetch('/api/clasificaciones')
      .then((r) => r.json())
      .then((j) => { if (j.ok) setNiveles(j.data) })
      .catch(() => {})
  }, [])

  async function handleSubmit() {
    if (nombre.trim().length < 1) return
    setSaving(true)
    try {
      const res = await fetch(`/api/archivos/${archivo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_archivo: nombre.trim(),
          proyecto_id: proyectoId,
          nivel_clasificacion_id: nivelId,
          descripcion: descripcion.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')

      const proy = proyectos.find((p) => p.id === proyectoId)
      const niv = niveles.find((n) => n.id === nivelId)
      onSaved(
        {
          ...archivo,
          nombre_archivo: nombre.trim(),
          proyecto_id: proyectoId,
          nivel_clasificacion_id: nivelId,
          descripcion: descripcion.trim() || null,
          proyecto: proy ? { id: proy.id, nombre_proyecto: proy.nombre_proyecto } : archivo.proyecto,
          nivel_clasificacion: niv ? { id: niv.id, nombre: niv.nombre, nivel_numerico: niv.nivel_numerico } : archivo.nivel_clasificacion,
        },
        'Archivo actualizado',
      )
      onClose()
    } catch (e) {
      onError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-surface-card rounded-2xl shadow-modal w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <div className="flex items-center gap-2">
            <FilePenLine className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-slate-900">Editar archivo</h2>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del archivo</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" autoFocus />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Proyecto</label>
              <select value={proyectoId} onChange={(e) => setProyectoId(e.target.value)} className="input py-1.5">
                {proyectos.map((p) => <option key={p.id} value={p.id}>{p.nombre_proyecto}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Clasificación</label>
              <select value={nivelId} onChange={(e) => setNivelId(e.target.value)} className={`input py-1.5 ${nivelInvalido ? 'border-red-400 focus:ring-red-400' : ''}`}>
                {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
              </select>
              {nivelInvalido && (
                <p className="text-[11px] text-red-500 mt-1">
                  El nivel es inferior al mínimo del proyecto ({proyectoSeleccionado?.nivel_clasificacion_minimo?.nombre})
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input min-h-[72px] resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || nivelInvalido} className="btn-primary">
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
