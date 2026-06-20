import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, hashPassword, NIVEL_ROL } from '@/lib/auth'
import { registrarEvento, extraerOrigen } from '@/lib/audit'

const createSchema = z.object({
  nombre_usuario:         z.string().min(3).max(120),
  password:               z.string().min(8, 'Mínimo 8 caracteres'),
  rol_id:                 z.string().min(1),
  nivel_clasificacion_id: z.string().min(1),
})

// ─── GET: listar usuarios (sólo Admin) ────────────────────────────────────────
export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.ADMIN) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const usuarios = await prisma.usuario.findMany({
    where: { activo: true },
    orderBy: { fecha_creacion: 'desc' },
    select: {
      id: true, nombre_usuario: true, activo: true, fecha_creacion: true,
      rol:                 { select: { id: true, nombre_rol: true, nivel_numerico: true } },
      nivel_clasificacion: { select: { id: true, nombre: true, nivel_numerico: true } },
    },
  })

  return NextResponse.json({
    ok: true,
    data: usuarios.map((u) => ({ ...u, fecha_creacion: u.fecha_creacion.toISOString() })),
  })
}

// ─── POST: crear usuario (sólo Admin) ─────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.ADMIN) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const parsed = createSchema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Datos inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { nombre_usuario, password, rol_id, nivel_clasificacion_id } = parsed.data

  const exists = await prisma.usuario.findUnique({ where: { nombre_usuario } })
  if (exists) return NextResponse.json({ ok: false, error: 'El nombre de usuario ya existe' }, { status: 409 })

  const usuario = await prisma.usuario.create({
    data: {
      nombre_usuario,
      password_hash: await hashPassword(password),
      rol_id,
      nivel_clasificacion_id,
    },
    select: {
      id: true, nombre_usuario: true, activo: true, fecha_creacion: true,
      rol:                 { select: { id: true, nombre_rol: true, nivel_numerico: true } },
      nivel_clasificacion: { select: { id: true, nombre: true, nivel_numerico: true } },
    },
  })

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'CREATE_USER',
    detalle: `Creó al usuario "${nombre_usuario}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json(
    { ok: true, data: { ...usuario, fecha_creacion: usuario.fecha_creacion.toISOString() } },
    { status: 201 },
  )
}
