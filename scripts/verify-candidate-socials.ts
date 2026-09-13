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

/**
 * Mouvements suivis comme comptes de SOUTIEN, rattachés à leur(s) candidat(s).
 *
 * `label` sert aussi de requête à la recherche YouTube, et `keywords` vérifie que la
 * chaîne trouvée est bien la bonne. Un mouvement peut soutenir plusieurs candidats : son
 * audience est alors comptée pour chacun, c'est pourquoi l'interface sépare par défaut
 * comptes personnels et comptes de soutien.
 */
const MOVEMENTS: { slugs: string[]; label: string; keywords: string[]; handles: string[] }[] = [
  { slugs: ["jean-luc-melenchon"], label: "La France insoumise", keywords: ["insoumise"], handles: ["franceinsoumise", "lafranceinsoumise"] },
  { slugs: ["jordan-bardella", "marine-le-pen"], label: "Rassemblement national", keywords: ["rassemblement", "national"], handles: ["rnational_off", "rassemblementnational", "rn_officiel"] },
  { slugs: ["bruno-retailleau", "xavier-bertrand"], label: "Les Républicains", keywords: ["republicains"], handles: ["lesrepublicains", "republicains"] },
  { slugs: ["gabriel-attal"], label: "Renaissance", keywords: ["renaissance"], handles: ["renaissance", "renaissance_off"] },
  { slugs: ["olivier-faure", "philippe-brun", "jerome-guedj"], label: "Parti socialiste", keywords: ["socialiste"], handles: ["partisocialiste", "ps_officiel"] },
  { slugs: ["raphael-glucksmann"], label: "Place publique", keywords: ["place", "publique"], handles: ["placepublique", "place_publique"] },
  { slugs: ["david-lisnard"], label: "Nouvelle Énergie", keywords: ["nouvelle", "energie"], handles: ["nouvelleenergie", "nouvelle_energie", "nouv_energie"] },
  { slugs: ["nathalie-arthaud"], label: "Lutte ouvrière", keywords: ["lutte", "ouvriere"], handles: ["lutteouvriere", "lutte_ouvriere"] },
  { slugs: ["florian-philippot"], label: "Les Patriotes", keywords: ["patriotes"], handles: ["lespatriotes", "patriotes_off"] },
  { slugs: ["marine-tondelier"], label: "Les Écologistes", keywords: ["ecologistes"], handles: ["lesecologistes", "eelv"] },
  { slugs: ["eric-zemmour"], label: "Reconquête", keywords: ["reconquete"], handles: ["reconquete_off", "parti_reconquete", "reconquete"] },
  { slugs: ["fabien-roussel"], label: "Parti communiste français", keywords: ["communiste"], handles: ["pcf", "pcf_officiel", "partcommuniste"] },
  { slugs: ["edouard-philippe"], label: "Horizons", keywords: ["horizons"], handles: ["horizons_org", "horizonsleparti", "horizons_officiel"] },
  { slugs: ["nicolas-dupont-aignan"], label: "Debout la France", keywords: ["debout", "france"], handles: ["deboutlafrance", "dlf_officiel"] },
  { slugs: ["francois-asselineau"], label: "Union populaire républicaine", keywords: ["union", "populaire", "republicaine"], handles: ["upr", "upr_officiel", "uprasselineau"] },
  { slugs: ["francois-ruffin"], label: "Debout Ruffin", keywords: ["ruffin"], handles: ["deboutruffin", "ruffin2027"] },
  { slugs: ["anasse-kazib"], label: "Révolution permanente", keywords: ["revolution", "permanente"], handles: ["revolutionpermanente", "revpermanente"] },
  { slugs: ["selma-labib"], label: "NPA Révolutionnaires", keywords: ["npa"], handles: ["npa_revolutionnaires", "npa2009"] },
  { slugs: ["delphine-batho"], label: "Génération écologie", keywords: ["generation", "ecologie"], handles: ["generationecologie", "gen_ecologie"] },
  { slugs: ["emmanuel-maurel"], label: "Gauche républicaine et socialiste", keywords: ["gauche", "republicaine"], handles: ["g_r_s", "gaucherepublicaine"] },
  { slugs: ["lydie-massard"], label: "Union démocratique bretonne", keywords: ["union", "democratique", "bretonne"], handles: ["udb_bzh", "udbbretagne"] },
];

/**
 * Comptes INSTAGRAM, renseignés à la main — et uniquement à la main.
 *
 * Instagram ne permet aucune vérification automatique : son API web répond 429 depuis un
 * serveur, et la page publique renvoie 200 même pour un compte qui n'existe pas, sans
 * aucun compteur lisible. Ces comptes sont donc listés sur la foi de qui les ajoute ici,
 * et l'interface affiche « source indisponible » à la place des chiffres — jamais un
 * nombre inventé. Ils restent utiles : le lien fonctionne et l'abonné voit le compte.
 */
const INSTAGRAM: Record<string, { handle: string; kind: "official" | "support"; label?: string }[]> = {
  "david-lisnard": [{ handle: "nouv_energie", kind: "support", label: "Nouvelle Énergie" }],
};

/** Comptes Instagram des mouvements, même réserve que ci-dessus. */
const INSTAGRAM_MOVEMENT: Record<string, string[]> = {};

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
 * YouTube — RECHERCHE par l'API officielle, et non plus par devinette d'identifiant.
 *
 * Deviner « @prenomnom » et ses variantes ratait la majorité des chaînes : celles de
 * Mélenchon ou du Rassemblement national ne suivent aucune règle dérivable du nom. La
 * recherche de l'API trouve la vraie chaîne, et renvoie au passage le nombre d'abonnés
 * exact, ce qui permet d'appliquer le seuil anti-usurpation sans requête de plus.
 *
 * Coût : 100 unités de quota par recherche, sur 10 000 par jour. Une cinquantaine de
 * recherches par exécution, donc très loin du plafond.
 */
let youtubeDown = false;   // quota épuisé ou API en erreur : on cesse d'interroger

async function searchYouTube(query: string, expect: string[], opts: { strict?: boolean } = {}): Promise<Found | null> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key || youtubeDown) return null;
  try {
    // regionCode + relevanceLanguage écartent déjà une bonne part des chaînes étrangères.
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&maxResults=8&regionCode=FR&relevanceLanguage=fr&q=${encodeURIComponent(query)}&key=${key}`);
    const j: any = await r.json();
    // Un quota épuisé renvoie 403/429. Sans ce test, l'erreur devient un « rien trouvé »
    // silencieux — et la fusion de fin effacerait des comptes pourtant déjà vérifiés.
    if (j.error) {
      youtubeDown = true;
      console.error(`\n❌ API YouTube indisponible : ${j.error.message?.slice(0, 120)}`);
      console.error("   Les comptes YouTube déjà connus sont CONSERVÉS tels quels.\n");
      return null;
    }
    const ids = (j.items ?? []).map((i: any) => i.snippet?.channelId ?? i.id?.channelId).filter(Boolean);
    if (!ids.length) return null;

    const d = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${ids.join(",")}&key=${key}`);
    const dj: any = await d.json();
    for (const ch of dj.items ?? []) {
      const title = ch.snippet?.title ?? "";
      if (!confirms(title, expect)) continue;

      // Mode STRICT, pour les noms de mouvements — souvent un seul mot courant.
      //
      // « Renaissance » a fait remonter « Renaissance Periodization », une chaîne
      // américaine de musculation ; « Horizons » a fait remonter « Horizons Reportages ».
      // Le simple fait de contenir le mot-clé ne prouve rien. On exige donc en plus :
      //  - un pays déclaré français quand la chaîne en déclare un ;
      //  - un titre qui ne soit pas beaucoup plus long que le nom cherché, ce qui
      //    élimine les chaînes qui ne font qu'emprunter le mot.
      if (opts.strict) {
        const country = ch.snippet?.country;
        if (country && country !== "FR") continue;
        // Le titre doit être le NOM DU MOUVEMENT, pas une chaîne qui contient le mot.
        // « Renaissance du Savoir » et « Horizons Reportages » sont françaises et
        // contiennent bien le mot-clé : seule l'égalité quasi stricte les écarte.
        const wanted = strip(query), got = strip(title);
        if (!got.startsWith(wanted) || got.length > wanted.length + 6) continue;
      }

      const followers = Number(ch.statistics?.subscriberCount ?? 0);
      if (followers < MIN_FOLLOWERS) continue;
      const custom = String(ch.snippet?.customUrl ?? "");
      return {
        handle: custom.startsWith("@") ? custom : `@${custom || ch.id}`,
        external_id: ch.id,
        followers,
        verified: false,
      };
    }
  } catch {}
  return null;
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

const CHECKERS = { tiktok: checkTikTok, bluesky: checkBluesky };

/** Essaie les identifiants l'un après l'autre, s'arrête au premier confirmé. */
async function firstConfirmed(
  platform: "tiktok" | "bluesky", handles: string[], expect: string[],
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

  const movementsOnly = process.argv.includes("--movements");
  // argv[0] et argv[1] sont l'exécutable et le script : le filtre ne peut venir qu'après.
  const filter = process.argv.slice(2).find(a => !a.startsWith("--"))?.toLowerCase();
  const res = await fetch(`${url}/rest/v1/presidential_candidates?select=slug,full_name&status=eq.declared&order=full_name`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const candidates: { slug: string; full_name: string }[] = await res.json();
  const todo = filter ? candidates.filter(c => c.slug.includes(filter)) : candidates;

  console.log(`=== Vérification des comptes — ${todo.length} candidat(s) ===\n`);
  const bySlug = new Map<string, any[]>();

  // 1. Comptes personnels (sautés en mode --movements : chaque recherche YouTube coûte
  //    100 unités de quota, inutile de les refaire pour corriger les seuls mouvements).
  for (const c of movementsOnly ? [] : todo) {
    const expect = c.full_name.split(/[\s-]+/);
    const accounts: any[] = [];

    // YouTube : recherche par l'API, bien plus fiable qu'une devinette d'identifiant.
    const yt = await searchYouTube(c.full_name, expect);
    if (yt) accounts.push({ platform: "youtube", handle: yt.handle, external_id: yt.external_id ?? null,
      url: `https://www.youtube.com/${yt.handle}`, kind: "official" });

    for (const platform of ["tiktok", "bluesky"] as const) {
      const handles = [...(HANDLES[c.slug]?.[platform] ?? []), ...variants(c.full_name)];
      let found = await firstConfirmed(platform, handles, expect);
      if (!found && platform === "bluesky") found = await searchBluesky(c.full_name, expect);
      if (!found) continue;
      accounts.push({
        platform,
        handle: found.handle,
        external_id: found.external_id ?? null,
        url: platform === "tiktok" ? `https://www.tiktok.com/${found.handle}` : `https://bsky.app/profile/${found.handle}`,
        kind: "official",
      });
    }

    // Instagram : renseigné À LA MAIN uniquement (voir INSTAGRAM plus haut). Aucune
    // vérification possible — Instagram renvoie 200 même pour un compte inexistant — et
    // aucun chiffre lisible sans authentification. Le compte est donc listé et cliquable,
    // mais l'interface affichera « source indisponible » à la place des abonnés.
    for (const ig of INSTAGRAM[c.slug] ?? []) {
      accounts.push({ platform: "instagram", handle: `@${ig.handle}`, external_id: null,
        url: `https://www.instagram.com/${ig.handle}/`, kind: ig.kind, label: ig.label ?? null });
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
    const yt = await searchYouTube(m.label, m.keywords, { strict: true });
    if (yt) accounts.push({ platform: "youtube", handle: yt.handle, external_id: yt.external_id ?? null,
      url: `https://www.youtube.com/${yt.handle}`, kind: "support", label: m.label });

    for (const platform of ["tiktok", "bluesky"] as const) {
      const found = await firstConfirmed(platform, m.handles, m.keywords);
      if (!found) continue;
      accounts.push({
        platform,
        handle: found.handle,
        external_id: found.external_id ?? null,
        url: platform === "tiktok" ? `https://www.tiktok.com/${found.handle}` : `https://bsky.app/profile/${found.handle}`,
        kind: "support",
        label: m.label,
      });
    }

    for (const ig of INSTAGRAM_MOVEMENT[m.label] ?? []) {
      accounts.push({ platform: "instagram", handle: `@${ig}`, external_id: null,
        url: `https://www.instagram.com/${ig}/`, kind: "support", label: m.label });
    }
    console.log(`${m.label.padEnd(24)} ${accounts.map(a => `${a.platform}:${a.handle}`).join(" ") || "(aucun)"}`);
    for (const slug of slugs) {
      const already = bySlug.get(slug) ?? [];
      // Le compte personnel d'un candidat ne doit pas être recompté comme son propre
      // soutien : « Debout Ruffin » avait ainsi ramené la chaîne de François Ruffin.
      const nouveaux = accounts.filter(a => !already.some(b => b.platform === a.platform && b.handle === a.handle));
      bySlug.set(slug, [...already, ...nouveaux]);
    }
  }

  // 3. Écriture. En mode filtré, on fusionne avec l'existant au lieu de l'écraser.
  let previous: any[] = [];
  if ((filter || movementsOnly) && fs.existsSync(OUT)) previous = JSON.parse(fs.readFileSync(OUT, "utf8"));
  const merged = new Map<string, any[]>(previous.map((e: any) => [e.candidate_slug, e.accounts]));
  if (movementsOnly) {
    // On conserve les comptes personnels, et on remplace les soutiens — SAUF ceux d'une
    // plateforme qu'on n'a pas pu interroger : un quota épuisé ne doit pas valoir
    // suppression. On ne retire que ce qu'on a effectivement pu re-vérifier.
    const injoignables = new Set(youtubeDown ? ["youtube"] : []);
    for (const [slug, accs] of merged) {
      merged.set(slug, accs.filter((a: any) => a.kind === "official" || injoignables.has(a.platform)));
    }
    for (const [slug, accounts] of bySlug) {
      const already = merged.get(slug) ?? [];
      const nouveaux = accounts.filter((a: any) => !already.some((b: any) => b.platform === a.platform && b.handle === a.handle));
      merged.set(slug, [...already, ...nouveaux]);
    }
  } else {
    for (const [slug, accounts] of bySlug) merged.set(slug, accounts);
  }

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
