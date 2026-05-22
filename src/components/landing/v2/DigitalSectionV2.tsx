import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { DIGITAL } from '@/data/familles'

function SmsContent() {
  return (
    <>
      <h3 className="font-v2-display text-2xl text-[#111111]">
        {DIGITAL.sms.title}
      </h3>
      <p className="mt-2 font-v2-body text-[13px] text-[#111111]/50">{DIGITAL.sms.tagline}</p>
      <div className="mt-6 space-y-2.5">
        {DIGITAL.sms.features.map((feat) => (
          <div key={feat} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F4C400]" />
            <span className="font-v2-body text-[13px] text-[#111111]/60">{feat}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-[#111111]/[0.1] pt-6 space-y-2">
        {DIGITAL.sms.pricing.map((p) => (
          <div
            key={p.volume}
            className="flex items-center justify-between rounded bg-[#111111]/[0.04] px-4 py-2.5"
          >
            <span className="font-v2-body text-[13px] text-[#111111]/50">{p.volume}</span>
            <span className="font-v2-body text-[14px] font-medium tabular-nums text-[#111111]">{p.price}</span>
          </div>
        ))}
      </div>
      <a
        href="#contact"
        className="font-v2-body mt-6 flex w-full items-center justify-center gap-2 bg-[#111111] text-[#F4C400] font-extrabold text-[13px] uppercase tracking-[0.08em] py-3.5 rounded border-2 border-[#111111] transition-all hover:bg-transparent hover:text-[#111111]"
      >
        Demander un devis <ArrowRight className="h-4 w-4" />
      </a>
    </>
  )
}

function DisplayContent() {
  return (
    <>
      <h3 className="font-v2-display text-2xl text-[#111111]">
        {DIGITAL.display.title}
      </h3>
      <p className="mt-2 font-v2-body text-[13px] text-[#111111]/50">{DIGITAL.display.tagline}</p>
      <div className="mt-6 space-y-2.5">
        {DIGITAL.display.features.map((feat) => (
          <div key={feat} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-[#F4C400]" />
            <span className="font-v2-body text-[13px] text-[#111111]/60">{feat}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 border-t border-[#111111]/[0.1] pt-6">
        <div className="rounded bg-[#111111]/[0.04] px-4 py-3">
          <p className="font-v2-body text-[13px] text-[#111111]/40">
            Tarification sur-mesure selon vos objectifs et votre zone de ciblage.
          </p>
        </div>
      </div>
      <a
        href="#contact"
        className="font-v2-body mt-6 flex w-full items-center justify-center gap-2 border-2 border-[#111111] text-[#111111] font-extrabold text-[13px] uppercase tracking-[0.08em] py-3.5 rounded transition-all hover:bg-[#111111] hover:text-[#F4C400]"
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
      <span className="font-v2-body text-[11px] font-medium uppercase tracking-[0.25em] text-[#111111]/40">
        Solutions digitales
      </span>
      <h2
        className="mt-4 font-v2-display font-black uppercase text-[clamp(36px,5vw,72px)] leading-[0.95] text-[#111111]"
        style={{ letterSpacing: '-0.01em' }}
      >
        Amplifiez avec
        <br />
        le digital.
      </h2>
      <p className="mt-4 max-w-lg font-v2-body text-[15px] text-[#111111]/50 text-justify">
        Touchez le même prospect offline ET sur son mobile.
      </p>
    </motion.div>
  )
}

export function DigitalSectionV2() {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  const [activeTab, setActiveTab] = useState<'sms' | 'display'>('sms')

  return (
    <section id="digital" className="bg-[#EAE3D0] py-20 md:py-28 relative">
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#111111]/20 to-transparent" />

      <div ref={ref} className="mx-auto max-w-3xl px-6">
        <SectionHeader inView={inView} />

        {/* Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-10 flex rounded border border-[#111111]/[0.12] bg-[#111111]/[0.04] p-1"
        >
          {(['sms', 'display'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex-1 rounded py-2.5 font-v2-body text-[13px] font-medium transition-all duration-300 ${
                activeTab === tab
                  ? 'text-[#111111]'
                  : 'text-[#111111]/40 hover:text-[#111111]/60'
              }`}
            >
              {activeTab === tab && (
                <motion.div
                  layoutId="digital-tab-bg-v2"
                  className="absolute inset-0 rounded bg-[#F4C400]"
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
          className="mt-6 rounded border border-[#111111]/[0.12] bg-white/60 p-6 md:p-8 min-h-[400px]"
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
