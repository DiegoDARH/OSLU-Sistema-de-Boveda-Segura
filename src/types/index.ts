// ─── Entidades base ───────────────────────────────────────────────────────────

export interface Rol {
  id:             string
  nombre_rol:     string
  nivel_numerico: number
  descripcion:    string | null
}

export interface ClasificacionSeguridad {
  id:             string
  nombre:         string
  nivel_numerico: number
  descripcion:    string | null
}

export interface Usuario {
  id:                     string
  nombre_usuario:         string
  activo:                 boolean
  fecha_creacion:         string
  fecha_actualizacion:    string
  rol_id:                 string
  nivel_clasificacion_id: string
  rol?:                   Pick<Rol, 'id' | 'nombre_rol' | 'nivel_numerico'>
  nivel_clasificacion?:   Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>
}

export interface Proyecto {
  id:                            string
  nombre_proyecto:               string
  descripcion:                   string | null
  fecha_creacion:                string
  nivel_clasificacion_minimo_id: string
  nivel_clasificacion_minimo?:   Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>
  _count?:                       { archivos: number }
}

export type EstadoArchivo = 'ACTIVO' | 'ARCHIVADO' | 'ELIMINADO'

export interface Archivo {
  id:                     string
  nombre_archivo:         string
  hash_original:          string
  tamanio:                number
  mime_type:              string | null
  descripcion:            string | null
  estado:                 EstadoArchivo
  fecha_subida:           string
  usuario_id:             string
  nivel_clasificacion_id: string
  proyecto_id:            string
  usuario?:               Pick<Usuario, 'id' | 'nombre_usuario'>
  nivel_clasificacion?:   Pick<ClasificacionSeguridad, 'id' | 'nombre' | 'nivel_numerico'>
  proyecto?:              Pick<Proyecto, 'id' | 'nombre_proyecto'>
  // `ruta_cifrada` NUNCA se expone al cliente.
}

export interface LogAcceso {
  id:         string
  evento:     string
  detalle:    string | null
  ip_address: string | null
  timestamp:  string
  usuario_id: string | null
  usuario?:   Pick<Usuario, 'id' | 'nombre_usuario'>
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** Payload del JWT. `nivel` y `rol_nivel` se incrustan para que middleware y
 *  route handlers decidan acceso sin re-consultar la BD en cada request. */
export interface JWTPayload {
  sub:            string   // usuario id
  usuario:        string   // nombre_usuario
  rol:            string   // nombre_rol (ej. "Administrador")
  rol_nivel:      number   // nivel_numerico del rol (jerarquía)
  nivel:          number   // nivel_numerico de clasificación (acreditación)
  iat?:           number
  exp?:           number
}

export interface SessionUser {
  id:             string
  nombre_usuario: string
  rol:            string
  rol_nivel:      number
  nivel:          number
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  ok:       boolean
  data?:    T
  error?:   string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page:  number
  limit: number
  pages: number
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  totalArchivos:    number
  totalUsuarios:    number
  totalProyectos:   number
  storageUsedBytes: number
  recentUploads:    number
  byClasificacion:  { nombre: string; count: number }[]
  recentActivity:   LogAcceso[]
}
