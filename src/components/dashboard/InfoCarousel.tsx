'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const SLIDES = [
  { id: 1, src: '/carousel/Imagen 1.png', alt: 'Imagen 1' },
  { id: 2, src: '/carousel/Imagen 2.jpg', alt: 'Imagen 2' },
  { id: 3, src: '/carousel/Imagen 3.png', alt: 'Imagen 3' },
]

const INTERVAL_MS = 5000

export default function InfoCarousel() {
  const [current, setCurrent] = useState(0)
  const [paused, setPaused] = useState(false)

  const goTo = useCallback((index: number) => {
    setCurrent((index + SLIDES.length) % SLIDES.length)
  }, [])

  const next = useCallback(() => goTo(current + 1), [current, goTo])
  const prev = useCallback(() => goTo(current - 1), [current, goTo])

  useEffect(() => {
    if (paused) return
    const id = setInterval(next, INTERVAL_MS)
    return () => clearInterval(id)
  }, [paused, next])

  return (
    <div
      className="relative overflow-hidden rounded-xl h-full min-h-[340px] select-none bg-slate-900"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Slides */}
      {SLIDES.map((slide, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={slide.id}
          src={slide.src}
          alt={slide.alt}
          className={`absolute inset-0 w-full h-full object-fill transition-opacity duration-500 ${i === current ? 'opacity-100' : 'opacity-0'
            }`}
        />
      ))}

      {/* Bottom gradient for legibility of controls */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Nav arrows */}
      <button
        onClick={prev}
        aria-label="Anterior"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors flex items-center justify-center text-white/80 hover:text-white"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={next}
        aria-label="Siguiente"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-lg bg-black/30 hover:bg-black/50 backdrop-blur-sm transition-colors flex items-center justify-center text-white/80 hover:text-white"
      >
        <ChevronRight className="w-5 h-5" />
      </button>

      {/* Dot indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            aria-label={`Ir a la imagen ${i + 1}`}
            className={`rounded-full transition-all duration-300 ${i === current ? 'w-5 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40 hover:bg-white/60'
              }`}
          />
        ))}
      </div>
    </div>
  )
}
