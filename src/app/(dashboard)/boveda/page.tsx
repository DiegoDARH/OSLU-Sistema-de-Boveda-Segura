import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { proyectosVisibles } from '@/lib/access'
import { redirect } from 'next/navigation'
import Header from '@/components/layout/Header'
import BovedaView from '@/components/boveda/BovedaView'
import { FolderLock } from 'lucide-react'
import type { Archivo, Proyecto } from '@/types'

export const metadata = { title: 'Bóveda' }

export default async function BovedaPage() {
  const session = await getSessionFromCookies()
  if (!session) redirect('/login')

  // Need-to-Know: sólo proyectos visibles para el usuario.
  const visibles = await proyectosVisibles(session.sub)

  const archivoWhere = {
    estado: 'ACTIVO' as const,
    proyecto_id: { in: visibles },
    nivel_clasificacion: { nivel_numerico: { lte: session.nivel } },
  }

  const [rawArchivos, rawProyectos] = await Promise.all([
    prisma.archivo.findMany({
      where: archivoWhere,
      orderBy: { fecha_subida: 'desc' },
      select: {
        id: true, nombre_archivo: true, hash_original: true, tamanio: true,
        mime_type: true, descripcion: true, estado: true, fecha_subida: true,
        usuario_id: true, nivel_clasificacion_id: true, proyecto_id: true,
        usuario:             { select: { id: true, nombre_usuario: true } },
        nivel_clasificacion: { select: { id: true, nombre: true, nivel_numerico: true } },
        proyecto:            { select: { id: true, nombre_proyecto: true } },
      },
    }),
    prisma.proyecto.findMany({
      where: { id: { in: visibles } },
      orderBy: { nombre_proyecto: 'asc' },
      include: {
        nivel_clasificacion_minimo: { select: { id: true, nombre: true, nivel_numerico: true } },
        _count: { select: { archivos: { where: { estado: 'ACTIVO' } } } },
      },
    }),
  ])

  const archivos: Archivo[] = rawArchivos.map((a) => ({
    ...a,
    mime_type: a.mime_type ?? null,
    descripcion: a.descripcion ?? null,
    fecha_subida: a.fecha_subida.toISOString(),
  }))

  const proyectos: Proyecto[] = rawProyectos.map((p) => ({
    ...p,
    descripcion: p.descripcion ?? null,
    fecha_creacion: p.fecha_creacion.toISOString(),
  }))

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <Header title="Bóveda" subtitle="Repositorio seguro y cifrado" icon={<FolderLock />} />
      <BovedaView
        initialArchivos={archivos}
        initialProyectos={proyectos}
        canUpload={session.rol_nivel >= NIVEL_ROL.GESTOR}
      />
    </div>
  )
}
