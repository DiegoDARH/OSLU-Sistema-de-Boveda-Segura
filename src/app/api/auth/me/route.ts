import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  const usuario = await prisma.usuario.findUnique({
    where: { id: session.sub },
    select: {
      id: true, nombre_usuario: true, activo: true,
      rol:                 { select: { nombre_rol: true, nivel_numerico: true } },
      nivel_clasificacion: { select: { nombre: true, nivel_numerico: true } },
    },
  })

  if (!usuario || !usuario.activo) {
    return NextResponse.json({ ok: false, error: 'Usuario no encontrado' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    data: {
      id:             usuario.id,
      nombre_usuario: usuario.nombre_usuario,
      rol:            usuario.rol.nombre_rol,
      rol_nivel:      usuario.rol.nivel_numerico,
      nivel:          usuario.nivel_clasificacion.nivel_numerico,
      nivel_nombre:   usuario.nivel_clasificacion.nombre,
    },
  })
}
