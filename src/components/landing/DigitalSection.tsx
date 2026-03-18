import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { DIGITAL } from '@/data/familles'

/* ══════════════════════════════════════════════════════════
   Shared sub-components
   ══════════════════════════════════════════════════════════ */

function SmsContent() {
  return (
    <>
      <h3 className="font-['Bebas_Neue'] text-2xl tracking-tight text-[#111111] dark:text-white">
        {DIGITAL.sms.title}
      </h3>
      <p className="mt-2 text-[13px] text-[#6B7280] dark:text-white/50">{DIGITAL.sms.tagline}</p>
      <div className="mt-6 space-y-2.5">
        {DIGITAL.sms.features.map((feat) => (
          <div key={feat} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F5C400]/60" />
            <span className="text-[13px] text-[#6B7280] dark:text-white/60">{feat}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-[#E5E5E5] dark:border-white/[0.06] pt-6 space-y-2">
        {DIGITAL.sms.pricing.map((p) => (
          <div key={p.volume} className="flex items-center justify-between rounded-lg bg-[#F5F5F5] dark:bg-white/[0.03] px-4 py-2.5">
            <span className="text-[13px] text-[#6B7280] dark:text-white/50">{p.volume}</span>
            <span className="text-[14px] font-medium tabular-nums text-[#F5C400]">{p.price}</span>
          </div>
        ))}
      </div>
      <a href="#contact" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C400] py-3 text-[13px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.25)]">
        Demander un devis <ArrowRight className="h-4 w-4" />
      </a>
    </>
  )
}

function DisplayContent() {
  return (
    <>
      <h3 className="font-['Bebas_Neue'] text-2xl tracking-tight text-[#111111] dark:text-white">
        {DIGITAL.display.title}
      </h3>
      <p className="mt-2 text-[13px] text-[#6B7280] dark:text-white/50">{DIGITAL.display.tagline}</p>
      <div className="mt-6 space-y-2.5">
        {DIGITAL.display.features.map((feat) => (
          <div key={feat} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F5C400]/60" />
            <span className="text-[13px] text-[#6B7280] dark:text-white/60">{feat}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-[#E5E5E5] dark:border-white/[0.06] pt-6">
        <div className="rounded-lg bg-[#F5F5F5] dark:bg-white/[0.03] px-4 py-3">
          <p className="text-[13px] text-[#9CA3AF] dark:text-white/40">Tarification sur-mesure selon vos objectifs et votre zone de ciblage.</p>
        </div>
      </div>
      <a href="#contact" className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border border-[#E5E5E5] dark:border-white/[0.12] py-3 text-[13px] font-medium text-[#6B7280] dark:text-white/70 transition-all hover:border-[#F5C400]/30 hover:text-[#111111] dark:hover:text-white">
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
        Touchez le meme prospect offline ET sur son mobile.
      </p>
    </motion.div>
  )
}

/* ══════════════════════════════════════════════════════════
   VERSION A — Gradient reveal (fond uniforme, glow hover)
   Conservee mais non utilisee — disponible via DigitalSectionVariantA
   ══════════════════════════════════════════════════════════ */

export function DigitalSectionVariantA() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })

  return (
    <section id="digital" className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A] py-20 md:py-28">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F5C400]/20 to-transparent" />
      <div ref={ref} className="mx-auto max-w-6xl px-6">
        <SectionHeader inView={inView} />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="group rounded-2xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 md:p-8 transition-all duration-500 hover:border-[#F5C400]/20 hover:shadow-[0_0_40px_rgba(245,196,0,0.06)]"
          >
            <SmsContent />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="group rounded-2xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 md:p-8 transition-all duration-500 hover:border-[#F5C400]/20 hover:shadow-[0_0_40px_rgba(245,196,0,0.06)]"
          >
            <DisplayContent />
          </motion.div>
        </div>
      </div>
    </section>
  )
}

/* ══════════════════════════════════════════════════════════
   VERSION C — Tabs interactifs (ACTIVE)
   ══════════════════════════════════════════════════════════ */

export function DigitalSection() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const [activeTab, setActiveTab] = useState<'sms' | 'display'>('sms')

  return (
    <section id="digital" className="relative overflow-hidden bg-[#FAFAFA] dark:bg-[#0A0A0A] py-20 md:py-28">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#F5C400]/20 to-transparent" />

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
          className="mt-6 rounded-2xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-6 md:p-8 min-h-[400px]"
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
                <SmsContent />
              </motion.div>
            ) : (
              <motion.div
                key="display"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <DisplayContent />
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
