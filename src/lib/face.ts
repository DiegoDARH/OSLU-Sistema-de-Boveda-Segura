/**
 * face.ts — Comparación de descriptores faciales (Node.js runtime).
 *
 * Un descriptor facial es un vector de 128 números (Float) generado por
 * face-api.js en el navegador. La identidad se decide por la DISTANCIA
 * EUCLIDIANA entre dos descriptores: a menor distancia, más parecidos.
 *
 * Umbral estándar de face-api.js: 0.6. Usamos 0.55 para un balance algo más
 * estricto entre falsos positivos y comodidad.
 */

export const FACE_DESCRIPTOR_LENGTH = 128
export const FACE_MATCH_THRESHOLD = 0.60

/** Valida y normaliza un descriptor recibido del cliente. Lanza si es inválido. */
export function parseDescriptor(raw: unknown): number[] {
  if (!Array.isArray(raw) || raw.length !== FACE_DESCRIPTOR_LENGTH) {
    throw new Error('Descriptor facial inválido')
  }
  const desc = raw.map(Number)
  if (desc.some((n) => !Number.isFinite(n))) {
    throw new Error('Descriptor facial con valores no numéricos')
  }
  return desc
}

/** Distancia euclidiana entre dos descriptores de igual longitud. */
export function euclideanDistance(a: number[], b: number[]): number {
  if (a.length !== b.length) return Number.POSITIVE_INFINITY
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    sum += d * d
  }
  return Math.sqrt(sum)
}

/** Promedia N descriptores en uno solo para reducir el ruido de captura. */
export function averageDescriptors(descriptors: number[][]): number[] {
  if (descriptors.length === 0) throw new Error('Sin descriptores para promediar')
  const len = descriptors[0].length
  const avg = new Array<number>(len).fill(0)
  for (const d of descriptors) {
    for (let i = 0; i < len; i++) avg[i] += d[i]
  }
  const n = descriptors.length
  return avg.map((v) => v / n)
}

/**
 * Dispersión media de un conjunto de descriptores respecto a su centroide.
 * Sirve para medir la consistencia de una sesión de captura: si es alta, los
 * frames no corresponden a un mismo rostro estable (movimiento, varias caras…).
 */
export function descriptorSpread(descriptors: number[][]): number {
  if (descriptors.length < 2) return 0
  const mean = averageDescriptors(descriptors)
  const dists = descriptors.map((d) => euclideanDistance(d, mean))
  return dists.reduce((s, d) => s + d, 0) / dists.length
}

/**
 * Promedia descriptores descartando outliers (frames ruidosos) antes de
 * promediar. Procedimiento:
 *   1. media inicial de todos los descriptores,
 *   2. distancia de cada uno a esa media,
 *   3. conserva los que estén dentro de 1.5× la mediana de distancias,
 *   4. re-promedia sólo los inliers.
 * Produce un template mucho más limpio y estable que la media simple, lo que
 * mejora directamente la precisión de la comparación posterior.
 */
export function robustAverageDescriptors(descriptors: number[][], minKeep = 3): number[] {
  if (descriptors.length === 0) throw new Error('Sin descriptores para promediar')
  if (descriptors.length <= minKeep) return averageDescriptors(descriptors)

  const mean = averageDescriptors(descriptors)
  const dists = descriptors.map((d) => euclideanDistance(d, mean))
  const sorted = [...dists].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const limit = Math.max(median * 1.5, 1e-6)

  const inliers = descriptors.filter((_, i) => dists[i] <= limit)
  return averageDescriptors(inliers.length >= minKeep ? inliers : descriptors)
}

/** ¿Coinciden los rostros? Devuelve la distancia y el veredicto. */
export function matchFace(
  candidato: number[],
  almacenado: number[],
  threshold = FACE_MATCH_THRESHOLD,
): { match: boolean; distance: number } {
  const distance = euclideanDistance(candidato, almacenado)
  return { match: distance <= threshold, distance }
}
