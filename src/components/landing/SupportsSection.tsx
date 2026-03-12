import { useState } from 'react'
import { motion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { SUPPORTS } from '@/data/supports'
import type { Support } from '@/data/supports'
import { SupportCard } from './SupportCard'
import { SupportModal } from './SupportModal'

export function SupportsSection() {
  const [selected, setSelected] = useState<Support | null>(null)
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  // Row 1: taxi (large) + sac-pain + sac-pharma
  const row1 = [SUPPORTS[0], SUPPORTS[1], SUPPORTS[2]]
  // Row 2: set-table + sous-bock + affiche-a3 (large)
  const row2 = [SUPPORTS[3], SUPPORTS[4], SUPPORTS[5]]

  return (
    <section id="supports" className="bg-[#F5F5F0] py-24 md:py-32">
      <div ref={ref} className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-['Bebas_Neue'] text-[clamp(40px,5vw,64px)] text-[#0A0A0A]">
            NOS SUPPORTS
          </h2>
          <p className="mt-2 text-lg text-gray-500">
            6 façons d'atteindre votre cible au bon moment.
          </p>
        </motion.div>

        {/* Desktop grid */}
        <div className="mt-14 hidden md:block">
          {/* Row 1: 2fr 1fr 1fr */}
          <div className="grid grid-cols-4 gap-6">
            <div className="col-span-2">
              <SupportCard support={row1[0]} index={0} onOpen={setSelected} />
            </div>
            <div>
              <SupportCard support={row1[1]} index={1} onOpen={setSelected} />
            </div>
            <div>
              <SupportCard support={row1[2]} index={2} onOpen={setSelected} />
            </div>
          </div>
          {/* Row 2: 1fr 1fr 2fr */}
          <div className="mt-6 grid grid-cols-4 gap-6">
            <div>
              <SupportCard support={row2[0]} index={3} onOpen={setSelected} />
            </div>
            <div>
              <SupportCard support={row2[1]} index={4} onOpen={setSelected} />
            </div>
            <div className="col-span-2">
              <SupportCard support={row2[2]} index={5} onOpen={setSelected} />
            </div>
          </div>
        </div>

        {/* Mobile horizontal scroll */}
        <div className="mt-10 -mx-6 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:hidden">
          {SUPPORTS.map((s, i) => (
            <div key={s.id} className="w-[280px] flex-shrink-0 snap-start">
              <SupportCard support={s} index={i} onOpen={setSelected} />
            </div>
          ))}
        </div>
      </div>

      <SupportModal support={selected} onClose={() => setSelected(null)} />
    </section>
  )
}
