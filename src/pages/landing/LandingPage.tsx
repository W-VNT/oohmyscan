import { Helmet } from 'react-helmet-async'
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
        <title>OOHMYAD — Publicite captive partout en France</title>
        <meta
          name="description"
          content="5 familles de supports publicitaires captifs : affichage de proximite, medias tactiques, reseaux ville & estival, animation terrain, digital. Partout en France."
        />
        <meta property="og:title" content="OOHMYAD — Votre pub la ou les gens s'arretent" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://oohmyad.com/og-image.jpg" />
        <meta
          property="og:description"
          content="5 familles de supports captifs deployes partout en France. Du terrain au digital."
        />
        <meta property="og:url" content="https://oohmyad.com" />
        <link rel="canonical" href="https://oohmyad.com" />
      </Helmet>

      <SmoothScroll>
        <div className="min-h-screen bg-[#FAFAFA] dark:bg-[#0A0A0A] text-[#111111] dark:text-[#F5F5F5]" style={{ fontFamily: "'Inter', sans-serif" }}>
          <Navbar />
          <HeroC />
          <TrustSection />
          <ConceptSection />
          <FamillesSection />
          <DigitalSection />
          <ProcessC />
          <WhyUsSection />
          <ContactSection />
          <Footer />
        </div>
      </SmoothScroll>
    </>
  )
}
