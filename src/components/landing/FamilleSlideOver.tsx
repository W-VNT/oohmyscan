import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight } from 'lucide-react'
import { useEffect } from 'react'
import { useScrollLock } from '@/hooks/useScrollLock'
import { TerrainGallery } from './TerrainGallery'
import type { Famille } from '@/data/familles'

interface FamilleSlideOverProps {
  famille: Famille | null
  onClose: () => void
}

export function FamilleSlideOver({ famille, onClose }: FamilleSlideOverProps) {
  useScrollLock(!!famille)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <AnimatePresence>
      {famille && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/40 dark:bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`${famille.numero} — ${famille.name}`}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 300 }}
            data-lenis-prevent
            className="fixed right-0 top-0 z-[80] h-full w-full overflow-y-auto bg-[#FAFAFA] dark:bg-[#0A0A0A] md:max-w-md"
          >
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] dark:border-white/[0.1] text-[#6B7280] dark:text-white/50 transition-colors hover:bg-[#F5F5F5] dark:hover:bg-white/5 hover:text-[#111111] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Image principale */}
            <div className="relative aspect-[16/10] overflow-hidden">
              <img
                src={famille.photo}
                alt={famille.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#FAFAFA] dark:from-[#0A0A0A] to-transparent" />
            </div>

            <div className="px-8 pb-8">
              {/* Titre */}
              <span className="text-[11px] tabular-nums text-[#F5C400]/40">
                {famille.numero}
              </span>
              <h2 className="font-['Bebas_Neue'] text-4xl tracking-tight text-[#111111] dark:text-white">
                {famille.name}
              </h2>
              <p className="mt-1 text-[14px] text-[#F5C400]/80">{famille.tagline}</p>
              <p className="mt-6 text-[14px] leading-relaxed text-[#6B7280] dark:text-white/40">
                {famille.description}
              </p>

              {/* Produits */}
              <div className="mt-8 border-t border-[#E5E5E5] dark:border-white/[0.06] pt-6">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
                  Nos produits
                </span>
                <div className="mt-3 space-y-3">
                  {famille.produits.map((p) => (
                    <div key={p.name}>
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-[#F5C400]" />
                        <span className="text-[13px] font-medium text-[#111111] dark:text-white">
                          {p.name}
                        </span>
                      </div>
                      <p className="ml-4 mt-0.5 text-[12px] text-[#9CA3AF] dark:text-white/35">
                        {p.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              {famille.stats.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {famille.stats.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-3"
                    >
                      <div className="text-lg font-semibold tabular-nums text-[#111111] dark:text-white">
                        {s.value}
                      </div>
                      <div className="text-[11px] text-[#9CA3AF] dark:text-white/35">
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Photos terrain */}
              {famille.terrainPhotos.length > 0 && (
                <div className="mt-6 border-t border-[#E5E5E5] dark:border-white/[0.06] pt-6">
                  <TerrainGallery photos={famille.terrainPhotos} />
                </div>
              )}

              {/* References */}
              {famille.references.length > 0 && (
                <div className="mt-6">
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
                    Ils nous font confiance
                  </span>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {famille.references.map((ref) => (
                      <span
                        key={ref}
                        className="rounded-full border border-[#E5E5E5] dark:border-white/[0.06] px-3 py-1 text-[11px] text-[#6B7280] dark:text-white/40"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <a
                href="#contact"
                onClick={onClose}
                className="mt-10 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C400] py-3.5 text-[14px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.2)]"
              >
                Lancer une campagne
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
