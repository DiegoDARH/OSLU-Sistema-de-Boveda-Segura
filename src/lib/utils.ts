import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day:   '2-digit',
    month: 'short',
    year:  'numeric',
  })
}

export function formatDateRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'justo ahora'
  if (mins  < 60) return `hace ${mins} min`
  if (hours < 24) return `hace ${hours}h`
  if (days  < 7)  return `hace ${days}d`
  return formatDate(dateStr)
}

export function getFileIcon(ext: string): string {
  const map: Record<string, string> = {
    pdf: '📄', docx: '📝', doc: '📝',
    xlsx: '📊', xls: '📊', csv: '📊',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', webp: '🖼️',
    mp4: '🎬', avi: '🎬', mov: '🎬',
    mp3: '🎵', wav: '🎵',
    zip: '🗜️', rar: '🗜️', '7z': '🗜️',
  }
  return map[ext.toLowerCase()] ?? '📎'
}

export function getExtensionColor(ext: string): string {
  const colors: Record<string, string> = {
    pdf:  'text-red-600 bg-red-50',
    docx: 'text-blue-600 bg-blue-50', doc: 'text-blue-600 bg-blue-50',
    xlsx: 'text-green-600 bg-green-50', xls: 'text-green-600 bg-green-50',
    png:  'text-purple-600 bg-purple-50', jpg: 'text-purple-600 bg-purple-50',
    jpeg: 'text-purple-600 bg-purple-50',
    mp4:  'text-orange-600 bg-orange-50',
    zip:  'text-gray-600 bg-gray-100',
  }
  return colors[ext.toLowerCase()] ?? 'text-gray-600 bg-gray-100'
}

export const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'doc', 'xlsx', 'xls', 'csv', 'png', 'jpg', 'jpeg', 'webp', 'mp4', 'zip', 'rar']
export const MAX_FILE_SIZE_BYTES = (Number(process.env.MAX_FILE_SIZE_MB) || 50) * 1024 * 1024

/** Extrae la extensión (sin punto, en minúsculas) del nombre de un archivo. */
export function extOf(nombre: string): string {
  const i = nombre.lastIndexOf('.')
  return i >= 0 ? nombre.slice(i + 1).toLowerCase() : ''
}

/** Estilos de badge por nivel de clasificación de seguridad. */
export function clasificacionBadge(nombre: string): string {
  const map: Record<string, string> = {
    PUBLICO:      'text-slate-600 bg-slate-100',
    NORMAL:       'text-blue-700 bg-blue-50',
    CONFIDENCIAL: 'text-amber-700 bg-amber-50',
    TOP_SECRET:   'text-red-700 bg-red-50',
  }
  return map[nombre?.toUpperCase()] ?? 'text-slate-600 bg-slate-100'
}
