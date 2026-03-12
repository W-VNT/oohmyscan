import { useState } from 'react'
import { motion } from 'framer-motion'
import { SUPPORTS } from '@/data/supports'
import { SupportModal } from '../SupportModal'
import type { Support } from '@/data/supports'
import { ArrowRight } from 'lucide-react'

/** Version C — Editorial premium : cartes horizontales full-width alternées */
export function SupportsC() {
  const [selected, setSelected] = useState<Support | null>(null)

  return (
    <section id="supports" className="bg-[#F5F5F0] py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-6">
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="font-['Bebas_Neue'] text-[clamp(40px,5vw,64px)] text-[#0A0A0A]"
        >
          NOS SUPPORTS
        </motion.h2>
        <p className="mt-2 text-lg text-gray-500">
          6 façons d'atteindre votre cible au bon moment.
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-7xl space-y-2 px-6">
        {SUPPORTS.map((support, i) => (
          <EditorialCard
            key={support.id}
            support={support}
            index={i}
            onOpen={setSelected}
          />
        ))}
      </div>

      <SupportModal support={selected} onClose={() => setSelected(null)} />
    </section>
  )
}

function EditorialCard({
  support,
  index,
  onOpen,
}: {
  support: Support
  index: number
  onOpen: (s: Support) => void
}) {
  const isEven = index % 2 === 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.6 }}
      onClick={() => onOpen(support)}
      className="group cursor-pointer overflow-hidden rounded-2xl bg-white transition-shadow duration-300 hover:shadow-xl"
    >
      <div className={`grid md:grid-cols-5 ${isEven ? '' : 'md:[direction:rtl]'}`}>
        {/* Image — 3 cols */}
        <div className="md:col-span-3 overflow-hidden">
          <img
            src={support.photo}
            alt={support.name}
            className="aspect-[16/9] h-full w-full object-cover transition-transform duration-700 group-hover:scale-105 md:aspect-auto md:min-h-[280px]"
            loading="lazy"
          />
        </div>

        {/* Text — 2 cols */}
        <div className={`md:col-span-2 flex flex-col justify-center p-8 md:p-12 ${isEven ? '' : 'md:[direction:ltr]'}`}>
          <span className="font-['Bebas_Neue'] text-6xl text-[#0A0A0A]/5">0{index + 1}</span>
          <h3 className="mt-1 font-['Bebas_Neue'] text-4xl text-[#0A0A0A]">{support.name}</h3>
          <p className="mt-2 text-base text-gray-500">{support.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed text-gray-600 line-clamp-3">
            {support.description}
          </p>
          <div className="mt-4 flex items-center gap-4 text-xs text-gray-400">
            <span>⏱ {support.contactDuration}</span>
          </div>
          <div className="mt-6 flex items-center gap-2 text-sm font-medium text-[#0A0A0A] transition-colors group-hover:text-[#F5C400]">
            En savoir plus
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
