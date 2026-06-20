import { NextRequest, NextResponse } from 'next/server'
import { TOKEN_COOKIE, getSessionFromCookies } from '@/lib/auth'
import { registrarEvento, extraerOrigen } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await getSessionFromCookies()
  if (session) {
    await registrarEvento({
      usuarioId: session.sub,
      evento: 'LOGOUT',
      detalle: 'Cierre de sesión',
      ...extraerOrigen(req),
    })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(TOKEN_COOKIE, '', { maxAge: 0, path: '/' })
  return res
}
