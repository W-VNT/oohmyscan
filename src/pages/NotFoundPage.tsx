import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { ArrowLeft } from 'lucide-react'
import { Footer } from '@/components/landing/Footer'

export function NotFoundPage() {
  return (
    <>
      <Helmet>
        <title>Page introuvable — OOH MY AD !</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div
        className="flex min-h-screen flex-col bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#111111] dark:text-[#F5F5F5]"
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

        {/* Main */}
        <main className="flex flex-1 items-center justify-center px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <p className="font-['Bebas_Neue'] text-[clamp(120px,18vw,200px)] leading-none tracking-tight text-[#E5E5E5] dark:text-white/[0.08]">
              404
            </p>
            <h1 className="-mt-2 font-['Bebas_Neue'] text-[clamp(32px,4vw,48px)] leading-tight text-[#111111] dark:text-white md:-mt-4">
              Page introuvable.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-[#6B7280] dark:text-white/60">
              Cette page n'existe pas ou a été déplacée. Vous pouvez revenir à l'accueil ou
              découvrir nos solutions.
            </p>

            <div className="mt-10 flex justify-center">
              <Link
                to="/"
                className="rounded-full border border-[#0A0A0A] dark:border-white bg-[#0A0A0A] dark:bg-white px-6 py-3 text-[13px] font-medium text-white dark:text-[#0A0A0A] transition-all hover:bg-transparent hover:text-[#0A0A0A] dark:hover:bg-transparent dark:hover:text-white"
              >
                Retour à l'accueil
              </Link>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
