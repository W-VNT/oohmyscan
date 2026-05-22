import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const CLIENTS = [
  'Havas',
  'La Région Aura',
  'Orange',
  'Dentsu',
  'Nickel',
  'Puy du Fou',
  'Disney',
  'Century 21',
]

export function TrustSectionV2() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="bg-[#111111] border-y border-y-white/[0.06] py-12 overflow-hidden">
      <motion.p
        ref={ref}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center font-v2-body text-[11px] font-medium uppercase tracking-[0.3em] text-white/40"
      >
        Ils nous font confiance
      </motion.p>

      {/* Infinite scroll marquee */}
      <div className="relative mt-8">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#111111] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#111111] to-transparent" />

        <div className="flex animate-[marquee_25s_linear_infinite] motion-reduce:[animation-play-state:paused]">
          {[...CLIENTS, ...CLIENTS, ...CLIENTS, ...CLIENTS].map((name, i) => (
            <span
              key={i}
              className="mx-4 flex-shrink-0 rounded border border-white/[0.06] bg-white/[0.03] px-5 py-2 font-v2-body text-[13px] font-medium tracking-wide text-white/60"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
