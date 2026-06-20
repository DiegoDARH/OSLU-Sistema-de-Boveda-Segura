'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X } from 'lucide-react'
import type { Usuario, Rol, ClasificacionSeguridad } from '@/types'

const createSchema = z.object({
  nombre_usuario:         z.string().min(3, 'Mínimo 3 caracteres'),
  password:               z.string().min(8, 'Mínimo 8 caracteres'),
  rol_id:                 z.string().min(1, 'Seleccione un rol'),
  nivel_clasificacion_id: z.string().min(1, 'Seleccione una acreditación'),
})

const editSchema = createSchema.extend({
  password: z.string().min(8).optional().or(z.literal('')),
})

type FormData = z.infer<typeof editSchema>

interface UserModalProps {
  usuario?: Usuario | null
  roles:    Pick<Rol, 'id' | 'nombre_rol' | 'nivel_numerico'>[]
  niveles:  Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>[]
  onClose:  () => void
  onSave:   (data: Record<string, unknown>) => Promise<void>
}

export default function UserModal({ usuario, roles, niveles, onClose, onSave }: UserModalProps) {
  const isEdit = !!usuario

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: usuario
      ? { nombre_usuario: usuario.nombre_usuario, rol_id: usuario.rol_id, nivel_clasificacion_id: usuario.nivel_clasificacion_id, password: '' }
      : { rol_id: roles[0]?.id ?? '', nivel_clasificacion_id: niveles[0]?.id ?? '' },
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-card rounded-2xl shadow-modal w-full max-w-md animate-slide-up">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border">
          <h2 className="font-semibold text-slate-900">{isEdit ? 'Editar usuario' : 'Crear usuario'}</h2>
          <button onClick={onClose} className="btn-ghost w-8 h-8 p-0 rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre de usuario</label>
            <input {...register('nombre_usuario')} className={`input ${errors.nombre_usuario ? 'input-error' : ''}`} placeholder="jperez" autoComplete="off" />
            {errors.nombre_usuario && <p className="mt-1 text-xs text-status-danger">{errors.nombre_usuario.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña {isEdit && <span className="text-slate-400 font-normal">(dejar vacío para no cambiar)</span>}
            </label>
            <input {...register('password')} type="password" className={`input ${errors.password ? 'input-error' : ''}`} placeholder="••••••••" autoComplete="new-password" />
            {errors.password && <p className="mt-1 text-xs text-status-danger">{errors.password.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol</label>
            <select {...register('rol_id')} className="input">
              {roles.map((r) => <option key={r.id} value={r.id}>{r.nombre_rol}</option>)}
            </select>
            {errors.rol_id && <p className="mt-1 text-xs text-status-danger">{errors.rol_id.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Acreditación (nivel de clasificación)</label>
            <select {...register('nivel_clasificacion_id')} className="input">
              {niveles.map((n) => <option key={n.id} value={n.id}>{n.nombre}</option>)}
            </select>
            {errors.nivel_clasificacion_id && <p className="mt-1 text-xs text-status-danger">{errors.nivel_clasificacion_id.message}</p>}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
