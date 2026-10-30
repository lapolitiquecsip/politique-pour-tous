/**
 * Calcul des tendances d'audience à partir des relevés quotidiens.
 *
 * Principe : on ne stocke JAMAIS une tendance en base, seulement des relevés
 * (`candidate_social_snapshots`). Une tendance est toujours la différence entre
 * deux relevés, recalculée à l'affichage. Une série incomplète produit donc un
 * `null` — jamais un chiffre inventé.
 */

export type Platform = "youtube" | "x" | "tiktok" | "instagram" | "bluesky" | "facebook";

export type SocialAccount = {
  id: string;
  candidate_id: string;
  platform: Platform;
  handle: string;
  url: string | null;
  kind: "official" | "support";
  label: string | null;
  external_id: string | null;
};

export type Snapshot = {
  account_id: string;
  captured_on: string;
  followers: number | null;
  total_views: number | null;
  posts: number | null;
  period_views: number | null;
  period_posts: number | null;
  engagement: number | null;
  status: "ok" | "stale" | "unavailable";
  source: string | null;
};

export type SocialPost = {
  account_id: string;
  candidate_id: string;
  platform: Platform;
  post_id: string;
  url: string;
  texte: string | null;
  publie_le: string;
  vues: number | null;
  likes: number | null;
  commentaires: number | null;
  partages: number | null;
  est_video: boolean;
  releve_le: string;
};

export type Metrics = {
  account: SocialAccount;
  /** Dernier relevé exploitable, ou null si la source n'a jamais rien rendu. */
  latest: Snapshot | null;
  followers: number | null;
  /** Abonnés gagnés/perdus sur la période. null si la série est trop courte. */
  followersDelta7: number | null;
  followersDelta30: number | null;
  /** Vues réellement gagnées sur la période (différence de compteur cumulé). */
  views7: number | null;
  views30: number | null;
  /** Contenus publiés sur la période. */
  posts7: number | null;
  posts30: number | null;
  /**
   * Vues faites par les seules publications de la semaine.
   *
   * À ne pas confondre avec `views7`, qui mesure les vues gagnées par la chaîne
   * ENTIÈRE, catalogue ancien compris. Renseigné pour YouTube, qui date ses mises
   * en ligne ; nul ailleurs.
   */
  weekViews: number | null;
  /** Abonnés à la date de référence, pour exprimer une progression en %. */
  followersRef7: number | null;
  followersRef30: number | null;
  /** Saut de plus de 10 % d'un jour à l'autre : à vérifier, écarté de la progression. */
  anomalie: boolean;
  /** Fraîcheur : nombre de jours depuis le dernier relevé « ok ». */
  staleDays: number | null;
  status: "ok" | "stale" | "unavailable";
};

const DAY = 864e5;
const toTime = (d: string) => new Date(d + "T00:00:00Z").getTime();

/**
 * Relevé le plus proche de `daysAgo` jours en arrière, à ±3 jours près.
 * La tolérance absorbe un cron qui aurait sauté une nuit ; au-delà on renonce
 * plutôt que de comparer des points trop éloignés, ce qui fausserait la pente.
 */
function snapshotAround(series: Snapshot[], daysAgo: number, tolerance = 3): Snapshot | null {
  if (!series.length) return null;
  const target = toTime(series[series.length - 1].captured_on) - daysAgo * DAY;
  let best: Snapshot | null = null;
  let bestGap = Infinity;
  for (const s of series) {
    const gap = Math.abs(toTime(s.captured_on) - target);
    if (gap < bestGap) { bestGap = gap; best = s; }
  }
  return bestGap <= tolerance * DAY ? best : null;
}

/** Différence entre deux relevés sur un compteur cumulé ; null si l'un manque. */
function delta(now: number | null | undefined, then: number | null | undefined): number | null {
  if (now == null || then == null) return null;
  return now - then;
}

/** Agrège la série d'un compte en indicateurs affichables. */
export function computeMetrics(account: SocialAccount, snapshots: Snapshot[]): Metrics {
  const toutes = snapshots
    .filter(s => s.account_id === account.id && s.status !== "unavailable")
    .sort((a, b) => a.captured_on.localeCompare(b.captured_on));

  const latest = toutes.length ? toutes[toutes.length - 1] : null;
  // On ne compare qu'une même source : la page publique de TikTok arrondit (3 200 000), Agentik
  // donne le chiffre exact (3 255 184). L'écart serait un faux gain de 55 000 abonnés.
  const series = toutes.filter(s => s.source === latest?.source);

  if (!latest) {
    return {
      account, latest: null, followers: null,
      followersDelta7: null, followersDelta30: null,
      views7: null, views30: null, posts7: null, posts30: null, weekViews: null,
      followersRef7: null, followersRef30: null, anomalie: false,
      staleDays: null, status: "unavailable",
    };
  }

  const staleDays = Math.round((Date.now() - toTime(latest.captured_on)) / DAY);
  const ref7 = snapshotAround(series, 7);
  const ref30 = snapshotAround(series, 30, 5);
  const anomalie = series.slice(-31).some((s, i, l) => {
    const avant = l[i - 1]?.followers, f = s.followers;
    return avant != null && f != null && avant >= 1000 && Math.abs(f - avant) / avant > 0.1;
  });
  // Seul YouTube a un vrai compteur de vues cumulées (sur TikTok, l'ancien champ comptait des j'aime).
  const vuesFiables = account.platform === "youtube";

  return {
    account,
    latest,
    followers: latest.followers,
    followersDelta7: delta(latest.followers, ref7?.followers),
    followersDelta30: delta(latest.followers, ref30?.followers),
    followersRef7: ref7?.followers ?? null,
    followersRef30: ref30?.followers ?? null,
    anomalie,
    views7: vuesFiables ? delta(latest.total_views, ref7?.total_views) : null,
    views30: vuesFiables ? delta(latest.total_views, ref30?.total_views) : null,
    // YouTube date ses mises en ligne : on prend son compte exact. Ailleurs, seule
    // la variation du compteur total renseigne, et elle demande deux relévés.
    posts7: latest.period_posts ?? delta(latest.posts, ref7?.posts),
    posts30: delta(latest.posts, ref30?.posts),
    weekViews: latest.period_views,
    staleDays,
    // Au-delà de 3 jours sans relevé frais, l'interface le signale explicitement.
    status: staleDays > 3 ? "stale" : latest.status,
  };
}

export const interactions = (p: SocialPost) => (p.likes ?? 0) + (p.commentaires ?? 0) + (p.partages ?? 0);

/** Publications d'une période et ce qu'elles ont réellement fait. */
export function bilanPublications(posts: SocialPost[], jours: number) {
  const depuis = Date.now() - jours * DAY;
  const l = posts.filter(p => Date.parse(p.publie_le) >= depuis);
  const avecVues = l.filter(p => p.vues != null);
  return {
    liste: l,
    nb: l.length,
    vues: avecVues.length ? avecVues.reduce((t, p) => t + (p.vues ?? 0), 0) : null,
    interactions: l.length ? l.reduce((t, p) => t + interactions(p), 0) : null,
  };
}

/**
 * Taux d'engagement : interactions par publication, rapportées aux abonnés du compte. Sur
 * plusieurs comptes, moyenne pondérée. null si aucune publication comparable.
 */
export function tauxEngagement(lignes: { followers: number | null; posts: SocialPost[] }[]): number | null {
  let inter = 0, base = 0;
  for (const { followers, posts } of lignes) {
    if (!followers || !posts.length) continue;
    inter += posts.reduce((t, p) => t + interactions(p), 0);
    base += followers * posts.length;
  }
  return base ? (inter / base) * 100 : null;
}

/**
 * Courbe d'audience à PÉRIMÈTRE CONSTANT : seuls les comptes déjà mesurés au début de la fenêtre,
 * par la même source, comptent ; un relevé manquant reprend le précédent. Sinon un jour sans
 * TikTok fait une chute, et l'arrivée d'un nouveau compte un bond, qui n'ont jamais eu lieu.
 */
export function courbeConstante(metrics: Metrics[], snapshots: Snapshot[], jours = 30): number[] {
  const parCompte = metrics.filter(m => m.latest).map(m => ({
    points: new Map(snapshots
      .filter(s => s.account_id === m.account.id && s.status !== "unavailable" && s.followers != null && s.source === m.latest!.source)
      .map(s => [s.captured_on, s.followers as number])),
  })).filter(c => c.points.size >= 2);
  if (!parCompte.length) return [];
  const dates = [...new Set(parCompte.flatMap(c => [...c.points.keys()]))].sort().slice(-jours);
  const retenus = parCompte.filter(c => [...c.points.keys()].some(d => d <= dates[0]));
  const dernier = retenus.map(() => null as number | null);
  return dates.map(d => retenus.reduce((t, c, i) => {
    dernier[i] = c.points.get(d) ?? dernier[i];
    return t + (dernier[i] ?? 0);
  }, 0));
}

/** Somme d'un indicateur sur plusieurs comptes ; null si aucun compte ne le fournit. */
export function sumMetric(list: Metrics[], key: "followers" | "views7" | "views30" | "followersDelta30" | "posts7" | "weekViews"): number | null {
  const values = list.map(m => m[key]).filter((v): v is number => v != null);
  return values.length ? values.reduce((a, b) => a + b, 0) : null;
}

/** 1 234 567 → « 1,2 M ». Les grands nombres sont illisibles en entier. */
export function compact(n: number | null | undefined): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1).replace(".", ",")} Md`;
  if (abs >= 999_500) return `${sign}${(abs / 1e6).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(".", ",")} k`;
  return `${sign}${abs}`;
}

/** Variation signée, pour les deltas : « +12,3 k », « -840 », « — ». */
export function signed(n: number | null | undefined): string {
  if (n == null) return "—";
  return (n > 0 ? "+" : "") + compact(n);
}

/** D'où vient un chiffre, en clair. */
export const SOURCES: Record<string, string> = {
  youtube_api: "API officielle YouTube (abonnés arrondis par YouTube)",
  bluesky_public: "API publique Bluesky",
  x_agentik: "Profil public X (ScrapeCreators via Agentik)",
  instagram_agentik: "Profil public Instagram (ScrapeCreators via Agentik)",
  tiktok_agentik: "Profil public TikTok (ScrapeCreators via Agentik)",
  tiktok_page: "Page publique TikTok (chiffre arrondi)",
};

export const PLATFORM_META: Record<Platform, { label: string; color: string; hasViews: boolean }> = {
  youtube:   { label: "YouTube",   color: "#ff0033", hasViews: true },
  x:         { label: "X",         color: "#0f172a", hasViews: false },
  tiktok:    { label: "TikTok",    color: "#00c2cb", hasViews: true },
  instagram: { label: "Instagram", color: "#d62976", hasViews: false },
  bluesky:   { label: "Bluesky",   color: "#0085ff", hasViews: false },
  facebook:  { label: "Facebook",  color: "#1877f2", hasViews: false },
};
