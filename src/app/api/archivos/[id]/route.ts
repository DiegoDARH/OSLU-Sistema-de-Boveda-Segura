import { NextRequest, NextResponse } from 'next/server'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { puedeAccederArchivo } from '@/lib/access'
import { registrarEvento, extraerOrigen } from '@/lib/audit'

// ─── GET: metadatos de un archivo (sin contenido) ─────────────────────────────
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  const { id } = await params
  const acceso = await puedeAccederArchivo(session.sub, id)
  if (!acceso.permitido) {
    const status = acceso.motivo === 'NO_ENCONTRADO' ? 404 : 403
    return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status })
  }

  const archivo = await prisma.archivo.findUnique({
    where: { id },
    select: {
      id: true, nombre_archivo: true, hash_original: true, tamanio: true,
      mime_type: true, descripcion: true, estado: true, fecha_subida: true,
      usuario:             { select: { id: true, nombre_usuario: true } },
      nivel_clasificacion: { select: { id: true, nombre: true, nivel_numerico: true } },
      proyecto:            { select: { id: true, nombre_proyecto: true } },
    },
  })
  if (!archivo) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })

  return NextResponse.json({ ok: true, data: { ...archivo, fecha_subida: archivo.fecha_subida.toISOString() } })
}

// ─── PATCH: actualizar metadatos (mínimo Gestor) ──────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const acceso = await puedeAccederArchivo(session.sub, id)
  if (!acceso.permitido) {
    const status = acceso.motivo === 'NO_ENCONTRADO' ? 404 : 403
    return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status })
  }

  const { nombre_archivo, descripcion, proyecto_id, nivel_clasificacion_id } = await req.json()

  // Resolver el nivel efectivo del archivo y el mínimo del proyecto destino
  // para validar Bell-LaPadula antes de persistir cualquier cambio.
  const [archivoActual, proyectoDestino] = await Promise.all([
    proyecto_id || nivel_clasificacion_id
      ? prisma.archivo.findUnique({
          where: { id },
          select: {
            proyecto_id: true,
            nivel_clasificacion: { select: { nivel_numerico: true } },
          },
        })
      : null,
    proyecto_id
      ? prisma.proyecto.findUnique({
          where: { id: proyecto_id },
          select: { nivel_clasificacion_minimo: { select: { nivel_numerico: true, nombre: true } } },
        })
      : null,
  ])

  if (archivoActual) {
    // Nivel efectivo del archivo tras el cambio (puede venir del body o del actual)
    const nivelArchivoNum = nivel_clasificacion_id
      ? (await prisma.clasificacionSeguridad.findUnique({
          where: { id: nivel_clasificacion_id },
          select: { nivel_numerico: true },
        }))?.nivel_numerico ?? 0
      : archivoActual.nivel_clasificacion?.nivel_numerico ?? 0

    // Proyecto destino efectivo (puede venir del body o del actual)
    const proyMin = proyectoDestino
      ? proyectoDestino.nivel_clasificacion_minimo
      : await prisma.proyecto.findUnique({
          where: { id: archivoActual.proyecto_id },
          select: { nivel_clasificacion_minimo: { select: { nivel_numerico: true, nombre: true } } },
        }).then((p) => p?.nivel_clasificacion_minimo)

    if (proyMin && nivelArchivoNum < proyMin.nivel_numerico) {
      return NextResponse.json(
        { ok: false, error: `El nivel es inferior al mínimo del proyecto (${proyMin.nombre})` },
        { status: 422 },
      )
    }
  }

  const updated = await prisma.archivo.update({
    where: { id },
    data: {
      ...(nombre_archivo && { nombre_archivo }),
      ...(proyecto_id && { proyecto_id }),
      ...(nivel_clasificacion_id && { nivel_clasificacion_id }),
      ...(descripcion !== undefined && { descripcion }),
    },
    select: {
      id: true, nombre_archivo: true, descripcion: true, fecha_actualizacion: true,
      nivel_clasificacion: { select: { nombre: true, nivel_numerico: true } },
      proyecto:            { select: { id: true, nombre_proyecto: true } },
    },
  })

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'EDIT',
    detalle: `Actualizó metadatos del archivo "${updated.nombre_archivo}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json({ ok: true, data: { ...updated, fecha_actualizacion: updated.fecha_actualizacion.toISOString() } })
}

// ─── DELETE: baja lógica + purga del archivo cifrado (mínimo Gestor) ───────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const acceso = await puedeAccederArchivo(session.sub, id)
  if (!acceso.permitido) {
    const status = acceso.motivo === 'NO_ENCONTRADO' ? 404 : 403
    return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status })
  }

  const archivo = await prisma.archivo.findUnique({ where: { id } })
  if (!archivo) return NextResponse.json({ ok: false, error: 'No encontrado' }, { status: 404 })

  // Purgar el archivo cifrado del disco; la fila se conserva como baja lógica
  // para preservar la trazabilidad de auditoría.
  try {
    await unlink(join(process.cwd(), archivo.ruta_cifrada))
  } catch { /* puede no existir ya */ }

  await prisma.archivo.update({ where: { id }, data: { estado: 'ELIMINADO' } })

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'DELETE',
    detalle: `Eliminó el archivo "${archivo.nombre_archivo}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json({ ok: true })
}
