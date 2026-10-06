import Link from "next/link";
import PageJuridique, { ou } from "@/components/legal/PageJuridique";
import { EDITEUR, MEDIATEUR, CONTACT_EMAIL, PLANS } from "@/lib/constants";

export const metadata = {
  title: "Conditions générales de vente | La Politique, C'est Simple",
  description: "Abonnements Premium et Pro : prix, durée, résiliation, rétractation, garanties.",
};

const euros = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;

export default function CGV() {
  return (
    <PageJuridique
      surtitre="Conditions générales de vente"
      titre="CGV"
      intro={<p>Les présentes conditions s&apos;appliquent aux abonnements payants souscrits sur <strong>lapolitiquecestsimple.fr</strong>{" "}par
        un consommateur. Elles sont acceptées, avec leur date de version, au moment de la commande.</p>}
      sections={[
        {
          id: "vendeur", titre: "Le vendeur",
          contenu: (
            <ul>
              <li>{ou(EDITEUR.nom)}{EDITEUR.forme ? `, ${EDITEUR.forme}` : ""} — {ou(EDITEUR.adresse)}</li>
              <li>SIREN / SIRET : {ou(EDITEUR.siren)}{EDITEUR.rcs ? ` — ${EDITEUR.rcs}` : ""} · TVA : {ou(EDITEUR.tva)}</li>
              <li>Contact : {CONTACT_EMAIL}, <Link href="/contact">formulaire de contact</Link>, téléphone {ou(EDITEUR.telephone)}</li>
            </ul>
          ),
        },
        {
          id: "offres", titre: "Les offres et leurs prix",
          contenu: (
            <>
              <ul>
                <li><strong>Premium</strong> — {euros(PLANS.elite.monthly)} TTC par mois : décryptages complets des lois, suivi de vos élus, alertes personnalisées.</li>
                <li><strong>Pro</strong> — {euros(PLANS.pro.monthly)} TTC par mois, ou {euros(PLANS.pro.annually!)} TTC par an : en plus, suivi des
                  commissions, Journal officiel du jour expliqué, alertes sur les textes qui vous concernent, récapitulatif hebdomadaire, veille des candidats.</li>
              </ul>
              <p>Le détail de chaque offre figure sur la <Link href="/premium">page des offres</Link>. Les prix sont indiqués en euros, toutes taxes
                comprises ; ils peuvent évoluer, mais un changement de prix ne s&apos;applique à un abonnement en cours qu&apos;après en avoir
                informé l&apos;abonné au moins un mois avant l&apos;échéance concernée, l&apos;abonné restant libre de résilier.</p>
            </>
          ),
        },
        {
          id: "commande", titre: "Commande et paiement",
          contenu: (
            <>
              <p>La commande se passe depuis un compte connecté : choix de l&apos;offre, récapitulatif, acceptation des présentes CGV et demande
                d&apos;accès immédiat, puis paiement sur la page sécurisée de notre prestataire <strong>Stripe</strong>{" "}(carte bancaire). Le site ne voit ni
                ne conserve vos coordonnées bancaires.</p>
              <p>Le paiement est prélevé à la souscription, puis à chaque échéance. Le contrat est confirmé par un e-mail récapitulant l&apos;offre,
                son prix, ses conditions de renouvellement, de résiliation et de rétractation. Les factures sont disponibles sur demande.</p>
            </>
          ),
        },
        {
          id: "duree", titre: "Durée, renouvellement et résiliation",
          contenu: (
            <>
              <p>L&apos;abonnement est conclu pour un mois (ou un an pour l&apos;offre Pro annuelle) et se renouvelle automatiquement pour la même
                durée, au même prix, tant qu&apos;il n&apos;est pas résilié. Pour l&apos;abonnement annuel, un e-mail vous rappelle l&apos;échéance et votre
                faculté de ne pas renouveler, entre trois mois et un mois avant celle-ci (C. conso., art. L215-1).</p>
              <p><strong>Résiliation en ligne, à tout moment :</strong> <strong>Mon compte → Paramètres → « Résilier mon abonnement »</strong>, puis
                confirmation. Un e-mail accuse réception et indique la date de fin (C. conso., art. L215-1-1). La résiliation prend effet à la fin de
                la période déjà payée, jusqu&apos;à laquelle l&apos;accès est conservé ; aucun prélèvement n&apos;a lieu ensuite, sans frais.</p>
            </>
          ),
        },
        {
          id: "retractation", titre: "Droit de rétractation",
          contenu: (
            <>
              <p>Vous disposez de <strong>14 jours</strong>{" "}à compter de la souscription pour vous rétracter, sans avoir à donner de motif
                (C. conso., art. L221-18). Comme vous demandez, lors de la commande, à accéder au service immédiatement, la rétractation reste
                possible mais vous serez remboursé <strong>déduction faite du montant correspondant aux jours d&apos;accès déjà écoulés</strong>{" "}
                (art. L221-25). Le remboursement intervient dans les 14 jours, par le moyen de paiement utilisé.</p>
              <p>Pour vous rétracter, envoyez une déclaration sans ambiguïté via la <Link href="/contact">page Contact</Link>, à {CONTACT_EMAIL}{" "}ou par
                courrier à l&apos;adresse du vendeur, par exemple avec le modèle ci-dessous.</p>
              <div className="rounded-2xl border border-border bg-card p-4 text-sm">
                <p className="font-bold">Formulaire de rétractation (annexe à l&apos;article R221-1 du Code de la consommation)</p>
                <p className="mt-2">À l&apos;attention de {ou(EDITEUR.nom)}, {ou(EDITEUR.adresse)}, {CONTACT_EMAIL} :</p>
                <p className="mt-2">Je vous notifie par la présente ma rétractation du contrat portant sur la prestation de services ci-dessous :
                  [offre souscrite] — commandé le [date] — nom du consommateur : [nom] — adresse e-mail du compte : [e-mail] — adresse : [adresse] —
                  date : [date] — signature (en cas de courrier papier).</p>
              </div>
            </>
          ),
        },
        {
          id: "garanties", titre: "Garantie légale de conformité",
          contenu: (
            <p>Le service numérique fourni doit être conforme au contrat pendant toute la durée de l&apos;abonnement (C. conso., art. L224-25-1 et
              suivants). En cas de défaut, signalez-le via la <Link href="/contact">page Contact</Link> : nous le corrigeons sans frais dans un délai
              raisonnable, ou, à défaut, vous pouvez obtenir une réduction du prix ou la résolution du contrat. Les contenus d&apos;information
              du site, issus de sources publiques et en partie rédigés par intelligence artificielle, restent soumis aux réserves des{" "}
              <Link href="/cgu">conditions d&apos;utilisation</Link>.</p>
          ),
        },
        {
          id: "mediation", titre: "Réclamations et médiation",
          contenu: (
            <>
              <p>Adressez d&apos;abord toute réclamation via la <Link href="/contact">page Contact</Link> ; nous répondons sous 15 jours.</p>
              <p>À défaut d&apos;accord, vous pouvez recourir gratuitement au médiateur de la consommation (C. conso., art. L612-1) :{" "}
                <strong>{ou(MEDIATEUR.nom)}</strong>{MEDIATEUR.site ? ` — ${MEDIATEUR.site}` : ""}{MEDIATEUR.adresse ? ` — ${MEDIATEUR.adresse}` : ""},
                dans un délai d&apos;un an à compter de votre réclamation écrite.</p>
            </>
          ),
        },
        {
          id: "droit", titre: "Données personnelles et droit applicable",
          contenu: (
            <p>Les données liées à la commande sont traitées selon la <Link href="/confidentialite">politique de confidentialité</Link>. Les présentes
              CGV sont soumises au droit français ; le consommateur peut saisir, à son choix, la juridiction du lieu où il demeurait au moment de
              la conclusion du contrat ou celle du lieu du fait dommageable.</p>
          ),
        },
      ]}
    />
  );
}
