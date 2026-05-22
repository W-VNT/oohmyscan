import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { DotPattern } from '@/components/ui/DotPattern'

const COMPARISON = [
  { media: 'Bannière web', duration: '1.7s', attention: '< 2%', evitable: true },
  { media: 'Spot TV', duration: '15s', attention: '~30%', evitable: true },
  { media: 'Affichage routier', duration: '2-3s', attention: 'Faible', evitable: true },
  { media: 'Sac boulangerie', duration: '30 min – 2h', attention: 'Haute', evitable: false },
  { media: 'Set de table', duration: '30 – 60 min', attention: 'Maximale', evitable: false },
  { media: 'Taxi', duration: '8 – 20 min', attention: 'Exclusive', evitable: false },
]

export function ConceptSectionV2() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="concept" className="relative overflow-hidden bg-[#EAE3D0] py-20 md:py-28">
      <DotPattern className="pointer-events-none absolute inset-0 w-full h-full opacity-20" />

      <div ref={ref} className="relative z-10 mx-auto max-w-6xl px-6">
        {/* Layout : texte à gauche + tableau à droite sur desktop */}
        <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:items-center md:gap-16">
          {/* Left — Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7 }}
            >
              <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.25em] text-[#111111]/40">
                Le problème
              </span>
              <h2
                className="mt-4 font-v2-display font-black uppercase text-[clamp(36px,5vw,64px)] leading-[0.95] text-[#111111]"
                style={{ letterSpacing: '-0.01em' }}
              >
                La pub traditionnelle,
                <br />
                <span className="text-[#111111]/40">on l'évite.</span>
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 max-w-sm font-v2-body text-[15px] leading-relaxed text-[#111111]/60 text-justify"
            >
              On zappe, on scrolle, on détourne le regard. Chez OOH MY AD !, votre message est lu dans
              des <span className="text-[#111111]/80">moments captifs</span> — quand le consommateur est
              là, et qu'il reste.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-8 font-v2-body text-[13px] text-[#111111]/50"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F4C400] mr-2 align-middle" />
              Temps de contact réel mesuré sur le terrain
            </motion.p>
          </div>

          {/* Right — Compact table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="overflow-hidden rounded border border-[#111111]/[0.1]"
          >
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[#111111]/[0.12] bg-[#111111]/[0.04] px-5 py-3 font-v2-body text-[11px] uppercase tracking-[0.15em] text-[#111111]/40">
              <span>Média</span>
              <span className="text-right">Durée</span>
              <span className="text-right">Attention</span>
            </div>

            {/* Rows */}
            {COMPARISON.map((row, i) => (
              <motion.div
                key={row.media}
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ duration: 0.4, delay: 0.35 + i * 0.06 }}
                className={`grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 ${
                  i < COMPARISON.length - 1 ? 'border-b border-[#111111]/[0.06]' : ''
                } ${!row.evitable ? 'bg-[#F4C400]/[0.15]' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  {!row.evitable && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#F4C400]" />
                  )}
                  <span
                    className={`font-v2-body text-[13px] ${
                      row.evitable ? 'text-[#111111]/40 line-through decoration-[#111111]/20' : 'text-[#111111] font-medium'
                    }`}
                  >
                    {row.media}
                  </span>
                </div>
                <span
                  className={`text-right font-v2-body text-[13px] tabular-nums ${
                    row.evitable ? 'text-[#111111]/40' : 'text-[#111111] font-bold'
                  }`}
                >
                  {row.duration}
                </span>
                <span
                  className={`text-right font-v2-body text-[13px] ${
                    row.evitable ? 'text-[#111111]/40' : 'text-[#111111]/60'
                  }`}
                >
                  {row.attention}
                </span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}
