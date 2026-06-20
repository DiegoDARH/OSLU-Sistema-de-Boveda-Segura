import { describe, it, expect } from 'vitest'
import { parseDescriptor, euclideanDistance, matchFace, FACE_DESCRIPTOR_LENGTH } from '@/lib/face'

const zeros = () => Array(FACE_DESCRIPTOR_LENGTH).fill(0)

describe('face — comparación de descriptores faciales', () => {
  it('valida la longitud del descriptor (128) y rechaza inválidos', () => {
    expect(parseDescriptor(zeros())).toHaveLength(128)
    expect(() => parseDescriptor([1, 2, 3])).toThrow()
    expect(() => parseDescriptor('no-array')).toThrow()
  })

  it('distancia 0 entre descriptores idénticos → coincide', () => {
    const d = zeros().map((_, i) => i / 128)
    expect(euclideanDistance(d, d)).toBe(0)
    expect(matchFace(d, d).match).toBe(true)
  })

  it('rostros muy distintos → no coinciden (distancia > umbral)', () => {
    const a = zeros()
    const b = zeros().map(() => 1) // distancia = sqrt(128) ≈ 11.3
    const { match, distance } = matchFace(a, b)
    expect(distance).toBeGreaterThan(0.55)
    expect(match).toBe(false)
  })

  it('rostros casi iguales (ruido pequeño) → coinciden bajo el umbral', () => {
    const a = zeros().map((_, i) => Math.sin(i))
    const b = a.map((v) => v + 0.001) // distancia ≈ 0.0357
    expect(matchFace(a, b).match).toBe(true)
  })
})
