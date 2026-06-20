import { NextResponse } from 'next/server'
import { getSessionFromCookies, NIVEL_ROL } from '@/lib/auth'
import { verifyChain } from '@/lib/audit'

// ─── GET: verificar la integridad de la cadena de auditoría (mínimo Gestor) ───
// Recorre toda la bitácora y confirma que ninguna entrada fue alterada ni borrada.
export async function GET() {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  if (session.rol_nivel < NIVEL_ROL.GESTOR) {
    return NextResponse.json({ ok: false, error: 'Sin permisos' }, { status: 403 })
  }

  const resultado = await verifyChain()
  return NextResponse.json({ ok: true, data: resultado })
}
