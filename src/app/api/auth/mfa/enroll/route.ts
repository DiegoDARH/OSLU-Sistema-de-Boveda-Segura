import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { verifyPreAuthToken, signToken, PREAUTH_COOKIE } from '@/lib/auth'
import { encryptString } from '@/lib/crypto'
import { parseDescriptor } from '@/lib/face'
import { registrarEvento, extraerOrigen } from '@/lib/audit'
import { issueSession } from '@/lib/session'

/**
 * Paso 2a del login (primer ingreso): registra el rostro del usuario.
 * Sólo accesible con un token pre-auth válido (contraseña ya verificada).
 * Guarda el descriptor CIFRADO + su hash SHA-512, registra el evento MFA y,
 * como el usuario acaba de probar identidad y presencia, emite la sesión.
 */
export async function POST(req: NextRequest) {
  const origen = extraerOrigen(req)

  const preauth = req.cookies.get(PREAUTH_COOKIE)?.value
  const pre = preauth ? verifyPreAuthToken(preauth) : null
  if (!pre) {
    return NextResponse.json({ ok: false, error: 'Sesión de autenticación expirada. Reinicie el login.' }, { status: 401 })
  }

  try {
    const { descriptor } = await req.json()
    const desc = parseDescriptor(descriptor)

    const usuario = await prisma.usuario.findUnique({
      where: { id: pre.sub },
      include: {
        rol: true,
        nivel_clasificacion: true,
        biometrias: { where: { tipo_biometria: 'FACIAL' }, select: { id: true } },
      },
    })
    if (!usuario || !usuario.activo) {
      return NextResponse.json({ ok: false, error: 'Usuario no válido' }, { status: 401 })
    }
    // Evitar re-enrolar si ya tiene rostro (debería ir a /verify).
    if (usuario.biometrias.length > 0) {
      return NextResponse.json({ ok: false, error: 'El rostro ya está registrado' }, { status: 409 })
    }

    const json = JSON.stringify(desc)
    const sal = crypto.randomBytes(16).toString('hex')
    const hash = crypto.createHash('sha512').update(sal + json).digest('hex')

    await prisma.biometria.create({
      data: {
        usuario_id: usuario.id,
        tipo_biometria: 'FACIAL',
        hash_template: hash,
        sal_template: sal,
        descriptor_cifrado: encryptString(json),
      },
    })

    await prisma.eventoMFA.create({
      data: { usuario_id: usuario.id, tipo_factor: 'FACIAL', resultado: 'EXITO', detalles: 'Registro de rostro' },
    })
    await registrarEvento({
      usuarioId: usuario.id, evento: 'LOGIN',
      detalle: 'Rostro registrado y sesión iniciada (MFA facial)', ...origen,
    })

    // Emitir sesión real y limpiar el pre-auth.
    const token = signToken({
      sub: usuario.id, usuario: usuario.nombre_usuario,
      rol: usuario.rol.nombre_rol, rol_nivel: usuario.rol.nivel_numerico,
      nivel: usuario.nivel_clasificacion.nivel_numerico,
    })
    return issueSession(token)
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] [MFA_ENROLL]`, err)
    return NextResponse.json({ ok: false, error: 'No se pudo registrar el rostro' }, { status: 400 })
  }
}
