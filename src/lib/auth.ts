/**
 * auth.ts — Autenticación y sesión (Node.js runtime únicamente).
 *
 * NO importar desde middleware (Edge Runtime es incompatible con
 * jsonwebtoken / bcryptjs / next/headers). El middleware verifica el JWT por
 * su cuenta con la Web Crypto API.
 */
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { TOKEN_COOKIE, PREAUTH_COOKIE } from '@/lib/constants'
import type { JWTPayload } from '@/types'

export { TOKEN_COOKIE, PREAUTH_COOKIE }

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-me'
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN ?? '8h'

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export function signToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES } as jwt.SignOptions)
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch {
    return null
  }
}

export async function getSessionFromCookies(): Promise<JWTPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get(TOKEN_COOKIE)?.value
  if (!token) return null
  return verifyToken(token)
}

// ─── Token pre-auth (MFA facial) ──────────────────────────────────────────────
// Identifica al usuario ENTRE el paso de contraseña y el facial. Vida corta y
// scope 'mfa': no sirve como sesión. La sesión real sólo se emite tras el rostro.
interface PreAuthPayload { sub: string; scope: 'mfa'; iat?: number; exp?: number }

export function signPreAuthToken(usuarioId: string): string {
  return jwt.sign({ sub: usuarioId, scope: 'mfa' }, JWT_SECRET, { expiresIn: '5m' })
}

export function verifyPreAuthToken(token: string): PreAuthPayload | null {
  try {
    const p = jwt.verify(token, JWT_SECRET) as PreAuthPayload
    return p.scope === 'mfa' ? p : null
  } catch {
    return null
  }
}

/**
 * Comprueba la jerarquía de roles por nivel numérico.
 * Convención: Administrador=3, Gestor=2, Analista/Lector=1.
 */
export function tieneNivelRol(nivelActual: number, nivelRequerido: number): boolean {
  return nivelActual >= nivelRequerido
}

/** Niveles de rol de referencia, para legibilidad en los handlers. */
export const NIVEL_ROL = {
  ADMIN: 3,
  GESTOR: 2,
  LECTOR: 1,
} as const
