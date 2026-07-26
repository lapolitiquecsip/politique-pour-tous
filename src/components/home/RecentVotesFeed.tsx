"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X, ExternalLink, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "@/lib/api";

// Fil chronologique « Derniers votes décryptés » (façon Datan) : les votes solennels de
// l'Assemblée, avec Adopté/Rejeté, catégorie et décryptage au clic. 100 % données réelles.
const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
function frDate(d?: string | null) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : "";
}
const isAdopted = (r?: string | null) => !!r && !/n['’]a pas adopt/i.test(r);
// Nettoie l'objet officiel (« l'ensemble du projet de loi relatif à … (première lecture) »).
function cleanTitle(v: any): string {
  let t = (v.title || v.objet || "").trim();
  t = t.replace(/^l['’]ensemble (de la|du|des|de l['’])\s*/i, "")
       .replace(/^(proposition|projet) de loi(\s+organique)?\s*/i, "")
       .replace(/\s*\((première|deuxième|nouvelle) lecture\)\s*$/i, "")
       .replace(/^(relati(f|ve)s? (à|au|aux)|visant à|portant|autorisant|pour|tendant à)\s*/i, "");
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t || (v.title || "Scrutin");
}

export default function RecentVotesFeed() {
  const [votes, setVotes] = useState<any[] | null>(null);
  const [open, setOpen] = useState<any | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    api.getRecentSolemnVotes(16).then(v => { if (active) setVotes(v as any[]); }).catch(() => setVotes([]));
    return () => { active = false; };
  }, []);

  if (!votes) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-red-600" /></div>;
  if (votes.length === 0) return null;

  const scroll = (dir: number) => scroller.current?.scrollBy({ left: dir * 340, behavior: "smooth" });

  return (
    <div>
      <div ref={scroller} className="flex snap-x gap-5 overflow-x-auto pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {votes.map(v => {
          const adopted = isAdopted(v.resultat);
          return (
            <button key={v.id} onClick={() => setOpen(v)}
              className="group w-[300px] shrink-0 snap-start rounded-[2rem] border border-slate-200 bg-white p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs font-bold text-slate-400">{frDate(v.date_scrutin)}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white ${adopted ? "bg-emerald-500" : "bg-rose-500"}`}>
                  {adopted ? <CheckCircle2 size={12} /> : <XCircle size={12} />}{adopted ? "Adopté" : "Rejeté"}
                </span>
              </div>
              <h3 className="mt-4 line-clamp-4 text-lg font-bold leading-snug text-slate-900 group-hover:text-red-600 dark:text-white">{cleanTitle(v)}</h3>
              {v.category && <span className="mt-4 inline-block rounded-full bg-gradient-to-r from-red-600 to-fuchsia-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">{v.category}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-center gap-4">
        <button onClick={() => scroll(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900"><ChevronLeft /></button>
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">Votes solennels · Assemblée nationale</span>
        <button onClick={() => scroll(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-red-300 hover:text-red-600 dark:border-slate-700 dark:bg-slate-900"><ChevronRight /></button>
      </div>

      {/* Décryptage au clic. */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
            <motion.div className="relative flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-2xl dark:bg-slate-900 sm:rounded-[2rem]"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} onClick={e => e.stopPropagation()}>
              <div className={`relative p-6 pr-14 text-white ${isAdopted(open.resultat) ? "bg-gradient-to-br from-emerald-600 to-teal-700" : "bg-gradient-to-br from-rose-600 to-red-700"}`}>
                <button onClick={() => setOpen(null)} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 transition hover:bg-white/30"><X size={18} /></button>
                <p className="text-[10px] font-black uppercase tracking-widest text-white/80">{frDate(open.date_scrutin)} · {open.category || "Assemblée nationale"}</p>
                <h3 className="mt-1 text-xl font-bold leading-snug">{cleanTitle(open)}</h3>
                <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[11px] font-black uppercase tracking-widest">
                  {isAdopted(open.resultat) ? "Adopté" : "Rejeté"} · {open.pour ?? 0} pour / {open.contre ?? 0} contre / {open.abstention ?? 0} abst.
                </p>
              </div>
              <div className="overflow-y-auto p-6 space-y-5">
                {open.summary && <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">De quoi s'agit-il</p><p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{open.summary}</p></div>}
                {open.why_it_matters && <div className="rounded-2xl bg-red-50/60 p-4 dark:bg-slate-800/60"><p className="text-[10px] font-black uppercase tracking-widest text-red-600">Pourquoi c'est important</p><p className="mt-1 text-[15px] leading-relaxed text-slate-700 dark:text-slate-300">{open.why_it_matters}</p></div>}
                {open.dossier_url && <a href={open.dossier_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-red-600 hover:text-red-500"><ExternalLink size={13} /> Voir le scrutin officiel</a>}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
