import { describe, it, expect } from 'vitest'
import {
  generateFileKey, encryptBuffer, decryptBuffer,
  hashContent, wrapKey, unwrapKey,
} from '@/lib/crypto'

describe('crypto — cifrado de archivos AES-256-GCM', () => {
  it('cifra y descifra recuperando el contenido original (roundtrip)', () => {
    const original = Buffer.from('Documento confidencial de prueba 🔐', 'utf-8')
    const key = generateFileKey()
    const blob = encryptBuffer(original, key)

    // El ciphertext no debe parecerse al original.
    expect(blob.equals(original)).toBe(false)

    const recuperado = decryptBuffer(blob, key)
    expect(recuperado.toString('utf-8')).toBe(original.toString('utf-8'))
  })

  it('genera claves de 32 bytes (AES-256) distintas en cada llamada', () => {
    const k1 = generateFileKey()
    const k2 = generateFileKey()
    expect(k1.length).toBe(32)
    expect(k1.equals(k2)).toBe(false)
  })

  it('el hash SHA-256 es determinista para igual contenido y cambia si cambia', () => {
    const a = Buffer.from('contenido')
    const b = Buffer.from('contenido')
    const c = Buffer.from('contenidO')
    expect(hashContent(a)).toBe(hashContent(b))
    expect(hashContent(a)).not.toBe(hashContent(c))
    expect(hashContent(a)).toHaveLength(64) // 32 bytes en hex
  })

  it('detecta manipulación: descifrar un blob alterado lanza (authTag GCM)', () => {
    const key = generateFileKey()
    const blob = encryptBuffer(Buffer.from('intacto'), key)
    // Alterar un byte del ciphertext.
    blob[blob.length - 1] ^= 0xff
    expect(() => decryptBuffer(blob, key)).toThrow()
  })

  it('una clave incorrecta no puede descifrar el contenido', () => {
    const blob = encryptBuffer(Buffer.from('secreto'), generateFileKey())
    expect(() => decryptBuffer(blob, generateFileKey())).toThrow()
  })

  it('envuelve y desenvuelve la data key con la master key (envelope)', () => {
    const fileKey = generateFileKey()
    const wrapped = wrapKey(fileKey)
    expect(wrapped).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/) // iv:tag:cipher
    expect(unwrapKey(wrapped).equals(fileKey)).toBe(true)
  })
})
