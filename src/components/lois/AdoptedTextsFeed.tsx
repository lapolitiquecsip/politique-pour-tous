"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, X, ExternalLink, Loader2, ArrowRight, Landmark } from "lucide-react";
import { api } from "@/lib/api";

// « Derniers textes adoptés par l'Assemblée » (façon CIVIX/Datan) : pour chaque vote solennel
// sur l'ensemble d'un texte, l'issue (adopté/rejeté), le vote de CHAQUE parti, et l'étape
// suivante vérifiée (transmis au Sénat / adopté définitivement). 100 % données officielles.
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
const frDate = (d?: string | null) => {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
};
const isAdopted = (r?: string | null) => !!r && !/n['’]a pas adopt/i.test(r);

function cleanTitle(v: any): string {
  let t = (v.title || v.objet || "").trim();
  t = t.replace(/^l['’]ensemble (de la|du|des|de l['’])\s*/i, "")
       .replace(/^(proposition|projet) de loi(\s+organique)?\s*/i, "")
       .replace(/\s*\((première|deuxième|nouvelle) lecture\)\s*$/i, "")
       .replace(/^(relati(f|ve)s? (à|au|aux)|visant à|portant|autorisant|pour|tendant à)\s*/i, "");
  return (t.charAt(0).toUpperCase() + t.slice(1)) || (v.title || "Scrutin");
}

// Barre empilée pour / contre / abstention (un texte ou un groupe).
function VoteBar({ pour, contre, abst, className = "" }: { pour: number; contre: number; abst: number; className?: string }) {
  const total = Math.max(1, pour + contre + abst);
  const seg = (n: number, cls: string) => n > 0 ? <div className={cls} style={{ width: `${(n / total) * 100}%` }} /> : null;
  return (
    <div className={`flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800 ${className}`}>
      {seg(pour, "bg-emerald-500")}{seg(contre, "bg-rose-500")}{seg(abst, "bg-slate-300 dark:bg-slate-600")}
    </div>
  );
}

const NAV_TONE: Record<string, string> = {
  definitif: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  senat: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
  cc: "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300",
  assemblee: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  rejet: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
};

export default function AdoptedTextsFeed() {
  const [items, setItems] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any | null>(null);

  useEffect(() => {
    let active = true;
    api.getRecentAssemblyTexts(12).then(d => { if (active) setItems(d as any[]); }).catch(() => setItems([]));
    return () => { active = false; };
  }, []);

  if (!items) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (items.length === 0) return null;

  return (
    <section className="mx-auto max-w-7xl px-4">
      <div className="mb-6">
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Derniers textes <span className="text-blue-600">adoptés par l'Assemblée</span>
        </h2>
        <p className="mt-1 text-slate-500">Chaque vote solennel sur l'ensemble d'un texte : l'issue, le vote de chaque parti, et ce qui se passe ensuite.</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(v => {
          const adopted = isAdopted(v.resultat);
          const nav = v.navette;
          const groups = (v.group_results || []).filter((g: any) => (g.pour + g.contre + g.abstention) > 0);
          return (
            <button key={v.id} onClick={() => setOpen(v)}
              className="group flex flex-col rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">{frDate(v.date_scrutin)}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white ${adopted ? "bg-emerald-500" : "bg-rose-500"}`}>
                  {adopted ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{adopted ? "Adopté" : "Rejeté"}
                </span>
              </div>
              <h3 className="mt-3 line-clamp-3 text-base font-bold leading-snug text-slate-900 group-hover:text-blue-600 dark:text-white">{cleanTitle(v)}</h3>

              {/* Étape suivante vérifiée. */}
              {nav?.navette_label && (
                <span className={`mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${NAV_TONE[nav.navette_status] || NAV_TONE.assemblee}`}>
                  {nav.navette_status === "senat" ? <ArrowRight size={12} /> : nav.navette_status === "definitif" ? <Landmark size={12} /> : null}
                  {nav.navette_label}
                </span>
              )}

              {/* Résumé du vote + aperçu par parti. */}
              <div className="mt-4">
                <VoteBar pour={v.pour || 0} contre={v.contre || 0} abst={v.abstention || 0} />
                <div className="mt-1.5 flex justify-between text-[11px] font-bold">
                  <span className="text-emerald-600">{v.pour ?? 0} pour</span>
                  <span className="text-rose-600">{v.contre ?? 0} contre</span>
                  <span className="text-slate-400">{v.abstention ?? 0} abst.</span>
                </div>
              </div>
              {groups.length > 0 && (
                <span className="mt-4 text-[11px] font-black uppercase tracking-widest text-blue-600">Voir le vote des {groups.length} partis →</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Détail : décryptage + vote de chaque parti. */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-slate-900 sm:rounded-[2rem]"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className={`relative p-6 pr-14 text-white ${isAdopted(open.resultat) ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-rose-600 to-red-700"}`}>
                <button onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 transition hover:bg-white/30"><X size={18} /></button>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{frDate(open.date_scrutin)} · {open.category || "Assemblée nationale"}</p>
                <h3 className="mt-1 text-xl font-bold leading-snug">{cleanTitle(open)}</h3>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-widest">
                  {isAdopted(open.resultat) ? "Adopté" : "Rejeté"} · {open.pour ?? 0} pour / {open.contre ?? 0} contre / {open.abstention ?? 0} abst.
                </p>
                {open.navette?.navette_label && (
                  <p className="mt-2 text-sm font-semibold text-white/90">{open.navette.navette_status === "senat" ? "→ " : ""}{open.navette.navette_label}</p>
                )}
              </div>
              <div className="overflow-y-auto p-6 space-y-5">
                {open.summary && <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">De quoi s'agit-il</p><p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{open.summary}</p></div>}
                {open.why_it_matters && <div className="rounded-2xl bg-blue-50/60 p-4 dark:bg-slate-800/60"><p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Pourquoi c'est important</p><p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{open.why_it_matters}</p></div>}

                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Le vote de chaque parti</p>
                  <div className="mt-3 space-y-2.5">
                    {(open.group_results || []).slice().sort((a: any, b: any) => (b.total || 0) - (a.total || 0)).map((g: any) => (
                      <div key={g.group_id} className="flex items-center gap-3">
                        <span className="w-32 shrink-0 truncate text-sm font-bold text-slate-700 dark:text-slate-200" title={g.group_label}>{g.group_label}</span>
                        <VoteBar pour={g.pour} contre={g.contre} abst={g.abstention} className="flex-1" />
                        <span className="w-24 shrink-0 text-right text-[11px] font-bold tabular-nums">
                          <span className="text-emerald-600">{g.pour}</span> · <span className="text-rose-600">{g.contre}</span> · <span className="text-slate-400">{g.abstention}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-4 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Pour</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" />Contre</span>
                    <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600" />Abstention</span>
                  </div>
                </div>

                {open.dossier_url && <a href={open.dossier_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-600 hover:text-blue-500"><ExternalLink size={13} /> Voir le scrutin officiel</a>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
