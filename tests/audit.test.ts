import { describe, it, expect } from 'vitest'
import { signEntry } from '@/lib/audit'

const base = {
  hashAnterior: 'GENESIS',
  usuarioId: 'user-1',
  evento: 'LOGIN',
  detalle: 'Inicio de sesión',
  timestamp: '2026-06-10T12:00:00.000Z',
}

describe('audit — bitácora inmutable encadenada (HMAC)', () => {
  it('la firma es determinista para la misma entrada', () => {
    expect(signEntry(base)).toBe(signEntry({ ...base }))
    expect(signEntry(base)).toHaveLength(64) // HMAC-SHA256 hex
  })

  it('cualquier cambio en un campo produce una firma distinta', () => {
    const original = signEntry(base)
    expect(signEntry({ ...base, evento: 'DOWNLOAD' })).not.toBe(original)
    expect(signEntry({ ...base, usuarioId: 'user-2' })).not.toBe(original)
    expect(signEntry({ ...base, detalle: 'otro' })).not.toBe(original)
  })

  it('encadena: alterar un eslabón rompe la verificación del siguiente', () => {
    // Eslabón 1 firma con hash_anterior = GENESIS.
    const firma1 = signEntry(base)
    // Eslabón 2 firma referenciando la firma del eslabón 1.
    const entry2 = { ...base, evento: 'UPLOAD', hashAnterior: firma1 }
    const firma2 = signEntry(entry2)

    // Si el eslabón 1 fuese manipulado, su nueva firma difiere, y por tanto
    // el hash_anterior esperado por el eslabón 2 ya no coincide.
    const firma1Manipulada = signEntry({ ...base, detalle: 'MANIPULADO' })
    expect(firma1Manipulada).not.toBe(firma1)
    expect(signEntry({ ...entry2, hashAnterior: firma1Manipulada })).not.toBe(firma2)
  })
})
