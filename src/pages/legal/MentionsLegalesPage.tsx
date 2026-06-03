import { Helmet } from 'react-helmet-async'
import { LegalLayout, LegalSection, LegalDl } from './LegalLayout'

export function MentionsLegalesPage() {
  return (
    <>
      <Helmet>
        <title>Mentions légales — OOH MY AD !</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <LegalLayout
        title="Mentions légales"
        subtitle="Conformément aux dispositions de l'article 6 de la loi n° 2004-575 du 21 juin 2004 pour la confiance dans l'économie numérique."
        updatedAt="3 juin 2026"
      >
        <LegalSection title="Éditeur du site">
          <LegalDl
            items={[
              { label: 'Raison sociale', value: 'OOH MY AD !' },
              { label: 'Forme juridique', value: 'Société par Actions Simplifiée (SAS)' },
              { label: 'Capital social', value: '1 841 250 €' },
              {
                label: 'Siège social',
                value: '72 Avenue Maréchal de Saxe, 69003 Lyon, France',
              },
              { label: 'SIREN', value: '851 670 968' },
              { label: 'SIRET', value: '851 670 968 00011' },
              { label: 'RCS', value: 'Lyon B 851 670 968' },
              { label: 'N° TVA intracommunautaire', value: 'FR33 851 670 968' },
              { label: 'Code APE', value: '70.10Z' },
              { label: 'Président', value: 'Camille Prot Legros' },
              {
                label: 'Contact',
                value: (
                  <a
                    href="mailto:devis@oohmyad.com"
                    className="underline decoration-[#F5C400]/60 underline-offset-4 hover:text-[#F5C400]"
                  >
                    devis@oohmyad.com
                  </a>
                ),
              },
            ]}
          />
        </LegalSection>

        <LegalSection title="Directeur de la publication">
          <p>
            Monsieur William Viennet, en sa qualité de représentant désigné par la société
            OOH MY AD !.
          </p>
        </LegalSection>

        <LegalSection title="Hébergeur">
          <LegalDl
            items={[
              { label: 'Société', value: 'OVH SAS' },
              { label: 'Adresse', value: '2 rue Kellermann, 59100 Roubaix, France' },
              { label: 'Téléphone', value: '+33 9 72 10 10 07' },
              {
                label: 'Site web',
                value: (
                  <a
                    href="https://www.ovhcloud.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[#F5C400]/60 underline-offset-4 hover:text-[#F5C400]"
                  >
                    ovhcloud.com
                  </a>
                ),
              },
            ]}
          />
        </LegalSection>

        <LegalSection title="Propriété intellectuelle">
          <p>
            L'ensemble du contenu du site (textes, graphismes, logos, icônes, images, vidéos,
            sons, ainsi que leur mise en forme) est la propriété exclusive de la société OOH
            MY AD !, à l'exception des marques, logotypes ou contenus appartenant à des
            partenaires ou auteurs tiers.
          </p>
          <p>
            Toute reproduction, représentation, modification, publication ou adaptation, totale
            ou partielle, des éléments du site, quel que soit le moyen ou le procédé utilisé,
            est interdite sans l'autorisation écrite préalable de OOH MY AD !.
          </p>
        </LegalSection>

        <LegalSection title="Liens hypertextes">
          <p>
            Le site peut contenir des liens vers des sites tiers. OOH MY AD ! n'exerce aucun
            contrôle sur ces sites et décline toute responsabilité quant à leur contenu, à
            leur politique de confidentialité ou à leurs conditions d'utilisation.
          </p>
        </LegalSection>

        <LegalSection title="Données personnelles">
          <p>
            Le traitement des données personnelles collectées via ce site est régi par notre{' '}
            <a
              href="/confidentialite"
              className="underline decoration-[#F5C400]/60 underline-offset-4 hover:text-[#F5C400]"
            >
              politique de confidentialité
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="Droit applicable">
          <p>
            Les présentes mentions légales sont régies par le droit français. En cas de litige,
            et après tentative de résolution amiable, les tribunaux français seront seuls
            compétents.
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  )
}
