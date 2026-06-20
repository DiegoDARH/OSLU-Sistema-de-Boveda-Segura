import { NextResponse } from 'next/server'
import { TOKEN_COOKIE, PREAUTH_COOKIE } from '@/lib/constants'

/**
 * Emite la cookie de sesión real (httpOnly) y descarta la cookie pre-auth.
 * Compartido por los endpoints MFA que completan el login (enroll / verify).
 */
export function issueSession(token: string): NextResponse {
  const res = NextResponse.json({ ok: true, data: { step: 'done' } })

  res.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   60 * 60 * 8, // 8 horas
    path:     '/',
  })
  // Invalidar el pre-auth: ya cumplió su función.
  res.cookies.set(PREAUTH_COOKIE, '', { maxAge: 0, path: '/' })

  return res
}
