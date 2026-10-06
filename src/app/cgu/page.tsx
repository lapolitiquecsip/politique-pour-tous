import Link from "next/link";
import PageJuridique, { ou } from "@/components/legal/PageJuridique";
import { EDITEUR } from "@/lib/constants";

export const metadata = {
  title: "Conditions générales d'utilisation | La Politique, C'est Simple",
  description: "Règles d'accès et d'utilisation du site et des comptes.",
};

export default function CGU() {
  return (
    <PageJuridique
      surtitre="Conditions générales d'utilisation"
      titre="CGU"
      intro={<p>Les présentes conditions encadrent l&apos;utilisation du site <strong>lapolitiquecestsimple.fr</strong>, édité par {ou(EDITEUR.nom)} (voir les{" "}
        <Link href="/mentions-legales" className="underline">mentions légales</Link>). Utiliser le site, c&apos;est les accepter ; les abonnements payants
        relèvent en plus des <Link href="/cgv" className="underline">conditions générales de vente</Link>.</p>}
      sections={[
        {
          id: "service", titre: "Le service",
          contenu: (
            <>
              <p>Le site explique la vie politique et législative française et européenne à partir de sources publiques : lois, votes,
                élus, institutions, Journal officiel, élections. Il est gratuit et accessible sans compte ; certaines fonctions demandent un
                compte gratuit (suivre des élus, enregistrer des contenus) ou un abonnement payant (offres Premium et Pro).</p>
              <p>Le site est indépendant de tout parti, élu ou institution. Il présente les positions et les votes de chacun selon les mêmes
                règles, sans consigne de vote.</p>
            </>
          ),
        },
        {
          id: "compte", titre: "Votre compte",
          contenu: (
            <>
              <p>Vous vous engagez à fournir une adresse e-mail valide et à garder votre mot de passe confidentiel. Le compte est personnel.</p>
              <p>Vous pouvez à tout moment télécharger vos données ou supprimer votre compte depuis <strong>Mon compte → Mes données</strong>.</p>
              <p>L&apos;éditeur peut suspendre un compte utilisé pour nuire au service (robots, tentatives d&apos;intrusion, revente des contenus),
                après vous en avoir informé, sauf urgence.</p>
            </>
          ),
        },
        {
          id: "mineurs", titre: "Mineurs",
          contenu: (
            <p>Le site est ouvert à tous. La création d&apos;un compte est réservée aux personnes de 15 ans et plus ; en dessous, elle demande
              l&apos;accord d&apos;un titulaire de l&apos;autorité parentale (loi « Informatique et Libertés », art. 45). La souscription d&apos;un abonnement
              payant est réservée aux majeurs ou se fait avec l&apos;accord d&apos;un parent.</p>
          ),
        },
        {
          id: "contenus", titre: "Fiabilité des contenus",
          contenu: (
            <>
              <p>Les informations proviennent de sources publiques citées sur chaque page (Assemblée nationale, Sénat, Légifrance, Journal
                officiel, instituts de sondage…) et sont mises à jour automatiquement. Malgré le soin apporté, elles peuvent comporter des
                erreurs ou des retards : <strong>seuls les textes officiels font foi</strong>. Le site ne fournit pas de conseil juridique.</p>
              <p><strong>Intelligence artificielle.</strong>{" "}Des résumés, titres, biographies, analyses et récapitulatifs sont rédigés
                automatiquement par des modèles d&apos;IA à partir des documents officiels (règlement européen sur l&apos;IA, art. 50). Ils
                peuvent être inexacts ; les pages renvoient aux documents d&apos;origine.</p>
              <p><strong>Affaires judiciaires.</strong>{" "}Les procédures mentionnées le sont d&apos;après des sources publiques citées ; toute
                personne mise en cause est présumée innocente tant qu&apos;une décision de justice définitive n&apos;a pas établi sa culpabilité.</p>
              <p><strong>Sondages.</strong>{" "}Ils sont publiés avec les mentions prévues par la loi du 19 juillet 1977 et retirés la veille et le
                jour de chaque tour de scrutin. Un sondage n&apos;est pas une prédiction.</p>
              <p>Une erreur ? Signalez-la depuis la <Link href="/contact">page Contact</Link> : elle est corrigée, et les personnes citées
                disposent d&apos;un droit de réponse (voir les mentions légales).</p>
            </>
          ),
        },
        {
          id: "usage", titre: "Usages interdits",
          contenu: (
            <ul>
              <li>Extraire massivement les contenus propres au site (aspiration, revente) ; les données publiques d&apos;origine restent
                réutilisables à leur source, selon leur licence.</li>
              <li>Tenter d&apos;accéder aux données d&apos;autres membres ou de perturber le fonctionnement du site.</li>
              <li>Utiliser le formulaire de contact pour du démarchage, des menaces ou des propos illicites.</li>
            </ul>
          ),
        },
        {
          id: "parrainage", titre: "Programme de parrainage",
          contenu: (
            <>
              <p>Tout membre peut partager son lien de parrainage. Une personne arrivée par ce lien et inscrite dans les 90 jours lui est
                rattachée ; sur chacun de ses paiements d&apos;abonnement pendant la durée indiquée dans l&apos;espace « Parrainage », le parrain
                perçoit la commission affichée (20 % par défaut), calculée sur le montant payé.</p>
              <p>Une commission devient disponible après le délai de validation affiché (30 jours, qui couvre le délai de rétractation) ;
                elle est annulée si le paiement est remboursé, et reprise si elle avait déjà été versée. Les commissions disponibles sont
                virées automatiquement, dès le seuil atteint, sur le compte bancaire que le parrain a renseigné auprès de notre prestataire
                de paiement Stripe (vérification d&apos;identité exigée par la réglementation ; réservé aux majeurs).</p>
              <p>Le parrainage doit rester loyal : pas de publicité trompeuse, pas de parrainage de soi-même ou de comptes fictifs, pas de
                courriels non sollicités. Une fraude entraîne l&apos;annulation des commissions concernées. Les sommes perçues sont des revenus
                à déclarer par le parrain. L&apos;éditeur peut modifier le taux ou la durée pour l&apos;avenir, sans effet sur les commissions déjà acquises.</p>
            </>
          ),
        },
        {
          id: "responsabilite", titre: "Responsabilité",
          contenu: (
            <p>L&apos;éditeur met tout en œuvre pour assurer l&apos;accès au site mais ne peut garantir une disponibilité permanente
              (maintenance, panne d&apos;un hébergeur ou d&apos;une source officielle). Les liens vers des sites tiers (sources, vidéos) sont fournis
              pour information ; ces sites relèvent de leurs propres conditions. Rien dans les présentes ne limite les droits que vous tenez de la loi.</p>
          ),
        },
        {
          id: "donnees", titre: "Données personnelles",
          contenu: <p>Voir la <Link href="/confidentialite">politique de confidentialité et de cookies</Link>.</p>,
        },
        {
          id: "droit", titre: "Modification et droit applicable",
          contenu: (
            <p>Ces conditions peuvent évoluer ; la version en vigueur est celle publiée sur cette page, datée en tête. En cas de changement
              important, les membres en sont informés par e-mail. Elles sont soumises au droit français. En cas de litige, une solution amiable
              est recherchée d&apos;abord ; un consommateur peut saisir la juridiction de son domicile.</p>
          ),
        },
      ]}
    />
  );
}
