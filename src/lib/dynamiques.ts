/**
 * Calculs de l'onglet « Dynamiques » (présidentielle 2027) : moyenne des sondages,
 * marges d'erreur, couleurs des candidats. Aucun appel réseau ici.
 */

export type Resultat = { nom: string; slug: string | null; pct: number; complet?: string; photo?: string | null };
export type Sondage = {
  id: number; cle: string; tour: 1 | 2; institut: string; date_debut: string | null; date_fin: string;
  echantillon: number | null; hypothese: number; resultats: Resultat[]; source_url: string | null;
  /** Notice officielle déposée à la Commission des sondages, et acheteur lu dedans (« — » : non repéré). */
  notice_url?: string | null; commanditaire?: string | null;
};

/**
 * Loi n° 77-808 du 19 juillet 1977, art. 11 : ni publication, ni diffusion, ni commentaire
 * d'un sondage électoral la veille et le jour de chaque tour. L'outre-mer votant dès le
 * samedi, le silence court du vendredi 0 h au dimanche 20 h (heure de Paris), comme le
 * pratique la Commission des sondages. Dates de la présidentielle 2027 à confirmer par
 * le décret de convocation (attendu au plus tard début février 2027).
 */
export const TOURS_PRESIDENTIELLE = ["2027-04-18", "2027-05-02"];
export function silenceSondages(maintenant = new Date()): string | null {
  for (const dimanche of TOURS_PRESIDENTIELLE) {
    const d = new Date(dimanche + "T12:00:00Z");
    const vendredi = new Date(d.getTime() - 2 * 864e5).toISOString().slice(0, 10);
    // Avril-mai : heure d'été, Paris = UTC+2.
    if (maintenant >= new Date(vendredi + "T00:00:00+02:00") && maintenant < new Date(dimanche + "T20:00:00+02:00")) return dimanche;
  }
  return null;
}

/** Identifiant d'un candidat dans les sondages : sa fiche, ou à défaut son nom. */
export const idDe = (r: Resultat) => r.slug ?? `nom:${r.nom}`;

/**
 * Couleurs des candidats, reprises des codes de leur famille politique et choisies
 * pour rester visibles sur fond clair comme sur fond sombre.
 */
const COULEURS: Record<string, string> = {
  "marine-le-pen": "#3451c7", "jordan-bardella": "#5b6fd6",
  "jean-luc-melenchon": "#e5484d", "edouard-philippe": "#14a8b8", "gabriel-attal": "#f0a020",
  "bruno-retailleau": "#3ba3f5", "raphael-glucksmann": "#ec4899", "marine-tondelier": "#22b35e",
  "eric-zemmour": "#8b7f75", "fabien-roussel": "#b4232f", "nicolas-dupont-aignan": "#0e7490",
  "nathalie-arthaud": "#9f1239", "olivier-faure": "#f472b6", "segolene-royal": "#db2777",
  "francois-hollande": "#f9a8d4", "francois-ruffin": "#f97316", "jerome-guedj": "#c026d3",
  "xavier-bertrand": "#60a5fa", "david-lisnard": "#1d6fd8", "florian-philippot": "#6d5bd0",
  "francois-asselineau": "#0f766e", "delphine-batho": "#4ade80", "karim-bouamrane": "#e879f9",
  "emmanuel-maurel": "#dc2626", "bernard-cazeneuve": "#fb7185", "anasse-kazib": "#7f1d1d",
  "juan-branco": "#a3a3a3", "selma-labib": "#991b1b", "lydie-massard": "#facc15",
};
const RESERVE = ["#a855f7", "#64748b", "#84cc16", "#06b6d4", "#f59e0b", "#ef4444", "#10b981", "#6366f1"];
export function couleur(id: string): string {
  if (COULEURS[id]) return COULEURS[id];
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return RESERVE[h % RESERVE.length];
}

/**
 * Vignette Wikimedia d'une photo : les fiches pointent sur l'original (souvent plus de
 * 300 Ko) quand l'onglet n'affiche que des pastilles de quelques dizaines de pixels.
 */
export function vignette(url: string | null | undefined, px = 96): string | null {
  if (!url) return null;
  const m = url.match(/^(https:\/\/upload\.wikimedia\.org\/wikipedia\/commons)\/(?:thumb\/)?([0-9a-f])\/([0-9a-f]{2})\/([^/?#]+)/);
  if (!m || /\.svg$/i.test(m[4])) return url;
  // Wikimedia ne sert que des largeurs standard (120, 250…) : une autre largeur répond 400.
  const std = px <= 120 ? 120 : 250;
  return `${m[1]}/thumb/${m[2]}/${m[3]}/${m[4]}/${std}px-${m[4]}`;
}

const JOUR = 86400000;
export const t = (iso: string) => new Date(iso + "T12:00:00Z").getTime();

/** Marge d'erreur à 95 % d'un score (en points), pour un échantillon donné. */
export function marge(pct: number, n: number | null): number | null {
  if (!n || n < 100) return null;
  const p = pct / 100;
  return 1.96 * Math.sqrt((p * (1 - p)) / n) * 100;
}

/**
 * Score d'un candidat dans un sondage : la moyenne de ses scores dans les hypothèses
 * de ce sondage où il est testé. Un institut qui teste dix variantes ne pèse ainsi
 * qu'une fois.
 */
export function parSondage(sondages: Sondage[]) {
  const groupes = new Map<string, Sondage[]>();
  for (const s of sondages) {
    const k = `${s.institut}|${s.date_fin}`;
    groupes.set(k, [...(groupes.get(k) || []), s]);
  }
  return [...groupes.values()].map(hyps => {
    const scores = new Map<string, { nom: string; slug: string | null; somme: number; n: number; min: number; max: number }>();
    for (const h of hyps) for (const r of h.resultats) {
      const id = idDe(r);
      const e = scores.get(id) || { nom: r.nom, slug: r.slug, somme: 0, n: 0, min: Infinity, max: -Infinity };
      e.somme += r.pct; e.n++; e.min = Math.min(e.min, r.pct); e.max = Math.max(e.max, r.pct);
      scores.set(id, e);
    }
    const h0 = hyps[0];
    return {
      institut: h0.institut, date_debut: h0.date_debut, date_fin: h0.date_fin, echantillon: h0.echantillon,
      notice_url: hyps.find(h => h.notice_url)?.notice_url ?? null,
      commanditaire: hyps.find(h => h.commanditaire && h.commanditaire !== "—")?.commanditaire ?? null,
      t: t(h0.date_fin), hypotheses: hyps.sort((a, b) => a.hypothese - b.hypothese),
      scores: new Map([...scores].map(([id, e]) => [id, { nom: e.nom, slug: e.slug, pct: e.somme / e.n, min: e.min, max: e.max }])),
    };
  }).sort((a, b) => b.t - a.t);
}
export type SondageAgrege = ReturnType<typeof parSondage>[number];

/**
 * Moyenne lissée d'un candidat à une date : moyenne des sondages voisins, pondérée
 * par la proximité dans le temps (noyau gaussien de 14 jours) et par la taille de
 * l'échantillon. Rien n'est extrapolé : sans sondage dans les trois semaines, pas de point.
 */
export function moyenne(sondages: SondageAgrege[], id: string, date: number): number | null {
  let s = 0, w = 0, proches = 0;
  for (const p of sondages) {
    const v = p.scores.get(id); if (!v) continue;
    const d = (date - p.t) / JOUR;
    if (d < -1 || d > 45) continue;           // pas de sondage « du futur »
    const k = Math.exp(-0.5 * (d / 14) ** 2);
    if (d <= 21) proches++;
    const poids = k * Math.sqrt((p.echantillon || 1000) / 1000);
    s += poids * v.pct; w += poids;
  }
  return proches && w > 0 ? s / w : null;
}

/** Série hebdomadaire de la moyenne, du `debut` à aujourd'hui. */
export function serie(sondages: SondageAgrege[], id: string, debut: number, fin = Date.now()) {
  const pts: { x: number; y: number }[] = [];
  for (let x = debut; x <= fin + 1; x += 7 * JOUR) {
    const y = moyenne(sondages, id, Math.min(x, fin));
    if (y != null) pts.push({ x: Math.min(x, fin), y });
  }
  const yFin = moyenne(sondages, id, fin);
  if (yFin != null && (!pts.length || pts[pts.length - 1].x < fin)) pts.push({ x: fin, y: yFin });
  return pts;
}

/** Nom court pour les étiquettes : « Le Pen », « Dupont-Aignan », « Villepin ». */
export function court(nom: string): string {
  const m = nom.trim().match(/(?:^|\s)((?:le|la|de|du|van)\s+)?([^\s]+)$/i);
  if (!m) return nom;
  return /^le\s|^la\s/i.test(m[1] || "") ? `${m[1].trim().replace(/^./, c => c.toUpperCase())} ${m[2]}` : m[2];
}

export const pct = (v: number, dec = 1) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: dec, minimumFractionDigits: v % 1 && dec ? 1 : 0 })} %`;
export const dateCourte = (iso: string) => new Date(iso + "T12:00:00Z").toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
export const periode = (debut: string | null, fin: string) => {
  const f = new Date(fin + "T12:00:00Z");
  if (!debut) return f.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const d = new Date(debut + "T12:00:00Z");
  const memeMois = d.getUTCMonth() === f.getUTCMonth();
  return `${d.toLocaleDateString("fr-FR", memeMois ? { day: "numeric" } : { day: "numeric", month: "short" })}–${f.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}`;
};
export const heures = (s: number) => {
  const h = Math.floor(s / 3600), m = Math.round((s % 3600) / 60);
  return h ? `${h} h ${String(m).padStart(2, "0")}` : `${m} min`;
};
