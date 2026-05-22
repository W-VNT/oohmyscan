import { Helmet } from 'react-helmet-async'
import { NavbarV2 } from '@/components/landing/v2/NavbarV2'
import { SmoothScroll } from '@/components/landing/SmoothScroll'
import { HeroV2 } from '@/components/landing/v2/HeroV2'
import { TrustSectionV2 } from '@/components/landing/v2/TrustSectionV2'
import { ConceptSectionV2 } from '@/components/landing/v2/ConceptSectionV2'
import { FamillesSectionV2 } from '@/components/landing/v2/FamillesSectionV2'
import { DigitalSectionV2 } from '@/components/landing/v2/DigitalSectionV2'
import { ProcessV2 } from '@/components/landing/v2/ProcessV2'
import { WhyUsSectionV2 } from '@/components/landing/v2/WhyUsSectionV2'
import { ContactSectionV2 } from '@/components/landing/v2/ContactSectionV2'
import { FooterV2 } from '@/components/landing/v2/FooterV2'

export function LandingPageV2() {
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
        <div className="min-h-screen bg-[#111111] font-v2-body">
          <NavbarV2 />
          <HeroV2 />
          <TrustSectionV2 />
          <ConceptSectionV2 />
          <FamillesSectionV2 />
          <DigitalSectionV2 />
          <ProcessV2 />
          <WhyUsSectionV2 />
          <ContactSectionV2 />
          <FooterV2 />
        </div>
      </SmoothScroll>
    </>
  )
}
