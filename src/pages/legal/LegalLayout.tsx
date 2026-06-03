import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/landing/Footer'

interface LegalLayoutProps {
  title: string
  subtitle?: string
  updatedAt: string
  children: React.ReactNode
}

export function LegalLayout({ title, subtitle, updatedAt, children }: LegalLayoutProps) {
  return (
    <div
      className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#111111] dark:text-[#F5F5F5]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* Simplified navbar */}
      <header className="border-b border-[#E5E5E5] dark:border-white/[0.06] bg-[#FAFAFA]/90 dark:bg-[#0A0A0A]/70 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="font-['Poppins'] font-black text-[16px] uppercase tracking-[0.02em] leading-none text-[#111111] dark:text-white"
          >
            OOH MY AD !
          </Link>
          <Link
            to="/"
            className="flex items-center gap-1.5 text-[13px] text-[#6B7280] dark:text-white/50 transition-colors hover:text-[#111111] dark:hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour à l'accueil
          </Link>
        </div>
      </header>

      {/* Page body */}
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-20">
        <span className="text-[11px] font-medium uppercase tracking-[0.25em] text-[#9CA3AF] dark:text-white/40">
          Informations légales
        </span>
        <h1 className="mt-4 font-['Bebas_Neue'] text-[clamp(36px,5vw,64px)] leading-[0.95] text-[#111111] dark:text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-[15px] text-[#6B7280] dark:text-white/60">{subtitle}</p>
        )}
        <p className="mt-3 text-[12px] text-[#9CA3AF] dark:text-white/40">
          Dernière mise à jour : {updatedAt}
        </p>

        <div className="prose-legal mt-12 space-y-10">{children}</div>
      </main>

      <Footer />
    </div>
  )
}

/* ── Reusable text primitives — used inside legal pages ─────────────── */

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-['Bebas_Neue'] text-2xl tracking-tight text-[#111111] dark:text-white md:text-3xl">
        {title}
      </h2>
      <div className="mt-4 space-y-3 text-[14px] leading-relaxed text-[#374151] dark:text-white/70">
        {children}
      </div>
    </section>
  )
}

export function LegalDl({ items }: { items: { label: string; value: React.ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-xl border border-[#E5E5E5] dark:border-white/[0.06] bg-white dark:bg-white/[0.02] p-5 sm:grid-cols-[180px_1fr]">
      {items.map((item, i) => (
        <div key={i} className="contents">
          <dt className="text-[12px] font-medium uppercase tracking-[0.1em] text-[#9CA3AF] dark:text-white/40">
            {item.label}
          </dt>
          <dd className="text-[14px] text-[#111111] dark:text-white/80">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}
