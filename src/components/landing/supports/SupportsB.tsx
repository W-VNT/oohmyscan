import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { SUPPORTS } from '@/data/supports'
import { SupportModal } from '../SupportModal'
import type { Support } from '@/data/supports'

/** Version B — Bento grid compact (desktop) + cartes empilées (mobile) */
export function SupportsB() {
  const [selected, setSelected] = useState<Support | null>(null)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="supports" className="relative overflow-hidden bg-white dark:bg-[#0A0A0A] py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#1A1A1A]/30 dark:text-white/30">
            Nos supports
          </span>
          <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#1A1A1A] dark:text-white">
            6 façons d'atteindre
            <br />
            <span className="text-[#1A1A1A]/30 dark:text-white/30">votre cible.</span>
          </h2>
        </motion.div>

        {/* Desktop bento — compact 3-column */}
        <div
          className="mt-12 hidden gap-2.5 md:grid md:grid-cols-3"
          style={{ gridAutoRows: '220px' }}
        >
          {SUPPORTS.map((support, i) => (
            <TiltCard
              key={support.id}
              support={support}
              index={i}
              inView={inView}
              onOpen={setSelected}
              className={support.size === 'large' ? 'md:col-span-2' : ''}
            />
          ))}
        </div>

        {/* Mobile — cartes empilées verticales */}
        <div className="mt-10 space-y-3 md:hidden">
          {SUPPORTS.map((support, i) => (
            <motion.div
              key={support.id}
              role="button"
              tabIndex={0}
              onKeyDown={(e: React.KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(support) } }}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.06 }}
              onClick={() => setSelected(support)}
              className="group cursor-pointer overflow-hidden rounded-xl border border-[#1A1A1A]/[0.06] dark:border-white/[0.06] bg-[#1A1A1A]/[0.02] dark:bg-white/[0.02]"
            >
              <div className="relative aspect-[16/9] overflow-hidden">
                <img
                  src={support.photo}
                  alt={support.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <div>
                  <h3 className="font-['Bebas_Neue'] text-lg tracking-tight text-[#1A1A1A] dark:text-white">
                    {support.name}
                  </h3>
                  <p className="mt-0.5 text-[12px] text-[#1A1A1A]/40 dark:text-white/40">{support.tagline}</p>
                </div>
                <span className="text-[11px] tabular-nums text-[#F5C400]">
                  {support.contactDuration}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <SupportModal support={selected} onClose={() => setSelected(null)} />
    </section>
  )
}

function TiltCard({
  support,
  index,
  inView,
  onOpen,
  className,
}: {
  support: Support
  index: number
  inView: boolean
  onOpen: (s: Support) => void
  className: string
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width - 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5
    cardRef.current.style.transform = `perspective(1000px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) scale(1.01)`
  }

  const handleMouseLeave = () => {
    if (!cardRef.current) return
    cardRef.current.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) scale(1)'
  }

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.1 + index * 0.07 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={() => onOpen(support)}
      className={`group cursor-pointer overflow-hidden rounded-xl transition-[transform,box-shadow] duration-300 ease-out hover:shadow-2xl ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div className="relative h-full">
        <img
          src={support.photo}
          alt={support.name}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        {/* Single overlay — extra info revealed on hover */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/50 dark:from-black/70 via-black/10 to-transparent p-4 transition-all duration-300 group-hover:from-black/90 group-hover:via-black/40">
          <h3 className="font-['Bebas_Neue'] text-xl tracking-tight text-white">{support.name}</h3>
          <p className="mt-0.5 text-[11px] text-white/50 transition-colors duration-300 group-hover:text-white/60">{support.tagline}</p>
          <div className="mt-2 flex items-center gap-3 max-h-0 overflow-hidden opacity-0 transition-all duration-300 group-hover:max-h-10 group-hover:opacity-100">
            <span className="text-[11px] text-[#F5C400]">{support.contactDuration}</span>
            <span className="text-[11px] text-white/30">·</span>
            <span className="text-[11px] text-white/30">{support.network.split('—')[0]}</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
