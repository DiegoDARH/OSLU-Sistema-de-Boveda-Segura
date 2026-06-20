'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import * as faceapi from 'face-api.js'
import { robustAverageDescriptors, descriptorSpread } from '@/lib/face'
import { Camera, Loader2, ScanFace, AlertCircle, CheckCircle2 } from 'lucide-react'

const MODEL_URL = '/models'
const ENROLL_SAMPLES = 10
const VERIFY_SAMPLES = 5
const CAPTURE_DELAY_MS = 150
const MIN_QUALITY    = 0.50   // score mínimo para aceptar un frame en captura
const LIVE_MIN_SCORE = 0.35   // score mínimo para el feedback del óvalo
const LIVE_INTERVAL  = 350    // ms entre ticks del loop en vivo
const AUTO_TICKS     = 4      // ticks consecutivos "ok" → auto-captura
const MIN_FACE_AREA  = 0.07   // fracción mínima del frame que debe ocupar la cara
const MIN_EYE_RATIO  = 0.28   // distancia_ojos / ancho_caja mínima (detecta perfil)
const MAX_NOSE_SKEW  = 0.34   // desviación lateral nariz / dist_ojos (detecta giro/yaw)
const MAX_ROLL_RATIO = 0.20   // desnivel vertical ojos / dist_ojos (detecta inclinación)
const MAX_SPREAD     = 0.45   // dispersión máxima entre frames de una misma captura

const LIVE_OPTS    = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.25 })
const CAPTURE_OPTS = new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.35 })

/** Congela el frame actual del video en un canvas para análisis limpio. */
function snapFrame(video: HTMLVideoElement): HTMLCanvasElement | null {
  if (!video.videoWidth) return null
  const canvas = document.createElement('canvas')
  canvas.width  = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d')?.drawImage(video, 0, 0)
  return canvas
}

/** Centroide de un grupo de puntos landmark. */
function centroid(pts: { x: number; y: number }[]) {
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  }
}

/**
 * Verifica que la cara detectada esté de frente y sea suficientemente grande.
 * Usa los 68 landmarks del modelo: ojos (36-47), punta de nariz (30).
 */
function isFrontalFace(
  det: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<object>>>,
  frameW: number,
  frameH: number,
): boolean {
  const { box } = det.detection
  const pos = det.landmarks.positions

  // 1. La cara debe ocupar al menos MIN_FACE_AREA del frame
  if ((box.width * box.height) / (frameW * frameH) < MIN_FACE_AREA) return false

  // 2. Los centros de ambos ojos deben estar dentro del frame
  const leftEye  = centroid(pos.slice(36, 42))
  const rightEye = centroid(pos.slice(42, 48))
  if (
    leftEye.x  < 0 || leftEye.x  > frameW ||
    rightEye.x < 0 || rightEye.x > frameW ||
    leftEye.y  < 0 || leftEye.y  > frameH ||
    rightEye.y < 0 || rightEye.y > frameH
  ) return false

  // 3. Distancia entre ojos debe ser suficiente (perfil la colapsa)
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y)
  if (eyeDist < box.width * MIN_EYE_RATIO) return false

  // 4. La punta de la nariz debe estar cerca del centro horizontal de los ojos (yaw)
  const noseTip     = pos[30]
  const faceCenterX = (leftEye.x + rightEye.x) / 2
  if (Math.abs(noseTip.x - faceCenterX) > eyeDist * MAX_NOSE_SKEW) return false

  // 5. Los ojos deben estar aproximadamente al mismo nivel (cabeza no inclinada / roll)
  if (Math.abs(rightEye.y - leftEye.y) > eyeDist * MAX_ROLL_RATIO) return false

  return true
}

/**
 * Check rápido para el loop en vivo (sin landmarks).
 * Rechaza caras demasiado pequeñas o con proporción de perfil evidente.
 */
function isBoxFrontal(box: faceapi.Box, frameW: number, frameH: number): boolean {
  if ((box.width * box.height) / (frameW * frameH) < MIN_FACE_AREA) return false
  // Una cara frontal tiene altura ≥ ancho; el perfil tiende a ser más ancho que alto
  if (box.height / box.width < 0.80) return false
  return true
}

type Estado = 'cargando' | 'listo' | 'capturando' | 'error'

interface FaceCaptureProps {
  mode: 'enroll' | 'verify'
  onDescriptor: (descriptor: number[]) => Promise<{ ok: boolean; error?: string }>
  busy?: boolean
}

let modelsPromise: Promise<void> | null = null
function loadModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]).then(() => undefined)
  }
  return modelsPromise
}

export default function FaceCapture({ mode, onDescriptor, busy }: FaceCaptureProps) {
  const videoRef   = useRef<HTMLVideoElement>(null)
  const streamRef  = useRef<MediaStream | null>(null)
  const [estado, setEstado]       = useState<Estado>('cargando')
  const [error,  setError]        = useState<string | null>(null)
  const [hint,   setHint]         = useState('Cargando modelos de reconocimiento...')
  const [liveOk, setLiveOk]       = useState(false)   // cara frontal detectada en vivo
  const [liveScore, setLiveScore] = useState(0)

  const readyCountRef   = useRef(0)
  const capturandoRef   = useRef(false)
  const onDescriptorRef = useRef(onDescriptor)
  useEffect(() => { onDescriptorRef.current = onDescriptor }, [onDescriptor])

  // ── Inicializar modelos y cámara ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await loadModels()
        if (cancelled) return
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 480, height: 360 },
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setEstado('listo')
        setHint('Mire de frente a la cámara')
      } catch (e) {
        setEstado('error')
        setError(
          (e as Error).name === 'NotAllowedError'
            ? 'Permiso de cámara denegado. Habilítelo para continuar.'
            : 'No se pudo iniciar la cámara o cargar los modelos.',
        )
      }
    })()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ── Captura multi-frame con filtrado de calidad y frontalis ───────────────
  const capturar = useCallback(async () => {
    if (!videoRef.current || capturandoRef.current || busy) return
    capturandoRef.current = true
    setEstado('capturando')
    setError(null)
    setLiveOk(false)

    const needed  = mode === 'enroll' ? ENROLL_SAMPLES : VERIFY_SAMPLES
    const maxTries = needed * 5
    const descriptors: number[][] = []
    let tries = 0

    try {
      while (descriptors.length < needed && tries < maxTries) {
        tries++
        setHint(`Capturando... (${descriptors.length}/${needed})`)

        const frame = snapFrame(videoRef.current)
        if (!frame) continue

        const det = await faceapi
          .detectSingleFace(frame, CAPTURE_OPTS)
          .withFaceLandmarks()
          .withFaceDescriptor()

        if (
          det &&
          det.detection.score >= MIN_QUALITY &&
          isFrontalFace(det, frame.width, frame.height)
        ) {
          descriptors.push(Array.from(det.descriptor))
        }

        if (descriptors.length < needed) {
          await new Promise((r) => setTimeout(r, CAPTURE_DELAY_MS))
        }
      }

      if (descriptors.length < Math.ceil(needed / 2)) {
        setEstado('listo')
        setError('Rostro no válido. Mire de frente y asegúrese de que su cara esté completamente visible.')
        setHint('Mire de frente a la cámara')
        capturandoRef.current = false
        return
      }

      // Gate de consistencia: si los frames difieren demasiado entre sí, la
      // sesión no es fiable (movimiento, cambios de luz, otra persona).
      if (descriptorSpread(descriptors) > MAX_SPREAD) {
        setEstado('listo')
        setError('Captura inestable. Quédese quieto y mire de frente, sin moverse.')
        setHint('Mire de frente a la cámara')
        capturandoRef.current = false
        return
      }

      setHint('Procesando...')
      const descriptor = robustAverageDescriptors(descriptors)
      const res = await onDescriptorRef.current(descriptor)
      if (!res.ok) {
        setEstado('listo')
        setError(res.error ?? 'No se pudo procesar el rostro.')
        setHint('Mire de frente a la cámara')
        capturandoRef.current = false
        return
      }
      streamRef.current?.getTracks().forEach((t) => t.stop())
    } catch {
      setEstado('listo')
      setError('Error al analizar el rostro. Intente de nuevo.')
      capturandoRef.current = false
    }
  }, [busy, mode])

  const capturarRef = useRef(capturar)
  useEffect(() => { capturarRef.current = capturar }, [capturar])

  // ── Loop de detección en vivo ─────────────────────────────────────────────
  useEffect(() => {
    if (estado !== 'listo') {
      readyCountRef.current = 0
      setLiveOk(false)
      setLiveScore(0)
      return
    }

    let active = true
    let timeoutId: ReturnType<typeof setTimeout>

    const tick = async () => {
      if (!active || !videoRef.current) return
      const frame = snapFrame(videoRef.current)
      const det   = frame ? await faceapi.detectSingleFace(frame, LIVE_OPTS) : undefined
      if (!active) return

      const score  = det?.score ?? 0
      const boxOk  = det ? isBoxFrontal(det.box, frame!.width, frame!.height) : false
      const ok     = score >= LIVE_MIN_SCORE && boxOk

      setLiveScore(score)
      setLiveOk(ok)

      if (ok) {
        readyCountRef.current += 1
        if (readyCountRef.current >= AUTO_TICKS && !busy && !capturandoRef.current) {
          capturarRef.current()
          return
        }
        setHint(readyCountRef.current >= 2 ? 'Perfecto, no se mueva...' : 'Rostro detectado, mantenga posición')
      } else {
        readyCountRef.current = 0
        if (score > 0 && !boxOk) {
          setHint('Mire directamente a la cámara y asegúrese de que su cara esté completa')
        } else if (score > 0) {
          setHint('Acérquese más o mejore la iluminación')
        } else {
          setHint('Mire de frente a la cámara')
        }
      }

      timeoutId = setTimeout(tick, LIVE_INTERVAL)
    }

    tick()
    return () => {
      active = false
      clearTimeout(timeoutId)
    }
  }, [estado, busy])

  const procesando = estado === 'capturando' || busy

  const ovalClass = procesando
    ? 'border-brand-400 animate-pulse'
    : liveOk
    ? 'border-green-400 shadow-[0_0_14px_3px_rgba(74,222,128,0.35)]'
    : liveScore > 0
    ? 'border-yellow-400'
    : 'border-white/50'

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full max-w-[320px] aspect-[4/3] rounded-2xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner">
        <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

        {estado === 'cargando' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-300 gap-2 bg-slate-900">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-xs">Cargando modelos...</span>
          </div>
        )}

        {(estado === 'listo' || procesando) && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className={`w-40 h-52 rounded-[50%] border-2 transition-all duration-300 ${ovalClass}`} />
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500 mt-3 text-center min-h-[16px]">{hint}</p>
      {error && (
        <p className="mt-1 text-xs text-status-danger flex items-center gap-1 text-center">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />{error}
        </p>
      )}

      {/* Indicador de estado — la captura es automática, no hay botón. */}
      <div
        className={`w-full max-w-[320px] mt-4 py-2.5 px-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors ${
          procesando
            ? 'bg-brand-50 text-brand-600'
            : liveOk
            ? 'bg-status-active-bg text-status-active'
            : 'bg-status-inactive-bg text-status-inactive'
        }`}
      >
        {procesando ? (
          <><Loader2 className="w-4 h-4 animate-spin" /> {mode === 'enroll' ? 'Registrando rostro...' : 'Verificando identidad...'}</>
        ) : liveOk ? (
          <><ScanFace className="w-4 h-4" /> Capturando automáticamente...</>
        ) : (
          <><Camera className="w-4 h-4" /> {estado === 'cargando' ? 'Preparando cámara...' : 'Buscando rostro frontal...'}</>
        )}
      </div>

      {mode === 'enroll' && !procesando && (
        <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1 text-center max-w-[320px]">
          <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
          Este rostro se usará para verificar tu identidad en los próximos inicios de sesión.
        </p>
      )}
    </div>
  )
}
