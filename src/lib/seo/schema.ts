/**
 * Schema.org JSON-LD pour le SEO de la landing publique.
 *
 * Structure @graph : plusieurs entites liees par @id.
 *  - Organization : identite entreprise (Knowledge Graph Google)
 *  - LocalBusiness : siege social + zone d'intervention
 *  - Service x N : une entree par famille de supports (rich snippets)
 *
 * A verifier apres deploy avec :
 *  - https://search.google.com/test/rich-results
 *  - https://validator.schema.org/
 */

import { FAMILLES } from '@/data/familles'

const SITE_URL = 'https://oohmyad.fr'
const ORG_ID = `${SITE_URL}/#organization`
const BUSINESS_ID = `${SITE_URL}/#localbusiness`

const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '72 Avenue Marechal de Saxe',
  postalCode: '69003',
  addressLocality: 'Lyon',
  addressRegion: 'Auvergne-Rhone-Alpes',
  addressCountry: 'FR',
} as const

const AREA_FRANCE = {
  '@type': 'Country',
  name: 'France',
} as const

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': ORG_ID,
  name: 'OOH MY AD !',
  legalName: 'OOH MY AD',
  alternateName: 'OOHMYAD',
  url: SITE_URL,
  logo: {
    '@type': 'ImageObject',
    url: `${SITE_URL}/images/logo-oohmyad-black.svg`,
    caption: 'OOH MY AD !',
  },
  image: `${SITE_URL}/og-image.jpg`,
  description:
    'Media de proximite captif pour marques et agences : 5 familles de supports outdoor + digital, deployes partout en France. Brief gratuit, devis 24h.',
  email: 'devis@oohmyad.com',
  vatID: 'FR33851670968',
  taxID: '851670968',
  iso6523Code: '0002:851670968',
  foundingDate: '2019-06-12',
  address: ADDRESS,
  areaServed: AREA_FRANCE,
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    email: 'devis@oohmyad.com',
    availableLanguage: ['French'],
    areaServed: 'FR',
  },
}

const LOCAL_BUSINESS = {
  '@type': 'LocalBusiness',
  '@id': BUSINESS_ID,
  name: 'OOH MY AD !',
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo-oohmyad-black.svg`,
  image: `${SITE_URL}/og-image.jpg`,
  email: 'devis@oohmyad.com',
  priceRange: '€€',
  address: ADDRESS,
  areaServed: AREA_FRANCE,
  parentOrganization: { '@id': ORG_ID },
}

function slugToServiceId(id: string): string {
  return `${SITE_URL}/#service-${id}`
}

/**
 * Un Service par famille de supports. Utilise les descriptions du fichier
 * familles.ts comme source de verite unique (evite de dupliquer le texte).
 */
const SERVICES = FAMILLES.map((f) => ({
  '@type': 'Service',
  '@id': slugToServiceId(f.id),
  provider: { '@id': ORG_ID },
  name: toTitleCase(f.name),
  description: f.description,
  serviceType: 'Publicite exterieure',
  areaServed: AREA_FRANCE,
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: toTitleCase(f.name),
    itemListElement: f.produits.map((p) => ({
      '@type': 'Offer',
      itemOffered: {
        '@type': 'Service',
        name: p.name,
        description: p.detail,
      },
    })),
  },
}))

const DIGITAL_SERVICE = {
  '@type': 'Service',
  '@id': `${SITE_URL}/#service-digital`,
  provider: { '@id': ORG_ID },
  name: 'Digital',
  description:
    'SMS/RCS et Display mobile geolocalise pour amplifier une campagne outdoor : 92% des SMS lus en 4 minutes, 2,1 milliards d\'impressions/jour sur 18 000 apps FR premium.',
  serviceType: 'Publicite digitale',
  areaServed: AREA_FRANCE,
}

/**
 * Convertit "DIFFUSION SUR-MESURE" en "Diffusion sur-mesure".
 * Les noms dans familles.ts sont en MAJ pour l'UI, mais Schema.org
 * prefere du Title Case standard.
 */
function toTitleCase(input: string): string {
  return input
    .toLowerCase()
    .replace(/(^|[\s-])(.)/g, (_, sep: string, ch: string) => sep + ch.toUpperCase())
}

/**
 * Retourne le @graph complet pour la landing page.
 * A stringifier et injecter dans un <script type="application/ld+json">.
 */
export function getLandingPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [ORGANIZATION, LOCAL_BUSINESS, ...SERVICES, DIGITAL_SERVICE],
  }
}
