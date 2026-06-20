/**
 * access.ts — Control de acceso a archivos (Node.js runtime únicamente).
 *
 * El acceso a un archivo exige superar TRES barreras en cadena (modelo
 * "no read up" de Bell-LaPadula + necesidad de saber):
 *
 *   1. Usuario activo.
 *   2. Acreditación suficiente:  nivel(usuario) >= nivel(archivo).
 *   3. Need-to-Know:  existe una fila en `necesidad_saber` para
 *      (usuario, proyecto del archivo).
 *
 * Un ADMIN (rol de mayor nivel numérico) puede saltarse el Need-to-Know por
 * diseño administrativo, pero NUNCA la barrera de clasificación.
 */
import { prisma } from '@/lib/prisma'

export interface ResultadoAcceso {
  permitido: boolean
  motivo?: 'USUARIO_INACTIVO' | 'CLASIFICACION_INSUFICIENTE' | 'SIN_NECESIDAD_SABER' | 'NO_ENCONTRADO'
}

/**
 * Determina si un usuario puede acceder (ver/descargar) a un archivo concreto.
 * No lanza: devuelve un resultado describible para auditar el motivo del rechazo.
 */
export async function puedeAccederArchivo(
  usuarioId: string,
  archivoId: string,
): Promise<ResultadoAcceso> {
  const [usuario, archivo] = await Promise.all([
    prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { rol: true, nivel_clasificacion: true },
    }),
    prisma.archivo.findUnique({
      where: { id: archivoId },
      include: { nivel_clasificacion: true },
    }),
  ])

  if (!usuario || !archivo) return { permitido: false, motivo: 'NO_ENCONTRADO' }
  if (!usuario.activo) return { permitido: false, motivo: 'USUARIO_INACTIVO' }

  // Barrera 2 — acreditación: el nivel del usuario debe alcanzar el del archivo.
  if (usuario.nivel_clasificacion.nivel_numerico < archivo.nivel_clasificacion.nivel_numerico) {
    return { permitido: false, motivo: 'CLASIFICACION_INSUFICIENTE' }
  }

  // El rol de mayor jerarquía (administrador) omite la necesidad de saber.
  const esAdministrador = usuario.rol.nivel_numerico >= 3
  if (esAdministrador) return { permitido: true }

  // Barrera 3 — need-to-know sobre el proyecto del archivo.
  const autorizacion = await prisma.necesidadSaber.findUnique({
    where: {
      usuario_id_proyecto_id: {
        usuario_id: usuarioId,
        proyecto_id: archivo.proyecto_id,
      },
    },
    select: { id: true },
  })

  if (!autorizacion) return { permitido: false, motivo: 'SIN_NECESIDAD_SABER' }
  return { permitido: true }
}

/**
 * Devuelve los IDs de proyecto a los que el usuario tiene acceso efectivo,
 * para filtrar listados de archivos sin traer todo y descartar después.
 * Un administrador ve todos los proyectos cuyo nivel mínimo cubra su acreditación.
 */
export async function proyectosVisibles(usuarioId: string): Promise<string[]> {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { rol: true, nivel_clasificacion: true },
  })
  if (!usuario || !usuario.activo) return []

  const nivelUsuario = usuario.nivel_clasificacion.nivel_numerico

  if (usuario.rol.nivel_numerico >= 3) {
    const proyectos = await prisma.proyecto.findMany({
      where: { nivel_clasificacion_minimo: { nivel_numerico: { lte: nivelUsuario } } },
      select: { id: true },
    })
    return proyectos.map((p) => p.id)
  }

  const accesos = await prisma.necesidadSaber.findMany({
    where: {
      usuario_id: usuarioId,
      proyecto: { nivel_clasificacion_minimo: { nivel_numerico: { lte: nivelUsuario } } },
    },
    select: { proyecto_id: true },
  })
  return accesos.map((a) => a.proyecto_id)
}
