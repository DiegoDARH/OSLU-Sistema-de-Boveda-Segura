/**
 * crypto.ts — Cifrado de archivos en reposo (Node.js runtime únicamente).
 *
 * Estrategia: ENVELOPE ENCRYPTION (cifrado de sobre).
 *   1. Cada archivo se cifra con su propia clave AES-256 aleatoria ("data key").
 *   2. Esa data key se cifra a su vez con la MASTER_KEY del servidor y se guarda
 *      en la tabla `gestion_claves`. La master key nunca toca el disco de datos.
 *
 * Algoritmo: AES-256-GCM (cifrado autenticado). El authTag detecta cualquier
 * manipulación del ciphertext: si el archivo o la clave fueron alterados, el
 * descifrado lanza y nunca se devuelven datos corruptos.
 *
 * NO importar desde el Edge Runtime (middleware): usa el módulo `crypto` de Node.
 */
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12 // 96 bits — tamaño recomendado para GCM
const KEY_BYTES = 32 // 256 bits

/** Lee y valida la master key desde el entorno (32 bytes en hex). */
function getMasterKey(): Buffer {
  const hex = process.env.MASTER_KEY
  if (!hex || hex.length !== 64) {
    throw new Error(
      '[CRYPTO] MASTER_KEY ausente o inválida. Debe ser un hex de 64 caracteres (32 bytes). ' +
        'Generar con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    )
  }
  return Buffer.from(hex, 'hex')
}

/** Genera una clave de datos AES-256 aleatoria para un archivo nuevo. */
export function generateFileKey(): Buffer {
  return crypto.randomBytes(KEY_BYTES)
}

/** SHA-256 (hex) del contenido original — huella de integridad del archivo. */
export function hashContent(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Cifra un buffer con AES-256-GCM usando la clave dada.
 * Devuelve un único buffer con el layout:  [ IV(12) | authTag(16) | ciphertext ]
 * para poder almacenarlo/leerlo como un solo `.enc`.
 */
export function encryptBuffer(plain: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()])
  const authTag = cipher.getAuthTag()
  return Buffer.concat([iv, authTag, ciphertext])
}

/**
 * Descifra un buffer producido por `encryptBuffer`.
 * Lanza si el authTag no coincide (archivo manipulado o clave incorrecta).
 */
export function decryptBuffer(blob: Buffer, key: Buffer): Buffer {
  const iv = blob.subarray(0, IV_BYTES)
  const authTag = blob.subarray(IV_BYTES, IV_BYTES + 16)
  const ciphertext = blob.subarray(IV_BYTES + 16)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Cifra una data key con la master key para guardarla en BD.
 * Formato de salida (texto): "ivHex:authTagHex:cipherHex".
 */
export function wrapKey(fileKey: Buffer): string {
  const master = getMasterKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, master, iv)
  const enc = Buffer.concat([cipher.update(fileKey), cipher.final()])
  const authTag = cipher.getAuthTag()
  return [iv.toString('hex'), authTag.toString('hex'), enc.toString('hex')].join(':')
}

/** Descifra la data key almacenada ("ivHex:authTagHex:cipherHex") con la master key. */
export function unwrapKey(wrapped: string): Buffer {
  const [ivHex, tagHex, cipherHex] = wrapped.split(':')
  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error('[CRYPTO] Clave cifrada con formato inválido en gestion_claves.')
  }
  const master = getMasterKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, master, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()])
}

/**
 * Cifra una cadena arbitraria con la master key (formato "iv:authTag:cipher" hex).
 * Útil para datos sensibles pequeños como un descriptor biométrico.
 */
export function encryptString(plain: string): string {
  const master = getMasterKey()
  const iv = crypto.randomBytes(IV_BYTES)
  const cipher = crypto.createCipheriv(ALGORITHM, master, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf-8'), cipher.final()])
  return [iv.toString('hex'), cipher.getAuthTag().toString('hex'), enc.toString('hex')].join(':')
}

/** Descifra una cadena producida por `encryptString`. */
export function decryptString(blob: string): string {
  const [ivHex, tagHex, cipherHex] = blob.split(':')
  if (!ivHex || !tagHex || !cipherHex) {
    throw new Error('[CRYPTO] Cadena cifrada con formato inválido.')
  }
  const master = getMasterKey()
  const decipher = crypto.createDecipheriv(ALGORITHM, master, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]).toString('utf-8')
}
