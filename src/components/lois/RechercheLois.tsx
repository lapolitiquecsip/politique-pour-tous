"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Search, X } from "lucide-react";
import { api, type LoiTrouvee } from "@/lib/api";

/**
 * Trouver une loi par mot-clé (30/10/2026, ouvert à tous) : « immigration », « retraites »,
 * « aide à mourir », le nom d'un texte… Cherche dans tous les dossiers législatifs, sans
 * tenir compte des accents ni des majuscules (api.rechercherLois). Chaque résultat ouvre la
 * fiche du texte.
 */
const PAR_PAGE = 6;
const date = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "");

export default function RechercheLois() {
  const [saisie, setSaisie] = useState("");
  const [terme, setTerme] = useState("");
  const [res, setRes] = useState<{ lois: LoiTrouvee[]; approchant: boolean } | null>(null);
  const [charge, setCharge] = useState(false);
  const [vus, setVus] = useState(PAR_PAGE);

  // On attend que la frappe s'arrête.
  useEffect(() => { const t = setTimeout(() => setTerme(saisie.trim()), 350); return () => clearTimeout(t); }, [saisie]);
  useEffect(() => {
    if (terme.length < 2) { setRes(null); return; }
    let actif = true;
    setCharge(true); setVus(PAR_PAGE);
    api.rechercherLois(terme).then(r => { if (actif) { setRes(r); setCharge(false); } }).catch(() => { if (actif) { setRes({ lois: [], approchant: false }); setCharge(false); } });
    return () => { actif = false; };
  }, [terme]);

  return (
    <div className="mt-4">
      <label className="relative block max-w-2xl">
        <span className="sr-only">Chercher une loi</span>
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input id="recherche-loi" type="search" value={saisie} onChange={e => setSaisie(e.target.value)} enterKeyHint="search" autoComplete="off"
          placeholder="Chercher une loi : immigration, retraites, logement…"
          className="w-full min-h-[52px] rounded-2xl border border-border bg-card pl-11 pr-11 text-[16px] [&::-webkit-search-cancel-button]:appearance-none text-foreground shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900" />
        {saisie && (
          <button type="button" onClick={() => setSaisie("")} aria-label="Effacer la recherche"
            className="absolute right-1.5 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 hover:text-foreground"><X size={17} /></button>
        )}
      </label>{" "}

      {terme.length >= 2 && (
        <div className="mt-3 max-w-2xl rounded-2xl border border-border bg-card p-2 shadow-lg dark:border-slate-700 dark:bg-slate-900" aria-live="polite">
          {charge && !res ? (
            <p className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground"><Loader2 size={16} className="animate-spin" /> Recherche…</p>
          ) : !res?.lois.length ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">Aucune loi trouvée pour « {terme} ». Essayez un autre mot, plus court ou plus général.</p>
          ) : (
            <>
              <p className="flex items-center gap-2 px-3 pb-1 pt-2 text-[12px] font-bold text-muted-foreground">
                {charge ? <><Loader2 size={13} className="animate-spin" /> Recherche…</>
                  : res.approchant ? `Aucun texte ne contient tous ces mots : voici les plus proches.` : `${res.lois.length}${res.lois.length >= 40 ? "+" : ""} texte${res.lois.length > 1 ? "s" : ""} trouvé${res.lois.length > 1 ? "s" : ""}`}
              </p>
              {/* Les résultats précédents restent, estompés, le temps de la nouvelle recherche. */}
              <ul className={charge ? "opacity-40 transition-opacity" : "transition-opacity"}>
                {res.lois.slice(0, vus).map(l => (
                  <li key={l.id}>
                    <Link href={`/lois/?dossier=${l.id}`} className="group flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-muted dark:hover:bg-slate-800">
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold leading-snug text-foreground group-hover:text-blue-700 dark:text-white dark:group-hover:text-blue-300">{l.titre}</span>{" "}
                        <span className="mt-0.5 block text-[12.5px] text-muted-foreground">
                          {[l.type === "bill" ? "Projet de loi" : "Proposition de loi", l.statut, date(l.date)].filter(Boolean).join(" · ")}
                        </span>
                      </span>{" "}
                      <ArrowRight size={16} className="mt-1 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-500" />
                    </Link>
                  </li>
                ))}
              </ul>
              {res.lois.length > vus && (
                <button type="button" onClick={() => setVus(v => v + PAR_PAGE * 2)}
                  className="mt-1 flex min-h-[44px] w-full items-center justify-center rounded-xl text-[14px] font-bold text-blue-700 hover:bg-muted dark:text-blue-300 dark:hover:bg-slate-800">
                  Voir {Math.min(PAR_PAGE * 2, res.lois.length - vus)} autres textes
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
