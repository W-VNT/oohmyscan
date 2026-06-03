import { motion, AnimatePresence } from 'framer-motion'
import { X, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'
import type { ProcessStep } from './process/ProcessC'
import { useScrollLock } from '@/hooks/useScrollLock'

interface ProcessModalProps {
  step: ProcessStep | null
  onClose: () => void
}

/* ── Sober artifacts (one per actionable step) ──────────── */

function PlanArtifact() {
  return (
    <div className="mx-auto w-full max-w-[280px] rounded-2xl border border-[#E5E5E5] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-5 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#9CA3AF] dark:text-white/40">
          Devis
        </span>
        <span className="font-mono text-[10px] tabular-nums text-[#9CA3AF] dark:text-white/40">
          D-2026-047
        </span>
      </div>

      {/* Skeleton intro */}
      <div className="mt-4 space-y-1.5">
        <div className="h-[3px] w-full rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" />
        <div className="h-[3px] w-5/6 rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" />
        <div className="h-[3px] w-2/3 rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" />
      </div>

      {/* Line items */}
      <div className="mt-5 space-y-2.5">
        {[0.7, 0.55, 0.8].map((w, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-[3px] flex-1 rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" style={{ maxWidth: `${w * 100}%` }} />
            <div className="h-[3px] w-10 rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" />
          </div>
        ))}
      </div>

      {/* Divider */}
      <div className="mt-5 h-px bg-[#E5E5E5] dark:bg-white/[0.06]" />

      {/* Total */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#6B7280] dark:text-white/50">
          Total HT
        </span>
        <span className="rounded-md bg-[#F5C400] px-2.5 py-1 text-[11px] font-bold tabular-nums text-[#0A0A0A]">
          2 400 €
        </span>
      </div>
    </div>
  )
}

function QRPattern() {
  const SIZE = 17
  const cells: { r: number; c: number; on: boolean }[] = []
  const finderAt = (fr: number, fc: number, r: number, c: number): boolean | null => {
    const dr = r - fr,
      dc = c - fc
    if (dr < 0 || dr > 6 || dc < 0 || dc > 6) return null
    if (dr === 0 || dr === 6 || dc === 0 || dc === 6) return true
    if (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4) return true
    return false
  }
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const f1 = finderAt(0, 0, r, c)
      const f2 = finderAt(0, SIZE - 7, r, c)
      const f3 = finderAt(SIZE - 7, 0, r, c)
      const finder = f1 ?? f2 ?? f3
      const on = finder !== null ? finder : (r * 7 + c * 3 + r * c * 2) % 5 < 2
      cells.push({ r, c, on })
    }
  }
  return (
    <div className="grid gap-0" style={{ gridTemplateColumns: `repeat(${SIZE}, 8px)` }}>
      {cells.map((cell, i) => (
        <div
          key={i}
          className={`h-2 w-2 ${cell.on ? 'bg-[#0A0A0A] dark:bg-white' : 'bg-transparent'}`}
        />
      ))}
    </div>
  )
}

function DeploiementArtifact() {
  return (
    <div className="mx-auto flex w-full max-w-[280px] flex-col items-center rounded-2xl border border-[#E5E5E5] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]">
      <QRPattern />

      {/* Check badge */}
      <div className="-mt-2 flex h-10 w-10 items-center justify-center rounded-full bg-[#F5C400] shadow-[0_4px_12px_-2px_rgba(245,196,0,0.5)]">
        <CheckCircle2 className="h-5 w-5 text-[#0A0A0A]" strokeWidth={2.5} />
      </div>

      <div className="mt-3 text-center">
        <p className="text-[13px] font-semibold text-[#111111] dark:text-white">
          Pose validée
        </p>
        <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-white/40">
          Lyon · 13:47
        </p>
      </div>
    </div>
  )
}

function RapportArtifact() {
  return (
    <div className="mx-auto flex aspect-[3/4] w-full max-w-[240px] flex-col rounded-2xl border border-[#E5E5E5] dark:border-white/[0.08] bg-white dark:bg-white/[0.04] p-6 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)]">
      {/* Header */}
      <div>
        <h3 className="font-['Bebas_Neue'] text-[22px] leading-tight tracking-tight text-[#111111] dark:text-white">
          Rapport
          <br />
          campagne
        </h3>
        <div className="mt-2 h-[3px] w-10 rounded-full bg-[#F5C400]" />
      </div>

      {/* Hero KPI */}
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div className="font-['Bebas_Neue'] text-[64px] leading-none tracking-tight text-[#0A0A0A] dark:text-white">
          300
        </div>
        <p className="mt-2 text-[12px] text-[#6B7280] dark:text-white/50">
          supports posés
        </p>
      </div>

      {/* Footer */}
      <div className="space-y-1.5">
        <div className="h-[3px] w-2/3 rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" />
        <div className="h-[3px] w-1/2 rounded-full bg-[#F5F5F5] dark:bg-white/[0.08]" />
        <p className="pt-2 text-[10px] text-[#9CA3AF] dark:text-white/40">
          OOH MY AD ! · juin 2026
        </p>
      </div>
    </div>
  )
}

/* ── Preview mapping by step ────────────────────────────── */
const STEP_MOCKUPS: Record<string, React.ReactNode> = {
  '02': <PlanArtifact />,
  '03': <DeploiementArtifact />,
  '04': <RapportArtifact />,
}

/* ── Modal ──────────────────────────────────────────────── */

export function ProcessModal({ step, onClose }: ProcessModalProps) {
  useScrollLock(!!step)

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const mockup = step ? STEP_MOCKUPS[step.num] : null

  return (
    <AnimatePresence>
      {step && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[70] bg-black/40 dark:bg-black/70 backdrop-blur-md"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={`Étape ${step.num} — ${step.title}`}
            data-lenis-prevent
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 35, stiffness: 300 }}
            className="fixed right-0 top-0 z-[80] h-full w-full overflow-y-auto bg-[#FAFAFA] dark:bg-[#0A0A0A] md:max-w-md"
          >
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-[#E5E5E5] dark:border-white/[0.1] text-[#6B7280] dark:text-white/50 transition-colors hover:bg-[#F5F5F5] dark:hover:bg-white/5 hover:text-[#111111] dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Header */}
            <div className="px-8 pt-16 pb-2">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#F5C400]/15">
                  <step.icon className="h-6 w-6 text-[#F5C400]" />
                </div>
                <h2 className="font-['Bebas_Neue'] text-3xl tracking-tight text-[#111111] dark:text-white">{step.title}</h2>
              </div>
              <p className="mt-6 text-[14px] leading-relaxed text-[#6B7280] dark:text-white/50">{step.detail}</p>
            </div>

            {/* App Mockups */}
            {mockup && (
              <div className="px-8 pt-6">
                <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
                  Aperçu
                </span>
                <div className="mt-4">{mockup}</div>
              </div>
            )}

            {/* Tools */}
            <div className="px-8 pt-6">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
                Méthodes
              </span>
              <div className="mt-4 space-y-3">
                {step.tools.map((tool) => {
                  const ToolIcon = tool.icon
                  return (
                    <div
                      key={tool.name}
                      className="rounded-xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-white/[0.04]">
                          <ToolIcon className="h-4 w-4 text-[#F5C400]/60" />
                        </div>
                        <h3 className="text-[14px] font-medium text-[#111111] dark:text-white">{tool.name}</h3>
                      </div>
                      <p className="mt-2 ml-11 text-[13px] leading-relaxed text-[#9CA3AF] dark:text-white/35">{tool.desc}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Deliverable */}
            <div className="px-8 pt-8">
              <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#D1D5DB] dark:text-white/20">
                Livrable
              </span>
              <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#F5C400]/25 bg-[#F5C400]/[0.06] p-4">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-white dark:bg-white/[0.04]">
                  <CheckCircle2 className="h-4 w-4 text-[#F5C400]/60" />
                </div>
                <p className="text-[14px] leading-relaxed text-[#6B7280] dark:text-white/60">{step.deliverable}</p>
              </div>
            </div>

            {/* CTA */}
            <div className="px-8 pt-10 pb-8">
              <a
                href="#contact"
                onClick={(e) => {
                  e.preventDefault()
                  onClose()
                  setTimeout(() => {
                    document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })
                  }, 350)
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F5C400] py-3.5 text-[14px] font-medium text-[#0A0A0A] transition-all hover:shadow-[0_0_24px_rgba(245,196,0,0.2)]"
              >
                Obtenir un devis sous 24h
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
