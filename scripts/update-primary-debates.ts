/**
 * Débats et votes des primaires : annonce tenue à la main, retransmission retrouvée seule.
 *
 * Aucune API ne publie « Les Républicains débattront le 12 novembre sur LCI » : cette
 * annonce-là est éditoriale, et elle vit dans src/lib/data/primaires.json. Ce que la
 * machine sait faire, en revanche, c'est retrouver la vidéo une fois le débat passé —
 * c'est le partage retenu, et c'est le seul qui tienne.
 *
 * La recherche YouTube est volontairement stricte. Un « débat » et un nom de parti
 * suffisent à faire remonter des extraits de chaînes d'opinion, des rediffusions
 * tronquées et des commentaires de plateau. On exige donc que le titre porte le mot
 * « débat » ET le nom de la primaire ou du diffuseur, et que la mise en ligne tombe
 * dans les trois jours qui suivent le rendez-vous. Mieux vaut aucune vidéo qu'une
 * vidéo qui n'est pas la bonne.
 *
 * Usage :
 *   npx tsx scripts/update-primary-debates.ts
 *   npx tsx scripts/update-primary-debates.ts --dry-run
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YOUTUBE_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");

const YT_KEY = process.env.YOUTUBE_API_KEY || "";

/** Fenêtre, en jours, pendant laquelle une mise en ligne peut être la retransmission. */
const FENETRE_JOURS = 3;

type Evenement = {
  id: string;
  primaire: string;
  type?: "debat" | "vote";
  titre: string;
  date_prevue: string;
  heure?: string;
  diffuseur?: string;
  participants?: string[];
  statut?: "a_venir" | "diffuse" | "annule";
  recherche?: string;
  media_url?: string;
  source_url?: string;
};

type Calendrier = {
  primaires: { nom: string; camp: string; candidats: string[] }[];
  evenements: Evenement[];
};

const sansAccent = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * Cherche la retransmission d'un rendez-vous passé.
 *
 * Coût : une unité de quota par recherche, sur les dix mille quotidiennes. On ne
 * cherche que pour les rendez-vous passés et encore dépourvus de vidéo, donc au plus
 * quelques appels par jour.
 */
async function chercherVideo(e: Evenement): Promise<{
  id: string; titre: string; publiee: string;
} | null> {
  if (!YT_KEY) return null;

  const requete = e.recherche || `${e.titre} ${e.diffuseur ?? ""} débat`;
  const apres = new Date(`${e.date_prevue}T00:00:00Z`);
  const avant = new Date(apres.getTime() + FENETRE_JOURS * 864e5);

  const url = "https://www.googleapis.com/youtube/v3/search"
    + `?part=snippet&type=video&maxResults=10&order=relevance&regionCode=FR&relevanceLanguage=fr`
    + `&publishedAfter=${apres.toISOString()}&publishedBefore=${avant.toISOString()}`
    + `&q=${encodeURIComponent(requete)}&key=${YT_KEY}`;

  const r = await fetch(url);
  if (!r.ok) throw new Error(`YouTube a répondu ${r.status}`);
  const j: any = await r.json();

  // Le titre doit parler de débat ET nommer la primaire ou le diffuseur. Sans cette
  // double condition, la recherche ramène des plateaux de commentateurs.
  const attendus = [e.primaire, e.diffuseur].filter(Boolean).map(x => sansAccent(String(x)));
  for (const it of j.items ?? []) {
    const titre = String(it.snippet?.title ?? "");
    const t = sansAccent(titre);
    const parleDeDebat = e.type === "vote" ? /vote|resultat|depouillement/.test(t) : /debat/.test(t);
    if (!parleDeDebat) continue;
    // On accepte qu'un seul des repères attendus figure : les chaînes abrègent.
    const nomme = attendus.some(a => a.split(/\s+/).some(mot => mot.length > 4 && t.includes(mot)));
    if (!nomme) continue;
    return { id: it.id.videoId, titre, publiee: it.snippet.publishedAt };
  }
  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Débats et votes des primaires ===");
  const brut = await readFile(join(process.cwd(), "src/lib/data/primaires.json"), "utf8");
  const cal: Calendrier = JSON.parse(brut);
  const campDe = new Map(cal.primaires.map(p => [p.nom, p.camp]));

  if (!cal.evenements.length) {
    console.log("  Aucun rendez-vous au calendrier : renseignez src/lib/data/primaires.json.");
    return;
  }

  // Les candidats connus, pour refuser un slug qui n'existe pas — une faute de frappe
  // dans le calendrier rattacherait le débat à personne, sans rien signaler.
  const { data: candidats } = await supabase.from("presidential_candidates").select("slug");
  const connus = new Set((candidats ?? []).map((c: any) => c.slug));

  const aujourdhui = new Date().toISOString().slice(0, 10);
  const lignes: any[] = [];
  let trouvees = 0;

  for (const e of cal.evenements) {
    const inconnus = (e.participants ?? []).filter(s => !connus.has(s));
    if (inconnus.length) console.warn(`  ⚠ ${e.id} : candidat(s) inconnu(s) — ${inconnus.join(", ")}`);

    const passe = e.date_prevue <= aujourdhui;
    const ligne: any = {
      id: e.id,
      primaire: e.primaire,
      camp: campDe.get(e.primaire) ?? null,
      type: e.type ?? "debat",
      titre: e.titre,
      date_prevue: e.date_prevue,
      heure: e.heure ?? null,
      diffuseur: e.diffuseur ?? null,
      participants: (e.participants ?? []).filter(s => connus.has(s)),
      statut: e.statut ?? (passe ? "diffuse" : "a_venir"),
      media_url: e.media_url ?? null,
      source_url: e.source_url ?? null,
      updated_at: new Date().toISOString(),
    };

    // On ne cherche la vidéo que pour un rendez-vous passé qui n'en a pas encore.
    if (passe && ligne.statut !== "annule") {
      const { data: deja } = await supabase
        .from("primary_events").select("video_id").eq("id", e.id).maybeSingle();
      if (!deja?.video_id) {
        try {
          const v = await chercherVideo(e);
          if (v) {
            ligne.video_id = v.id;
            ligne.video_url = `https://www.youtube.com/watch?v=${v.id}`;
            ligne.video_title = v.titre;
            ligne.video_published_at = v.publiee;
            trouvees++;
            console.log(`  ✓ ${e.id} → ${v.titre.slice(0, 70)}`);
          } else {
            console.log(`  · ${e.id} : aucune retransmission trouvée pour l'instant`);
          }
        } catch (err) {
          console.warn(`  ⚠ ${e.id} : ${(err as Error).message}`);
        }
      }
    }

    lignes.push(ligne);
  }

  if (DRY) { console.log(`\n  (--dry-run : ${lignes.length} rendez-vous, rien n'est écrit)`); return; }
  const { error } = await supabase.from("primary_events").upsert(lignes, { onConflict: "id" });
  if (error) { console.error(`  ✗ écriture : ${error.message}`); process.exit(1); }
  console.log(`\n  → ${lignes.length} rendez-vous enregistré(s), ${trouvees} retransmission(s) rattachée(s)`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
