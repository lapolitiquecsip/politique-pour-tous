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
 *   tiktok    Lecture de la page publique du profil. Fonctionne, mais dépend de la structure
 *             de la page : à surveiller, d'où le statut par plateforme.
 *   instagram Lecture de l'endpoint web public. Souvent bloqué depuis une IP de datacentre
 *             (429) — dans ce cas, statut « unavailable », et rien n'est affiché.
 *   x         Plus aucune source gratuite depuis la fermeture de l'API publique. Reste en
 *             « unavailable » tant qu'aucun fournisseur payant n'est configuré.
 *
 * Usage :
 *   npx tsx scripts/update-social-stats.ts            # relevé du jour
 *   npx tsx scripts/update-social-stats.ts --seed     # (ré)injecte les comptes suivis
 *   npx tsx scripts/update-social-stats.ts --dry-run  # affiche sans rien écrire
 *
 * Variables : NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (requises),
 *             YOUTUBE_API_KEY (optionnelle mais vivement conseillée).
 */
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
};

/** Ce qu'un adaptateur sait dire d'un compte à l'instant T. */
type Reading = {
  followers: number | null;
  total_views: number | null;
  posts: number | null;
  status: "ok" | "unavailable";
  source: string;
};

const UNAVAILABLE = (source: string): Reading =>
  ({ followers: null, total_views: null, posts: null, status: "unavailable", source });

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

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
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${batch.map(a => a.external_id).join(",")}&key=${key}`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: any = await res.json();
      const stats = new Map<string, any>((json.items ?? []).map((it: any) => [it.id, it.statistics]));
      for (const a of batch) {
        const s = stats.get(a.external_id!);
        out.set(a.id, s
          ? {
              followers: num(s.subscriberCount),
              total_views: num(s.viewCount),
              posts: num(s.videoCount),
              status: "ok",
              source: "youtube_api",
            }
          : UNAVAILABLE("youtube_api_reponse_vide"));
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
    const hearts = html.match(/"heartCount":(\d+)/)?.[1];
    if (!followers) return UNAVAILABLE("tiktok_page_structure_inconnue");
    return {
      followers: num(followers),
      // TikTok n'expose pas les vues cumulées ; le total de « j'aime » est le seul
      // compteur cumulé disponible et sert de proxy d'engagement.
      total_views: num(hearts),
      posts: num(videos),
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
      status: "ok",
      source: "instagram_web",
    };
  } catch {
    return UNAVAILABLE("instagram_web");
  }
}

/**
 * X — l'API publique a été fermée et l'endpoint de syndication qui servait de repli
 * ne renvoie plus rien. Aucune source gratuite fiable à ce jour : on l'assume plutôt
 * que d'afficher un chiffre faux. Brancher ici un fournisseur payant le cas échéant.
 */
async function readX(_account: Account): Promise<Reading> {
  return UNAVAILABLE("x_aucune_source_gratuite");
}

async function readAccount(account: Account): Promise<Reading> {
  switch (account.platform) {
    case "bluesky": return readBluesky(account);
    case "tiktok": return readTikTok(account);
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
    .select("id, candidate_id, platform, handle, url, external_id")
    .eq("active", true);

  if (error) { console.error(`  ✗ ${error.message}`); return; }
  const accounts = (data ?? []) as Account[];
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
      period_views: null,
      period_posts: null,
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

  if (dryRun) { console.log("  (--dry-run : rien n'est écrit)"); return; }

  const { error: upErr } = await supabase
    .from("candidate_social_snapshots")
    .upsert(rows, { onConflict: "account_id,captured_on" });
  if (upErr) console.error(`  ✗ écriture : ${upErr.message}`);
  else console.log(`  ✓ ${rows.length} relevé(s) enregistré(s) au ${today}`);
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
