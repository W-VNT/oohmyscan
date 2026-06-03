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
  'Airbus',
  'Turkish Airlines',
  'Visa',
  'Hard Rock Café',
  'Futuroscope',
  'Bonne Maman',
  'Crédit Agricole',
  'SNCF',
  'Uber',
  'Darty',
  'Pasquier',
  'Tiffany & Co',
]

export function TrustSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="bg-[#FAFAFA] dark:bg-[#0A0A0A] py-12 overflow-hidden">
      <motion.p
        ref={ref}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center text-[11px] font-medium uppercase tracking-[0.3em] text-[#9CA3AF] dark:text-white/40"
      >
        Ils nous font confiance
      </motion.p>

      {/* Infinite scroll marquee */}
      <div className="group/marquee relative mt-8">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#FAFAFA] dark:from-[#0A0A0A] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#FAFAFA] dark:from-[#0A0A0A] to-transparent" />

        <div className="flex animate-[marquee_25s_linear_infinite] group-hover/marquee:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]">
          {[...CLIENTS, ...CLIENTS, ...CLIENTS, ...CLIENTS].map((name, i) => (
            <span
              key={i}
              className="mx-4 flex-shrink-0 cursor-default rounded-lg border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.03] px-5 py-2 text-[13px] font-medium tracking-wide text-[#6B7280] dark:text-white/60 transition-all duration-200 hover:border-[#F5C400] hover:text-[#111111] hover:shadow-md dark:hover:border-[#F5C400] dark:hover:text-white dark:hover:bg-white/[0.06] dark:hover:shadow-[0_0_16px_rgba(245,196,0,0.18)]"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
