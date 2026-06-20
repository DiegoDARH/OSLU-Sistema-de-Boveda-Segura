import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'

// ─── GET: catálogo de roles (para el formulario de usuarios, sólo Admin) ──────
export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.ADMIN) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const roles = await prisma.rol.findMany({
    orderBy: { nivel_numerico: 'desc' },
    select: { id: true, nombre_rol: true, nivel_numerico: true, descripcion: true },
  })

  return NextResponse.json({ ok: true, data: roles })
}
