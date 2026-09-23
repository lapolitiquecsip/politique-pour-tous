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
  const series = snapshots
    .filter(s => s.account_id === account.id && s.status !== "unavailable")
    .sort((a, b) => a.captured_on.localeCompare(b.captured_on));

  const latest = series.length ? series[series.length - 1] : null;

  if (!latest) {
    return {
      account, latest: null, followers: null,
      followersDelta7: null, followersDelta30: null,
      views7: null, views30: null, posts7: null, posts30: null, weekViews: null,
      staleDays: null, status: "unavailable",
    };
  }

  const staleDays = Math.round((Date.now() - toTime(latest.captured_on)) / DAY);
  const ref7 = snapshotAround(series, 7);
  const ref30 = snapshotAround(series, 30, 5);

  return {
    account,
    latest,
    followers: latest.followers,
    followersDelta7: delta(latest.followers, ref7?.followers),
    followersDelta30: delta(latest.followers, ref30?.followers),
    views7: delta(latest.total_views, ref7?.total_views),
    views30: delta(latest.total_views, ref30?.total_views),
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
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(abs >= 1e4 ? 0 : 1).replace(".", ",")} k`;
  return `${sign}${abs}`;
}

/** Variation signée, pour les deltas : « +12,3 k », « -840 », « — ». */
export function signed(n: number | null | undefined): string {
  if (n == null) return "—";
  return (n > 0 ? "+" : "") + compact(n);
}

export const PLATFORM_META: Record<Platform, { label: string; color: string; hasViews: boolean }> = {
  youtube:   { label: "YouTube",   color: "#ff0033", hasViews: true },
  x:         { label: "X",         color: "#0f172a", hasViews: true },
  tiktok:    { label: "TikTok",    color: "#00c2cb", hasViews: true },
  instagram: { label: "Instagram", color: "#d62976", hasViews: false },
  bluesky:   { label: "Bluesky",   color: "#0085ff", hasViews: false },
  facebook:  { label: "Facebook",  color: "#1877f2", hasViews: false },
};
