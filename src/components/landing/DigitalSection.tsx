import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { DIGITAL } from '@/data/familles'

/* ══════════════════════════════════════════════════════════
   Visual artifacts — minimal, sober (no iPhone frame)
   ══════════════════════════════════════════════════════════ */

function SmsArtifact() {
  return (
    <div className="relative flex w-full max-w-[220px] items-center justify-center py-6">
      <motion.div
        animate={{
          y: [-8, 0, 0, -8],
          opacity: [0, 1, 1, 0],
        }}
        transition={{
          duration: 5,
          times: [0, 0.15, 0.85, 1],
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: [0.16, 1, 0.3, 1],
        }}
        className="w-full rounded-2xl border border-[#E5E5E5] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-3 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]"
      >
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#F5C400]/15">
            <div className="h-2 w-2 rounded-sm bg-[#F5C400]" />
          </div>
          <span className="text-[11px] font-semibold text-[#111111] dark:text-white">OOH MY AD !</span>
          <span className="ml-auto text-[10px] text-[#9CA3AF] dark:text-white/40">à l'instant</span>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-[#374151] dark:text-white/70">
          -20% sur votre prochaine commande. Code OOH20
        </p>
      </motion.div>
    </div>
  )
}

function DisplayArtifact() {
  return (
    <div className="relative flex w-full max-w-[220px] items-center justify-center py-6">
      <div className="relative w-full overflow-hidden rounded-xl border border-[#E5E5E5] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]">
        {/* Creative A */}
        <motion.div
          animate={{ opacity: [1, 1, 0, 0, 1] }}
          transition={{ duration: 6, times: [0, 0.45, 0.55, 0.95, 1], repeat: Infinity }}
          className="flex items-center gap-2.5 p-3"
        >
          <div className="h-10 w-10 flex-shrink-0 rounded-md bg-[#F5C400]/15" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold text-[#111111] dark:text-white">
              -20% sur votre commande
            </div>
            <div className="mt-0.5 text-[9px] text-[#9CA3AF] dark:text-white/40">
              Découvrir l'offre
            </div>
          </div>
        </motion.div>

        {/* Creative B (overlay) */}
        <motion.div
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: 6, times: [0, 0.45, 0.55, 0.95, 1], repeat: Infinity }}
          className="absolute inset-0 flex items-center gap-2.5 bg-white dark:bg-[#0A0A0A] p-3"
        >
          <div className="h-10 w-10 flex-shrink-0 rounded-md bg-[#111111]/[0.06] dark:bg-white/[0.06]" />
          <div className="flex-1">
            <div className="text-[10px] font-semibold text-[#111111] dark:text-white">
              Nouvelle collection
            </div>
            <div className="mt-0.5 text-[9px] text-[#F5C400]">
              Voir →
            </div>
          </div>
        </motion.div>

        {/* "Pub" label */}
        <div className="absolute right-1.5 top-1.5 rounded bg-[#F5F5F5] dark:bg-white/[0.08] px-1.5 py-px text-[8px] font-medium uppercase tracking-wider text-[#9CA3AF] dark:text-white/40">
          Pub
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════
   Card content
   ══════════════════════════════════════════════════════════ */

function CardBody({
  data,
  mockup,
}: {
  data: { title: string; tagline: string; intro: string; features: string[]; priceFrom: string }
  mockup: React.ReactNode
}) {
  return (
    <>
      <h3 className="font-['Bebas_Neue'] text-2xl tracking-tight text-[#111111] dark:text-white">
        {data.title}
      </h3>
      <p className="mt-2 text-[13px] font-medium text-[#F5C400]/80">{data.tagline}</p>
      <p className="mt-3 text-[13px] leading-relaxed text-[#6B7280] dark:text-white/60">
        {data.intro}
      </p>

      {/* 2-col : bullets gauche / mockup droite (md+), stack en mobile */}
      <div className="mt-6 grid grid-cols-1 items-center gap-6 md:grid-cols-[1fr_220px]">
        <div className="space-y-2.5">
          {data.features.map((feat) => (
            <div key={feat} className="flex items-start gap-2.5">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F5C400]/60" />
              <span className="text-[13px] text-[#6B7280] dark:text-white/60">{feat}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center">{mockup}</div>
      </div>

      <div className="mt-6 border-t border-[#E5E5E5] dark:border-white/[0.06] pt-6">
        <div className="rounded-lg bg-[#F5F5F5] dark:bg-white/[0.03] px-4 py-3">
          <p className="text-[13px] font-medium text-[#374151] dark:text-white/60">
            {data.priceFrom}
          </p>
        </div>
      </div>

      <a
        href="#contact"
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C400] py-3 text-[13px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.25)]"
      >
        Demander un devis <ArrowRight className="h-4 w-4" />
      </a>
    </>
  )
}

function SectionHeader({ inView }: { inView: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7 }}
    >
      <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#9CA3AF] dark:text-white/40">
        Solutions digitales
      </span>
      <h2 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#111111] dark:text-white">
        Amplifiez avec
        <br />
        <span className="text-[#F5C400]">le digital.</span>
      </h2>
      <p className="mt-4 max-w-lg text-[15px] text-[#6B7280] dark:text-white/50">
        Touchez le même prospect offline ET sur son mobile.
      </p>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════ */

export function DigitalSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const [activeTab, setActiveTab] = useState<'sms' | 'display'>('sms')

  return (
    <section id="digital" className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A] py-20 md:py-28">
      <div ref={ref} className="mx-auto max-w-3xl px-6">
        <SectionHeader inView={inView} />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex rounded-xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-1"
        >
          {(['sms', 'display'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 rounded-lg py-2.5 text-[13px] font-medium transition-all duration-300 ${
                activeTab === tab
                  ? 'text-[#0A0A0A]'
                  : 'text-[#9CA3AF] dark:text-white/40 hover:text-[#6B7280] dark:hover:text-white/60'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="digital-tab-bg"
                  className="absolute inset-0 rounded-lg bg-[#F5C400]"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <span className="relative z-10">
                {tab === 'sms' ? 'SMS / RCS & DATA' : 'DISPLAY MOBILE'}
              </span>
            </button>
          ))}
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-6 rounded-2xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 md:p-8"
        >
          <AnimatePresence mode="wait">
            {activeTab === 'sms' ? (
              <motion.div
                key="sms"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <CardBody data={DIGITAL.sms} mockup={<SmsArtifact />} />
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <CardBody data={DIGITAL.display} mockup={<DisplayArtifact />} />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
