import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, tieneNivelRol, NIVEL_ROL } from '@/lib/auth'

describe('auth — contraseñas y jerarquía de roles', () => {
  it('hashea y verifica una contraseña correcta (bcrypt)', async () => {
    const hash = await hashPassword('Secreta1234!')
    expect(hash).not.toBe('Secreta1234!') // nunca en claro
    expect(await verifyPassword('Secreta1234!', hash)).toBe(true)
  })

  it('rechaza una contraseña incorrecta', async () => {
    const hash = await hashPassword('Correcta123')
    expect(await verifyPassword('Incorrecta123', hash)).toBe(false)
  })

  it('respeta la jerarquía de roles por nivel numérico', () => {
    // Admin(3) cubre a Gestor(2) y Lector(1).
    expect(tieneNivelRol(NIVEL_ROL.ADMIN, NIVEL_ROL.GESTOR)).toBe(true)
    expect(tieneNivelRol(NIVEL_ROL.ADMIN, NIVEL_ROL.ADMIN)).toBe(true)
    // Lector(1) no alcanza a Gestor(2).
    expect(tieneNivelRol(NIVEL_ROL.LECTOR, NIVEL_ROL.GESTOR)).toBe(false)
    // Gestor(2) cubre a Lector(1) pero no a Admin(3).
    expect(tieneNivelRol(NIVEL_ROL.GESTOR, NIVEL_ROL.LECTOR)).toBe(true)
    expect(tieneNivelRol(NIVEL_ROL.GESTOR, NIVEL_ROL.ADMIN)).toBe(false)
  })
})
