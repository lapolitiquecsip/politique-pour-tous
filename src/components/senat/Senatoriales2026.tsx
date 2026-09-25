"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarClock, MapPin, Search, CheckCircle2, XCircle, Users, ArrowRight, Vote,
  Sparkles, RefreshCw, Hourglass, ExternalLink,
} from "lucide-react";
import { departmentPaths } from "@/lib/data/departmentPaths";
import { groupeSenat } from "@/lib/senate-groups";
import DragScroller from "@/components/ui/DragScroller";
import { api } from "@/lib/api";

/**
 * Le renouvellement du Sénat, avant et après.
 *
 * Trois états, et le composant choisit celui qu'il faut sans qu'on ait à
 * redéployer quoi que ce soit :
 *
 *   · AVANT      — qui vote le 27 septembre, et combien de sièges sont en jeu.
 *   · ATTENTE    — le scrutin a eu lieu, le Sénat n'a pas encore publié sa
 *                  nouvelle liste officielle. On le dit, plutôt que d'afficher
 *                  un résultat vide ou, pire, l'ancien Sénat comme s'il était
 *                  le nouveau.
 *   · RÉSULTATS  — les élus, circonscription par circonscription, ce que chaque
 *                  groupe gagne ou perd, et les nouveaux visages.
 *
 * Rien n'est écrit en dur ici : la liste des circonscriptions qui votent, le
 * nombre de sièges et les élus viennent de la base, alimentée par
 * scripts/update-senate-election.ts depuis l'open data du Sénat. Les constantes
 * qui subsistent plus bas ne servent que de filet, le temps que la première
 * synchronisation passe — et elles ont été vérifiées contre les données du
 * Sénat, pas devinées.
 */

const ELECTION_ISO = "2026-09-27";
const ELECTION_DATE = new Date(`${ELECTION_ISO}T08:00:00+02:00`);

const DEPT_NAMES: Record<string, string> = {
  "01": "Ain", "02": "Aisne", "03": "Allier", "04": "Alpes-de-Haute-Provence", "05": "Hautes-Alpes",
  "06": "Alpes-Maritimes", "07": "Ardèche", "08": "Ardennes", "09": "Ariège", "10": "Aube", "11": "Aude",
  "12": "Aveyron", "13": "Bouches-du-Rhône", "14": "Calvados", "15": "Cantal", "16": "Charente",
  "17": "Charente-Maritime", "18": "Cher", "19": "Corrèze", "2A": "Corse-du-Sud", "2B": "Haute-Corse",
  "21": "Côte-d'Or", "22": "Côtes-d'Armor", "23": "Creuse", "24": "Dordogne", "25": "Doubs", "26": "Drôme",
  "27": "Eure", "28": "Eure-et-Loir", "29": "Finistère", "30": "Gard", "31": "Haute-Garonne", "32": "Gers",
  "33": "Gironde", "34": "Hérault", "35": "Ille-et-Vilaine", "36": "Indre", "37": "Indre-et-Loire",
  "38": "Isère", "39": "Jura", "40": "Landes", "41": "Loir-et-Cher", "42": "Loire", "43": "Haute-Loire",
  "44": "Loire-Atlantique", "45": "Loiret", "46": "Lot", "47": "Lot-et-Garonne", "48": "Lozère",
  "49": "Maine-et-Loire", "50": "Manche", "51": "Marne", "52": "Haute-Marne", "53": "Mayenne",
  "54": "Meurthe-et-Moselle", "55": "Meuse", "56": "Morbihan", "57": "Moselle", "58": "Nièvre", "59": "Nord",
  "60": "Oise", "61": "Orne", "62": "Pas-de-Calais", "63": "Puy-de-Dôme", "64": "Pyrénées-Atlantiques",
  "65": "Hautes-Pyrénées", "66": "Pyrénées-Orientales", "67": "Bas-Rhin", "68": "Haut-Rhin", "69": "Rhône",
  "70": "Haute-Saône", "71": "Saône-et-Loire", "72": "Sarthe", "73": "Savoie", "74": "Haute-Savoie",
  "75": "Paris", "76": "Seine-Maritime", "77": "Seine-et-Marne", "78": "Yvelines", "79": "Deux-Sèvres",
  "80": "Somme", "81": "Tarn", "82": "Tarn-et-Garonne", "83": "Var", "84": "Vaucluse", "85": "Vendée",
  "86": "Vienne", "87": "Haute-Vienne", "88": "Vosges", "89": "Yonne", "90": "Territoire de Belfort",
  "91": "Essonne", "92": "Hauts-de-Seine", "93": "Seine-Saint-Denis", "94": "Val-de-Marne", "95": "Val-d'Oise",
  "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion",
  "975": "Saint-Pierre-et-Miquelon", "976": "Mayotte", "977": "Saint-Barthélemy", "978": "Saint-Martin",
  "986": "Wallis-et-Futuna", "987": "Polynésie française", "988": "Nouvelle-Calédonie",
  "099": "Français établis hors de France",
};

/**
 * Filet de secours : les 63 circonscriptions de la série renouvelée en 2026.
 *
 * Établie à partir des données du Sénat — les circonscriptions dont les
 * sénateurs élus au renouvellement du 27 septembre 2020 siègent encore. La
 * version précédente de ce fichier déduisait la série des numéros de
 * département, et cette règle de pouce OUBLIAIT LA GUYANE : un Guyanais à qui
 * on répondait « votre département ne vote pas cette fois » était mal informé.
 * Dès la première synchronisation, cette liste est remplacée par celle de la
 * base, qui vient du Sénat lui-même.
 */
const SERIE_2_REPLI = [
  "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17",
  "18", "19", "2A", "2B", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33",
  "34", "35", "36", "67", "68", "69", "70", "71", "72", "73", "74", "76", "79", "80", "81", "82", "83",
  "84", "85", "86", "87", "88", "89", "90", "973", "977", "978", "986", "987",
];
// Sièges remis en jeu, relevés dans la liste officielle du Sénat le 25/09/2026.
// Affiché tant que la base n'a pas donné le chiffre du jour.
const SIEGES_REPLI = 172;

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");

function resolveDept(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const up = raw.toUpperCase().replace(/\s/g, "");
  if (DEPT_NAMES[up]) return up;
  if (/^\d$/.test(up) && DEPT_NAMES["0" + up]) return "0" + up;
  const n = norm(raw);
  const exact = Object.entries(DEPT_NAMES).find(([, name]) => norm(name) === n);
  if (exact) return exact[0];
  const debut = Object.entries(DEPT_NAMES).find(([, name]) => norm(name).startsWith(n) && n.length >= 3);
  return debut ? debut[0] : null;
}

const METRO = Object.keys(departmentPaths);
const MAP_VIEWBOX = (() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of METRO) {
    const vb = departmentPaths[c]?.viewBox?.split(/\s+/).map(Number);
    if (!vb || vb.length < 4) continue;
    minX = Math.min(minX, vb[0]); minY = Math.min(minY, vb[1]);
    maxX = Math.max(maxX, vb[0] + vb[2]); maxY = Math.max(maxY, vb[1] + vb[3]);
  }
  const pad = 6;
  return `${minX - pad} ${minY - pad} ${maxX - minX + pad * 2} ${maxY - minY + pad * 2}`;
})();

type Phase = "avant" | "attente" | "resultats";
type Circo = { code: string; label: string; seats: number };
type Statut = {
  phase: Phase; constituencies_total: number | null; seats_total: number | null;
  seats_confirmed: number | null; renewable: Circo[] | null;
  groups_before: Record<string, number> | null; groups_after: Record<string, number> | null;
  updated_at: string | null;
};
type Elu = {
  matricule: string; first_name: string; last_name: string; slug: string | null;
  photo_url: string | null; constituency: string; dept_code: string | null;
  political_group: string | null; outcome: "reelu" | "nouveau"; seats: number | null;
};

const joursAvant = (d: Date) => Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));

const dateLongue = (iso: string) => {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août",
    "septembre", "octobre", "novembre", "décembre"];
  return `${+m[3]} ${mois[+m[2] - 1]} ${m[1]}`;
};

export default function Senatoriales2026() {
  const [statut, setStatut] = useState<Statut | null>(null);
  const [elus, setElus] = useState<Elu[]>([]);
  const [query, setQuery] = useState("");
  const [choisi, setChoisi] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    let vivant = true;
    api.getSenateElection(ELECTION_ISO)
      .then(r => { if (!vivant) return; setStatut(r.status as Statut | null); setElus((r.results || []) as Elu[]); })
      .catch(() => { /* la page reste utilisable sur son affichage d'avant-scrutin */ });
    return () => { vivant = false; };
  }, []);

  const scrutinPasse = Date.now() > ELECTION_DATE.getTime();
  const phase: Phase = statut?.phase ?? (scrutinPasse ? "attente" : "avant");
  const jMinus = useMemo(() => joursAvant(ELECTION_DATE), []);

  // Les circonscriptions qui votent : celles de la base, sinon le filet.
  const circos: Circo[] = useMemo(() => {
    if (statut?.renewable?.length) return statut.renewable;
    return SERIE_2_REPLI.map(code => ({ code, label: DEPT_NAMES[code] || code, seats: 0 }));
  }, [statut]);
  const enJeu = useMemo(() => new Set(circos.map(c => c.code)), [circos]);
  const siegesTotal = statut?.seats_total || SIEGES_REPLI;

  // Les élus, rangés par circonscription.
  const parDept = useMemo(() => {
    const m = new Map<string, Elu[]>();
    for (const e of elus) {
      if (!e.dept_code) continue;
      const l = m.get(e.dept_code); if (l) l.push(e); else m.set(e.dept_code, [e]);
    }
    return m;
  }, [elus]);

  // Couleur d'un département sur la carte : le groupe qui y emporte le plus de
  // sièges. À égalité, le premier dans l'ordre de l'hémicycle — arbitraire mais
  // stable, ce qui vaut mieux qu'une couleur qui saute d'un affichage à l'autre.
  const couleurDe = (code: string): string | null => {
    const l = parDept.get(code);
    if (!l?.length) return null;
    const t = new Map<string, number>();
    for (const e of l) { const g = e.political_group || "NI"; t.set(g, (t.get(g) || 0) + 1); }
    const meilleur = [...t.entries()].sort((a, b) =>
      b[1] - a[1] || groupeSenat(a[0]).order - groupeSenat(b[0]).order)[0];
    return groupeSenat(meilleur[0]).color;
  };

  const nouveaux = useMemo(() => elus.filter(e => e.outcome === "nouveau"), [elus]);
  const reelus = elus.length - nouveaux.length;

  // Ce que chaque groupe gagne ou perd sur l'ensemble du Sénat.
  const solde = useMemo(() => {
    if (!statut?.groups_after) return [];
    const avant = statut.groups_before || {};
    const apres = statut.groups_after;
    return [...new Set([...Object.keys(avant), ...Object.keys(apres)])]
      .map(code => ({ code, avant: avant[code] || 0, apres: apres[code] || 0, ...groupeSenat(code) }))
      .filter(g => g.avant || g.apres)
      .sort((a, b) => a.order - b.order);
  }, [statut]);

  const chercher = () => setChoisi(resolveDept(query));
  const deptChoisi = choisi ? { code: choisi, name: DEPT_NAMES[choisi] || choisi, concerne: enJeu.has(choisi) } : null;
  const elusDuDept = choisi ? parDept.get(choisi) || [] : [];

  // Les circonscriptions hors métropole : absentes du fond de carte, elles
  // seraient invisibles alors qu'elles votent bel et bien.
  const horsMetropole = circos.filter(c => !METRO.includes(c.code));

  const accent = phase === "resultats"
    ? { bord: "border-slate-300/70 dark:border-slate-600/40", fond: "from-slate-50 via-white to-blue-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950" }
    : { bord: "border-amber-200/70 dark:border-amber-500/20", fond: "from-amber-50 via-white to-rose-50/40 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900" };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className={`overflow-hidden rounded-3xl border bg-gradient-to-br shadow-sm ${accent.bord} ${accent.fond}`}>
        <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
          {/* ── Colonne texte (prioritaire sur mobile) ───────────────────── */}
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                <Vote size={12} /> Sénatoriales 2026
              </span>
              {phase === "avant" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  <CalendarClock size={12} /> {jMinus === 0 ? "C'est aujourd'hui" : `J‑${jMinus}`}
                </span>
              )}
              {phase === "attente" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  <Hourglass size={12} /> Résultats en cours de publication
                </span>
              )}
              {phase === "resultats" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 size={12} /> Résultats officiels
                </span>
              )}
            </div>

            <h2 className="mt-3 font-staatliches text-2xl uppercase leading-[1.05] tracking-tight text-foreground dark:text-white md:text-4xl">
              {phase === "resultats"
                ? <>Le nouveau Sénat, élu le <span className="text-red-600">27 septembre</span></>
                : <>Les départements qui votent le <span className="text-red-600">27 septembre</span></>}
            </h2>

            <p className="mt-2 text-sm leading-6 text-muted-foreground dark:text-slate-300">
              {phase === "resultats" ? (
                <>
                  Le Sénat a renouvelé la moitié de ses sièges — la <strong>série 2</strong>.
                  {" "}<strong>{nouveaux.length}</strong> nouveaux sénateurs entrent au Palais du Luxembourg,
                  {" "}<strong>{reelus}</strong> sont reconduits.
                </>
              ) : phase === "attente" ? (
                <>
                  Le scrutin s&apos;est tenu le {dateLongue(ELECTION_ISO)}. Les élus prennent leurs fonctions
                  au début de la session, le 1<sup>er</sup> octobre : cette page se remplira d&apos;elle‑même
                  dès que le Sénat aura publié sa liste officielle.
                </>
              ) : (
                <>
                  Le Sénat renouvelle la moitié de ses sièges. Cette fois, c&apos;est la <strong>série 2</strong> :
                  une partie des sénateurs actuels sera remplacée par de nouveaux élus.
                </>
              )}
            </p>

            {/* ── Chiffres clés ─────────────────────────────────────────── */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {(phase === "resultats"
                ? [
                    [String(elus.length), "sièges renouvelés"],
                    [String(nouveaux.length), "nouveaux visages"],
                    [String(reelus), "réélus"],
                  ]
                : [
                    [String(siegesTotal), "sièges en jeu"],
                    [String(statut?.constituencies_total || circos.length), "circonscriptions"],
                    ["6 ans", "de mandat"],
                  ]
              ).map(([n, l]) => (
                <div key={l} className="rounded-2xl bg-white/70 p-2.5 dark:bg-slate-800/50">
                  <p className="text-lg font-black tabular-nums text-foreground dark:text-white">{n}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>

            {/* ── Vérificateur / consultation par département ────────────── */}
            <div className="mt-5">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {phase === "resultats" ? "Qui a été élu chez vous ?" : "Votre département vote‑t‑il ?"}
              </label>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3 dark:border-slate-700 dark:bg-slate-900">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setChoisi(null); }}
                    onKeyDown={e => { if (e.key === "Enter") chercher(); }}
                    placeholder="N° ou nom (ex. 33, Gironde)"
                    className="w-full bg-transparent py-3 text-sm text-foreground outline-none placeholder:text-slate-400 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <button
                  onClick={chercher}
                  aria-label="Chercher ce département"
                  className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-900"
                >
                  <Search size={16} />
                </button>
              </div>

              {deptChoisi && (
                <div className={`mt-3 rounded-2xl border p-3.5 ${deptChoisi.concerne
                  ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10"
                  : "border-border bg-muted dark:border-slate-700 dark:bg-slate-800/50"}`}>
                  <div className="flex items-start gap-3">
                    {deptChoisi.concerne
                      ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                      : <XCircle className="mt-0.5 shrink-0 text-slate-400" size={20} />}
                    <div className="min-w-0 text-sm">
                      <p className="font-black text-foreground dark:text-white">
                        {deptChoisi.name}{deptChoisi.code !== "099" ? ` (${deptChoisi.code})` : ""}
                      </p>
                      {deptChoisi.concerne ? (
                        elusDuDept.length ? (
                          <p className="text-emerald-700 dark:text-emerald-400">
                            {elusDuDept.length} siège{elusDuDept.length > 1 ? "s" : ""} renouvelé{elusDuDept.length > 1 ? "s" : ""} le 27 septembre 2026.
                          </p>
                        ) : (
                          <p className="text-emerald-700 dark:text-emerald-400">
                            <strong>Concerné</strong> — vos sénateurs sont renouvelés le 27 septembre 2026.
                          </p>
                        )
                      ) : (
                        <p className="text-muted-foreground dark:text-slate-400">
                          Non concerné cette fois (série 1) — prochain renouvellement en 2029.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Les élus du département, quand ils sont connus. */}
                  {elusDuDept.length > 0 && (
                    <ul className="mt-3 space-y-1.5 border-t border-emerald-200/70 pt-3 dark:border-emerald-500/20">
                      {elusDuDept.map(e => <EluLigne key={e.matricule} elu={e} />)}
                    </ul>
                  )}
                </div>
              )}
              {query && !choisi && (
                <p className="mt-2 text-xs italic text-slate-400">
                  Tapez un numéro (01–95, 2A…) ou un nom de département, puis validez.
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href="#membres" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-700">
                <Users size={15} /> {phase === "resultats" ? "Voir tous les sénateurs" : "Voir les sénateurs actuels"} <ArrowRight size={14} />
              </Link>
              {/* Le lien pointait vers une page du Sénat qui n'existe plus (404).
                  Le Sénat a ouvert un site dédié à ce scrutin. */}
              <a
                href="https://senatoriales2026.senat.fr/"
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-slate-400 transition hover:text-red-600"
              >
                Source : Sénat <ExternalLink size={11} />
              </a>
            </div>
          </div>

          {/* ── Carte ──────────────────────────────────────────────────── */}
          <div className="relative flex flex-col items-center justify-center bg-white/40 p-4 dark:bg-slate-900/30 md:p-6">
            <svg
              viewBox={MAP_VIEWBOX}
              className="h-auto max-h-[240px] w-full md:max-h-[340px]"
              role="img"
              aria-label={phase === "resultats"
                ? "Carte des départements renouvelés, colorés par groupe majoritaire"
                : "Carte des départements qui votent en 2026"}
            >
              {METRO.map(code => {
                const vote = enJeu.has(code);
                const survol = hover === code;
                const couleur = phase === "resultats" && vote ? couleurDe(code) : null;
                const remplissage = couleur
                  ? couleur
                  : vote ? (survol ? "#dc2626" : "#f59e0b") : (survol ? "#cbd5e1" : "#e2e8f0");
                return (
                  <path
                    key={code}
                    d={departmentPaths[code].d}
                    fill={remplissage}
                    fillOpacity={couleur && !survol ? 0.9 : 1}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={() => setHover(code)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => { setQuery(DEPT_NAMES[code] || code); setChoisi(code); }}
                  >
                    <title>
                      {DEPT_NAMES[code] || code}
                      {vote
                        ? phase === "resultats"
                          ? ` — ${(parDept.get(code) || []).map(e => `${e.first_name} ${e.last_name} (${e.political_group || "SG"})`).join(", ") || "renouvelé"}`
                          : " — vote en 2026"
                        : " — non concerné"}
                    </title>
                  </path>
                );
              })}
            </svg>

            {/* Légende : elle change avec la phase, sinon elle ment. */}
            {phase === "resultats" ? (
              <div className="mt-3 flex max-w-full flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-1 text-[10px] font-bold">
                {solde.filter(g => g.apres > 0).map(g => (
                  <span key={g.code} className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: g.color }} /> {g.label}
                  </span>
                ))}
              </div>
            ) : (
              <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-bold shadow-sm backdrop-blur-sm dark:bg-slate-800/85">
                <span className="flex items-center gap-1.5 text-muted-foreground dark:text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Vote en 2026
                </span>
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> En 2029
                </span>
              </div>
            )}

            {/* L'outre-mer ne figure pas sur le fond de carte métropolitain : il
                est rappelé ici pour ne pas disparaître du scrutin. */}
            {horsMetropole.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
                {horsMetropole.map(c => {
                  const l = parDept.get(c.code) || [];
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => { setQuery(c.label); setChoisi(c.code); }}
                      title={l.length ? l.map(e => `${e.first_name} ${e.last_name}`).join(", ") : `${c.label} — vote en 2026`}
                      className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-bold text-muted-foreground transition hover:bg-red-600 hover:text-white dark:bg-slate-800/60 dark:text-slate-300"
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Après le scrutin : le solde des groupes ──────────────────── */}
        {phase === "resultats" && solde.length > 0 && (
          <div className="border-t border-border/60 px-5 py-5 dark:border-slate-700/50 md:px-8">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              Ce que chaque groupe gagne ou perd — sur l&apos;ensemble des 348 sièges
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {solde.map(g => {
                const ecart = g.apres - g.avant;
                return (
                  <div key={g.code} className="rounded-2xl bg-white/70 p-3 dark:bg-slate-800/50">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: g.color }} />
                      <span className="truncate text-[11px] font-black text-foreground dark:text-white">{g.label}</span>
                    </div>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-black tabular-nums text-foreground dark:text-white">{g.apres}</span>
                      <span className={`text-xs font-black tabular-nums ${ecart > 0 ? "text-emerald-600" : ecart < 0 ? "text-red-600" : "text-slate-400"}`}>
                        {ecart > 0 ? `+${ecart}` : ecart < 0 ? ecart : "="}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Après le scrutin : les nouveaux visages ──────────────────── */}
        {phase === "resultats" && nouveaux.length > 0 && (
          <div className="border-t border-border/60 px-5 py-5 dark:border-slate-700/50 md:px-8">
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
              <Sparkles size={12} className="text-amber-500" /> Ils entrent au Sénat — {nouveaux.length} nouveaux élus
            </p>
            <DragScroller ariaLabel="Les nouveaux sénateurs" className="mt-3 gap-3 pb-2">
              {nouveaux.map(e => <CarteElu key={e.matricule} elu={e} />)}
            </DragScroller>
          </div>
        )}

        {/* ── Pendant l'attente : dire ce qui se passe ─────────────────── */}
        {phase === "attente" && (
          <div className="flex items-start gap-3 border-t border-border/60 px-5 py-4 text-sm dark:border-slate-700/50 md:px-8">
            <RefreshCw size={16} className="mt-0.5 shrink-0 animate-spin text-amber-500" style={{ animationDuration: "3s" }} />
            <p className="text-muted-foreground dark:text-slate-300">
              Le Sénat publie la liste de ses membres dans son open data, et c&apos;est elle qui fait foi.
              Nous la relisons plusieurs fois par jour : dès qu&apos;elle change, les élus, la carte et
              la composition de l&apos;hémicycle se mettent à jour ici sans intervention.
            </p>
          </div>
        )}

        {/* Provenance : un résultat d'élection sans source n'est qu'une rumeur. */}
        {statut?.updated_at && (
          <p className="border-t border-border/60 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:border-slate-700/50 md:px-8">
            Données du Sénat (open data ODSEN) — relevé du {dateLongue(statut.updated_at.slice(0, 10))}
          </p>
        )}
      </div>
    </section>
  );
}

/** Une ligne « élu » compacte, sous le résultat d'un département. */
function EluLigne({ elu }: { elu: Elu }) {
  const g = groupeSenat(elu.political_group);
  const contenu = (
    <>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: g.color }} />
      <span className="truncate font-bold text-foreground dark:text-white">
        {elu.first_name} {elu.last_name}
      </span>
      <span className="shrink-0 text-[11px] font-bold text-muted-foreground">{g.label}</span>
      {elu.outcome === "nouveau" && (
        <span className="shrink-0 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
          Nouveau
        </span>
      )}
    </>
  );
  return (
    <li>
      {elu.slug
        ? <Link href={`/senateurs/${elu.slug}`} className="flex items-center gap-2 text-sm hover:underline">{contenu}</Link>
        : <span className="flex items-center gap-2 text-sm">{contenu}</span>}
    </li>
  );
}

/** Une carte de nouvel élu, dans le rail horizontal. */
function CarteElu({ elu }: { elu: Elu }) {
  const g = groupeSenat(elu.political_group);
  const corps = (
    <>
      <span
        className="mx-auto block h-14 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"
        style={{ boxShadow: `0 0 0 2px ${g.color}55` }}
      >
        {elu.photo_url
          /* Photo hébergée par le Sénat : la balise native évite d'ajouter ce
             domaine à la configuration des images, pour une vignette de 56 px. */
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={elu.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" />
          : <span className="flex h-full w-full items-center justify-center text-lg font-black text-slate-400">
              {elu.first_name.charAt(0)}{elu.last_name.charAt(0)}
            </span>}
      </span>
      <span className="mt-2 block truncate text-center text-sm font-black text-foreground dark:text-white">
        {elu.first_name} {elu.last_name}
      </span>
      <span className="mt-0.5 block truncate text-center text-[11px] text-muted-foreground">{elu.constituency}</span>
      <span
        className="mx-auto mt-1.5 block w-fit rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white"
        style={{ background: g.color }}
      >
        {g.label}
      </span>
    </>
  );
  const classe = "w-40 shrink-0 rounded-2xl bg-white/80 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:bg-slate-800/60";
  return elu.slug
    ? <Link href={`/senateurs/${elu.slug}`} className={classe}>{corps}</Link>
    : <div className={classe}>{corps}</div>;
}
