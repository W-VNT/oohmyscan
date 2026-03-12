import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight } from 'lucide-react'
import type { Support } from '@/data/supports'
import { useEffect } from 'react'

interface SupportModalProps {
  support: Support | null
  onClose: () => void
}

export function SupportModal({ support, onClose }: SupportModalProps) {
  useEffect(() => {
    if (support) document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [support])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <AnimatePresence>
      {support && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 300 }}
            data-lenis-prevent
            className="fixed right-0 top-0 z-[80] h-full w-full overflow-y-auto bg-[#0A0A0A] md:max-w-md"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.1] text-white/50 transition-colors hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative aspect-[16/10] overflow-hidden">
              <img src={support.photo} alt={support.name} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#0A0A0A] to-transparent" />
            </div>

            <div className="px-8 pb-8">
              <h2 className="font-['Bebas_Neue'] text-4xl tracking-tight text-white">{support.name}</h2>
              <p className="mt-1 text-[14px] text-[#F5C400]/80">{support.tagline}</p>
              <p className="mt-6 text-[14px] leading-relaxed text-white/40">{support.description}</p>

              <div className="mt-8 space-y-3 border-t border-white/[0.06] pt-6">
                {[
                  { label: 'Durée contact', value: support.contactDuration },
                  { label: 'Réseau', value: support.network },
                ].map((spec) => (
                  <div key={spec.label} className="flex items-center justify-between">
                    <span className="text-[12px] text-white/25">{spec.label}</span>
                    <span className="text-[13px] text-white/60">{spec.value}</span>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <span className="text-[12px] text-white/25">Idéal pour</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {support.idealFor.map((item) => (
                    <span key={item} className="rounded-full border border-white/[0.06] px-3 py-1 text-[11px] text-white/40">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

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
