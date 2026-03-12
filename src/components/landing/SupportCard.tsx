import { motion } from 'framer-motion'
import type { Support } from '@/data/supports'

interface SupportCardProps {
  support: Support
  index: number
  onOpen: (support: Support) => void
}

export function SupportCard({ support, index, onOpen }: SupportCardProps) {
  const isLarge = support.size === 'large'

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
      onClick={() => onOpen(support)}
      className={`group cursor-pointer overflow-hidden rounded-xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
        isLarge ? 'md:col-span-2 md:row-span-1' : ''
      }`}
    >
      <div className={`overflow-hidden ${isLarge ? 'aspect-[16/9]' : 'aspect-[4/3]'}`}>
        <img
          src={support.photo}
          alt={support.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      </div>
      <div className="p-5">
        <h3 className="font-['Bebas_Neue'] text-2xl text-[#0A0A0A]">{support.name}</h3>
        <p className="mt-1 text-sm text-gray-500">{support.tagline}</p>
        <p className="mt-2 text-xs text-gray-400">{support.network}</p>
        <p className="mt-1 text-xs text-gray-400">Contact : {support.contactDuration}</p>
        <button className="mt-3 text-sm font-medium text-[#0A0A0A] transition-colors hover:text-[#F5C400]">
          → En savoir plus
        </button>
      </div>
    </motion.div>
  )
}
