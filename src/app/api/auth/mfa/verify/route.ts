import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPreAuthToken, signToken, PREAUTH_COOKIE } from '@/lib/auth'
import { decryptString } from '@/lib/crypto'
import { parseDescriptor, matchFace } from '@/lib/face'
import { registrarEvento, extraerOrigen } from '@/lib/audit'
import { issueSession } from '@/lib/session'

/**
 * Paso 2b del login: verifica el rostro contra el descriptor registrado.
 * Sólo accesible con token pre-auth válido. La comparación (distancia euclidiana)
 * ocurre en el servidor con el descriptor descifrado. Sólo si coincide se emite
 * la sesión. Cada intento queda en `eventos_mfa`.
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
    const candidato = parseDescriptor(descriptor)

    const usuario = await prisma.usuario.findUnique({
      where: { id: pre.sub },
      include: {
        rol: true,
        nivel_clasificacion: true,
        biometrias: { where: { tipo_biometria: 'FACIAL' }, orderBy: { fecha_registro: 'desc' }, take: 1 },
      },
    })
    if (!usuario || !usuario.activo) {
      return NextResponse.json({ ok: false, error: 'Usuario no válido' }, { status: 401 })
    }

    const bio = usuario.biometrias[0]
    if (!bio?.descriptor_cifrado) {
      return NextResponse.json({ ok: false, error: 'No hay rostro registrado' }, { status: 409 })
    }

    const almacenado = parseDescriptor(JSON.parse(decryptString(bio.descriptor_cifrado)))
    const { match, distance } = matchFace(candidato, almacenado)

    await prisma.eventoMFA.create({
      data: {
        usuario_id: usuario.id,
        tipo_factor: 'FACIAL',
        resultado: match ? 'EXITO' : 'FALLO',
        detalles: `Distancia ${distance.toFixed(4)}`,
      },
    })

    if (!match) {
      await registrarEvento({
        usuarioId: usuario.id, evento: 'LOGIN_FAILED',
        detalle: `MFA facial fallido (distancia ${distance.toFixed(4)})`, ...origen,
      })
      return NextResponse.json({ ok: false, error: 'El rostro no coincide. Intente de nuevo.' }, { status: 401 })
    }

    await registrarEvento({
      usuarioId: usuario.id, evento: 'LOGIN',
      detalle: `Sesión iniciada con MFA facial (distancia ${distance.toFixed(4)})`, ...origen,
    })

    const token = signToken({
      sub: usuario.id, usuario: usuario.nombre_usuario,
      rol: usuario.rol.nombre_rol, rol_nivel: usuario.rol.nivel_numerico,
      nivel: usuario.nivel_clasificacion.nivel_numerico,
    })
    return issueSession(token)
  } catch (err) {
    console.error(`[ERROR] [${new Date().toISOString()}] [MFA_VERIFY]`, err)
    return NextResponse.json({ ok: false, error: 'No se pudo verificar el rostro' }, { status: 400 })
  }
}
