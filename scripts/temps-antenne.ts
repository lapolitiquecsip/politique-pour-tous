/**
 * Temps d'antenne des candidats, au jour le jour, sans attendre l'Arcom.
 *
 * L'Arcom publie le temps de parole officiel mois par mois, avec six semaines de retard.
 * En attendant, on relève chaque jour les émissions que 19 chaînes de télévision et de radio
 * mettent elles-mêmes en ligne sur leur chaîne YouTube officielle (identifiants vérifiés le
 * 07/11/2026 : nom, pays, audience — « @CNEWS » est une chaîne taïwanaise, la bonne est
 * @cnewsofficiel). Une vidéo compte pour un candidat quand son titre le montre EN TRAIN DE
 * PARLER : invité, entretien, débat, ou citation (« Attal : "…" »). Un sujet SUR lui
 * (« X en tête des sondages ») ne compte pas.
 *
 *  - entretien (≥ 6 min) : la durée est comptée, partagée à parts égales s'il y a plusieurs
 *    candidats (débat) ;
 *  - extrait (< 6 min) : compté en nombre de passages seulement, car il est découpé dans une
 *    émission déjà comptée ou diffusée ailleurs ;
 *  - Shorts (≤ 60 s) : ignorés.
 * C'est du temps d'antenne en interview (questions comprises), pas le décompte de l'Arcom.
 *
 * Coût : API YouTube gratuite, ~2 unités par chaîne et par passage (quota : 10 000 / jour).
 * Usage : npx tsx --env-file=.env.local scripts/temps-antenne.ts [--essai] [--rattrapage=30]
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, YOUTUBE_API_KEY.
 */
import { createClient } from "@supabase/supabase-js";

const ESSAI = process.argv.includes("--essai");
/** --rattrapage=30 : remonte 30 jours en arrière (pages suivantes de chaque chaîne), pour un premier remplissage. */
const RATTRAPAGE = Number(process.argv.find(a => a.startsWith("--rattrapage="))?.split("=")[1] || 0);
const YT = process.env.YOUTUBE_API_KEY || "";
const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const supabase = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY || "", { auth: { persistSession: false } });

export const CHAINES: { id: string; media: string; type: "tv" | "radio" }[] = [
  { id: "UCJldRgT_D7Am-ErRHQZ90uw", media: "France Inter", type: "radio" },
  { id: "UCO6K_kkdP-lnSCiO3tPx7WA", media: "franceinfo", type: "tv" },
  { id: "UC_ykXc7v9zZQdOG5QvJqpgg", media: "RTL", type: "radio" },
  { id: "UCXwDLMDV86ldKoFVc_g8P0g", media: "BFMTV", type: "tv" },
  { id: "UCewhc0fvja891XkpIPGRMxQ", media: "LCI", type: "tv" },
  { id: "UCgGb7tN3tIH5_Kk05D1J_bA", media: "RMC", type: "radio" },
  { id: "UCIMGfEAERXjmWwQeg15BFsg", media: "Europe 1", type: "radio" },
  { id: "UCXKJrYczY2_fJEZgFPGY0HQ", media: "CNews", type: "tv" },
  { id: "UCsrPUA0ZSDCNZC6wyRlR7ZA", media: "TF1 Info", type: "tv" },
  { id: "UCTa1bPArjpvNMgSHAb_pflA", media: "Public Sénat", type: "tv" },
  { id: "UCHGFbA0KWBgf6gMbyUCZeCQ", media: "LCP", type: "tv" },
  { id: "UCd5DKToXYTKAQ6khzewww2g", media: "France Culture", type: "radio" },
  { id: "UCpi-4daExRSchtsJzO06rwA", media: "Quotidien (TMC)", type: "tv" },
  { id: "UCejTWYquMXD_MFHRZiqo_Aw", media: "C à vous (France 5)", type: "tv" },
  { id: "UCGxEJXuCo8lXti1A3akxyjg", media: "Télématin (France 2)", type: "tv" },
  { id: "UCESTwDXpoMgiYBHipMdKTkQ", media: "Sud Radio", type: "radio" },
  { id: "UCUsBMOIUl_ad6JUOC16DpmQ", media: "BFM Business", type: "tv" },
  { id: "UCxPd2eZWiZ_ZJax71fyfrnA", media: "Radio J", type: "radio" },
  { id: "UC5WjQI_NY-PODOQ3kTewebA", media: "ici (ex-France Bleu)", type: "radio" },
];

const sans = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const decoder = (s: string) => (s || "").replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
// Noms de famille qui sont aussi des prénoms ou des mots courants : il faut le nom complet.
const AMBIGUS = new Set(["philippe", "royal", "faure", "bertrand", "hollande", "brun", "roussel", "batho", "kazib", "labib", "massard", "arthaud", "maurel"]);

/** Le candidat parle : il est invité, interrogé, en débat, s'exprime. */
const PAROLE = /\b(invite|invitee|l'invite|interview|entretien|interroge|repond|face a|face aux|debat|duel|grand oral|grand jury|questions politiques|matinale|4 verites|quatre verites|politique matin|dimanche en politique|en toute franchise|en direct avec|s'exprime|prend la parole|discours|meeting|conference de presse|integrale)\b/;
/** Ce qui parle DE lui sans le montrer. */
const EXCLUS = /\b(edito|editorial|chronique|revue de presse|analyse|decrypt|decrypte|decryptage|humour|parodie|billet|sondage|sondages|pourquoi|vers un|se profile|qui gagne|portrait|enquete|biographie|imitation|predit|pronostic|selon|les raisons|on vous explique|vrai ou faux|verif|caveriviere|vizorek|meurice|a retenir|faut retenir|passe d'armes|sur les propos|installent|reunis)\b/;
/** Verbes qui attribuent une citation : « "…", déclare X ». */
const DIRE = "(dit|declare|lance|martele|affirme|assure|estime|denonce|annonce|explique|promet|tacle|repond|reagit|insiste|previent|regrette|defend|propose|plaide|accuse|fustige)";

/** Titre normalisé ; les citations (15 caractères au moins : « Le 20.27 » est un nom d'émission) deviennent QUOTE, car un nom cité n'est pas l'orateur. */
const forme = (titre: string) => ` ${sans(titre).replace(/([a-z])-([a-z])/g, "$1 $2").replace(/«[^»]{15,}»|"[^"]{15,}"|“[^”]{15,}”|'[^']{15,}'/g, " QUOTE ").replace(/[-–—_|]/g, " - ").replace(/[^a-zA-Z0-9':?() -]+/g, " ").replace(/\s+/g, " ")} `;

type Video = { id: string; titre: string; publie: string; duree: number; media: string; type: string };

const iso = (d: string) => { // PT1H2M3S → secondes
  const m = d.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+(m[1] || 0)) * 3600 + (+(m[2] || 0)) * 60 + (+(m[3] || 0)) : 0;
};

async function api(chemin: string) {
  const r = await fetch(`https://www.googleapis.com/youtube/v3/${chemin}&key=${YT}`);
  const j = await r.json();
  if (!r.ok) throw new Error(`YouTube ${r.status} : ${j?.error?.message ?? ""}`);
  return j;
}

/** Les 50 dernières vidéos d'une chaîne (2 unités de quota par page) ; en rattrapage, les pages suivantes. */
async function dernieres(c: typeof CHAINES[number]): Promise<Video[]> {
  const limite = RATTRAPAGE ? Date.now() - RATTRAPAGE * 86400000 : 0;
  const tout: Video[] = [];
  let page = "";
  for (let n = 0; n < (RATTRAPAGE ? 60 : 1); n++) {
    const pl = await api(`playlistItems?part=contentDetails&maxResults=50&playlistId=UU${c.id.slice(2)}${page ? `&pageToken=${page}` : ""}`);
    const ids = (pl.items || []).map((i: any) => i.contentDetails.videoId).join(",");
    if (!ids) break;
    const v = await api(`videos?part=snippet,contentDetails,liveStreamingDetails&id=${ids}`);
    const lot: Video[] = (v.items || []).map((x: any) => ({
      id: x.id, titre: decoder(x.snippet.title), publie: x.liveStreamingDetails?.actualStartTime || x.snippet.publishedAt,
      duree: iso(x.contentDetails.duration || ""), media: c.media, type: c.type,
    }));
    tout.push(...lot);
    page = pl.nextPageToken || "";
    if (!page || !lot.length || Math.min(...lot.map(x => new Date(x.publie).getTime())) < limite) break;
  }
  return limite ? tout.filter(x => new Date(x.publie).getTime() >= limite) : tout;
}

function candidatsDuTitre(t: string, cands: { slug: string; cles: string[] }[]) {
  return cands.filter(c => c.cles.some(k => t.includes(` ${k} `))).map(c => c.slug);
}

/** Le titre montre-t-il le candidat parler ? (citation dont il est l'auteur, invité, débat…) */
function ilParle(t: string, noms: string[]): boolean {
  if (EXCLUS.test(t)) return false;
  const n = `(${noms.join("|")})`;   // noms déjà normalisés : lettres, chiffres, espaces
  const nom = new RegExp(`(^| )${n}( |$)`);
  // franceinfo nomme l'orateur entre parenthèses en fin de titre : « "…" (Bruno Retailleau) » ou « (A. Bouilhaguet) ».
  const orateur = t.match(/\(([^()]*)\) *$/);
  if (orateur && /[a-z]/.test(orateur[1])) return nom.test(` ${orateur[1].trim()} `);
  // « Nom : "…" », « Nom sur RTL : "…" » — seulement quand le nom ouvre le titre (ou une partie du titre) :
  // « R. Ménard énervé contre M. Le Pen : "…" » ou « Victoire de Glucksmann : "…" » ne sont pas sa parole.
  if (new RegExp(`(^ | - | : )${n}( [a-z']+){0,6} ?: ?(- )?QUOTE`).test(t)) return true;
  // « "…", déclare (le candidat) Nom », « "…" - Nom » ; pas « "…" d'après Lisnard » (analyse de ses propos).
  // Nom seul après la citation, en fin de titre (« "…" - Bruno Retailleau ») ; pas « "…", Retailleau et Lisnard réunis ».
  if (new RegExp(`QUOTE ,? ?(- )?${n} ?( - .*)?$`).test(t.trim())) return true;
  if (new RegExp(`QUOTE ,? ?${DIRE} (le |la |l')?([a-z']+ ){0,2}${n}( |$)`).test(t)) return true;
  // Une question sur lui (« Mélenchon : une popularité générationnelle ? ») n'est pas sa parole.
  if (t.includes("?") && !/\b(invite|interview|entretien|face a|debat|grand jury|4 verites)\b/.test(t)) return false;
  // Invité, entretien, débat… à 6 mots au plus du nom : « … / Invitée : Christine Angot » ne fait pas de Le Pen l'invitée.
  const mot = PAROLE.source.replace(/^\\b\(|\)\\b$/g, "");
  return new RegExp(`${n}( [^ ]+){0,6} (${mot})\\b|\\b(${mot})( [^ ]+){0,6} ${n}( |$)`).test(t);
}

async function main() {
  if (!YT) { console.log("::warning::YOUTUBE_API_KEY absente : relevé impossible."); process.exit(1); }
  const { data: cs, error } = await supabase.from("presidential_candidates").select("slug, full_name").in("status", ["declared", "pressenti"]);
  if (error) throw error;
  const cands = (cs || []).map(c => {
    const complet = sans(c.full_name).replace(/[^a-z0-9']+/g, " ").trim();   // « jean luc melenchon »
    const nom = /le pen/.test(complet) ? "le pen" : /dupont aignan/.test(complet) ? "dupont aignan" : complet.split(" ").slice(-1)[0];
    return { slug: c.slug, complet, nom, cles: AMBIGUS.has(nom) ? [complet] : [complet, nom] };
  });

  const lignes: any[] = []; let vues = 0, echecs = 0;
  for (const c of CHAINES) {
    let videos: Video[] = [];
    try { videos = await dernieres(c); } catch (e) { echecs++; console.log(`::warning::${c.media} : ${(e as Error).message}`); continue; }
    vues += videos.length;
    for (const v of videos) {
      if (v.duree <= 60) continue; // Shorts
      const t = forme(v.titre);
      const slugs = candidatsDuTitre(t, cands);
      if (!slugs.length) continue;
      const noms = cands.filter(x => slugs.includes(x.slug)).flatMap(x => x.cles);
      if (!ilParle(t, noms)) { if (ESSAI) console.log(`   écarté  ${v.media} | ${v.titre}`); continue; }
      const entretien = v.duree >= 360;
      for (const slug of slugs) {
        lignes.push({
          video_id: v.id, slug, media: v.media, type_media: v.type, titre: v.titre.slice(0, 300),
          url: `https://www.youtube.com/watch?v=${v.id}`, publie_le: v.publie, duree_s: v.duree,
          format: entretien ? (slugs.length > 1 ? "debat" : "entretien") : "extrait",
          // Une émission complète (C à vous l'intégrale…) compte au plus 30 min : le candidat n'y parle pas de bout en bout.
          secondes_attribuees: entretien ? Math.round(Math.min(v.duree, 1800) / slugs.length) : 0,
          releve_le: new Date().toISOString(),
        });
      }
      if (ESSAI) console.log(`   ${entretien ? "ENTRETIEN" : "extrait  "} ${Math.round(v.duree / 60)} min | ${v.media} | ${slugs.join("+")} | ${v.titre}`);
    }
  }
  console.log(`${vues} vidéos lues sur ${CHAINES.length - echecs} chaînes, ${lignes.length} passage(s) de candidat retenu(s).`);
  if (echecs > CHAINES.length / 2) throw new Error(`${echecs} chaînes illisibles : relevé interrompu`);
  if (ESSAI || !lignes.length) return;
  const { error: e } = await supabase.from("antenne_passages").upsert(lignes, { onConflict: "video_id,slug" });
  if (e) throw e;
}

main().then(() => process.exit(0)).catch(e => { console.log(`::error::${String(e?.message ?? e).slice(0, 400)}`); process.exit(1); });
