import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, hashPassword, NIVEL_ROL } from '@/lib/auth'
import { registrarEvento, extraerOrigen } from '@/lib/audit'

const patchSchema = z.object({
  nombre_usuario:         z.string().min(3).max(120).optional(),
  password:               z.string().min(8).optional(),
  rol_id:                 z.string().optional(),
  nivel_clasificacion_id: z.string().optional(),
  activo:                 z.boolean().optional(),
})

// ─── PATCH: editar usuario (sólo Admin) ───────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.ADMIN) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  const parsed = patchSchema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })

  const { password, ...rest } = parsed.data
  const usuario = await prisma.usuario.update({
    where: { id },
    data: {
      ...rest,
      ...(password && { password_hash: await hashPassword(password) }),
    },
    select: {
      id: true, nombre_usuario: true, activo: true, fecha_creacion: true,
      rol:                 { select: { id: true, nombre_rol: true, nivel_numerico: true } },
      nivel_clasificacion: { select: { id: true, nombre: true, nivel_numerico: true } },
    },
  })

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'EDIT_USER',
    detalle: `Editó al usuario "${usuario.nombre_usuario}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json({ ok: true, data: { ...usuario, fecha_creacion: usuario.fecha_creacion.toISOString() } })
}

// ─── DELETE: eliminar usuario (sólo Admin) ────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.ADMIN) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const { id } = await params
  if (id === session.sub) {
    return NextResponse.json({ ok: false, error: 'No puede eliminarse a sí mismo' }, { status: 400 })
  }

  // Buscar primero para dar un mensaje claro si no existe
  const target = await prisma.usuario.findUnique({ where: { id }, select: { nombre_usuario: true } })
  if (!target) return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 })

  try {
    await prisma.usuario.delete({ where: { id } })
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code
    if (code === 'P2003' || code === 'P2014') {
      return NextResponse.json(
        { ok: false, error: 'No se puede eliminar: el usuario tiene archivos u otras referencias activas. Elimine primero sus recursos.' },
        { status: 409 },
      )
    }
    throw e
  }

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'DELETE_USER',
    detalle: `Eliminó al usuario "${target.nombre_usuario}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json({ ok: true })
}
