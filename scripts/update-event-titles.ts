/**
 * Titres courts pour l'agenda des institutions.
 *
 * Les agendas de l'Assemblée et du Sénat ne sont pas écrits pour être lus : ce
 * sont des convocations. On y trouve des intitulés de trois cent soixante-huit
 * caractères, où l'objet de la réunion arrive après l'heure, le tiret, le nom de
 * l'organisme, la qualité de la personne auditionnée et deux parenthèses.
 *
 *   « [10:00] - Conseil économique, social et environnemental (CESE) :
 *     Mme Manon Rousselot Pailley, membre au titre de la cohésion sociale… »
 *
 * Sur la page d'accueil, ces titres débordent de leur carte et le lecteur
 * décroche. Ce script en tire un titre court, et une phrase de résumé. Le front
 * les préfère déjà quand ils existent (short_title, short_summary) et retombe
 * sur le titre nettoyé sinon : tant que ce script n'a pas tourné, rien ne casse.
 *
 * Usage :
 *   npx tsx scripts/update-event-titles.ts
 *   npx tsx scripts/update-event-titles.ts --days=30
 *   npx tsx scripts/update-event-titles.ts --dry-run
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, LLM_FREE_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { demanderJSON, llmDisponible, llmVoie } from "./lib/llm";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const flag = (nom: string, defaut: number) => {
  const a = args.find(x => x.startsWith(`--${nom}=`));
  return a ? Number(a.split("=")[1]) || defaut : defaut;
};
/** Fenêtre en jours autour d'aujourd'hui : le passé récent et l'agenda à venir. */
const JOURS = flag("days", 21);
const LOT = flag("lot", 25);
/** Plafond par passage, pour qu'un cron ne parte pas dans un rattrapage sans fin. */
const MAX = flag("max", 400);

const CONSIGNE = `Tu réécris des intitulés de l'agenda parlementaire français pour qu'ils soient lisibles d'un coup d'œil.

Pour CHAQUE entrée reçue, produis :
- "titre" : un titre court, 40 à 70 caractères, qui dit CE QUI SE PASSE et SUR QUOI ;
- "resume" : une phrase de 12 à 25 mots qui ajoute le contexte utile (qui est auditionné, quel texte, quelle commission).

Règles impératives :
- ne t'appuie QUE sur l'intitulé fourni ; n'invente ni date, ni numéro, ni nom, ni fonction ;
- retire l'heure, les tirets d'ouverture, et les mentions de pure procédure (« Éventuellement, », « le cas échéant, », « suite de ») ;
- garde ce qui identifie : le numéro d'un texte (n° 3106), le nom d'une personne auditionnée, l'organisme ;
- le titre ne se termine JAMAIS par des points de suspension : il est court parce qu'il est réécrit, pas parce qu'il est coupé ;
- si l'intitulé est déjà court et clair, reprends-le tel quel plutôt que de le déformer.

Exemple.
Entrée : « [09:00] Éventuellement, suite de l'examen de la proposition de loi visant à apporter une réponse intégrale au phénomène des violences sexuelles et sexistes contre les femmes et les enfants (n° 3106) (Mme Céline Thiébault-Martinez, rapporteure) »
Sortie : titre « Violences sexuelles et sexistes : examen de la loi n° 3106 »
         resume « Suite de l'examen de la proposition de loi sur les violences faites aux femmes et aux enfants, rapportée par Céline Thiébault-Martinez. »

Réponds en JSON : { "entrees": [ { "id": "…", "titre": "…", "resume": "…" } ] } — un objet par entrée reçue, avec son identifiant exact.`;

/** Coupe proprement, sans laisser de mot tranché. */
function borner(s: string, max: number): string {
  const net = String(s ?? "").replace(/\s+/g, " ").trim();
  return net.length <= max ? net : net.slice(0, max).replace(/\s\S*$/, "");
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  if (!llmDisponible()) {
    console.error("❌ Aucune clé LLM (LLM_FREE_API_KEY) : aucun titre ne peut être réécrit.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Agenda — titres courts ===");
  console.log(`  voie de rédaction : ${llmVoie()}`);

  const debut = new Date();
  debut.setDate(debut.getDate() - JOURS);
  const fin = new Date();
  fin.setDate(fin.getDate() + JOURS);

  const { data, error } = await supabase
    .from("events")
    .select("id, title, description, institution")
    .is("short_title", null)
    .gte("date", debut.toISOString().slice(0, 10))
    .lte("date", fin.toISOString().slice(0, 10))
    .order("date", { ascending: false })
    .limit(MAX);
  if (error) { console.error(`✗ lecture : ${error.message}`); process.exit(1); }

  const aFaire = (data ?? []).filter(e => String(e.title ?? "").trim());
  if (!aFaire.length) { console.log("  Rien à réécrire."); return; }
  console.log(`  ${aFaire.length} intitulé(s) à réécrire, sur ±${JOURS} jours`);

  let ecrits = 0;
  for (let i = 0; i < aFaire.length; i += LOT) {
    const lot = aFaire.slice(i, i + LOT);
    try {
      const parsed = await demanderJSON<{ entrees?: { id?: string; titre?: string; resume?: string }[] }>(
        CONSIGNE,
        lot.map(e => [`### ${e.id}`, String(e.title).replace(/\s+/g, " ").trim()].join("\n")).join("\n\n---\n\n"),
        { maxJetons: 8192 },
      );

      // On n'accepte QUE les identifiants envoyés : un identifiant inventé
      // rattacherait un titre au mauvais évènement, ce qui est pire qu'un titre
      // long — le lecteur croirait lire autre chose que ce qui se passe.
      const envoyes = new Set(lot.map(e => String(e.id)));
      const maj: { id: string; short_title: string; short_summary: string | null }[] = [];
      for (const x of parsed.entrees ?? []) {
        const id = String(x?.id ?? "");
        const titre = borner(x?.titre ?? "", 90);
        if (!titre || !envoyes.has(id)) continue;
        maj.push({ id, short_title: titre, short_summary: borner(x?.resume ?? "", 220) || null });
      }

      if (!DRY) {
        for (const m of maj) {
          const { error: err } = await supabase
            .from("events")
            .update({ short_title: m.short_title, short_summary: m.short_summary })
            .eq("id", m.id);
          if (err) console.warn(`  ⚠ ${m.id} : ${err.message}`);
          else ecrits++;
        }
      } else {
        ecrits += maj.length;
        for (const m of maj.slice(0, 2)) console.log(`    · ${m.short_title}`);
      }
      console.log(`  ${Math.min(i + LOT, aFaire.length)}/${aFaire.length} — ${ecrits} réécrit(s)`);
    } catch (e) {
      console.warn(`  ⚠ lot ${i + 1}-${i + lot.length} : ${(e as Error).message}`);
    }
  }

  console.log(DRY ? `\n  (--dry-run : ${ecrits} titre(s), rien n'est écrit)` : `\n  → ${ecrits} titre(s) court(s) enregistré(s)`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
