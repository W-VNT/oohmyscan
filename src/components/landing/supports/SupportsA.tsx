import { useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useRef } from 'react'
import { SUPPORTS } from '@/data/supports'
import { SupportModal } from '../SupportModal'
import type { Support } from '@/data/supports'

/** Version A — Cinématique : sticky scroll, 1 support par "écran" */
export function SupportsA() {
  const [selected, setSelected] = useState<Support | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <section id="supports" className="bg-[#F5F5F0]">
      {/* Header */}
      <div className="mx-auto max-w-7xl px-6 pt-24 md:pt-32">
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

      {/* Sticky scroll */}
      <div ref={containerRef} className="relative">
        {SUPPORTS.map((support, i) => (
          <StickySupport
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

function StickySupport({
  support,
  index,
  onOpen,
}: {
  support: Support
  index: number
  onOpen: (s: Support) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  })

  const imageScale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.85, 1, 1, 0.95])
  const textY = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [60, 0, 0, -30])
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0, 1, 1, 0])

  return (
    <div ref={ref} className="sticky top-0 min-h-screen">
      <div className="mx-auto flex min-h-screen max-w-7xl items-center px-6 py-12">
        <div className="grid w-full gap-8 md:grid-cols-2 md:gap-16">
          {/* Image */}
          <motion.div
            style={{ scale: imageScale, opacity }}
            className={`overflow-hidden rounded-2xl ${index % 2 === 1 ? 'md:order-2' : ''}`}
          >
            <img
              src={support.photo}
              alt={support.name}
              className="aspect-[4/3] w-full object-cover"
              loading="lazy"
            />
          </motion.div>

          {/* Text */}
          <motion.div
            style={{ y: textY, opacity }}
            className={`flex flex-col justify-center ${index % 2 === 1 ? 'md:order-1' : ''}`}
          >
            <span className="font-['Bebas_Neue'] text-8xl text-[#0A0A0A]/5">
              0{index + 1}
            </span>
            <h3 className="mt-2 font-['Bebas_Neue'] text-5xl text-[#0A0A0A]">
              {support.name}
            </h3>
            <p className="mt-3 text-xl text-gray-500">{support.tagline}</p>
            <p className="mt-4 max-w-md leading-relaxed text-gray-600">
              {support.description}
            </p>
            <div className="mt-6 flex items-center gap-6 text-sm text-gray-400">
              <span>⏱ {support.contactDuration}</span>
              <span>📍 {support.network}</span>
            </div>
            <button
              onClick={() => onOpen(support)}
              className="mt-8 w-fit rounded-md bg-[#0A0A0A] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1A1A1A]"
            >
              En savoir plus →
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
