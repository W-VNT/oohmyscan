import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface TerrainGalleryProps {
  photos: string[]
  /** Contexte pour enrichir les alt text SEO — ex. "campagne outdoor". */
  context?: string
}

/** Extrait un label lisible depuis un chemin d'image (ex. /a/puy-du-fou.jpg -> "Puy du Fou"). */
function labelFromPath(path: string): string {
  const base = path.split('/').pop()?.replace(/\.[^.]+$/, '') ?? ''
  return base
    .split('-')
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
}

export function TerrainGallery({ photos, context = 'campagne' }: TerrainGalleryProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const close = useCallback(() => setOpenIndex(null), [])
  const next = useCallback(() => {
    setOpenIndex((i) => (i === null ? 0 : (i + 1) % photos.length))
  }, [photos.length])
  const prev = useCallback(() => {
    setOpenIndex((i) => (i === null ? 0 : (i - 1 + photos.length) % photos.length))
  }, [photos.length])

  useEffect(() => {
    if (openIndex === null) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openIndex, close, next, prev])

  if (photos.length === 0) return null

  return (
    <div>
      <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
        Photos terrain
      </span>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
        {photos.map((src, i) => {
          const label = labelFromPath(src)
          const alt = `Photo terrain — ${context} ${label} par OOH MY AD !`
          return (
            <button
              key={i}
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`Voir ${label} en grand`}
              className="group relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-[#E5E5E5] dark:border-white/[0.06] bg-[#F5F5F5] dark:bg-white/[0.03] transition-all hover:border-[#F5C400] hover:shadow-md"
            >
              <img
                src={src}
                alt={alt}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
            </button>
          )
        })}
      </div>

      {/* Lightbox modal — rendered via portal on document.body to escape any transformed parents (e.g. slide-over drawer) */}
      {createPortal(
        <AnimatePresence>
          {openIndex !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
              data-lenis-prevent
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-6"
            >
            {/* Close button */}
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Prev button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  prev()
                }}
                aria-label="Photo précédente"
                className="absolute left-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Image */}
            <motion.img
              key={openIndex}
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              src={photos[openIndex]}
              alt={`Photo terrain ${context} ${labelFromPath(photos[openIndex])} par OOH MY AD !`}
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            />

            {/* Next button */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  next()
                }}
                aria-label="Photo suivante"
                className="absolute right-6 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}

            {/* Counter */}
            {photos.length > 1 && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-4 py-1.5 text-[12px] font-medium text-white">
                {openIndex + 1} / {photos.length}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>,
        document.body,
      )}
    </div>
  )
}
