"use client";

import { useMemo, useState } from "react";
import { MapPin, X } from "lucide-react";
import { getDepartmentName } from "@/lib/department-mapping";
import { departmentPaths } from "@/lib/data/departmentPaths";

/**
 * Carte des départements, pour retrouver ses élus.
 *
 * Les tracés viennent de `departmentPaths`, le fond de carte déjà utilisé ailleurs sur
 * le site : cent un départements, DROM et Corse compris, livrés avec la page. L'ancienne
 * version téléchargeait un SVG sur un CDN, le passait au DOMParser, le recomposait puis
 * l'injectait en `innerHTML` — trois étapes avant le premier affichage, et un survol qui
 * traînait parce qu'un filtre CSS posé sur le SVG entier obligeait à redessiner la carte
 * entière à chaque changement de couleur. Ici, un `fill` change, rien d'autre.
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
const REGION_COLOR: Record<string, string> = Object.fromEntries(
  REGION_GROUPS.flatMap(g => g.deps.map(d => [d, g.color]))
);

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
  const marge = 6;
  return `${minX - marge} ${minY - marge} ${maxX - minX + marge * 2} ${maxY - minY + marge * 2}`;
})();

interface FranceMapProps {
  selectedDepartment: string | null;
  onDepartmentSelect: (dept: string | null) => void;
}

export default function FranceMap({ selectedDepartment, onDepartmentSelect }: FranceMapProps) {
  const [survole, setSurvole] = useState<string | null>(null);

  // Le département désigné par l'infobulle : celui qu'on survole, sinon la sélection.
  const montre = survole ?? selectedDepartment;
  const nom = useMemo(() => (montre ? getDepartmentName(montre) : null), [montre]);

  return (
    <div className="relative w-full">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-red-500" />
          <span className="text-sm font-semibold text-foreground">
            {selectedDepartment
              ? "Cliquez sur un autre département ou réinitialisez"
              : "Cliquez sur un département (Hexagone ou DROM-COM)"}
          </span>
        </div>

        {selectedDepartment && (
          <button
            onClick={() => onDepartmentSelect(null)}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-500/20 active:scale-95 dark:text-red-400"
          >
            <X className="h-3.5 w-3.5" />
            Voir toute la France
          </button>
        )}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-sm md:p-8">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-br from-red-500/[0.05] via-transparent to-red-500/[0.02]" />

        {montre && (
          <div className="pointer-events-none absolute right-6 top-6 z-20 flex min-w-[140px] flex-col rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white shadow-2xl dark:bg-slate-100 dark:text-slate-900">
            <span className="mb-0.5 text-[10px] uppercase tracking-wider opacity-60">{montre}</span>
            <span className="text-nowrap text-base">{nom}</span>
          </div>
        )}

        <svg
          viewBox={VIEWBOX}
          className="mx-auto h-auto max-h-[500px] w-full text-white dark:text-slate-900"
          role="img"
          aria-label="Carte des départements français"
          onMouseLeave={() => setSurvole(null)}
          // Un clic à côté des tracés remet la carte à plat.
          onClick={e => { if ((e.target as Element).tagName !== "path") onDepartmentSelect(null); }}
        >
          {CODES.map(code => {
            const choisi = selectedDepartment === code;
            const teinte = choisi ? "#ef4444" : survole === code ? (REGION_COLOR[code] ?? "#94a3b8") : null;
            return (
              <path
                key={code}
                d={departmentPaths[code].d}
                // La teinte n'est posée en style que sur le département désigné ; les autres
                // gardent une classe, qui sait suivre le thème sombre.
                className={`cursor-pointer outline-none transition-[fill] duration-150 ${
                  teinte ? "" : "fill-slate-200 dark:fill-slate-700"
                }`}
                style={teinte ? { fill: teinte } : undefined}
                stroke="currentColor"
                strokeWidth={0.8}
                strokeLinejoin="round"
                onMouseEnter={() => setSurvole(code)}
                onClick={() => onDepartmentSelect(choisi ? null : code)}
              >
                <title>{getDepartmentName(code)}</title>
              </path>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
