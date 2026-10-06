import Link from "next/link";
import PageJuridique, { ou } from "@/components/legal/PageJuridique";
import RefusMesure from "@/components/analytics/RefusMesure";
import { EDITEUR, CONTACT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: "Confidentialité et cookies | La Politique, C'est Simple",
  description: "Quelles données, pourquoi, combien de temps, chez qui, et comment exercer vos droits.",
};

const TRAITEMENTS: [string, string, string, string][] = [
  ["Compte : adresse e-mail, mot de passe (stocké chiffré), dates de création et de connexion",
    "Vous connecter, sécuriser le compte", "Exécution du contrat (RGPD art. 6.1.b)", "Jusqu'à la suppression du compte"],
  ["Profil facultatif : tranche d'âge, catégorie socioprofessionnelle, secteur, logement, enfants, commune ou département, centres d'intérêt, rythme et périmètre des alertes",
    "Choisir les alertes et le récapitulatif qui vous concernent", "Exécution du contrat (service demandé)", "Jusqu'à modification ou suppression du compte"],
  ["Élus suivis (députés, sénateurs, eurodéputés), ministères et commissions suivis",
    "Vous informer de leurs votes et de leur actualité", "Exécution du contrat", "Jusqu'à ce que vous cessiez de les suivre"],
  ["Partis et candidats suivis ; positions données sur les lois (pour, contre, abstention)",
    "Mêmes finalités ; ces informations peuvent révéler une opinion politique", "Consentement explicite (RGPD art. 9.2.a), retirable à tout moment",
    "Jusqu'au retrait de l'accord (les suivis concernés sont alors effacés) ou à la suppression du compte"],
  ["Alertes envoyées et récapitulatifs", "Historique dans votre espace, éviter les doublons", "Exécution du contrat", "12 mois"],
  ["Abonnement : offre, statut, identifiant client Stripe, accords donnés à la commande (CGV, accès immédiat)",
    "Gérer l'abonnement, prouver les accords", "Contrat ; obligation légale (preuve, comptabilité)",
    "Durée du compte ; pièces comptables 10 ans chez notre prestataire de paiement (code de commerce, art. L123-22)"],
  ["Parrainage : code, filleuls rattachés, commissions, identifiant du compte de versement Stripe (votre identité et votre IBAN sont saisis et conservés chez Stripe, jamais chez nous)",
    "Calculer et virer automatiquement les commissions", "Contrat ; obligations comptables et fiscales", "Durée du compte ; pièces comptables 10 ans"],
  ["Formulaire de contact : nom, e-mail, message", "Vous répondre", "Intérêt légitime (art. 6.1.f)", "2 ans"],
  ["Mesure d'audience : pages vues, provenance, type d'appareil, identifiant tiré au hasard",
    "Statistiques de fréquentation anonymes", "Intérêt légitime ; traceur exempté de consentement (lignes directrices CNIL)", "13 mois"],
];

const TRACEURS: [string, string, string][] = [
  ["sb-…-auth-token (Supabase)", "Garder votre session ouverte", "Strictement nécessaire — jusqu'à la déconnexion"],
  ["lpcs.tier, lpcs.connecte, lpcs.courriel", "Afficher tout de suite votre offre et votre compte", "Strictement nécessaire — effacés à la déconnexion"],
  ["theme", "Mémoriser le thème clair ou sombre choisi", "Préférence d'interface — sans durée"],
  ["lpcs.visiteur, lpcs.session", "Mesure d'audience anonyme (voir ci-dessous)", "Exempté — 13 mois au plus ; la session s'efface à la fermeture de l'onglet"],
  ["lpcs.parrain", "Créditer la personne qui vous a recommandé le site, si vous êtes arrivé par son lien", "Fonctionnel — 90 jours"],
  ["lpcs.sans-mesure", "Retenir votre refus de la mesure d'audience", "Strictement nécessaire — sans durée"],
  ["lpcs_followed_candidates, lpcs_commune_feed, pwa-install-dismissed", "Candidats suivis sans compte, commune choisie, bannière d'installation fermée", "Préférences restant sur votre appareil, jamais transmises"],
];

const cellule = "border-b border-border px-3 py-2 align-top";

export default function Confidentialite() {
  return (
    <PageJuridique
      surtitre="RGPD · loi Informatique et Libertés · ePrivacy"
      titre="Confidentialité"
      intro={<p>Le site n&apos;affiche aucune publicité, ne vend aucune donnée et n&apos;utilise aucun traceur publicitaire. Voici, sans jargon, ce que
        nous traitons, pourquoi, combien de temps, chez qui, et comment exercer vos droits.</p>}
      sections={[
        {
          id: "responsable", titre: "Responsable du traitement",
          contenu: <p>{ou(EDITEUR.nom)}, {ou(EDITEUR.adresse)} — {CONTACT_EMAIL} ou <Link href="/contact">formulaire de contact</Link>.
            Pour toute question sur vos données, écrivez-nous en précisant « Données personnelles ».</p>,
        },
        {
          id: "traitements", titre: "Données, finalités, bases légales et durées",
          contenu: (
            <>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[640px] text-left text-[13px]">
                  <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr><th className={cellule}>Données</th><th className={cellule}>Pourquoi</th><th className={cellule}>Base légale</th><th className={cellule}>Durée</th></tr>
                  </thead>
                  <tbody>
                    {TRAITEMENTS.map(([d, f, b, t]) => (
                      <tr key={d}><td className={cellule}>{d}</td><td className={cellule}>{f}</td><td className={cellule}>{b}</td><td className={cellule}>{t}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Les données facultatives du profil ne sont jamais obligatoires : sans elles, vous recevez simplement des alertes moins ciblées.</p>
            </>
          ),
        },
        {
          id: "opinions", titre: "Opinions politiques : une protection renforcée",
          contenu: (
            <>
              <p>Suivre un parti ou un candidat, ou donner votre position sur une loi, peut laisser deviner une opinion politique — une
                donnée « sensible » (RGPD art. 9). Nous ne l&apos;enregistrons qu&apos;avec votre accord explicite, demandé au moment de l&apos;action et
                daté. Ces informations ne sont visibles que de vous, ne sont jamais partagées ni utilisées à d&apos;autres fins que vos alertes et
                votre historique ; les statistiques affichées sont des totaux anonymes.</p>
              <p>Retirer votre accord : <strong>Mon compte → Alertes</strong>{" "}(les partis et candidats suivis sont alors effacés), ou{" "}
                <strong>Mon compte → Mes données → « Effacer mes positions sur les lois »</strong>.</p>
            </>
          ),
        },
        {
          id: "tri", titre: "Tri automatique des alertes",
          contenu: (
            <p>Le choix des textes qui vous sont signalés est automatique : un texte vous est envoyé s&apos;il touche un public, un secteur ou un
              territoire de votre profil, selon des règles fixes. Ce tri ne produit aucun effet juridique et ne vous affecte pas de manière
              significative (RGPD art. 22) ; vous pouvez à tout moment modifier votre profil ou couper ces alertes.</p>
          ),
        },
        {
          id: "destinataires", titre: "Qui y a accès : nos prestataires",
          contenu: (
            <>
              <p>Seul l&apos;éditeur accède à vos données. Les prestataires techniques ci-dessous les traitent pour notre compte, sur nos instructions :</p>
              <ul>
                <li><strong>Supabase</strong> — base de données et comptes, hébergés dans l&apos;UE (Irlande).</li>
                <li><strong>Stripe Payments Europe</strong>{" "}(Irlande) — paiement ; vos coordonnées bancaires ne nous sont jamais transmises.</li>
                <li><strong>Resend</strong>{" "}(États-Unis) — envoi des e-mails (alertes, récapitulatif, confirmations).</li>
                <li><strong>GitHub</strong>{" "}(États-Unis) — hébergement des pages : votre adresse IP est vue lors du chargement, comme pour tout site.</li>
              </ul>
              <p>Les transferts hors de l&apos;UE sont encadrés par le cadre de protection des données UE–États-Unis ou par les clauses
                contractuelles types de la Commission européenne.</p>
              <p><strong>Intelligence artificielle.</strong>{" "}Les modèles d&apos;IA (Google Gemini, DeepSeek) ne reçoivent que des textes publics (lois,
                décrets, comptes rendus). Seule exception : le sujet que vous tapez dans « Tout sur un sujet » est envoyé à Google Gemini, sans votre
                nom ni votre adresse — n&apos;y écrivez pas d&apos;informations personnelles.</p>
              <p><strong>Contenus de tiers.</strong>{" "}Les vidéos ne se chargent depuis YouTube (Google) que lorsque vous cliquez pour les lire, en mode
                « confidentialité renforcée » ; certaines photos proviennent des sites de l&apos;Assemblée, du Sénat ou de Wikimedia Commons, qui voient
                alors votre adresse IP.</p>
            </>
          ),
        },
        {
          id: "cookies", titre: "Cookies et stockage dans votre navigateur",
          contenu: (
            <>
              <p>Le site n&apos;utilise que des traceurs nécessaires à son fonctionnement ou exemptés de consentement ; c&apos;est pourquoi il ne vous
                présente pas de bandeau. Aucun n&apos;est publicitaire ni partagé avec un tiers.</p>
              <div className="overflow-x-auto rounded-2xl border border-border">
                <table className="w-full min-w-[560px] text-left text-[13px]">
                  <thead className="bg-muted text-[10px] uppercase tracking-widest text-muted-foreground">
                    <tr><th className={cellule}>Nom</th><th className={cellule}>Rôle</th><th className={cellule}>Nature et durée</th></tr>
                  </thead>
                  <tbody>
                    {TRACEURS.map(([n, r, d]) => (
                      <tr key={n}><td className={`${cellule} font-mono text-[12px]`}>{n}</td><td className={cellule}>{r}</td><td className={cellule}>{d}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p><strong>Mesure d&apos;audience.</strong>{" "}Elle sert uniquement à des statistiques de fréquentation pour notre propre compte : identifiant
                tiré au hasard, aucun croisement avec d&apos;autres données, aucune transmission à des tiers, effacement au bout de 13 mois. Vous pouvez
                vous y opposer ici :</p>
              <RefusMesure />
            </>
          ),
        },
        {
          id: "droits", titre: "Vos droits",
          contenu: (
            <>
              <p>Vous disposez des droits d&apos;accès, de rectification, d&apos;effacement, de limitation, de portabilité et d&apos;opposition, du droit de
                retirer votre consentement à tout moment, et du droit de définir des directives sur le sort de vos données après votre décès
                (loi Informatique et Libertés, art. 85).</p>
              <ul>
                <li><strong>En libre-service :</strong>{" "}Mon compte → Mes données (téléchargement complet au format JSON, suppression du compte),
                  Mon compte → Alertes (profil, suivis, accords).</li>
                <li><strong>Par écrit :</strong> {CONTACT_EMAIL} ou <Link href="/contact">formulaire de contact</Link>. Réponse sous un mois.</li>
                <li><strong>E-mails :</strong>{" "}chaque e-mail contient un lien pour vous désinscrire (en un clic pour le récapitulatif hebdomadaire).</li>
              </ul>
              <p>Si vous estimez que vos droits ne sont pas respectés, vous pouvez saisir la <strong>CNIL</strong>{" "}(3 place de Fontenoy, TSA 80715,
                75334 Paris Cedex 07 — cnil.fr).</p>
            </>
          ),
        },
        {
          id: "mineurs", titre: "Mineurs",
          contenu: <p>Un compte peut être ouvert dès 15 ans. En dessous, l&apos;accord d&apos;un titulaire de l&apos;autorité parentale est nécessaire pour
            les traitements fondés sur le consentement (loi Informatique et Libertés, art. 45), notamment le suivi de partis ou de candidats.</p>,
        },
        {
          id: "securite", titre: "Sécurité",
          contenu: <p>Connexions chiffrées (HTTPS), mots de passe chiffrés, accès aux données restreint par des règles de sécurité qui ne laissent
            chaque membre lire que ses propres informations. En cas de violation de données présentant un risque, la CNIL et, si nécessaire,
            les personnes concernées sont prévenues dans les délais légaux.</p>,
        },
      ]}
    />
  );
}
