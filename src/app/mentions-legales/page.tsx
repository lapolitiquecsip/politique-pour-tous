import Link from "next/link";
import PageJuridique, { ou } from "@/components/legal/PageJuridique";
import RefusMesure from "@/components/analytics/RefusMesure";
import { EDITEUR, CONTACT_EMAIL } from "@/lib/constants";

export const metadata = {
  title: "Mentions légales | La Politique, C'est Simple",
  description: "Éditeur, hébergement, sources des données et droit de réponse.",
};

export default function MentionsLegales() {
  return (
    <PageJuridique
      surtitre="Loi pour la confiance dans l'économie numérique, art. 6"
      titre="Mentions légales"
      sections={[
        {
          id: "editeur", titre: "Éditeur du site",
          contenu: (
            <>
              <p>Le site <strong>lapolitiquecestsimple.fr</strong>{" "}(« La Politique, C&apos;est Simple ») est édité par :</p>
              <ul>
                <li><strong>Éditeur :</strong> {ou(EDITEUR.nom)}{EDITEUR.forme ? `, ${EDITEUR.forme}` : ""}</li>
                <li><strong>Adresse :</strong> {ou(EDITEUR.adresse)}</li>
                <li><strong>SIREN / SIRET :</strong> {ou(EDITEUR.siren)}{EDITEUR.rcs ? ` — ${EDITEUR.rcs}` : ""}</li>
                <li><strong>TVA :</strong> {ou(EDITEUR.tva)}</li>
                <li><strong>Téléphone :</strong> {ou(EDITEUR.telephone)}</li>
                <li><strong>Courriel :</strong> {CONTACT_EMAIL} — ou le <Link href="/contact">formulaire de contact</Link></li>
                <li><strong>Directeur de la publication :</strong> {ou(EDITEUR.directeur)}</li>
              </ul>
            </>
          ),
        },
        {
          id: "hebergement", titre: "Hébergement",
          contenu: (
            <ul>
              <li><strong>Pages du site :</strong>{" "}GitHub, Inc. (GitHub Pages), 88 Colin P. Kelly Jr. Street, San Francisco, CA 94107, États-Unis — github.com.</li>
              <li><strong>Base de données et comptes :</strong>{" "}Supabase, Inc., 970 Toa Payoh North #07-04, Singapour 318992 — supabase.com.
                Les données sont stockées dans l&apos;Union européenne (centre de données d&apos;Amazon Web Services en Irlande).</li>
            </ul>
          ),
        },
        {
          id: "sources", titre: "Sources des données et licences",
          contenu: (
            <>
              <p>Le site rend lisibles des informations publiques. Il en cite les sources et en respecte les licences :</p>
              <ul>
                <li><strong>Assemblée nationale, Sénat, Légifrance et Journal officiel (DILA), data.gouv.fr, Insee, Parlement européen :</strong>{" "}données publiées
                  sous la Licence Ouverte / Open Licence 2.0 d&apos;Etalab, réutilisées avec mention de leur source et mises à jour automatiquement.</li>
                <li><strong>EUR-Lex</strong>{" "}(© Union européenne) : réutilisation autorisée sous réserve de mention de la source.</li>
                <li><strong>Wikipédia et Wikidata :</strong>{" "}textes sous licence CC BY-SA 4.0, données sous CC0 ; les biographies du site en sont des
                  synthèses rédigées à partir de ces sources et des sites officiels.</li>
                <li><strong>Photographies :</strong>{" "}portraits officiels de l&apos;Assemblée nationale et du Sénat, ou fichiers de Wikimedia Commons sous la
                  licence indiquée par leur auteur sur Commons.</li>
                <li><strong>Sondages :</strong>{" "}résultats publiés par les instituts, accompagnés des mentions exigées par la loi du 19 juillet 1977 et d&apos;un
                  lien vers la notice déposée à la Commission des sondages.</li>
                <li><strong>Aide à l&apos;Ukraine :</strong>{" "}Ukraine Support Tracker de l&apos;Institut de Kiel pour l&apos;économie mondiale.</li>
              </ul>
              <p>Le design, les textes explicatifs, les logos et la mise en forme propres au site sont protégés par le droit d&apos;auteur ;
                leur reproduction sans autorisation est interdite. Les données publiques ci-dessus restent librement réutilisables selon leur licence d&apos;origine.</p>
            </>
          ),
        },
        {
          id: "ia", titre: "Contenus rédigés avec l'intelligence artificielle",
          contenu: (
            <p>
              Une partie des textes du site — résumés de lois et de décrets, titres simplifiés du fil d&apos;actualité, biographies, analyses
              détaillées, récapitulatif hebdomadaire — est rédigée automatiquement par des modèles d&apos;intelligence artificielle à partir des
              documents officiels cités. Ceux qui sont envoyés par e-mail (alertes, récapitulatif) sont en outre contrôlés automatiquement
              contre leurs sources (citations vérifiées mot pour mot, chiffres et noms présents dans les sources). Tous peuvent néanmoins
              contenir des erreurs : seul le texte officiel fait foi. Signalez toute
              erreur via la <Link href="/contact">page Contact</Link> ; elle sera corrigée.
            </p>
          ),
        },
        {
          id: "reponse", titre: "Droit de réponse et présomption d'innocence",
          contenu: (
            <>
              <p>Toute personne nommée ou désignée sur le site dispose d&apos;un droit de réponse (loi n° 2004-575 du 21 juin 2004, art. 6-IV),
                à adresser au directeur de la publication dans les trois mois suivant la mise en ligne, via la <Link href="/contact">page Contact</Link> ou
                par courrier à l&apos;adresse de l&apos;éditeur. La réponse est publiée dans les trois jours suivant sa réception.</p>
              <p>Les affaires judiciaires mentionnées sur les fiches des personnalités sont rapportées d&apos;après des sources publiques citées.
                Toute personne mise en cause est présumée innocente tant que sa culpabilité n&apos;a pas été établie par une décision de justice
                définitive (code civil, art. 9-1).</p>
            </>
          ),
        },
        {
          id: "donnees", titre: "Données personnelles et cookies",
          contenu: (
            <>
              <p>Le traitement de vos données, vos droits et la liste des traceurs utilisés sont décrits dans la{" "}
                <Link href="/confidentialite">politique de confidentialité</Link>. Le site n&apos;utilise aucun cookie publicitaire.</p>
              <p>Mesure d&apos;audience : vous pouvez vous y opposer à tout moment ci-dessous.</p>
              <RefusMesure />
            </>
          ),
        },
      ]}
    />
  );
}
