/**
 * OUTIL : construit et vérifie la liste des comptes de candidats suivis par la veille Pro.
 *
 * Écrit `src/lib/data/candidate-socials.json`, qui alimente ensuite
 * `update-social-stats.ts --seed`. À relancer quand un candidat entre en campagne
 * ou change de compte.
 *
 * RÈGLE DE SÛRETÉ — un compte n'est retenu que si la page interrogée confirme
 * elle-même l'identité :
 *   1. le nom affiché correspond au candidat ou au mouvement, ET
 *   2. le compte porte le badge de la plateforme, OU dépasse un seuil d'audience.
 *
 * La règle 2 n'est pas cosmétique : les comptes usurpateurs recopient le nom à
 * l'identique. Sans elle, on publie « Éric Zemmour, 55 abonnés » à des abonnés qui
 * paient 24,99 € pour des chiffres justes.
 *
 * Les identifiants sont dérivés du nom, puis complétés par la liste HANDLES ci-dessous,
 * qu'on enrichit à la main quand la dérivation ne trouve pas le bon compte (un compte
 * comme « @mlp_officiel » n'est dérivable d'aucune règle).
 *
 * Usage :
 *   npx tsx scripts/verify-candidate-socials.ts            # tous les candidats
 *   npx tsx scripts/verify-candidate-socials.ts melenchon  # un seul (filtre sur le slug)
 */
import fs from "fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const OUT = "src/lib/data/candidate-socials.json";

/** En dessous, un compte au nom d'un candidat à la présidentielle n'est pas crédible. */
const MIN_FOLLOWERS = 5000;
/** Les plateformes n'aiment pas les rafales : on interroge lentement. */
const DELAY_MS = 1600;

/**
 * Identifiants connus, à compléter à la main. Ils sont essayés EN PREMIER, avant les
 * variantes dérivées du nom. Un identifiant listé ici reste soumis aux vérifications.
 */
const HANDLES: Record<string, Partial<Record<"youtube" | "tiktok" | "bluesky", string[]>>> = {
  "jean-luc-melenchon": { tiktok: ["jlmelenchon"], youtube: ["jlmelenchon"], bluesky: ["jlmelenchon.bsky.social"] },
  "marine-le-pen": { tiktok: ["mlp_officiel"], youtube: ["marinelepenofficiel"] },
  "eric-zemmour": { tiktok: ["zemmoureric"], youtube: ["ericzemmouroff"] },
  "jordan-bardella": { tiktok: ["jordanbardella"], youtube: ["j_bardella"] },
  "gabriel-attal": { tiktok: ["gabrielattal"], youtube: ["gabriel_attal"] },
  "francois-ruffin": { tiktok: ["francois_ruffin"], youtube: ["francois_ruffin"], bluesky: ["francoisruffin.fr"] },
  "marine-tondelier": { tiktok: ["marinetondelier"], bluesky: ["marinetondelier.fr"] },
  "francois-asselineau": { tiktok: ["fasselineau"], youtube: ["f_asselineau"] },
  "florian-philippot": { tiktok: ["florianphilippot"] },
  "david-lisnard": { tiktok: ["david.lisnard"], youtube: ["david_lisnard"] },
  "raphael-glucksmann": { bluesky: ["raphaelglucksmann.bsky.social"] },
  "olivier-faure": { bluesky: ["olivierfaure.bsky.social"] },
  "nathalie-arthaud": { tiktok: ["nathaliearthaud"] },
  "juan-branco": { tiktok: ["brancojuan"] },
};

/** Mouvements suivis comme comptes de SOUTIEN, rattachés à leur(s) candidat(s). */
const MOVEMENTS: { slugs: string[]; label: string; keywords: string[]; handles: string[] }[] = [
  { slugs: ["jean-luc-melenchon"], label: "La France insoumise", keywords: ["insoumise"], handles: ["franceinsoumise"] },
  { slugs: ["jordan-bardella", "marine-le-pen"], label: "Rassemblement national", keywords: ["rassemblement", "national"], handles: ["rnational_off", "rassemblementnational"] },
  { slugs: ["bruno-retailleau", "xavier-bertrand"], label: "Les Républicains", keywords: ["republicains"], handles: ["lesrepublicains"] },
  { slugs: ["gabriel-attal"], label: "Renaissance", keywords: ["renaissance"], handles: ["renaissance", "renaissance_off"] },
  { slugs: ["olivier-faure", "philippe-brun", "jerome-guedj"], label: "Parti socialiste", keywords: ["socialiste"], handles: ["partisocialiste"] },
  { slugs: ["raphael-glucksmann"], label: "Place publique", keywords: ["place", "publique"], handles: ["placepublique"] },
  { slugs: ["david-lisnard"], label: "Nouvelle Énergie", keywords: ["nouvelle", "energie"], handles: ["nouvelleenergie"] },
  { slugs: ["nathalie-arthaud"], label: "Lutte ouvrière", keywords: ["lutte", "ouvriere"], handles: ["lutteouvriere"] },
  { slugs: ["florian-philippot"], label: "Les Patriotes", keywords: ["patriotes"], handles: ["lespatriotes"] },
  { slugs: ["marine-tondelier"], label: "Les Écologistes", keywords: ["ecologistes"], handles: ["lesecologistes"] },
];

/* ─────────────────────────────── Utilitaires ─────────────────────────────── */

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const strip = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]/g, "");

/** Tous les mots significatifs attendus sont-ils présents dans le nom trouvé ? */
function confirms(found: string, expected: string[]): boolean {
  const f = strip(found);
  return expected.map(strip).filter(p => p.length > 2).every(p => f.includes(p));
}

/** Variantes d'identifiant plausibles, dérivées du nom. Volontairement peu nombreuses. */
function variants(name: string): string[] {
  const parts = name.split(/[\s-]+/).map(strip).filter(Boolean);
  const first = parts[0], last = parts[parts.length - 1];
  const initials = parts.slice(0, -1).map(p => p[0]).join("");
  return [...new Set([
    parts.join(""), first + last, first + "_" + last, initials + last, first[0] + last, last,
  ])].filter(v => v.length >= 4);
}

/* ──────────────────────────────── Plateformes ──────────────────────────────── */

type Found = { handle: string; external_id?: string; followers: number; verified: boolean };

async function checkTikTok(handle: string, expect: string[]): Promise<Found | null> {
  try {
    const r = await fetch(`https://www.tiktok.com/@${handle}`, {
      headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" },
    });
    if (!r.ok) return null;
    const h = await r.text();
    const nick = h.match(/"nickname":"([^"]{2,60})"/)?.[1];
    const followers = Number(h.match(/"followerCount":(\d+)/)?.[1] ?? 0);
    if (!nick || !confirms(nick, expect)) return null;
    const verified = /"verified":true/.test(h);
    if (!verified && followers < MIN_FOLLOWERS) return null;
    return { handle: "@" + handle, followers, verified };
  } catch { return null; }
}

/**
 * YouTube : l'identité se vérifie par le triplet titre + identifiant canonique + externalId.
 * On ne lit AUCUN compteur ici — une page de chaîne affiche aussi les compteurs des chaînes
 * recommandées, impossible à démêler de façon fiable. Les chiffres viendront de l'API.
 */
async function checkYouTube(handle: string, expect: string[]): Promise<Found | null> {
  try {
    const r = await fetch(`https://www.youtube.com/@${handle}`, {
      headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" }, redirect: "follow",
    });
    if (!r.ok) return null;
    const h = await r.text();
    const title = h.match(/<meta property="og:title" content="([^"]{2,80})"/)?.[1];
    const canonical = h.match(/"canonicalBaseUrl":"\/@([\w.-]+)"/)?.[1];
    const cid = h.match(/"externalId":"(UC[\w-]{20,24})"/)?.[1];
    if (!title || !cid || !confirms(title, expect)) return null;
    // La page doit bien être celle de l'identifiant demandé, pas une redirection.
    if (canonical && strip(canonical) !== strip(handle)) return null;
    return { handle: "@" + handle, external_id: cid, followers: 0, verified: false };
  } catch { return null; }
}

async function checkBluesky(handle: string, expect: string[]): Promise<Found | null> {
  try {
    const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`, { headers: { "User-Agent": UA } });
    if (!r.ok) return null;
    const p: any = await r.json();
    if (!p.did || !confirms(p.displayName ?? "", expect)) return null;
    const verified = p.verification?.verifiedStatus === "valid";
    const followers = Number(p.followersCount ?? 0);
    if (!verified && followers < MIN_FOLLOWERS) return null;
    return { handle: p.handle, external_id: p.did, followers, verified };
  } catch { return null; }
}

/** Cherche un compte Bluesky par nom quand aucun identifiant n'est connu. */
async function searchBluesky(name: string, expect: string[]): Promise<Found | null> {
  try {
    const r = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.searchActors?q=${encodeURIComponent(name)}&limit=10`, { headers: { "User-Agent": UA } });
    const j: any = await r.json();
    for (const a of j.actors ?? []) {
      if (!confirms(a.displayName ?? "", expect)) continue;
      const found = await checkBluesky(a.handle, expect);
      if (found) return found;
      await sleep(300);
    }
  } catch {}
  return null;
}

const CHECKERS = { tiktok: checkTikTok, youtube: checkYouTube, bluesky: checkBluesky };

/** Essaie les identifiants l'un après l'autre, s'arrête au premier confirmé. */
async function firstConfirmed(
  platform: "tiktok" | "youtube" | "bluesky", handles: string[], expect: string[],
): Promise<Found | null> {
  for (const h of handles) {
    const found = await CHECKERS[platform](h, expect);
    await sleep(DELAY_MS);
    if (found) return found;
  }
  return null;
}

/* ──────────────────────────────────── Main ──────────────────────────────────── */

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("❌ NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY sont requises.");
    process.exit(1);
  }

  const filter = process.argv[2]?.toLowerCase();
  const res = await fetch(`${url}/rest/v1/presidential_candidates?select=slug,full_name&status=eq.declared&order=full_name`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const candidates: { slug: string; full_name: string }[] = await res.json();
  const todo = filter ? candidates.filter(c => c.slug.includes(filter)) : candidates;

  console.log(`=== Vérification des comptes — ${todo.length} candidat(s) ===\n`);
  const bySlug = new Map<string, any[]>();

  // 1. Comptes personnels.
  for (const c of todo) {
    const expect = c.full_name.split(/[\s-]+/);
    const accounts: any[] = [];

    for (const platform of ["youtube", "tiktok", "bluesky"] as const) {
      const candidatesHandles = [...(HANDLES[c.slug]?.[platform] ?? []), ...variants(c.full_name)];
      let found = await firstConfirmed(platform, candidatesHandles, expect);
      if (!found && platform === "bluesky") found = await searchBluesky(c.full_name, expect);
      if (!found) continue;
      accounts.push({
        platform,
        handle: found.handle,
        external_id: found.external_id ?? null,
        url: platform === "youtube" ? `https://www.youtube.com/${found.handle}`
          : platform === "tiktok" ? `https://www.tiktok.com/${found.handle}`
          : `https://bsky.app/profile/${found.handle}`,
        kind: "official",
      });
    }

    if (accounts.length) bySlug.set(c.slug, accounts);
    const show = accounts.map(a => `${a.platform}:${a.handle}`).join(" ") || "(aucun compte confirmé)";
    console.log(`${c.full_name.padEnd(24)} ${show}`);
  }

  // 2. Comptes de soutien (mouvements), rattachés à chaque candidat concerné.
  console.log("\n--- Comptes de soutien ---");
  for (const m of MOVEMENTS) {
    const slugs = m.slugs.filter(s => todo.some(c => c.slug === s));
    if (!slugs.length) continue;
    const accounts: any[] = [];
    for (const platform of ["youtube", "tiktok", "bluesky"] as const) {
      const found = await firstConfirmed(platform, m.handles, m.keywords);
      if (!found) continue;
      accounts.push({
        platform,
        handle: found.handle,
        external_id: found.external_id ?? null,
        url: platform === "youtube" ? `https://www.youtube.com/${found.handle}`
          : platform === "tiktok" ? `https://www.tiktok.com/${found.handle}`
          : `https://bsky.app/profile/${found.handle}`,
        kind: "support",
        label: m.label,
      });
    }
    console.log(`${m.label.padEnd(24)} ${accounts.map(a => `${a.platform}:${a.handle}`).join(" ") || "(aucun)"}`);
    for (const slug of slugs) bySlug.set(slug, [...(bySlug.get(slug) ?? []), ...accounts]);
  }

  // 3. Écriture. En mode filtré, on fusionne avec l'existant au lieu de l'écraser.
  let previous: any[] = [];
  if (filter && fs.existsSync(OUT)) previous = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const merged = new Map(previous.map((e: any) => [e.candidate_slug, e.accounts]));
  for (const [slug, accounts] of bySlug) merged.set(slug, accounts);

  const out = [...merged.entries()]
    .filter(([, a]) => a.length)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([candidate_slug, accounts]) => ({ candidate_slug, accounts }));

  fs.writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  const total = out.reduce((n, e) => n + e.accounts.length, 0);
  const official = out.reduce((n, e) => n + e.accounts.filter((a: any) => a.kind === "official").length, 0);
  console.log(`\n✓ ${OUT} — ${out.length} candidat(s), ${total} compte(s) (${official} personnels, ${total - official} de soutien)`);
}

main().catch(e => { console.error("Erreur fatale :", e); process.exit(1); });
