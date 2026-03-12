import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'

const LOGOS = [
  { name: 'Client 1' },
  { name: 'Client 2' },
  { name: 'Client 3' },
  { name: 'Client 4' },
  { name: 'Client 5' },
  { name: 'Client 6' },
  { name: 'Client 7' },
  { name: 'Client 8' },
]

export function TrustSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.2 })

  return (
    <section className="border-y border-white/[0.04] bg-[#0A0A0A] py-12 overflow-hidden">
      <motion.p
        ref={ref}
        initial={{ opacity: 0 }}
        animate={inView ? { opacity: 1 } : {}}
        transition={{ duration: 0.6 }}
        className="text-center text-[11px] font-medium uppercase tracking-[0.3em] text-white/20"
      >
        Ils nous font confiance
      </motion.p>

      {/* Infinite scroll marquee */}
      <div className="relative mt-8">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-[#0A0A0A] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-[#0A0A0A] to-transparent" />

        <div className="flex animate-[marquee_25s_linear_infinite]">
          {[...LOGOS, ...LOGOS, ...LOGOS, ...LOGOS].map((logo, i) => (
            <div
              key={i}
              className="mx-6 flex h-8 w-28 flex-shrink-0 items-center justify-center rounded-md bg-white/[0.04] text-[11px] text-white/15"
            >
              {logo.name}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
