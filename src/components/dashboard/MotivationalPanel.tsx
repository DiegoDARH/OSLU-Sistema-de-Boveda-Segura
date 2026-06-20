'use client'

import { useState, useEffect } from 'react'
import { Quote, Sparkles } from 'lucide-react'

interface Frase {
  texto:  string
  autor:  string
}

const FRASES: Frase[] = [
  { texto: 'La seguridad no es un producto, sino un proceso.', autor: 'Bruce Schneier' },
  { texto: 'El éxito es la suma de pequeños esfuerzos repetidos día tras día.', autor: 'Robert Collier' },
  { texto: 'La disciplina es el puente entre las metas y los logros.', autor: 'Jim Rohn' },
  { texto: 'La excelencia no es un acto, sino un hábito.', autor: 'Aristóteles' },
  { texto: 'Confía, pero verifica.', autor: 'Proverbio' },
  { texto: 'La constancia vence lo que la dicha no alcanza.', autor: 'Anónimo' },
  { texto: 'Protege hoy lo que construiste ayer.', autor: 'Bóveda Segura' },
  { texto: 'Un sistema seguro empieza por un equipo comprometido.', autor: 'Bóveda Segura' },
  { texto: 'La calidad nunca es un accidente; siempre es el resultado de un esfuerzo inteligente.', autor: 'John Ruskin' },
  { texto: 'Cada acción cuenta. Cada acceso deja huella.', autor: 'Bóveda Segura' },
]

const INTERVAL_MS = 6000

export default function MotivationalPanel() {
  const [current, setCurrent] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setCurrent((c) => (c + 1) % FRASES.length)
        setFade(true)
      }, 350)
    }, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])

  const frase = FRASES[current]

  return (
    <div className="relative overflow-hidden rounded-xl h-full min-h-[340px] bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 shadow-sm border border-slate-800 flex flex-col">
      {/* Glow decorativo */}
      <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -left-10 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      {/* Patrón de cuadrícula sutil */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.4) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative z-10 flex flex-col h-full p-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-sm">Frase del momento</span>
          </div>
        </div>

        {/* Cita */}
        <div className="flex-1 flex flex-col justify-center">
          <Quote className="w-8 h-8 text-white/25 mb-2" />
          <blockquote
            className={`transition-all duration-300 ${
              fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
            }`}
          >
            <p className="text-white text-lg font-medium leading-snug">{frase.texto}</p>
            <footer className="text-white/60 text-sm font-medium mt-3">— {frase.autor}</footer>
          </blockquote>
        </div>

        {/* Indicadores */}
        <div className="flex items-center gap-1.5 mt-4">
          {FRASES.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
