import { Helmet } from 'react-helmet-async'
import { LegalLayout, LegalSection } from './LegalLayout'

export function ConfidentialitePage() {
  return (
    <>
      <Helmet>
        <title>Politique de confidentialité — OOH MY AD !</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <LegalLayout
        title="Politique de confidentialité"
        subtitle="Comment OOH MY AD ! collecte, utilise et protège vos données personnelles, conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés."
        updatedAt="3 juin 2026"
      >
        <LegalSection title="Responsable du traitement">
          <p>
            Le responsable du traitement des données personnelles collectées sur ce site est
            la société <strong>OOH MY AD !</strong> (SAS), dont le siège social est situé au
            72 Avenue Maréchal de Saxe, 69003 Lyon.
          </p>
          <p>
            Pour toute question relative à la protection de vos données, vous pouvez nous
            contacter à l'adresse{' '}
            <a
              href="mailto:devis@oohmyad.com"
              className="underline decoration-[#F5C400]/60 underline-offset-4 hover:text-[#F5C400]"
            >
              devis@oohmyad.com
            </a>
            .
          </p>
        </LegalSection>

        <LegalSection title="Données collectées">
          <p>
            Nous collectons uniquement les données que vous nous transmettez volontairement
            via notre formulaire de contact :
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Nom ou raison sociale</li>
            <li>Adresse email</li>
            <li>Ville cible (facultatif)</li>
            <li>Famille de supports d'intérêt (facultatif)</li>
            <li>Contenu de votre message (incluant éventuellement un budget indicatif)</li>
          </ul>
          <p>
            Aucune donnée n'est collectée à votre insu. Nous n'utilisons ni cookies de
            traçage, ni outils d'analyse d'audience tiers (Google Analytics, Meta Pixel,
            etc.), ni technologie de fingerprinting.
          </p>
        </LegalSection>

        <LegalSection title="Finalités et bases légales">
          <p>Vos données sont traitées dans le but exclusif de :</p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Répondre à votre demande de devis ou d'information</li>
            <li>Établir un échange commercial à votre initiative</li>
            <li>Vous transmettre une proposition adaptée à votre projet</li>
          </ul>
          <p>
            La base légale du traitement repose sur l'<strong>exécution de mesures
            précontractuelles</strong> prises à votre demande (art. 6.1.b du RGPD).
          </p>
        </LegalSection>

        <LegalSection title="Destinataires des données">
          <p>
            Vos données sont exclusivement destinées aux équipes commerciales et
            administratives de OOH MY AD !. Elles ne sont ni vendues, ni louées, ni cédées à
            des tiers à des fins commerciales.
          </p>
          <p>
            Elles peuvent être traitées par nos sous-traitants techniques (hébergeur, service
            d'envoi d'emails) dans le strict cadre de leur mission et sous notre contrôle, et
            uniquement au sein de l'Union Européenne.
          </p>
        </LegalSection>

        <LegalSection title="Durée de conservation">
          <p>
            Vos données sont conservées pendant la durée nécessaire à l'instruction de votre
            demande, puis pendant <strong>3 ans à compter du dernier contact</strong> de votre
            part, à des fins de prospection commerciale, conformément aux recommandations de
            la CNIL.
          </p>
          <p>
            Au-delà, les données sont supprimées ou anonymisées, sauf obligation légale de
            conservation (facturation, comptabilité…).
          </p>
        </LegalSection>

        <LegalSection title="Hébergement et sécurité">
          <p>
            Le site et les données collectées sont hébergés en France par{' '}
            <strong>OVH SAS</strong> (2 rue Kellermann, 59100 Roubaix). Aucun transfert de
            données hors de l'Union Européenne n'est effectué.
          </p>
          <p>
            Nous mettons en œuvre des mesures techniques et organisationnelles appropriées
            pour protéger vos données contre la perte, l'altération ou l'accès non autorisé.
          </p>
        </LegalSection>

        <LegalSection title="Vos droits">
          <p>
            Conformément au RGPD et à la loi Informatique et Libertés, vous disposez à tout
            moment des droits suivants sur vos données :
          </p>
          <ul className="ml-5 list-disc space-y-1.5">
            <li>Droit d'accès et de copie</li>
            <li>Droit de rectification</li>
            <li>Droit à l'effacement (« droit à l'oubli »)</li>
            <li>Droit à la limitation du traitement</li>
            <li>Droit d'opposition au traitement</li>
            <li>Droit à la portabilité de vos données</li>
            <li>
              Droit de définir des directives relatives au sort de vos données après votre
              décès
            </li>
          </ul>
          <p>
            Pour exercer ces droits, écrivez-nous à{' '}
            <a
              href="mailto:devis@oohmyad.com"
              className="underline decoration-[#F5C400]/60 underline-offset-4 hover:text-[#F5C400]"
            >
              devis@oohmyad.com
            </a>{' '}
            en précisant votre demande. Une réponse vous sera apportée dans un délai maximum
            d'un mois.
          </p>
        </LegalSection>

        <LegalSection title="Réclamation auprès de la CNIL">
          <p>
            Si vous estimez, après nous avoir contactés, que vos droits ne sont pas
            respectés, vous pouvez adresser une réclamation à la{' '}
            <a
              href="https://www.cnil.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-[#F5C400]/60 underline-offset-4 hover:text-[#F5C400]"
            >
              Commission Nationale de l'Informatique et des Libertés (CNIL)
            </a>
            , 3 place de Fontenoy, 75007 Paris.
          </p>
        </LegalSection>

        <LegalSection title="Cookies">
          <p>
            Ce site n'utilise <strong>aucun cookie de traçage</strong> ni outil de mesure
            d'audience tiers. Seuls les cookies strictement nécessaires au fonctionnement
            technique du site peuvent être déposés ; ceux-ci ne nécessitent pas votre
            consentement préalable.
          </p>
        </LegalSection>
      </LegalLayout>
    </>
  )
}
