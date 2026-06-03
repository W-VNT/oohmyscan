import { useState, type FormEvent } from 'react'
import { Helmet } from 'react-helmet-async'

const STORAGE_KEY = 'landing_access'
const VALIDITY_MS = 30 * 24 * 60 * 60 * 1000 // 30 jours
const PASSWORD = import.meta.env.VITE_LANDING_PASSWORD ?? ''

function hasValidAccess(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return false
    const ts = parseInt(stored, 10)
    if (isNaN(ts)) return false
    return Date.now() - ts < VALIDITY_MS
  } catch {
    return false
  }
}

export function LandingGate({ children }: { children: React.ReactNode }) {
  const [granted, setGranted] = useState(hasValidAccess)
  const [pw, setPw] = useState('')
  const [error, setError] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Si pas de password configuré, ouvre l'accès (utile en dev sans .env)
  if (!PASSWORD) return <>{children}</>

  if (granted) return <>{children}</>

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    // Léger délai pour éviter une attaque par timing
    setTimeout(() => {
      if (pw === PASSWORD) {
        localStorage.setItem(STORAGE_KEY, Date.now().toString())
        setGranted(true)
      } else {
        setError(true)
        setSubmitting(false)
      }
    }, 200)
  }

  return (
    <>
      <Helmet>
        <title>Espace réservé — OOH MY AD !</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div
        className="flex min-h-screen items-center justify-center bg-[#F5C400] px-6"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        <div className="w-full max-w-sm">
          <div className="text-center font-['Poppins'] font-black text-[32px] uppercase tracking-[0.02em] leading-none text-[#111111]">
            OOH MY AD !
          </div>

          <div className="mt-14 text-center">
            <h1 className="font-['Bebas_Neue'] text-[36px] leading-none tracking-tight text-[#111111]">
              Espace réservé.
            </h1>
            <p className="mx-auto mt-4 max-w-[280px] text-[14px] leading-relaxed text-[#6B7280]">
              Le site ouvre bientôt. Accès sur invitation pour le moment.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-10 space-y-3">
            <input
              type="password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value)
                setError(false)
              }}
              placeholder="Mot de passe"
              autoComplete="off"
              autoFocus
              disabled={submitting}
              className="w-full rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-[14px] text-[#111111] placeholder-[#9CA3AF] outline-none transition-colors focus:border-[#0A0A0A] disabled:opacity-60"
            />
            {error && (
              <p className="text-center text-[12px] text-red-600">Mot de passe incorrect.</p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full border border-[#0A0A0A] bg-[#0A0A0A] py-3 text-[14px] font-medium text-white transition-all hover:bg-transparent hover:text-[#0A0A0A] disabled:cursor-wait"
            >
              {submitting ? 'Vérification...' : 'Entrer'}
            </button>
          </form>

          <p className="mt-10 text-center text-[11px] text-[#9CA3AF]">
            Vous représentez une marque ?{' '}
            <a
              href="mailto:devis@oohmyad.com"
              className="underline decoration-[#9CA3AF]/40 underline-offset-2 transition-colors hover:text-[#111111]"
            >
              devis@oohmyad.com
            </a>
          </p>
        </div>
      </div>
    </>
  )
}
