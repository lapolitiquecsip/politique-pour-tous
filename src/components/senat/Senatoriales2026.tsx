"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarClock, MapPin, Search, CheckCircle2, XCircle, Users, ArrowRight, Vote } from "lucide-react";
import { departmentPaths } from "@/lib/data/departmentPaths";

// ── Données OFFICIELLES (Sénat / série 2) ───────────────────────────────────────────────────
// Le Sénat se renouvelle par moitié. Le 27 septembre 2026, c'est la SÉRIE 2 : départements de
// l'Ain (01) à l'Indre (36), puis du Bas-Rhin (67) au Territoire de Belfort (90) SAUF Île-de-France
// (75, 77, 78), + Saint-Barthélemy, Saint-Martin, Wallis-et-Futuna, Polynésie française et les
// Français établis hors de France. (Sources : Sénat, publicsenat.fr.) On n'invente rien : cette
// règle est encodée telle quelle.
const ELECTION_DATE = new Date("2026-09-27T08:00:00+02:00");

const serie2 = new Set<string>();
for (let n = 1; n <= 19; n++) serie2.add(String(n).padStart(2, "0"));
serie2.add("2A"); serie2.add("2B");
for (let n = 21; n <= 36; n++) serie2.add(String(n));
for (let n = 67; n <= 74; n++) serie2.add(String(n));
serie2.add("76");
for (let n = 79; n <= 90; n++) serie2.add(String(n));
// Outre-mer + étranger concernés en 2026 (série 2)
["977", "978", "986", "987"].forEach(c => serie2.add(c));

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
  "971": "Guadeloupe", "972": "Martinique", "973": "Guyane", "974": "La Réunion", "976": "Mayotte",
  "977": "Saint-Barthélemy", "978": "Saint-Martin", "986": "Wallis-et-Futuna", "987": "Polynésie française",
  "988": "Nouvelle-Calédonie",
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
// Résout une saisie (numéro OU nom) vers un code département.
function resolveDept(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const up = raw.toUpperCase().replace(/\s/g, "");
  if (DEPT_NAMES[up]) return up;                                   // code exact (01, 2A, 971…)
  if (/^\d$/.test(up) && DEPT_NAMES["0" + up]) return "0" + up;    // « 1 » → « 01 »
  const n = norm(raw);
  const hit = Object.entries(DEPT_NAMES).find(([, name]) => norm(name) === n)
    || Object.entries(DEPT_NAMES).find(([, name]) => norm(name).startsWith(n) && n.length >= 3);
  return hit ? hit[0] : null;
}

// Codes métropolitains présents dans le fond de carte (série 2 en couleur, le reste en gris).
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

function daysUntil(d: Date) {
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400000));
}

export default function Senatoriales2026() {
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<{ code: string; name: string; concerned: boolean } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const jMinus = useMemo(() => daysUntil(ELECTION_DATE), []);
  const past = Date.now() > ELECTION_DATE.getTime();

  const check = () => {
    const code = resolveDept(query);
    if (!code) { setChecked(null); return; }
    setChecked({ code, name: DEPT_NAMES[code], concerned: serie2.has(code) });
  };

  return (
    <section className="mx-auto max-w-6xl px-4 pt-6">
      <div className="overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-rose-50/40 shadow-sm dark:border-amber-500/20 dark:from-amber-950/20 dark:via-slate-900 dark:to-slate-900">
        <div className="grid gap-0 md:grid-cols-[1.15fr_1fr]">
          {/* Colonne texte + vérificateur (prioritaire sur mobile) */}
          <div className="p-5 md:p-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                <Vote size={12} /> Sénatoriales 2026
              </span>
              {!past && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                  <CalendarClock size={12} /> J‑{jMinus}
                </span>
              )}
            </div>

            <h2 className="mt-3 text-2xl md:text-4xl font-staatliches uppercase leading-[1.05] tracking-tight text-slate-900 dark:text-white">
              Les départements qui votent le <span className="text-red-600">27 septembre</span>
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Le Sénat renouvelle la moitié de ses sièges. Cette fois, c'est la <strong>série 2</strong> :
              une partie des sénateurs actuels sera remplacée par de nouveaux élus.
            </p>

            {/* Stats compactes */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[["178", "sièges en jeu"], ["≈ 63", "départements"], ["6 ans", "de mandat"]].map(([n, l]) => (
                <div key={l} className="rounded-2xl bg-white/70 p-2.5 dark:bg-slate-800/50">
                  <p className="text-lg font-black text-slate-900 dark:text-white">{n}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{l}</p>
                </div>
              ))}
            </div>

            {/* ⭐ Vérificateur : mon département est-il concerné ? */}
            <div className="mt-5">
              <label className="text-xs font-black uppercase tracking-widest text-slate-500">Votre département vote‑t‑il ?</label>
              <div className="mt-2 flex gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900">
                  <MapPin size={16} className="shrink-0 text-slate-400" />
                  <input
                    value={query}
                    onChange={e => { setQuery(e.target.value); setChecked(null); }}
                    onKeyDown={e => { if (e.key === "Enter") check(); }}
                    placeholder="N° ou nom (ex. 33, Gironde)"
                    className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white [color-scheme:light] dark:[color-scheme:dark]"
                  />
                </div>
                <button onClick={check} className="inline-flex items-center gap-1.5 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-red-600 dark:bg-white dark:text-slate-900">
                  <Search size={16} />
                </button>
              </div>

              {checked && (
                <div className={`mt-3 flex items-start gap-3 rounded-2xl border p-3.5 ${checked.concerned ? "border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10" : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50"}`}>
                  {checked.concerned
                    ? <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={20} />
                    : <XCircle className="mt-0.5 shrink-0 text-slate-400" size={20} />}
                  <div className="text-sm">
                    <p className="font-black text-slate-900 dark:text-white">{checked.name} ({checked.code})</p>
                    {checked.concerned ? (
                      <p className="text-emerald-700 dark:text-emerald-400">
                        <strong>Concerné</strong> — vos sénateurs sont renouvelés le 27 septembre 2026.
                      </p>
                    ) : (
                      <p className="text-slate-600 dark:text-slate-400">
                        Non concerné cette fois (série 1) — prochain renouvellement en 2029.
                      </p>
                    )}
                  </div>
                </div>
              )}
              {query && !checked && (
                <p className="mt-2 text-xs italic text-slate-400">Tapez un numéro (01–95, 2A…) ou un nom de département, puis validez.</p>
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link href="#membres" className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-3 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-700">
                <Users size={15} /> Voir les sénateurs actuels <ArrowRight size={14} />
              </Link>
              <a href="https://www.senat.fr/elections-senatoriales.html" target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold uppercase tracking-widest text-slate-400 hover:text-red-600">
                Source : Sénat ↗
              </a>
            </div>
          </div>

          {/* Carte métropolitaine — série 2 en couleur (légère, décorative sur mobile) */}
          <div className="relative flex items-center justify-center bg-white/40 p-4 dark:bg-slate-900/30 md:p-6">
            <svg viewBox={MAP_VIEWBOX} className="h-auto max-h-[240px] w-full md:max-h-[340px]" role="img" aria-label="Carte des départements qui votent en 2026">
              {METRO.map(code => {
                const on = serie2.has(code);
                const isHover = hover === code;
                return (
                  <path
                    key={code}
                    d={departmentPaths[code].d}
                    fill={on ? (isHover ? "#dc2626" : "#f59e0b") : (isHover ? "#cbd5e1" : "#e2e8f0")}
                    stroke="#ffffff"
                    strokeWidth={0.8}
                    className="cursor-pointer transition-colors"
                    onMouseEnter={() => setHover(code)}
                    onMouseLeave={() => setHover(null)}
                    onClick={() => { setQuery(DEPT_NAMES[code] || code); setChecked({ code, name: DEPT_NAMES[code] || code, concerned: on }); }}
                  >
                    <title>{DEPT_NAMES[code] || code} — {on ? "vote en 2026" : "non concerné"}</title>
                  </path>
                );
              })}
            </svg>
            <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-white/85 px-3 py-1.5 text-[10px] font-bold shadow-sm backdrop-blur-sm dark:bg-slate-800/85">
              <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500" /> Vote en 2026</span>
              <span className="flex items-center gap-1.5 text-slate-500"><span className="h-2.5 w-2.5 rounded-sm bg-slate-200" /> En 2029</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
