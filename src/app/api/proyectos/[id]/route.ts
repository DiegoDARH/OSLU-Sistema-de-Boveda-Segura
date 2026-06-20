import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { registrarEvento, extraerOrigen } from '@/lib/audit'

const patchSchema = z.object({
  nombre_proyecto:               z.string().min(2).max(150).optional(),
  descripcion:                   z.string().optional(),
  nivel_clasificacion_minimo_id: z.string().optional(),
})

// ─── PATCH: editar proyecto (mínimo Gestor) ───────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })

  const proyecto = await prisma.proyecto.update({
    where: { id },
    data: parsed.data,
    include: {
      nivel_clasificacion_minimo: { select: { id: true, nombre: true, nivel_numerico: true } },
      _count: { select: { archivos: { where: { estado: 'ACTIVO' } } } },
    },
  })

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'EDIT_PROJECT',
    detalle: `Editó el proyecto "${proyecto.nombre_proyecto}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json({ ok: true, data: { ...proyecto, fecha_creacion: proyecto.fecha_creacion.toISOString() } })
}

// ─── DELETE: eliminar proyecto (mínimo Gestor) ────────────────────────────────
// Purga todos sus archivos del disco, los borra de BD y luego elimina el proyecto.
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const proyecto = await prisma.proyecto.findUnique({
    where: { id },
    include: { archivos: { select: { id: true, nombre_archivo: true, ruta_cifrada: true } } },
  })
  if (!proyecto) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })

  // Purgar archivos cifrados del disco (best-effort; pueden no existir ya).
  await Promise.all(
    proyecto.archivos.map((a) =>
      unlink(join(process.cwd(), a.ruta_cifrada)).catch(() => {}),
    ),
  )

  // Borrar archivos y proyecto en una transacción. GestionClave cascada desde Archivo.
  // NecesidadSaber cascada desde Proyecto.
  try {
    await prisma.$transaction([
      prisma.archivo.deleteMany({ where: { proyecto_id: id } }),
      prisma.proyecto.delete({ where: { id } }),
    ])
  } catch {
    return NextResponse.json({ ok: false, error: 'No se pudo eliminar el proyecto.' }, { status: 500 })
  }

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'DELETE_PROJECT',
    detalle: `Eliminó el proyecto "${proyecto.nombre_proyecto}" junto con ${proyecto.archivos.length} archivo(s)`,
    ...extraerOrigen(req),
  })

  return NextResponse.json({ ok: true, data: { archivosEliminados: proyecto.archivos.length } })
}
