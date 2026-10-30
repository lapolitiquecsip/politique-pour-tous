/**
 * CRON : veille réseaux sociaux des candidats à la présidentielle (abonnement Pro).
 *
 * Relève chaque jour l'audience des comptes suivis — comptes personnels ET comptes de
 * soutien — et écrit un instantané par compte et par jour dans `candidate_social_snapshots`.
 * Les tendances (7 j / 30 j) ne sont JAMAIS stockées : elles sont recalculées à l'affichage
 * par différence entre deux relevés (voir src/lib/socialStats.ts). Un relevé manquant
 * produit donc un « — » dans l'interface, jamais un chiffre périmé présenté comme frais.
 *
 * UNE SOURCE PAR PLATEFORME, ISOLÉE. Si un adaptateur casse, il enregistre le statut
 * « unavailable » pour SA plateforme et les autres continuent. C'est le point critique :
 * des professionnels qui paient doivent pouvoir distinguer « pas de donnée » de « zéro ».
 *
 *   youtube   API officielle YouTube Data v3. Clé gratuite (10 000 requêtes/jour), quota
 *             très largement suffisant. Seule source qui donne les VUES cumulées, donc les
 *             vraies vues gagnées par semaine et par mois. Sans clé : plateforme ignorée.
 *   bluesky   API publique AT Protocol, sans clé ni quota gênant. Stable.
 *   tiktok    Via Agentik : abonnés exacts (la page publique les arrondit : 3 200 000 pour
 *             3 255 184) et vidéos récentes des comptes officiels. Sans clé : page publique.
 *   instagram Via Agentik (ScrapeCreators, 0,00188 $ par compte) — l'endpoint web public, bloqué
 *             depuis les serveurs (429), ne sert plus que sans clé AGENTIK_API_KEY.
 *   x         Via Agentik (ScrapeCreators, 0,00188 $ par compte). Sans clé : « unavailable ».
 *             Plafond : MAX_APPELS_AGENTIK par relevé ; dépense inscrite dans ia_depenses.
 *
 * PUBLICATIONS (30/10/2026) : chaque relevé enregistre aussi les publications récentes de
 * chaque compte dans `candidate_social_posts` (vues, j'aime, commentaires, partages réels, avec
 * leur date). Elles s'accumulent de jour en jour ; purge après 90 jours.
 *
 * ERREUR CORRIGÉE : le total de j'aime de TikTok était rangé dans `total_views`, et affiché comme
 * des « vues ». TikTok n'a pas de compteur de vues cumulées : ce champ reste vide désormais.
 *
 * Usage :
 *   npx tsx scripts/update-social-stats.ts            # relevé du jour
 *   npx tsx scripts/update-social-stats.ts --seed     # (ré)injecte les comptes suivis
 *   npx tsx scripts/update-social-stats.ts --dry-run  # affiche sans rien écrire
 *   npx tsx scripts/update-social-stats.ts --plateformes=x,instagram,tiktok   # ces plateformes seules
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (requises),
 *             YOUTUBE_API_KEY (optionnelle mais vivement conseillée).
 */
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

/** Liste des comptes suivis, produite par scripts/verify-candidate-socials.ts. */
const SEED_FILE = path.join(process.cwd(), "src", "lib", "data", "candidate-socials.json");

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

type Platform = "youtube" | "x" | "tiktok" | "instagram" | "bluesky" | "facebook";

type Account = {
  id: string;
  candidate_id: string;
  platform: Platform;
  handle: string;
  url: string | null;
  external_id: string | null;
  kind: "official" | "support";
};

/** Une publication, avec ses chiffres publics au moment du relevé. */
type Publication = {
  post_id: string;
  url: string;
  texte: string | null;
  publie_le: string;
  vues: number | null;
  likes: number | null;
  commentaires: number | null;
  partages: number | null;
  est_video: boolean;
};

/** Ce qu'un adaptateur sait dire d'un compte à l'instant T. */
type Reading = {
  followers: number | null;
  total_views: number | null;
  posts: number | null;
  /** Contenus publiés dans les 7 derniers jours, et vues qu'ils ont déjà faites. */
  week_posts: number | null;
  week_views: number | null;
  status: "ok" | "unavailable";
  source: string;
  publications?: Publication[];
};

const UNAVAILABLE = (source: string): Reading =>
  ({ followers: null, total_views: null, posts: null, week_posts: null, week_views: null, status: "unavailable", source });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/* ═══════════════════════════════ Agentik ═══════════════════════════════ */

// Filet : 100 appels ≈ 0,19 $ par relevé quotidien, soit moins de 6 $ par mois.
const MAX_APPELS_AGENTIK = 100;
let appelsAgentik = 0;
let depenseAgentik = 0;

// Un compte de parti est rattaché à plusieurs candidats : il n'est payé qu'une fois par relevé.
const dejaLus = new Map<string, Promise<any | null>>();
function agentik(outil: string, handle: string): Promise<any | null> {
  const cle = `${outil}|${handle.toLowerCase()}`;
  if (!dejaLus.has(cle)) dejaLus.set(cle, appelAgentik(outil, handle));
  return dejaLus.get(cle)!;
}

async function appelAgentik(outil: string, handle: string): Promise<any | null> {
  if (!process.env.AGENTIK_API_KEY || appelsAgentik >= MAX_APPELS_AGENTIK) return null;
  appelsAgentik++;
  try {
    const res = await fetch("https://api.agentik.cc/v1/run", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.AGENTIK_API_KEY}`, "Content-Type": "application/json", "Idempotency-Key": randomUUID() },
      body: JSON.stringify({ tool_id: outil, input: { handle } }),
      signal: AbortSignal.timeout(60_000),
    });
    const json: any = await res.json().catch(() => null);
    depenseAgentik += Number(json?.price_billed_usd || 0);
    if (!res.ok || json?.status !== "COMPLETED") {
      console.warn(`  ⚠ Agentik ${outil} ${handle} : ${json?.error?.message ?? json?.status ?? res.status}`);
      return null;
    }
    return json.output;
  } catch {
    return null;
  }
}

const SEMAINE = 7 * 864e5;
/** Publications de la semaine, seulement si l'échantillon remonte au-delà des 7 jours. */
function postsSemaine(p: Publication[], plusAncienne: number | null): number | null {
  if (plusAncienne == null || Date.now() - plusAncienne < SEMAINE) return null;
  return p.filter(x => Date.now() - Date.parse(x.publie_le) < SEMAINE).length;
}
const court = (t: unknown) => (typeof t === "string" && t.trim() ? t.replace(/\s+/g, " ").trim().slice(0, 280) : null);

/* ═══════════════════════════════ Adaptateurs ═══════════════════════════════ */

/**
 * YouTube — API officielle uniquement. Un seul appel couvre jusqu'à 50 chaînes
 * (1 unité de quota sur les 10 000 quotidiennes), on groupe donc les identifiants.
 *
 * Pourquoi PAS de repli par lecture de page : une page de chaîne YouTube affiche aussi
 * les chaînes recommandées, avec LEURS compteurs d'abonnés, dans le même format. Aucun
 * moyen fiable de distinguer le compteur de la chaîne demandée de celui d'une chaîne
 * suggérée — on obtient un chiffre plausible mais faux. Et YouTube ne publie de toute
 * façon pas les vues cumulées hors API, or c'est la métrique qui porte la fonctionnalité.
 * La clé est gratuite (console Google Cloud, aucun paiement) : c'est le bon prix à payer
 * pour des chiffres justes.
 */
/**
 * Ce qu'une chaîne a publié ces sept derniers jours, et ce que ça a fait.
 *
 * Le compteur d'abonnés dit l'audience accumulée ; il ne dit rien du rythme. Deux
 * candidats à 300 000 abonnés n'ont pas la même présence si l'un publie quatre fois
 * par semaine et l'autre une fois par trimestre. On date donc les mises en ligne.
 *
 * Coût : deux unités de quota par chaîne (la playlist, puis les vues des vidéos
 * trouvées), sur les dix mille quotidiennes. Une trentaine de chaînes tient large.
 *
 * Renvoie des nuls — et non des zéros — quand la lecture échoue : un « 0 publication »
 * inexact se lirait comme un candidat inactif, ce qui est une information, fausse.
 */
async function activiteSemaine(playlist: string | undefined, key: string): Promise<{ posts: number | null; views: number | null; publications?: Publication[] }> {
  if (!playlist) return { posts: null, views: null };
  const depuis = Date.now() - 7 * 24 * 3600 * 1000;
  try {
    const r = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${playlist}&key=${key}`,
    );
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j: any = await r.json();

    // La playlist des mises en ligne est triée du plus récent au plus ancien : on
    // s'arrête dès qu'on sort de la fenêtre plutôt que de tout parcourir.
    const ids: string[] = [];
    for (const it of j.items ?? []) {
      const publie = Date.parse(it.contentDetails?.videoPublishedAt ?? "");
      if (!Number.isFinite(publie)) continue;
      if (publie < depuis) break;
      ids.push(it.contentDetails.videoId);
    }
    if (!ids.length) return { posts: 0, views: 0 };

    const v = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,snippet&id=${ids.join(",")}&key=${key}`,
    );
    if (!v.ok) throw new Error(`HTTP ${v.status}`);
    const vj: any = await v.json();
    const vues = (vj.items ?? []).reduce((t: number, it: any) => t + (num(it.statistics?.viewCount) ?? 0), 0);
    const publications: Publication[] = (vj.items ?? []).filter((it: any) => it.snippet?.publishedAt).map((it: any) => ({
      post_id: it.id,
      url: `https://www.youtube.com/watch?v=${it.id}`,
      texte: court(it.snippet.title),
      publie_le: it.snippet.publishedAt,
      vues: num(it.statistics?.viewCount),
      likes: num(it.statistics?.likeCount),
      commentaires: num(it.statistics?.commentCount),
      partages: null,
      est_video: true,
    }));
    return { posts: ids.length, views: vues, publications };
  } catch {
    return { posts: null, views: null };
  }
}

async function readYouTube(accounts: Account[]): Promise<Map<string, Reading>> {
  const out = new Map<string, Reading>();
  const key = process.env.YOUTUBE_API_KEY;

  if (!key) {
    for (const a of accounts) out.set(a.id, UNAVAILABLE("youtube_api_sans_cle"));
    if (accounts.length) {
      console.warn(`  ⚠ YOUTUBE_API_KEY absente : ${accounts.length} chaîne(s) non relevée(s).`);
      console.warn("    Clé gratuite : console.cloud.google.com → API YouTube Data v3 → Créer une clé.");
    }
    return out;
  }

  // Les comptes stockés avec un identifiant de chaîne (UC…) sont interrogeables en lot ;
  // ceux qui n'ont qu'un @pseudo doivent d'abord être résolus (1 unité chacun, une fois).
  const needResolve = accounts.filter(a => !a.external_id?.startsWith("UC"));
  for (const a of needResolve) {
    const handle = a.handle.replace(/^@/, "");
    try {
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=id&forHandle=%40${encodeURIComponent(handle)}&key=${key}`,
      );
      const json: any = await res.json();
      const id = json?.items?.[0]?.id;
      if (id) a.external_id = id;
    } catch { /* le compte restera « unavailable » plus bas */ }
    await sleep(120);
  }

  const resolvable = accounts.filter(a => a.external_id?.startsWith("UC"));
  for (const a of accounts) if (!a.external_id?.startsWith("UC")) out.set(a.id, UNAVAILABLE("youtube_api_chaine_introuvable"));

  for (let i = 0; i < resolvable.length; i += 50) {
    const batch = resolvable.slice(i, i + 50);
    try {
      // `contentDetails` livre au passage la playlist des mises en ligne : elle sert
      // ensuite à dater les publications de la semaine, sans coûter d'appel ici.
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,contentDetails&id=${batch.map(a => a.external_id).join(",")}&key=${key}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      const stats = new Map<string, any>((json.items ?? []).map((it: any) => [it.id, it.statistics]));
      const uploads = new Map<string, string>((json.items ?? [])
        .filter((it: any) => it.contentDetails?.relatedPlaylists?.uploads)
        .map((it: any) => [it.id, it.contentDetails.relatedPlaylists.uploads]));

      for (const a of batch) {
        const s = stats.get(a.external_id!);
        if (!s) { out.set(a.id, UNAVAILABLE("youtube_api_reponse_vide")); continue; }
        const semaine = await activiteSemaine(uploads.get(a.external_id!), key);
        out.set(a.id, {
          followers: num(s.subscriberCount),
          total_views: num(s.viewCount),
          posts: num(s.videoCount),
          week_posts: semaine.posts,
          week_views: semaine.views,
          status: "ok",
          source: "youtube_api",
          publications: semaine.publications,
        });
      }
    } catch (e) {
      console.warn(`  ⚠ YouTube : ${(e as Error).message}`);
      for (const a of batch) out.set(a.id, UNAVAILABLE("youtube_api_erreur"));
    }
    await sleep(200);
  }

  return out;
}

/** Bluesky — API publique AT Protocol, sans authentification. */
async function readBluesky(account: Account): Promise<Reading> {
  const actor = account.external_id || account.handle.replace(/^@/, "");
  try {
    const res = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(actor)}`,
      { headers: { "User-Agent": UA } },
    );
    if (!res.ok) return UNAVAILABLE("bluesky_public");
    const json: any = await res.json();
    return {
      followers: num(json.followersCount),
      total_views: null, // Bluesky ne publie aucun compteur de vues.
      posts: num(json.postsCount),
      week_posts: null,
      week_views: null,
      status: "ok",
      source: "bluesky_public",
    };
  } catch {
    return UNAVAILABLE("bluesky_public");
  }
}

/**
 * TikTok — les compteurs sont sérialisés dans la page publique du profil.
 * Pas d'API gratuite : cet adaptateur dépend donc de la structure de la page et peut
 * cesser de fonctionner sans préavis. C'est exactement pourquoi le statut est stocké
 * par relevé : le jour où ça casse, l'interface affiche « source indisponible ».
 */
async function readTikTok(account: Account): Promise<Reading> {
  const handle = account.handle.replace(/^@/, "");
  try {
    const res = await fetch(`https://www.tiktok.com/@${encodeURIComponent(handle)}`, {
      headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    if (!res.ok) return UNAVAILABLE("tiktok_page");
    const html = await res.text();
    const followers = html.match(/"followerCount":(\d+)/)?.[1];
    const videos = html.match(/"videoCount":(\d+)/)?.[1];
    if (!followers) return UNAVAILABLE("tiktok_page_structure_inconnue");
    return {
      followers: num(followers),
      // TikTok n'expose pas de vues cumulées (et `heartCount` compte des j'aime, pas des vues).
      total_views: null,
      posts: num(videos),
      week_posts: null,
      week_views: null,
      status: "ok",
      source: "tiktok_page",
    };
  } catch {
    return UNAVAILABLE("tiktok_page");
  }
}

/** Instagram — endpoint web public, fréquemment bloqué depuis un runner CI. */
async function readInstagram(account: Account): Promise<Reading> {
  const handle = account.handle.replace(/^@/, "");
  if (process.env.AGENTIK_API_KEY) {
    const u = (await agentik("scrapecreators/get-v1-instagram-profile", handle))?.data?.user;
    if (!u || num(u.edge_followed_by?.count) === null) return UNAVAILABLE("instagram_agentik");
    const noeuds: any[] = (u.edge_owner_to_timeline_media?.edges ?? []).map((e: any) => e.node).filter((n: any) => n?.shortcode && n?.taken_at_timestamp);
    const publications: Publication[] = noeuds.map(n => ({
      post_id: n.shortcode,
      url: `https://www.instagram.com/p/${n.shortcode}/`,
      texte: court(n.edge_media_to_caption?.edges?.[0]?.node?.text),
      publie_le: new Date(n.taken_at_timestamp * 1000).toISOString(),
      vues: n.is_video ? num(n.video_view_count ?? null) : null,
      likes: n.like_and_view_counts_disabled ? null : num(n.edge_media_preview_like?.count ?? null),
      commentaires: num(n.comment_count ?? n.edge_media_to_comment?.count ?? null),
      partages: null,
      est_video: !!n.is_video,
    }));
    const plusAncienne = noeuds.length ? Math.min(...noeuds.map(n => n.taken_at_timestamp * 1000)) : null;
    return {
      followers: num(u.edge_followed_by.count),
      total_views: null,
      posts: num(u.edge_owner_to_timeline_media?.count),
      week_posts: postsSemaine(publications, plusAncienne),
      week_views: null,
      status: "ok",
      source: "instagram_agentik",
      publications,
    };
  }
  try {
    const res = await fetch(
      `https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(handle)}`,
      { headers: { "User-Agent": UA, "x-ig-app-id": "936619743392459" } },
    );
    if (!res.ok) return UNAVAILABLE(`instagram_web_${res.status}`);
    const json: any = await res.json();
    const u = json?.data?.user;
    if (!u) return UNAVAILABLE("instagram_web_reponse_vide");
    return {
      followers: num(u.edge_followed_by?.count),
      total_views: null,
      posts: num(u.edge_owner_to_timeline_media?.count),
      week_posts: null,
      week_views: null,
      status: "ok",
      source: "instagram_web",
    };
  } catch {
    return UNAVAILABLE("instagram_web");
  }
}

/** X — l'API publique est fermée et sans repli gratuit : lecture via Agentik, sinon rien. */
async function readX(account: Account): Promise<Reading> {
  const handle = account.handle.replace(/^@/, "");
  const u = (await agentik("scrapecreators/get-v1-twitter-profile", handle))?.legacy;
  if (!u || num(u.followers_count) === null) return UNAVAILABLE("x_agentik");
  const brut: any[] = (await agentik("scrapecreators/get-v1-twitter-user-tweets", handle))?.tweets ?? [];
  const dates = brut.map(t => Date.parse(t?.legacy?.created_at)).filter(Number.isFinite);
  // Ni repartages ni réponses : seulement ce que le compte publie lui-même.
  const publications: Publication[] = brut
    .filter(t => t?.rest_id && t?.legacy?.created_at && !t.legacy.retweeted_status_result && !t.legacy.in_reply_to_status_id_str && !/^RT @/.test(t.legacy.full_text || ""))
    .map(t => ({
      post_id: t.rest_id,
      url: t.url || `https://x.com/${handle}/status/${t.rest_id}`,
      texte: court(t.note_tweet?.note_tweet_results?.result?.text || t.legacy.full_text),
      publie_le: new Date(t.legacy.created_at).toISOString(),
      vues: num(t.views?.count ?? null),
      likes: num(t.legacy.favorite_count ?? null),
      commentaires: num(t.legacy.reply_count ?? null),
      partages: (num(t.legacy.retweet_count ?? 0) ?? 0) + (num(t.legacy.quote_count ?? 0) ?? 0),
      est_video: false,
    }));
  return {
    followers: num(u.followers_count),
    total_views: null,
    posts: num(u.statuses_count),
    week_posts: null,   // le compteur total (`posts`) inclut réponses et repartages : mesuré par écart
    week_views: null,
    status: "ok",
    source: "x_agentik",
    publications,
  };
}

/** TikTok — abonnés exacts via Agentik (vidéos pour les comptes officiels), sinon page publique. */
async function readTikTokAgentik(account: Account): Promise<Reading> {
  const handle = account.handle.replace(/^@/, "");
  if (!process.env.AGENTIK_API_KEY) return readTikTok(account);
  const o = await agentik("scrapecreators/get-v1-tiktok-profile", handle);
  const st = o?.statsV2 ?? o?.stats;
  if (!st || num(st.followerCount) === null) return readTikTok(account);
  let publications: Publication[] = [];
  if (account.kind === "official") {
    const videos: any[] = (await agentik("scrapecreators/get-v3-tiktok-profile-videos", handle))?.aweme_list ?? [];
    publications = videos.filter(v => v?.aweme_id && v?.create_time).map(v => ({
      post_id: v.aweme_id,
      url: `https://www.tiktok.com/@${handle}/video/${v.aweme_id}`,
      texte: court(v.desc),
      publie_le: new Date(v.create_time * 1000).toISOString(),
      vues: num(v.statistics?.play_count ?? null),
      likes: num(v.statistics?.digg_count ?? null),
      commentaires: num(v.statistics?.comment_count ?? null),
      partages: num(v.statistics?.share_count ?? null),
      est_video: true,
    }));
  }
  return {
    followers: num(st.followerCount),
    total_views: null,
    posts: num(st.videoCount),
    week_posts: null,
    week_views: null,
    status: "ok",
    source: "tiktok_agentik",
    publications,
  };
}

async function readAccount(account: Account): Promise<Reading> {
  switch (account.platform) {
    case "bluesky": return readBluesky(account);
    case "tiktok": return readTikTokAgentik(account);
    case "instagram": return readInstagram(account);
    case "x": return readX(account);
    case "facebook": return UNAVAILABLE("facebook_aucune_source_gratuite");
    default: return UNAVAILABLE("plateforme_inconnue");
  }
}

/* ═════════════════════════ Injection des comptes suivis ═════════════════════ */

async function seed(supabase: any) {
  console.log("\n🌱 Injection des comptes suivis");
  if (!fs.existsSync(SEED_FILE)) {
    console.error(`  ✗ ${SEED_FILE} introuvable.`);
    console.error("    Lancez d'abord : npx tsx scripts/verify-candidate-socials.ts");
    return;
  }
  const seedAccounts = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));

  const { data: candidates } = await supabase
    .from("presidential_candidates").select("id, slug");
  const bySlug = new Map((candidates ?? []).map((c: any) => [c.slug, c.id]));

  const rows: any[] = [];
  const unknown: string[] = [];
  for (const entry of seedAccounts as any[]) {
    const candidateId = bySlug.get(entry.candidate_slug);
    if (!candidateId) { unknown.push(entry.candidate_slug); continue; }
    for (const acc of entry.accounts) {
      rows.push({
        candidate_id: candidateId,
        platform: acc.platform,
        handle: acc.handle,
        url: acc.url ?? null,
        kind: acc.kind ?? "official",
        label: acc.label ?? null,
        external_id: acc.external_id ?? null,
        active: true,
      });
    }
  }

  if (unknown.length) console.warn(`  ⚠ candidats inconnus en base, ignorés : ${[...new Set(unknown)].join(", ")}`);
  if (!rows.length) { console.log("  Aucun compte à injecter."); return; }

  const { error } = await supabase
    .from("candidate_social_accounts")
    .upsert(rows, { onConflict: "candidate_id,platform,handle" });
  if (error) console.error(`  ✗ ${error.message}`);
  else console.log(`  ✓ ${rows.length} compte(s) enregistré(s)`);
}

/* ═════════════════════════════ Relevé quotidien ═════════════════════════════ */

async function capture(supabase: any, dryRun: boolean) {
  console.log("\n📈 Relevé du jour");
  const { data, error } = await supabase
    .from("candidate_social_accounts")
    .select("id, candidate_id, platform, handle, url, external_id, kind")
    .eq("active", true);

  if (error) { console.error(`  ✗ ${error.message}`); return; }
  const filtre = process.argv.find(a => a.startsWith("--plateformes="))?.split("=")[1]?.split(",");
  const accounts = ((data ?? []) as Account[]).filter(a => !filtre || filtre.includes(a.platform));
  if (!accounts.length) {
    console.log("  Aucun compte suivi. Lancez d'abord --seed.");
    return;
  }
  console.log(`  ${accounts.length} compte(s) à relever`);

  const readings = new Map<string, Reading>();

  // YouTube se traite en lot pour économiser le quota.
  const yt = accounts.filter(a => a.platform === "youtube");
  for (const [id, r] of await readYouTube(yt)) readings.set(id, r);

  // Les autres plateformes, une par une, sans brusquer les serveurs.
  for (const account of accounts.filter(a => a.platform !== "youtube")) {
    readings.set(account.id, await readAccount(account));
    await sleep(700);
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows = accounts.map(a => {
    const r = readings.get(a.id) ?? UNAVAILABLE("non_traite");
    return {
      account_id: a.id,
      captured_on: today,
      followers: r.followers,
      total_views: r.total_views,
      posts: r.posts,
      // Activité de la semaine : nombre de publications et vues qu'elles ont faites.
      // Renseigné pour YouTube, qui date ses mises en ligne ; nul ailleurs, où seule
      // la variation du compteur total est observable.
      period_views: r.week_views,
      period_posts: r.week_posts,
      engagement: null,
      status: r.status,
      source: r.source,
    };
  });

  // Bilan lisible dans les logs du cron : on voit d'un coup d'œil ce qui a cassé.
  const byPlatform = new Map<string, { ok: number; ko: number }>();
  for (const a of accounts) {
    const r = readings.get(a.id)!;
    const t = byPlatform.get(a.platform) ?? { ok: 0, ko: 0 };
    r.status === "ok" ? t.ok++ : t.ko++;
    byPlatform.set(a.platform, t);
  }
  for (const [p, t] of byPlatform) {
    console.log(`  ${t.ko === 0 ? "✓" : t.ok === 0 ? "✗" : "~"} ${p.padEnd(10)} ${t.ok} relevé(s), ${t.ko} indisponible(s)`);
  }

  console.log(`  Agentik : ${appelsAgentik} appel(s), ${depenseAgentik.toFixed(4)} $`);
  if (dryRun) { console.log("  (--dry-run : rien n'est écrit)"); return; }

  if (depenseAgentik > 0) {
    const { error: e } = await supabase.from("ia_depenses").insert({ poste: "agentik", modele: "agentik", usd: Number(depenseAgentik.toFixed(5)), detail: `relevé réseaux sociaux, ${appelsAgentik} appels` });
    if (e) console.warn(`  ⚠ dépense Agentik non inscrite : ${e.message}`);
  }

  const { error: upErr } = await supabase
    .from("candidate_social_snapshots")
    .upsert(rows, { onConflict: "account_id,captured_on" });
  if (upErr) console.error(`  ✗ écriture : ${upErr.message}`);
  else console.log(`  ✓ ${rows.length} relevé(s) enregistré(s) au ${today}`);

  // Publications : une ligne par compte et par publication, chiffres remis à jour tant qu'elle
  // reste dans l'échantillon lu.
  const posts = accounts.flatMap(a => (readings.get(a.id)?.publications ?? []).map(p => ({
    ...p, account_id: a.id, candidate_id: a.candidate_id, platform: a.platform, releve_le: today,
  })));
  for (let i = 0; i < posts.length; i += 500) {
    const { error: e } = await supabase.from("candidate_social_posts").upsert(posts.slice(i, i + 500), { onConflict: "account_id,post_id" });
    if (e) { console.error(`  ✗ publications : ${e.message}`); break; }
  }
  console.log(`  ✓ ${posts.length} publication(s) relevée(s)`);
  await supabase.from("candidate_social_posts").delete().lt("publie_le", new Date(Date.now() - 90 * 864e5).toISOString());
}

/* ───────────────────────────────── Entrée ───────────────────────────────── */

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requises.");
    process.exit(1);
  }
  const supabase = createClient(url, key);

  console.log("=== Veille réseaux sociaux des candidats ===");
  if (process.argv.includes("--seed")) await seed(supabase);
  await capture(supabase, process.argv.includes("--dry-run"));
  console.log("\n=== Terminé ===");
}

main().catch(e => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
