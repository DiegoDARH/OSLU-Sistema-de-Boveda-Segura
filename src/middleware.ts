/**
 * Middleware de Next.js — Edge Runtime
 *
 * NO puede importar `jsonwebtoken`, `bcryptjs` ni `next/headers`:
 * esos usan APIs de Node.js que no existen en Edge Runtime.
 * JWT se verifica aquí usando la Web Crypto API nativa (disponible en Edge).
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─── Constantes ───────────────────────────────────────────────────────────────
// Importar desde constants.ts (sin deps Node.js) — seguro en Edge Runtime
import { TOKEN_COOKIE } from '@/lib/constants'
export { TOKEN_COOKIE }

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/mfa']
const ADMIN_ROUTES  = ['/usuarios', '/api/usuarios']

// Archivos estáticos servidos desde public/ (logo, imágenes, fuentes, etc.).
// Se sirven en la raíz (p. ej. /LOGO.png), por lo que hay que dejarlos pasar
// explícitamente o el middleware los redirige al login.
const PUBLIC_FILE = /\.(png|jpe?g|gif|svg|ico|webp|avif|css|js|woff2?|ttf|otf|map)$/i

// Niveles de rol (deben coincidir con NIVEL_ROL en auth.ts / el seed).
const NIVEL_ADMIN  = 3
const NIVEL_GESTOR = 2

// ─── JWT via Web Crypto API (HS256, Edge-compatible) ─────────────────────────
// Devolvemos un ArrayBuffer "fresco" (no SharedArrayBuffer) para satisfacer el
// tipo BufferSource que exige crypto.subtle en las libs recientes de TypeScript.
function b64uDecode(str: string): ArrayBuffer {
  str = str.replace(/-/g, '+').replace(/_/g, '/')
  const pad = str.length % 4
  if (pad === 2) str += '=='
  if (pad === 3) str += '='
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function verifyJWT(token: string, secret: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [h, p, s] = parts

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const data    = new TextEncoder().encode(`${h}.${p}`)
    const sigBytes = b64uDecode(s)
    const valid   = await crypto.subtle.verify('HMAC', key, sigBytes, data)
    if (!valid) return null

    const payload = JSON.parse(new TextDecoder().decode(b64uDecode(p)))

    if (payload.exp && Math.floor(Date.now() / 1_000) > payload.exp) return null

    return payload as {
      sub: string
      usuario: string
      rol: string
      rol_nivel: number
      nivel: number
    }
  } catch {
    return null
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const secret = process.env.JWT_SECRET ?? 'dev-secret-change-me'

  // Assets y rutas públicas — pasar sin verificar
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.startsWith('/uploads') ||
    pathname.startsWith('/models') ||   // modelos de face-api.js (login facial)
    PUBLIC_FILE.test(pathname) ||       // assets estáticos de public/ (logo, imágenes…)
    PUBLIC_ROUTES.some(r => pathname.startsWith(r))
  ) {
    return NextResponse.next()
  }

  const token   = request.cookies.get(TOKEN_COOKIE)?.value
  const payload = token ? await verifyJWT(token, secret) : null

  // Sin sesión válida
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'No autorizado' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Rutas sólo para ADMIN (por nivel de rol, no por nombre)
  if (ADMIN_ROUTES.some(r => pathname.startsWith(r)) && payload.rol_nivel < NIVEL_ADMIN) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })
    }
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Eliminar archivos: mínimo GESTOR
  if (
    pathname.startsWith('/api/archivos') &&
    request.method === 'DELETE' &&
    payload.rol_nivel < NIVEL_GESTOR
  ) {
    return NextResponse.json({ ok: false, error: 'Acceso denegado' }, { status: 403 })
  }

  // Inyectar identidad en headers para los route handlers (evita re-verificar el JWT)
  const headers = new Headers(request.headers)
  headers.set('x-user-id',        payload.sub)
  headers.set('x-user-name',      payload.usuario)
  headers.set('x-user-role',      payload.rol)
  headers.set('x-user-role-nivel', String(payload.rol_nivel))
  headers.set('x-user-nivel',     String(payload.nivel))

  return NextResponse.next({ request: { headers } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|uploads).*)'],
}
