import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSessionFromCookies } from '@/lib/auth'

// ─── GET: catálogo de niveles de clasificación (para selects de formularios) ──
export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })

  // Un usuario sólo ve (y puede asignar) niveles hasta su propia acreditación.
  const niveles = await prisma.clasificacionSeguridad.findMany({
    where: { nivel_numerico: { lte: session.nivel } },
    orderBy: { nivel_numerico: 'asc' },
    select: { id: true, nombre: true, nivel_numerico: true, descripcion: true },
  })

  return NextResponse.json({ ok: true, data: niveles })
}
