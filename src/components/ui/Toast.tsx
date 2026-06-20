'use client'

import { useState, useCallback } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export type ToastKind = 'success' | 'error' | 'info'
export interface ToastItem { id: number; kind: ToastKind; message: string }

const ICONS = { success: CheckCircle, error: AlertCircle, info: Info }
const STYLES = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  error:   'border-red-200 bg-red-50 text-red-800',
  info:    'border-blue-200 bg-blue-50 text-blue-800',
}

/** Hook minimalista de toasts: estado local + helper `toast(kind, message)`. */
export function useToasts() {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback((kind: ToastKind, message: string) => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, kind, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  return { toasts, toast, dismiss }
}

/** Contenedor fijo que renderiza la pila de toasts (esquina inferior derecha). */
export function ToastContainer({ toasts, dismiss }: { toasts: ToastItem[]; dismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-[70] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind]
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg animate-slide-up ${STYLES[t.kind]}`}
          >
            <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100 transition-opacity">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
