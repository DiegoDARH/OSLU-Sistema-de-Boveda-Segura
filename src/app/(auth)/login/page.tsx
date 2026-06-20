'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Lock, User, AlertCircle, ScanFace, ArrowLeft, ShieldCheck, FileClock } from 'lucide-react'
import { cn } from '@/lib/utils'
import FaceCapture from '@/components/auth/FaceCapture'

const schema = z.object({
  nombre_usuario: z.string().min(3, 'Mínimo 3 caracteres'),
  password: z.string().min(1, 'Contraseña requerida'),
})
type FormData = z.infer<typeof schema>

type Phase = 'credenciales' | 'mfa'

export default function LoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('credenciales')
  const [enrolled, setEnrolled] = useState(false)
  const [mfaBusy, setMfaBusy] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  })

  // ── Paso 1: credenciales ────────────────────────────────────────────────────
  async function onSubmit(data: FormData) {
    setApiError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      let json: { ok: boolean; error?: string; data?: { step?: string; enrolled?: boolean } } = { ok: false }
      try { json = await res.json() } catch {
        setApiError('Error del servidor. Revisa que la base de datos esté configurada.')
        return
      }
      if (!res.ok || !json.ok) {
        setApiError(json.error ?? 'Credenciales incorrectas')
        return
      }
      // Contraseña OK → pasar al reconocimiento facial obligatorio.
      setEnrolled(Boolean(json.data?.enrolled))
      setPhase('mfa')
    } catch {
      setApiError('No se pudo conectar. Verifica que el servidor esté activo.')
    }
  }

  // ── Paso 2: rostro (registro o verificación) ─────────────────────────────────
  async function handleDescriptor(descriptor: number[]) {
    setMfaBusy(true)
    try {
      const endpoint = enrolled ? '/api/auth/mfa/verify' : '/api/auth/mfa/enroll'
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descriptor }),
      })
      const json = await res.json()
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.error ?? 'No se pudo verificar el rostro' }
      }
      router.replace('/dashboard')
      router.refresh()
      return { ok: true }
    } catch {
      return { ok: false, error: 'No se pudo conectar con el servidor.' }
    } finally {
      setMfaBusy(false)
    }
  }

  function volver() {
    setPhase('credenciales')
    setApiError(null)
  }

  return (
    <div className="relative flex w-full min-h-screen items-center justify-center overflow-hidden p-4 sm:p-6 bg-[#060B1A]">
      {/* ── Fondo tecnológico ────────────────────────────────────────────── */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        {/* Imagen de fondo */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/FONDO.png')" }}
        />
        {/* Glows azules */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_30%,rgba(56,130,246,0.25),transparent_45%),radial-gradient(circle_at_80%_20%,rgba(99,102,241,0.22),transparent_40%),radial-gradient(circle_at_60%_85%,rgba(14,165,233,0.18),transparent_45%)]" />
        {/* Rejilla de circuito */}
        <div
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(56,130,246,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(56,130,246,0.12) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
            maskImage: 'radial-gradient(ellipse at center, black 55%, transparent 100%)',
            WebkitMaskImage: 'radial-gradient(ellipse at center, black 55%, transparent 100%)',
          }}
        />
        {/* Viñeta para resaltar la tarjeta */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(6,11,26,0.85)_100%)]" />
      </div>

      {/* ── Tarjeta central ──────────────────────────────────────────────── */}
      <div className="relative w-full max-w-4xl animate-slide-up">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">

        {/* ── Panel informativo (marca + info general) ─────────────────── */}
        <div className="relative hidden md:flex flex-col justify-between overflow-hidden rounded-2xl border border-white/60 ring-1 ring-inset ring-white/40 bg-white/85 backdrop-blur-2xl p-8 text-slate-800 shadow-2xl shadow-black/30">
          {/* Glow decorativo */}
          <div aria-hidden className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-brand-400/15 blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LOGO.png" alt="OSLU" className="w-36 h-36 object-contain drop-shadow-md" />
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">OSLU</h1>
            <p className="text-brand-600 font-medium">Bóveda Segura</p>
            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Repositorio digital cifrado con control de acceso multinivel.
              Tu información, protegida y auditada de extremo a extremo.
            </p>
          </div>

          <ul className="relative z-10 mt-8 space-y-3">
            {[
              { icon: Lock,        label: 'Cifrado AES-256-GCM por archivo' },
              { icon: ShieldCheck, label: 'Control de acceso Bell-LaPadula' },
              { icon: ScanFace,    label: 'Doble factor con reconocimiento facial' },
              { icon: FileClock,   label: 'Auditoría inmutable encadenada' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 border border-brand-100">
                  <Icon className="h-4 w-4 text-brand-600" />
                </span>
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* ── Tarjeta de formulario ────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-2xl border border-white/15 ring-1 ring-inset ring-white/10 bg-slate-800/85 backdrop-blur-2xl shadow-2xl shadow-black/60">
          <div aria-hidden className="absolute -bottom-10 -left-10 h-48 w-48 rounded-full bg-brand-500/15 blur-3xl pointer-events-none" />
          {/* Encabezado de marca compacto (sólo móvil; en desktop lo cubre el panel) */}
          <div className="md:hidden relative flex flex-col items-center text-center px-8 pt-8 pb-6 bg-gradient-to-b from-white/5 to-transparent border-b border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/LOGO.png" alt="OSLU" className="w-20 h-20 object-contain drop-shadow-md" />
            <h1 className="mt-1 text-xl font-bold tracking-tight text-white">OSLU</h1>
            <p className="text-sm font-medium text-brand-300">Bóveda Segura</p>
          </div>

          {/* ── Cuerpo ───────────────────────────────────────────────────── */}
          <div className="relative z-10 px-8 sm:px-10 py-8">
          {phase === 'credenciales' ? (
            <>
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-bold text-white">Iniciar sesión</h2>
                <p className="text-slate-400 text-sm mt-1">Ingresa tus credenciales para continuar</p>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Usuario</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register('nombre_usuario')}
                      type="text"
                      placeholder="nombre de usuario"
                      className={cn(
                        'w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent',
                        errors.nombre_usuario && 'border-red-500/60 focus:ring-red-500/60'
                      )}
                      autoComplete="username"
                    />
                  </div>
                  {errors.nombre_usuario && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.nombre_usuario.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      {...register('password')}
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={cn(
                        'w-full rounded-lg border border-white/15 bg-white/5 pl-9 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/60 focus:border-transparent',
                        errors.password && 'border-red-500/60 focus:ring-red-500/60'
                      )}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1 text-xs text-red-400 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />{errors.password.message}
                    </p>
                  )}
                </div>

                {apiError && (
                  <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300 animate-fade-in">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {apiError}
                  </div>
                )}

                <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-2.5">
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Verificando...
                    </span>
                  ) : 'Continuar'}
                </button>
              </form>
            </>
          ) : (
            <>
              <button onClick={volver} className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>

              <div className="mb-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center mx-auto mb-3">
                  <ScanFace className="w-6 h-6 text-brand-300" />
                </div>
                <h2 className="text-2xl font-bold text-white">
                  {enrolled ? 'Verificación facial' : 'Registra tu rostro'}
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  {enrolled
                    ? 'Mira a la cámara para confirmar tu identidad.'
                    : 'Es tu primer ingreso: registra tu rostro para activar el segundo factor.'}
                </p>
              </div>

              <FaceCapture
                mode={enrolled ? 'verify' : 'enroll'}
                onDescriptor={handleDescriptor}
                busy={mfaBusy}
              />
            </>
          )}
          </div>

          {/* Pie de la tarjeta */}
          <div className="relative z-10 border-t border-white/10 px-8 sm:px-10 py-4">
            <p className="text-center text-[11px] leading-relaxed text-slate-400">
              © {new Date().getFullYear()} OSLU · Bóveda Segura · Cifrado AES-256 · Auditoría inmutable
            </p>
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}
