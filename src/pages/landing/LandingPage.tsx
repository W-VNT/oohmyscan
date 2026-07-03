import { Helmet } from 'react-helmet-async'
import { getLandingPageSchema } from '@/lib/seo/schema'
import { Navbar } from '@/components/landing/Navbar'
import { SmoothScroll } from '@/components/landing/SmoothScroll'
import { HeroC } from '@/components/landing/heroes/HeroC'
import { TrustSection } from '@/components/landing/TrustSection'
import { ConceptSection } from '@/components/landing/ConceptSection'
import { FamillesSection } from '@/components/landing/FamillesSection'
import { DigitalSection } from '@/components/landing/DigitalSection'
import { ProcessC } from '@/components/landing/process/ProcessC'
import { WhyUsSection } from '@/components/landing/WhyUsSection'
import { ContactSection } from '@/components/landing/ContactSection'
import { Footer } from '@/components/landing/Footer'

export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>OOH MY AD ! — Média de proximité captif</title>
        <meta
          name="description"
          content="Média de proximité captif pour marques et agences : 5 familles de supports outdoor + digital, déployés partout en France. Brief gratuit, devis 24h."
        />
        <meta property="og:title" content="OOH MY AD ! — Média de proximité captif" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://oohmyad.fr/og-image.jpg" />
        <meta
          property="og:description"
          content="Média de proximité captif pour marques et agences : 5 familles de supports outdoor + digital, déployés partout en France. Brief gratuit, devis 24h."
        />
        <meta property="og:locale" content="fr_FR" />
        <meta property="og:site_name" content="OOH MY AD !" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="OOH MY AD ! — Média de proximité captif" />
        <meta
          name="twitter:description"
          content="Média de proximité captif pour marques et agences : 5 familles de supports outdoor + digital, déployés partout en France."
        />
        <meta name="twitter:image" content="https://oohmyad.fr/og-image.jpg" />
        <meta property="og:url" content="https://oohmyad.fr" />
        <link rel="canonical" href="https://oohmyad.fr" />
        <script type="application/ld+json">
          {JSON.stringify(getLandingPageSchema())}
        </script>
      </Helmet>

      <SmoothScroll>
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#111111] dark:text-[#F5F5F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Navbar />
          <main>
            <HeroC />
            <TrustSection />
            <ConceptSection />
            <FamillesSection />
            <DigitalSection />
            <ProcessC />
            <WhyUsSection />
            <ContactSection />
          </main>
          <Footer />
        </div>
      </SmoothScroll>
    </>
  )
}
