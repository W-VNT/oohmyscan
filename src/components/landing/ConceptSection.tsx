import { motion, useMotionValue, useSpring } from 'framer-motion'
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

  // Mouse-follow effect on the table card — very subtle, smoothed via spring
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const tableX = useSpring(mouseX, { stiffness: 90, damping: 22, mass: 0.6 })
  const tableY = useSpring(mouseY, { stiffness: 90, damping: 22, mass: 0.6 })

  function handleTableMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2)
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2)
    mouseX.set(relX * 8)
    mouseY.set(relY * 8)
  }

  function handleTableMouseLeave() {
    mouseX.set(0)
    mouseY.set(0)
  }

  return (
    <section id="concept" className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A] py-20 md:py-28">
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
              <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#9CA3AF] dark:text-white/40">
                Le problème
              </span>
              <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#111111] dark:text-white">
                La pub traditionnelle,
                <br />
                <span className="text-[#F5C400]">on l'évite.</span>
              </h2>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="mt-6 max-w-sm text-[15px] leading-relaxed text-[#6B7280] dark:text-white/60"
            >
              On zappe, on scrolle, on détourne le regard.
              <br />
              Chez OOH MY AD !, votre message est lu dans des{' '}
              <span className="text-[#374151] dark:text-white/70">moments captifs</span> — quand le
              consommateur est là,
              <br />
              et qu'il reste.
            </motion.p>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="mt-8 text-[13px] text-[#6B7280] dark:text-white/50"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#F5C400] mr-2 align-middle" />
              Temps de contact réel mesuré sur le terrain
            </motion.p>
          </div>

          {/* Right — Compact table */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.25 }}
            onMouseMove={handleTableMouseMove}
            onMouseLeave={handleTableMouseLeave}
            style={{ x: tableX, y: tableY }}
            className="overflow-hidden rounded-2xl border border-[#E5E5E5] dark:border-white/[0.06] transition-[box-shadow,border-color] hover:border-[#F5C400]/30 hover:shadow-lg dark:hover:border-[#F5C400]/40 dark:hover:shadow-[0_0_28px_rgba(245,196,0,0.12)]"
          >
            {/* Header row */}
            <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 border-b border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] px-5 py-3 text-[11px] uppercase tracking-[0.15em] text-[#9CA3AF] dark:text-white/40">
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
                  i < COMPARISON.length - 1 ? 'border-b border-[#E5E5E5] dark:border-white/[0.04]' : ''
                } ${!row.evitable ? 'bg-[#F5C400]/[0.03]' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  {!row.evitable && (
                    <div className="h-1.5 w-1.5 rounded-full bg-[#F5C400]" />
                  )}
                  <span className={`text-[13px] ${row.evitable ? 'text-[#9CA3AF] dark:text-white/40 line-through decoration-[#111111] dark:decoration-white' : 'text-[#111111] dark:text-white font-medium'}`}>
                    {row.media}
                  </span>
                </div>
                <span className={`text-right text-[13px] tabular-nums ${row.evitable ? 'text-[#9CA3AF] dark:text-white/40' : 'text-[#F5C400]'}`}>
                  {row.duration}
                </span>
                <span className={`text-right text-[13px] ${row.evitable ? 'text-[#9CA3AF] dark:text-white/40' : 'text-[#4B5563] dark:text-white/60'}`}>
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
