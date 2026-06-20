'use client'

import { useState, useEffect, useCallback } from 'react'
import Header from '@/components/layout/Header'
import UsersTable from '@/components/usuarios/UsersTable'
import UserModal from '@/components/usuarios/UserModal'
import { Plus, Users } from 'lucide-react'
import type { Usuario, Rol, ClasificacionSeguridad } from '@/types'

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [roles, setRoles] = useState<Pick<Rol, 'id' | 'nombre_rol' | 'nivel_numerico'>[]>([])
  const [niveles, setNiveles] = useState<Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Usuario | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    const [ur, rr, cr] = await Promise.all([
      fetch('/api/usuarios'),
      fetch('/api/roles'),
      fetch('/api/clasificaciones'),
    ])
    const [uj, rj, cj] = await Promise.all([ur.json(), rr.json(), cr.json()])
    if (uj.ok) setUsuarios(uj.data)
    if (rj.ok) setRoles(rj.data)
    if (cj.ok) setNiveles(cj.data)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  async function handleSave(data: Record<string, unknown>) {
    const url = editing ? `/api/usuarios/${editing.id}` : '/api/usuarios'
    const method = editing ? 'PATCH' : 'POST'
    const payload = { ...data }
    if (editing && !payload.password) delete payload.password

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) { setShowModal(false); setEditing(null); loadAll() }
    else { const e = await res.json(); alert(e.error ?? 'Error') }
  }

  async function handleToggle(u: Usuario) {
    await fetch(`/api/usuarios/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: !u.activo }),
    })
    loadAll()
  }

  async function handleDelete(u: Usuario) {
    if (!confirm(`¿Eliminar al usuario "${u.nombre_usuario}"? Quedará desactivado y no podrá iniciar sesión.`)) return
    const res = await fetch(`/api/usuarios/${u.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const e = await res.json().catch(() => ({}))
      alert(e.error ?? 'Error al eliminar el usuario')
    } else {
      loadAll()
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header
        title="Gestión de Usuarios"
        subtitle="Administrar accesos, roles y acreditaciones"
        icon={<Users />}
        actions={
          <button onClick={() => { setEditing(null); setShowModal(true) }} className="btn-primary gap-1.5">
            <Plus className="w-4 h-4" /> Crear usuario
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400">Cargando usuarios...</div>
        ) : (
          <UsersTable
            usuarios={usuarios}
            onEdit={(u) => { setEditing(u); setShowModal(true) }}
            onToggle={handleToggle}
            onDelete={handleDelete}
          />
        )}
      </main>

      {showModal && (
        <UserModal
          usuario={editing}
          roles={roles}
          niveles={niveles}
          onClose={() => { setShowModal(false); setEditing(null) }}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
