/**
 * Débats et grandes émissions des candidats à la présidentielle.
 *
 * Alimente `candidate_debates`, que le fil « Mes candidats suivis » affiche en
 * tête. Deux sources, sans intervention humaine :
 *
 *   1. Les débats des primaires (`primary_events`) : le calendrier connaît déjà
 *      les participants, par slug, et la retransmission une fois diffusée.
 *   2. YouTube : une recherche par candidat, chaque jour, sur les dix derniers
 *      jours. C'est le seul endroit où les chaînes publient TOUS leurs débats et
 *      face-à-face, avec la date et la vidéo pour les revoir.
 *
 * Le filtre YouTube est volontairement strict — mieux vaut rater une émission que
 * présenter comme « débat » l'édito d'un commentateur :
 *   — la vidéo vient d'une grande chaîne ou radio (liste ci-dessous) ;
 *   — le titre nomme le candidat ;
 *   — le titre annonce un format de confrontation (débat, duel, face-à-face,
 *     « face à », grand oral…) ;
 *   — éditos, chroniques, revues de presse et humour sont écartés.
 *
 * Coût : 100 unités de quota YouTube par candidat, soit ~3 000 par jour pour
 * trente candidats, sur 10 000 gratuites.
 *
 * Usage :
 *   npx tsx --env-file=.env.local scripts/update-candidate-debates.ts [--dry-run] [--jours=10]
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YOUTUBE_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const DRY = args.includes("--dry-run");
const JOURS = Number(args.find(a => a.startsWith("--jours="))?.split("=")[1] || 10);
const YT_KEY = process.env.YOUTUBE_API_KEY || "";

const sansAccent = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const decoder = (s: string) => (s || "")
  .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

/** Grandes chaînes et radios : seule leur parole fait un « débat » ou une « émission ». */
const DIFFUSEURS = [
  "lci", "bfmtv", "bfm tv", "franceinfo", "france info", "france 2", "france 3", "france 5", "france inter",
  "france televisions", "c a vous", "c dans l'air", "cnews", "tf1", "rtl", "europe 1", "rmc", "sud radio",
  "public senat", "lcp", "france 24", "tv5monde", "le figaro", "le parisien", "arte", "m6", "quotidien",
  "radio france", "france culture", "le monde", "ouest-france", "brut",
];

const DEBAT = /\b(debat|debats|debattent|debat avec|duel|face-a-face|face a face|confrontation|affronte|affrontement|contradicteur)\b/;
/** « face à » suivi d'une PERSONNE (« face à Darius Rochebin ») — pas « face à la hausse des carburants ». */
const FACE_A_PERSONNE = /face (à|aux) (?:[A-ZÉÈÀÂÎÔ][\p{L}'-]+|journalistes|la rédaction|nos auditeurs|des Français)/u;
const EMISSION = /\b(grand oral|grand entretien|invite de|l'invite de|questions politiques|objectif elysee|elysee 2027)\b/;
/**
 * Ce qui parle DU candidat au lieu de le montrer : éditos, analyses, pronostics
 * (« pourquoi le duel Mélenchon-Le Pen se profile », « vers un duel… »), humour
 * (« Caverivière face à… 🤣 »), commentaires d'un débat par des tiers.
 */
const EXCLUS = /\b(edito|editorial|chronique|revue de presse|analyse|decrypt|humour|parodie|billet|sondage|pourquoi|vers un|se profile|evitent|sur les propos|comme carburant|qui gagne|relance le debat|ouvre le debat|fait debat|au coeur du debat|caveriviere|vizorek|reagissent)\b/;

type Candidat = { id: string; slug: string; full_name: string };
type Ligne = {
  candidate_id: string; source_key: string; kind: "debat" | "emission" | "primaire"; title: string;
  broadcaster: string | null; date: string | null; url: string | null; video_id: string | null;
  thumbnail_url: string | null; a_venir: boolean; updated_at: string;
};

async function chercher(c: Candidat, depuis: string): Promise<Ligne[]> {
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.search = new URLSearchParams({
    part: "snippet", type: "video", q: `"${c.full_name}" débat OR "face à" OR duel`,
    publishedAfter: depuis, regionCode: "FR", relevanceLanguage: "fr", maxResults: "25", key: YT_KEY,
  }).toString();
  const r = await fetch(u);
  const j = await r.json();
  if (j.error) throw new Error(j.error.message);

  const nom = sansAccent(c.full_name.split(/\s+/).slice(-1)[0]); // le nom de famille suffit dans un titre
  const out: Ligne[] = [];
  for (const it of j.items || []) {
    const titre = decoder(it.snippet?.title || "");
    const chaine = decoder(it.snippet?.channelTitle || "");
    const t = sansAccent(titre).replace(/[-’]/g, m => (m === "’" ? "'" : "-"));
    const ch = sansAccent(chaine);
    if (!t.includes(nom)) continue;
    if (!DIFFUSEURS.some(d => ch.includes(d))) continue;
    if (EXCLUS.test(t) || /\?|🤣|😂/u.test(titre)) continue;
    // Un mot cité entre guillemets est une PHRASE du candidat (« il faut un débat
    // clair sur… »), pas le format de l'émission : on le retire avant de juger.
    const horsCitation = t.replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, " ");
    const titreHorsCitation = titre.replace(/«[^»]*»|"[^"]*"|“[^”]*”/g, " ");
    const kind = DEBAT.test(horsCitation) ? "debat"
      : FACE_A_PERSONNE.test(titreHorsCitation) || EMISSION.test(horsCitation) ? "emission"
      : null;
    if (!kind) continue;
    const id = it.id?.videoId;
    if (!id) continue;
    out.push({
      candidate_id: c.id, source_key: `yt:${id}`, kind, title: titre, broadcaster: chaine,
      date: String(it.snippet.publishedAt || "").slice(0, 10) || null,
      url: `https://www.youtube.com/watch?v=${id}`, video_id: id,
      thumbnail_url: it.snippet?.thumbnails?.medium?.url || it.snippet?.thumbnails?.default?.url || null,
      a_venir: false, updated_at: new Date().toISOString(),
    });
  }
  return out;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis");
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: cands, error } = await supabase.from("presidential_candidates").select("id, slug, full_name");
  if (error) throw error;
  const parSlug = new Map((cands as Candidat[]).map(c => [c.slug, c]));
  const lignes: Ligne[] = [];

  // 1. Les débats des primaires, participants connus par slug.
  const { data: evts } = await supabase.from("primary_events")
    .select("id, primaire, titre, type, date_prevue, diffuseur, participants, statut, video_id, video_url")
    .eq("type", "debat").neq("statut", "annule");
  for (const e of evts || []) {
    for (const slug of e.participants || []) {
      const c = parSlug.get(slug);
      if (!c) continue;
      lignes.push({
        candidate_id: c.id, source_key: `primaire:${e.id}`, kind: "primaire",
        title: `${e.primaire} — ${e.titre}`, broadcaster: e.diffuseur || null, date: e.date_prevue,
        url: e.video_url || "/presidentielles-2027#primaires", video_id: e.video_id || null,
        thumbnail_url: e.video_id ? `https://i.ytimg.com/vi/${e.video_id}/mqdefault.jpg` : null,
        a_venir: e.statut === "a_venir", updated_at: new Date().toISOString(),
      });
    }
  }
  console.log(`> Primaires : ${lignes.length} participation(s) à un débat.`);

  // 2. Les débats télévisés et radiophoniques, retrouvés sur YouTube.
  if (!YT_KEY) {
    console.warn("! YOUTUBE_API_KEY absente : seuls les débats des primaires sont mis à jour.");
  } else {
    const depuis = new Date(Date.now() - JOURS * 86400000).toISOString().replace(/\.\d+Z$/, "Z");
    let n = 0;
    for (const c of cands as Candidat[]) {
      try {
        const trouves = await chercher(c, depuis);
        lignes.push(...trouves);
        n += trouves.length;
        if (DRY) for (const l of trouves) console.log(`   ${c.full_name} · [${l.kind}] ${l.date} ${l.broadcaster} — ${l.title}`);
      } catch (e) {
        console.warn(`  ! ${c.full_name} : ${(e as Error).message}`);
        if (/quota/i.test((e as Error).message)) break;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    console.log(`> YouTube : ${n} débat(s) ou émission(s) sur ${JOURS} jours.`);
  }

  if (DRY) { console.log("--- DRY-RUN : rien écrit ---"); return; }
  for (let i = 0; i < lignes.length; i += 200) {
    const { error: e } = await supabase.from("candidate_debates")
      .upsert(lignes.slice(i, i + 200), { onConflict: "candidate_id,source_key" });
    if (e) throw new Error(`écriture : ${e.message}`);
  }
  console.log(`--- TERMINÉ : ${lignes.length} ligne(s) écrite(s) ---`);
}

main().catch(e => { console.error(e); process.exit(1); });
