import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { proyectosVisibles } from '@/lib/access'
import { registrarEvento, extraerOrigen } from '@/lib/audit'

const schema = z.object({
  nombre_proyecto:               z.string().min(2).max(150),
  descripcion:                   z.string().optional(),
  nivel_clasificacion_minimo_id: z.string().min(1),
})

// ─── GET: proyectos visibles según need-to-know del usuario ───────────────────
export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  const visibles = await proyectosVisibles(session.sub)

  const proyectos = await prisma.proyecto.findMany({
    where: { id: { in: visibles } },
    orderBy: { nombre_proyecto: 'asc' },
    include: {
      nivel_clasificacion_minimo: { select: { id: true, nombre: true, nivel_numerico: true } },
      _count: { select: { archivos: { where: { estado: 'ACTIVO' } } } },
    },
  })

  return NextResponse.json({
    ok: true,
    data: proyectos.map((p) => ({ ...p, fecha_creacion: p.fecha_creacion.toISOString() })),
  })
}

// ─── POST: crear proyecto (mínimo Gestor) ─────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Datos inválidos' }, { status: 400 })

  const proyecto = await prisma.proyecto.create({
    data: parsed.data,
    include: {
      nivel_clasificacion_minimo: { select: { id: true, nombre: true, nivel_numerico: true } },
      _count: { select: { archivos: { where: { estado: 'ACTIVO' } } } },
    },
  })

  // Quien crea el proyecto queda autorizado en él (necesidad de saber).
  await prisma.necesidadSaber.create({
    data: { usuario_id: session.sub, proyecto_id: proyecto.id, autorizado_por: session.sub },
  })

  await registrarEvento({
    usuarioId: session.sub,
    evento: 'CREATE_PROJECT',
    detalle: `Creó el proyecto "${proyecto.nombre_proyecto}"`,
    ...extraerOrigen(req),
  })

  return NextResponse.json(
    { ok: true, data: { ...proyecto, fecha_creacion: proyecto.fecha_creacion.toISOString() } },
    { status: 201 },
  )
}
