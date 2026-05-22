import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight } from 'lucide-react'
import { FAMILLES } from '@/data/familles'
import { FamilleSlideOverV2 } from './FamilleSlideOverV2'
import type { Famille } from '@/data/familles'

export function FamillesSectionV2() {
  const [selected, setSelected] = useState<Famille | null>(null)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="solutions" className="relative overflow-hidden bg-[#111111] py-20 md:py-28">
      <div ref={ref} className="relative z-10 mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.25em] text-white/40">
            Nos solutions
          </span>
          <h2
            className="mt-4 font-v2-display font-black uppercase text-[clamp(36px,5vw,64px)] leading-[0.95] text-white"
            style={{ letterSpacing: '-0.01em' }}
          >
            Choisissez le moment
            <br />
            <span className="text-white/40">où votre cible ne peut pas zapper.</span>
          </h2>
        </motion.div>

        {/* Grille 2x2 — 4 familles physiques */}
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {FAMILLES.map((famille, i) => (
            <motion.div
              key={famille.id}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.1 + i * 0.1 }}
              onClick={() => setSelected(famille)}
              className="group cursor-pointer overflow-hidden rounded border border-white/[0.08] bg-[#1A1A1A] transition-all hover:border-[#F4C400]/40 hover:shadow-[0_0_32px_rgba(244,196,0,0.1)]"
            >
              {/* Image */}
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={famille.photo}
                  alt={famille.name}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                <span className="absolute bottom-3 left-4 font-v2-display text-[13px] tracking-wider text-white/40">
                  {famille.numero}
                </span>
              </div>

              {/* Content */}
              <div className="p-5">
                <h3 className="font-v2-display text-[20px] font-extrabold uppercase tracking-[0.05em] text-[#F4C400]">
                  {famille.name}
                </h3>
                <div className="mt-3 h-px w-full bg-white/[0.06]" />
                <ul className="mt-3 space-y-1">
                  {famille.produits.map((p) => (
                    <li key={p.name} className="font-v2-body text-[13px] text-white/55">
                      {p.name}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-1.5 font-v2-body text-[12px] font-medium text-[#F4C400] opacity-0 transition-opacity group-hover:opacity-100">
                  En savoir plus
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Lien vers section Digital */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <div className="h-px flex-1 bg-white/[0.06]" />
          <a
            href="#digital"
            className="flex items-center gap-2 font-v2-body text-[13px] text-white/50 transition-colors hover:text-[#F4C400]"
          >
            Et pour amplifier votre campagne
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </motion.div>
      </div>

      <FamilleSlideOverV2 famille={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
