'use client'

import { AlertTriangle, X } from 'lucide-react'

interface ConfirmDialogProps {
  title:        string
  message:      string
  confirmLabel?: string
  cancelLabel?: string
  variant?:     'danger' | 'default'
  loading?:     boolean
  onConfirm:    () => void
  onCancel:     () => void
}

/**
 * Diálogo de confirmación modal reutilizable. Reemplaza window.confirm() con un
 * componente consistente con el diseño de la app.
 */
export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
  variant = 'danger', loading, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />

      <div className="relative bg-surface-card rounded-2xl shadow-modal w-full max-w-sm animate-slide-up">
        <button onClick={onCancel} className="absolute top-3 right-3 btn-ghost w-8 h-8 p-0 rounded-full">
          <X className="w-4 h-4" />
        </button>

        <div className="p-6">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${
            variant === 'danger' ? 'bg-status-danger-bg text-status-danger' : 'bg-brand-50 text-brand-500'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>

          <h2 className="font-semibold text-slate-900 text-lg">{title}</h2>
          <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{message}</p>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={onCancel} disabled={loading} className="btn-secondary">{cancelLabel}</button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={variant === 'danger'
                ? 'inline-flex items-center justify-center rounded-lg bg-status-danger px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50'
                : 'btn-primary'}
            >
              {loading ? 'Procesando...' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
