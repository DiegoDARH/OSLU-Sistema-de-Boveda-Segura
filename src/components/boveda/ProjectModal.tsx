'use client'

import { useState, useEffect } from 'react'
import { X, FolderPlus } from 'lucide-react'
import type { Proyecto, ClasificacionSeguridad } from '@/types'

interface ProjectModalProps {
  proyecto?: Proyecto | null            // si viene, es edición
  onClose:   () => void
  onSaved:   (kind: 'success' | 'error', message: string) => void
}

/**
 * Modal de creación/edición de proyectos (compartimentos).
 * El nivel mínimo de clasificación se elige entre los niveles que el usuario
 * puede acreditar (devueltos por /api/clasificaciones).
 */
export default function ProjectModal({ proyecto, onClose, onSaved }: ProjectModalProps) {
  const isEdit = !!proyecto
  const [nombre, setNombre] = useState(proyecto?.nombre_proyecto ?? '')
  const [descripcion, setDescripcion] = useState(proyecto?.descripcion ?? '')
  const [nivelId, setNivelId] = useState(proyecto?.nivel_clasificacion_minimo_id ?? '')
  const [niveles, setNiveles] = useState<Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/clasificaciones')
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) {
          setNiveles(j.data)
        }
      })
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleSubmit() {
    if (nombre.trim().length < 2) { setError('El nombre debe tener al menos 2 caracteres'); return }
    if (!nivelId) { setError('Seleccione un nivel mínimo'); return }
    setSaving(true)
    setError(null)

    const url = isEdit ? `/api/proyectos/${proyecto!.id}` : '/api/proyectos'
    const method = isEdit ? 'PATCH' : 'POST'
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_proyecto: nombre.trim(),
          descripcion: descripcion.trim() || undefined,
          nivel_clasificacion_minimo_id: nivelId,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error al guardar')
      onSaved('success', isEdit ? 'Proyecto actualizado' : `Proyecto "${nombre.trim()}" creado`)
      onClose()
    } catch (e) {
      setError((e as Error).message)
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
            <FolderPlus className="w-5 h-5 text-brand-500" />
            <h2 className="font-semibold text-slate-900">{isEdit ? 'Editar proyecto' : 'Crear proyecto'}</h2>
          </div>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre del proyecto</label>
            <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="input" placeholder="Operación Centinela" autoFocus />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción <span className="text-slate-400 font-normal">(opcional)</span></label>
            <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} className="input min-h-[72px] resize-none" placeholder="Propósito del compartimento..." />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nivel mínimo de clasificación</label>
            <select value={nivelId} onChange={(e) => setNivelId(e.target.value)} className="input">
              <option value="" disabled>Selecciona un nivel</option>
              {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            <p className="text-xs text-slate-400 mt-1">Sólo usuarios con esta acreditación o superior podrán participar.</p>
          </div>

          {error && <p className="text-xs text-status-danger">{error}</p>}
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-surface-border">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary">
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
}
