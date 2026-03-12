import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const COMPARISON = [
  { media: 'Bannière web', duration: '1.7s', attention: '< 2%', evitable: true },
  { media: 'Spot TV', duration: '15s', attention: '~30%', evitable: true },
  { media: 'Affichage routier', duration: '2-3s', attention: 'Faible', evitable: true },
  { media: 'Sac boulangerie', duration: '30 min – 2h', attention: 'Haute', evitable: false },
  { media: 'Set de table', duration: '30 – 60 min', attention: 'Maximale', evitable: false },
  { media: 'Taxi', duration: '8 – 20 min', attention: 'Exclusive', evitable: false },
]

export function ConceptSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="concept" className="relative overflow-hidden bg-[#0A0A0A] py-20 md:py-28">
      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        {/* Layout : texte à gauche + tableau à droite sur desktop */}
        <div className="grid gap-12 md:grid-cols-[1fr_1fr] md:items-center md:gap-16">
          {/* Left — Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7 }}
            >
              <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-white/30">
                Le problème
              </span>
              <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,64px)] leading-[0.95] text-white">
                La pub traditionnelle,
                <br />
                <span className="text-white/30">on l'évite.</span>
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 max-w-sm text-[15px] leading-relaxed text-white/40"
            >
              On zappe, on scrolle, on détourne le regard. Chez OOH MY AD !, votre message est lu dans
              des <span className="text-white/70">moments captifs</span> — quand le consommateur est
              là, et qu'il reste.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-8 text-[13px] text-white/20"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F5C400] mr-2 align-middle" />
              Temps de contact réel mesuré sur le terrain
            </motion.p>
          </div>

          {/* Right — Compact table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="overflow-hidden rounded-2xl border border-white/[0.06]"
          >
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-white/[0.06] bg-white/[0.02] px-5 py-3 text-[11px] uppercase tracking-[0.15em] text-white/25">
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
                  i < COMPARISON.length - 1 ? 'border-b border-white/[0.04]' : ''
                } ${!row.evitable ? 'bg-[#F5C400]/[0.03]' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  {!row.evitable && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#F5C400]" />
                  )}
                  <span className={`text-[13px] ${row.evitable ? 'text-white/30 line-through decoration-white/10' : 'text-white font-medium'}`}>
                    {row.media}
                  </span>
                </div>
                <span className={`text-right text-[13px] tabular-nums ${row.evitable ? 'text-white/20' : 'text-[#F5C400]'}`}>
                  {row.duration}
                </span>
                <span className={`text-right text-[13px] ${row.evitable ? 'text-white/20' : 'text-white/60'}`}>
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
