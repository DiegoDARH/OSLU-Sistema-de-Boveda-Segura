'use client'

/*
  Layout idéntico a repositorio.png:

  0 Archivo(s)                        0   ← azul
  Archivos disponibles    Espacio usado   ← gris
  [══════░░░░░░░░░░░░░░░░░░░░░░░░░]      ← barra progreso

  [🟣] Imágenes                           ← fila por categoría
       0 Archivo(s)                    0

  [🟢] Documentos
       0 Archivo(s)                    0
  ...
*/

import { Image as ImgIcon, FileText, Film, Archive, HelpCircle } from 'lucide-react'
import { formatBytes } from '@/lib/utils'

interface StorageStatsProps {
  total:       number
  usedBytes:   number
  byExtension: { extension: string; count: number; bytes: number }[]
}

const CATEGORIES = [
  { key: 'images', label: 'Imágenes',    icon: ImgIcon,    bg: 'bg-purple-500', exts: ['png','jpg','jpeg','webp'] },
  { key: 'docs',   label: 'Documentos',  icon: FileText,   bg: 'bg-green-600',  exts: ['pdf','docx','doc','xlsx','xls','csv'] },
  { key: 'media',  label: 'Multimedia',  icon: Film,       bg: 'bg-red-500',    exts: ['mp4','avi','mov','mp3','wav'] },
  { key: 'zip',    label: 'Otros',       icon: Archive,    bg: 'bg-amber-500',  exts: ['zip','rar','7z'] },
  { key: 'other',  label: 'Desconocidos',icon: HelpCircle, bg: 'bg-cyan-500',   exts: [] },
]

const ALL_KNOWN_EXTS = CATEGORIES.flatMap(c => c.exts)
const MAX_BYTES = 10 * 1024 * 1024 * 1024 // 10 GB

export default function StorageStats({ total, usedBytes, byExtension }: StorageStatsProps) {
  const pct = Math.min(100, (usedBytes / MAX_BYTES) * 100)

  const grouped = CATEGORIES.map(cat => {
    const items = cat.key === 'other'
      ? byExtension.filter(e => !ALL_KNOWN_EXTS.includes(e.extension.toLowerCase()))
      : byExtension.filter(e => cat.exts.includes(e.extension.toLowerCase()))
    return {
      ...cat,
      count: items.reduce((s, i) => s + i.count, 0),
    }
  })

  return (
    <div className="space-y-3">
      {/* ── Fila 1: "0 Archivo(s)" — "0" ────────────────────────────────── */}
      <div className="flex items-baseline justify-between">
        <span className="text-brand-500 font-bold text-base leading-none">
          {total} Archivo(s)
        </span>
        <span className="text-brand-500 font-bold text-base">{formatBytes(usedBytes)}</span>
      </div>

      {/* ── Fila 2: etiquetas gris ─────────────────────────────────────── */}
      <div className="flex items-center justify-between -mt-1">
        <span className="text-slate-400 text-xs">Archivos disponibles</span>
        <span className="text-slate-400 text-xs">Espacio usado</span>
      </div>

      {/* ── Barra de progreso ────────────────────────────────────────────── */}
      <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* ── Categorías (layout de dos líneas como en repositorio.png) ────── */}
      <ul className="space-y-3 pt-1">
        {grouped.map(cat => {
          const Icon = cat.icon
          return (
            <li key={cat.key} className="flex items-center gap-3">
              {/* Icono cuadrado coloreado */}
              <div className={`w-9 h-9 rounded-lg ${cat.bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-[18px] h-[18px] text-white" />
              </div>

              {/* Nombre + sub-etiqueta */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-700 text-sm leading-none">{cat.label}</p>
                <p className="text-slate-400 text-xs mt-0.5">{cat.count} Archivo(s)</p>
              </div>

              {/* Conteo en azul */}
              <span className="text-brand-500 font-semibold text-sm">{cat.count}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
