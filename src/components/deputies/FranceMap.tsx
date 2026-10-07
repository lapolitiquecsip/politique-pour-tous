"use client";

import { useEffect, useMemo, useRef } from "react";
import { MapPin, X } from "lucide-react";
import { getDepartmentName } from "@/lib/department-mapping";
import { departmentPaths } from "@/lib/data/departmentPaths";
import { ENCARTS_OUTREMER } from "@/lib/data/outremerEncarts";

/**
 * Carte des départements, pour retrouver ses élus.
 *
 * Les tracés viennent de `departmentPaths`, le fond de carte déjà utilisé ailleurs sur
 * le site : cent un départements, DROM et Corse compris, livrés avec la page.
 *
 * Deux choix commandent la fluidité. Le survol est traité EN CSS, pas en React : garder
 * le département survolé dans un état redessinait les cent un tracés à chaque passage de
 * frontière. Et l'infobulle est écrite directement dans le DOM, pour la même raison.
 * React ne réagit plus qu'à la sélection, qui est rare.
 */

// Couleur de survol PAR RÉGION : chaque région a sa teinte (PACA jaune, Auvergne-Rhône-Alpes
// orange, etc.). Table code département → couleur, construite à partir des groupes régionaux.
const REGION_GROUPS: Array<{ color: string; deps: string[] }> = [
  { color: "#f97316", deps: ["01","03","07","15","26","38","42","43","63","69","73","74"] }, // Auvergne-Rhône-Alpes — orange
  { color: "#f5b301", deps: ["04","05","06","13","83","84"] },                                 // PACA — jaune
  { color: "#6366f1", deps: ["75","77","78","91","92","93","94","95"] },                        // Île-de-France — indigo
  { color: "#ec4899", deps: ["09","11","12","30","31","32","34","46","48","65","66","81","82"] }, // Occitanie — rose
  { color: "#14b8a6", deps: ["16","17","19","23","24","33","40","47","64","79","86","87"] },    // Nouvelle-Aquitaine — turquoise
  { color: "#8b5cf6", deps: ["02","59","60","62","80"] },                                       // Hauts-de-France — violet
  { color: "#ef4444", deps: ["08","10","51","52","54","55","57","67","68","88"] },              // Grand Est — rouge
  { color: "#0ea5e9", deps: ["22","29","35","56"] },                                            // Bretagne — bleu ciel
  { color: "#06b6d4", deps: ["14","27","50","61","76"] },                                       // Normandie — cyan
  { color: "#84cc16", deps: ["44","49","53","72","85"] },                                       // Pays de la Loire — vert lime
  { color: "#a855f7", deps: ["21","25","39","58","70","71","89","90"] },                        // Bourgogne-Franche-Comté — pourpre
  { color: "#10b981", deps: ["18","28","36","37","41","45"] },                                  // Centre-Val de Loire — émeraude
  { color: "#d946ef", deps: ["2A","2B"] },                                                      // Corse — fuchsia
  { color: "#fb7185", deps: ["971","972","973","974","976"] },                                  // DROM — rose corail
];

/** Code département → indice de sa région, pour lui attribuer sa classe de survol. */
const REGION_INDEX: Record<string, number> = Object.fromEntries(
  REGION_GROUPS.flatMap((g, i) => g.deps.map(d => [d, i]))
);

/**
 * Une règle de survol par région, écrite une fois pour toutes.
 *
 * Tailwind ne sait pas composer un nom de classe à la volée, et de toute façon la
 * couleur doit venir du même tableau que le reste. La double classe dans le sélecteur
 * met la règle au-dessus de celle du thème sombre, qui a la même force.
 */
const REGION_CSS = REGION_GROUPS
  .map((g, i) => `.fm-d.fm-r${i}:hover{fill:${g.color}}`)
  .join("") +
  // Tuiles d'outre-mer : le survol de la tuile entière colore le territoire.
  `.fm-t:hover .fm-d{fill:${REGION_GROUPS[REGION_INDEX["971"] ?? 0]?.color ?? "#fb7185"}}.fm-t:hover .fm-cadre{stroke-opacity:.9}`;

const CODES = Object.keys(departmentPaths);

/** Cadre englobant tous les départements — calculé une fois, au chargement du module. */
const VIEWBOX = (() => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const code of CODES) {
    const vb = departmentPaths[code]?.viewBox?.split(/\s+/).map(Number);
    if (!vb || vb.length < 4) continue;
    minX = Math.min(minX, vb[0]); minY = Math.min(minY, vb[1]);
    maxX = Math.max(maxX, vb[0] + vb[2]); maxY = Math.max(maxY, vb[1] + vb[3]);
  }
  // La rangée de tuiles d'outre-mer, sous la carte (avec la place de leurs noms).
  for (const e of ENCARTS_OUTREMER) {
    minX = Math.min(minX, e.box[0]); maxX = Math.max(maxX, e.box[0] + e.box[2]); maxY = Math.max(maxY, e.box[1] + e.box[3] + 16);
  }
  const marge = 6;
  return `${minX - marge} ${minY - marge} ${maxX - minX + marge * 2} ${maxY - minY + marge * 2}`;
})();

interface FranceMapProps {
  selectedDepartment: string | null;
  onDepartmentSelect: (dept: string | null) => void;
}

export default function FranceMap({ selectedDepartment, onDepartmentSelect }: FranceMapProps) {
  const bulle = useRef<HTMLDivElement>(null);
  const bulleCode = useRef<HTMLSpanElement>(null);
  const bulleNom = useRef<HTMLSpanElement>(null);
  // Dernier code écrit dans l'infobulle : la souris émet des dizaines d'événements par
  // seconde à l'intérieur d'un même tracé, inutile de la réécrire à chacun.
  const dernier = useRef<string | null>(null);

  /** Écrit l'infobulle sans repasser par React. */
  const afficher = (code: string | null) => {
    if (code === dernier.current) return;
    dernier.current = code;
    if (!bulle.current) return;
    if (!code) { bulle.current.style.opacity = "0"; return; }
    if (bulleCode.current) bulleCode.current.textContent = code;
    if (bulleNom.current) bulleNom.current.textContent = getDepartmentName(code);
    bulle.current.style.opacity = "1";
  };

  // Au repos, l'infobulle rappelle le département choisi.
  useEffect(() => { dernier.current = null; afficher(selectedDepartment); }, [selectedDepartment]);

  const liste = useMemo(
    () => [...CODES, ...ENCARTS_OUTREMER.map(e => e.code)].map(c => ({ code: c, nom: getDepartmentName(c) })).sort((a, b) => a.nom.localeCompare(b.nom, "fr")),
    [],
  );

  return (
    <div className="relative w-full">
      <style dangerouslySetInnerHTML={{ __html: REGION_CSS }} />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 shrink-0 text-red-500" />
          <span className="text-sm font-semibold text-foreground">
            {selectedDepartment
              ? "Touchez un autre département ou réinitialisez"
              : "Touchez un département — Hexagone, Corse ou Outre-mer"}
          </span>
        </div>

        {selectedDepartment && (
          <button
            onClick={() => onDepartmentSelect(null)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-500/20 active:scale-95 dark:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
            Voir toute la France
          </button>
        )}
      </div>

      {/* Sur un téléphone, viser le Val-de-Marne au doigt relève de l'exploit : la liste
          déroulante fait le même travail, et reste utile au clavier sur grand écran. */}
      <label className="mb-3 block sm:hidden">
        <span className="sr-only">Choisir un département</span>
        <select
          value={selectedDepartment ?? ""}
          onChange={e => onDepartmentSelect(e.target.value || null)}
          className="w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground"
        >
          <option value="">Choisir un département…</option>
          {liste.map(d => <option key={d.code} value={d.code}>{d.code} — {d.nom}</option>)}
        </select>
      </label>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/[0.05] via-transparent to-red-500/[0.02]" />

        <div
          ref={bulle}
          style={{ opacity: 0, transition: "opacity .12s ease-out" }}
          className="pointer-events-none absolute right-4 top-4 z-20 flex min-w-[130px] flex-col rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-2xl dark:bg-slate-100 dark:text-slate-900 md:right-6 md:top-6"
        >
          <span ref={bulleCode} className="mb-0.5 text-[10px] uppercase tracking-wider opacity-60" />
          <span ref={bulleNom} className="text-nowrap text-base" />
        </div>

        <svg
          viewBox={VIEWBOX}
          className="mx-auto h-auto max-h-[500px] w-full text-white dark:text-slate-900"
          role="img"
          aria-label="Carte des départements français"
          // Un seul écouteur pour les cent un tracés, et aucun rendu React déclenché.
          onMouseOver={e => {
            const t = e.target as Element;
            afficher(t.getAttribute("data-code") || selectedDepartment);
          }}
          onMouseLeave={() => afficher(selectedDepartment)}
          onClick={e => {
            const t = e.target as Element;
            const code = t.getAttribute("data-code");
            onDepartmentSelect(code && code !== selectedDepartment ? code : null);
          }}
        >
          {CODES.map(code => {
            const choisi = selectedDepartment === code;
            return (
              <path
                key={code}
                d={departmentPaths[code].d}
                data-code={code}
                // Le style en ligne ne sert qu'au département choisi, et passe alors
                // devant la règle de survol de sa région.
                className={`fm-d fm-r${REGION_INDEX[code] ?? 0} cursor-pointer outline-none transition-[fill] duration-150 ${
                  choisi ? "" : "fill-slate-200 dark:fill-slate-700"
                }`}
                style={choisi ? { fill: "#ef4444" } : undefined}
                stroke="currentColor"
                strokeWidth={0.8}
                strokeLinejoin="round"
              >
                <title>{getDepartmentName(code)}</title>
              </path>
            );
          })}
          {/* Collectivités d'outre-mer et Français de l'étranger : une tuile chacun. */}
          {ENCARTS_OUTREMER.map(e => {
            const choisi = selectedDepartment === e.code;
            const [x, y, w, h] = e.box;
            return (
              <g key={e.code} className="fm-t cursor-pointer">
                <rect data-code={e.code} x={x} y={y} width={w} height={h} rx={8}
                  className={`fm-cadre ${choisi ? "fill-red-500/10" : "fill-slate-100/60 dark:fill-slate-800/60"}`}
                  stroke="#94a3b8" strokeOpacity={choisi ? 0.9 : 0.45} strokeDasharray="3 3" strokeWidth={0.8}>
                  <title>{getDepartmentName(e.code)}</title>
                </rect>
                <path data-code={e.code} d={e.d}
                  className={`fm-d transition-[fill] duration-150 ${choisi ? "" : "fill-slate-300 dark:fill-slate-600"}`}
                  style={choisi ? { fill: "#ef4444" } : undefined}
                  stroke="currentColor" strokeWidth={0.4} strokeLinejoin="round">
                  <title>{getDepartmentName(e.code)}</title>
                </path>
                {e.deco && <path d={e.deco} fill="none" stroke="currentColor" strokeWidth={1.2} pointerEvents="none" />}
                <text x={x + w / 2} y={y + h + 11} textAnchor="middle" pointerEvents="none"
                  className="fill-slate-500 dark:fill-slate-400" fontSize={9} fontWeight={800}>{e.nom.replace("Saint-Pierre-et-Miquelon", "St-Pierre-et-Miq.").replace("Français de l'étranger", "Hors de France")}</text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
