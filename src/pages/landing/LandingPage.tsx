import { Helmet } from 'react-helmet-async'
import { Navbar } from '@/components/landing/Navbar'
import { SmoothScroll } from '@/components/landing/SmoothScroll'
import { HeroC } from '@/components/landing/heroes/HeroC'
import { TrustSection } from '@/components/landing/TrustSection'
import { ConceptSection } from '@/components/landing/ConceptSection'
import { SupportsB } from '@/components/landing/supports/SupportsB'
import { ProcessC } from '@/components/landing/process/ProcessC'
import { WhyUsSection } from '@/components/landing/WhyUsSection'
import { ContactSection } from '@/components/landing/ContactSection'
import { Footer } from '@/components/landing/Footer'

export function LandingPage() {
  return (
    <>
      <Helmet>
        <title>OOH MY AD ! — Publicité de proximité captive partout en France</title>
        <meta
          name="description"
          content="Diffusez votre campagne sur des supports captifs : sacs de boulangerie, pharmacies, taxis, sets de table, sous-bocks. Réseau national. Brief → terrain en 5 jours."
        />
        <meta property="og:title" content="OOH MY AD ! — Votre pub là où les gens s'arrêtent" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://oohmyad.com/images/supports/hero.png" />
        <meta
          property="og:description"
          content="6 supports de proximité captifs déployés partout en France."
        />
        <meta property="og:url" content="https://oohmyad.com" />
        <link rel="canonical" href="https://oohmyad.com" />
      </Helmet>

      <SmoothScroll>
        <div className="min-h-screen bg-white dark:bg-[#0A0A0A] text-[#1A1A1A] dark:text-[#F5F5F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Navbar />
          <HeroC />
          <TrustSection />
          <ConceptSection />
          <SupportsB />
          <ProcessC />
          <WhyUsSection />
          <ContactSection />
          <Footer />
        </div>
      </SmoothScroll>
    </>
  )
}
