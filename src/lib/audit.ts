/**
 * audit.ts — Bitácora de auditoría INMUTABLE (Node.js runtime únicamente).
 *
 * Cada entrada se encadena con la anterior al estilo de un libro mayor:
 *
 *     firma(n) = HMAC-SHA256( hash_anterior(n) || campos(n) , HMAC_SECRET )
 *     hash_anterior(n) = firma(n-1)   (o "GENESIS" para la primera)
 *
 * Propiedad: alterar o borrar cualquier fila rompe la cadena de firmas de TODAS
 * las filas posteriores, lo que hace la manipulación detectable con
 * `verifyChain()`. A nivel de BD, las reglas SQL `logs_no_update`/`logs_no_delete`
 * impiden además UPDATE y DELETE (ver prisma/schema.sql).
 *
 * Toda mutación de datos del sistema DEBE registrar un evento aquí.
 */
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'

export type EventoAuditoria =
  | 'LOGIN'
  | 'LOGIN_FAILED'
  | 'LOGOUT'
  | 'UPLOAD'
  | 'DOWNLOAD'
  | 'VIEW'
  | 'EDIT'
  | 'DELETE'
  | 'CREATE_USER'
  | 'EDIT_USER'
  | 'DELETE_USER'
  | 'CREATE_PROJECT'
  | 'EDIT_PROJECT'
  | 'DELETE_PROJECT'
  | 'GRANT_ACCESS'
  | 'REVOKE_ACCESS'
  | 'ACCESS_DENIED'

const GENESIS = 'GENESIS'

function getHmacSecret(): string {
  const secret = process.env.HMAC_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('[AUDIT] HMAC_SECRET ausente o demasiado corto (mínimo 32 caracteres).')
  }
  return secret
}

/** Calcula la firma HMAC-SHA256 (hex) de una entrada encadenada.
 *  Exportada para pruebas unitarias de la integridad de la cadena. */
export function signEntry(input: {
  hashAnterior: string
  usuarioId: string | null
  evento: string
  detalle: string | null
  timestamp: string
}): string {
  const canonical = [
    input.hashAnterior,
    input.usuarioId ?? 'SYSTEM',
    input.evento,
    input.detalle ?? '',
    input.timestamp,
  ].join('|')
  return crypto.createHmac('sha256', getHmacSecret()).update(canonical).digest('hex')
}

export interface RegistrarOpts {
  usuarioId?: string | null
  evento: EventoAuditoria
  detalle?: string
  ipAddress?: string | null
  userAgent?: string | null
}

/**
 * Inserta una entrada inmutable en la bitácora, encadenándola con la última.
 *
 * Se ejecuta dentro de una transacción serializable para evitar dos inserciones
 * concurrentes que tomen el mismo `hash_anterior` y bifurquen la cadena.
 */
export async function registrarEvento(opts: RegistrarOpts): Promise<void> {
  const timestamp = new Date().toISOString()

  try {
    await prisma.$transaction(
      async (tx) => {
        const ultimo = await tx.logAcceso.findFirst({
          orderBy: { timestamp: 'desc' },
          select: { firma_digital: true },
        })

        const hashAnterior = ultimo?.firma_digital ?? GENESIS
        const firma = signEntry({
          hashAnterior,
          usuarioId: opts.usuarioId ?? null,
          evento: opts.evento,
          detalle: opts.detalle ?? null,
          timestamp,
        })

        await tx.logAcceso.create({
          data: {
            usuario_id: opts.usuarioId ?? null,
            evento: opts.evento,
            detalle: opts.detalle ?? null,
            ip_address: opts.ipAddress ?? null,
            user_agent: opts.userAgent ?? null,
            timestamp,
            hash_anterior: hashAnterior,
            firma_digital: firma,
          },
        })
      },
      { isolationLevel: 'Serializable' },
    )
  } catch (err) {
    // La auditoría no debe tumbar la operación principal, pero sí debe gritar.
    console.error(`[ERROR] [${timestamp}] No se pudo registrar evento de auditoría:`, err)
  }
}

/**
 * Recorre toda la cadena y verifica que cada firma sea válida y enlace con la
 * anterior. Devuelve la primera entrada corrupta, o null si la cadena es íntegra.
 * Útil para un endpoint de verificación de integridad o una prueba.
 */
export async function verifyChain(): Promise<{ ok: boolean; brokenAtId?: string }> {
  const logs = await prisma.logAcceso.findMany({ orderBy: { timestamp: 'asc' } })

  let esperado = GENESIS
  for (const log of logs) {
    if (log.hash_anterior !== esperado) {
      return { ok: false, brokenAtId: log.id }
    }
    const firma = signEntry({
      hashAnterior: log.hash_anterior,
      usuarioId: log.usuario_id,
      evento: log.evento,
      detalle: log.detalle,
      timestamp: log.timestamp.toISOString(),
    })
    if (firma !== log.firma_digital) {
      return { ok: false, brokenAtId: log.id }
    }
    esperado = log.firma_digital
  }
  return { ok: true }
}

/** Extrae IP y user-agent de una petición para registrarlos en la bitácora. */
export function extraerOrigen(req: Request): { ipAddress: string; userAgent: string } {
  const h = req.headers
  return {
    ipAddress:
      h.get('x-forwarded-for')?.split(',')[0].trim() ?? h.get('x-real-ip') ?? 'desconocida',
    userAgent: h.get('user-agent') ?? 'desconocido',
  }
}
