"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { categoryLabel, type LegislativeListItem } from "@/lib/legislative";

// Journal Officiel présenté comme un LIVRE que l'on feuillette : une page = un jour + une loi
// promulguée. Mise en page uniquement — données réelles (lois publiées au JORF).
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function frDate(d?: string | null) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { jour: +m[3], mois: MOIS[+m[2] - 1], annee: m[1] } : null;
}

export default function JournalOfficielBook() {
  const [laws, setLaws] = useState<LegislativeListItem[] | null>(null);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);

  useEffect(() => {
    let active = true;
    api.getPromulgatedLaws({ limit: 40 }).then(rows => { if (active) setLaws(rows); }).catch(() => setLaws([]));
    return () => { active = false; };
  }, []);

  if (!laws) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div>;
  if (laws.length === 0) return null;

  const go = (d: number) => { setDir(d); setI(v => Math.min(laws.length - 1, Math.max(0, v + d))); };
  const law = laws[i];
  const date = frDate(law.promulgated_at);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Le livre : reliure centrale, page gauche (date) + page droite (loi) qui se tourne. */}
      <div className="relative mx-auto" style={{ perspective: 2200 }}>
        <div className="grid grid-cols-1 overflow-hidden rounded-[1.5rem] shadow-2xl md:grid-cols-2 md:rounded-[2rem]">
          {/* Page gauche — le jour, façon frontispice. */}
          <div className="relative hidden flex-col justify-between bg-[#f3ead6] p-10 md:flex"
            style={{ backgroundImage: "repeating-linear-gradient(180deg, transparent, transparent 33px, rgba(120,90,40,0.06) 34px)" }}>
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-amber-800/70">
              <BookOpen size={14} /> Journal Officiel
            </div>
            {date && (
              <div className="text-amber-900">
                <p className="font-staatliches text-8xl leading-none">{String(date.jour).padStart(2, "0")}</p>
                <p className="mt-1 text-2xl font-bold capitalize">{date.mois}</p>
                <p className="text-lg text-amber-800/70">{date.annee}</p>
              </div>
            )}
            <p className="text-[11px] italic text-amber-800/60">Lois promulguées de la République française.</p>
            {/* Ombre de reliure au centre. */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/15 to-transparent" />
          </div>

          {/* Page droite — la loi (se tourne). */}
          <div className="relative bg-[#fbf6ea] min-h-[440px]">
            <div className="pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-black/12 to-transparent md:block" />
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div
                key={i}
                custom={dir}
                initial={{ rotateY: dir > 0 ? 78 : -78, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: dir > 0 ? -78 : 78, opacity: 0 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                style={{ transformOrigin: "left center", transformStyle: "preserve-3d" }}
                className="flex h-full flex-col p-8 md:p-10"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="rounded-full bg-red-700/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-800">{categoryLabel(law.category)}</span>
                  <span className="text-[11px] font-bold text-amber-800/60 md:hidden">{date ? `${date.jour} ${date.mois} ${date.annee}` : ""}</span>
                  {law.nor && <span className="hidden font-mono text-[11px] text-amber-800/60 md:inline">NOR : {law.nor}</span>}
                </div>
                <h3 className="font-staatliches text-3xl uppercase leading-tight text-slate-900 md:text-4xl">{law.title}</h3>
                <p className="mt-4 flex-1 overflow-hidden text-[15px] leading-7 text-slate-700 line-clamp-[8]">{law.summary || "Texte promulgué et publié au Journal officiel."}</p>
                <Link href={`/lois/?dossier=${law.id}`} className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-slate-900 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-red-700">
                  Lire la loi & son parcours <ArrowRight size={14} />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Commandes de feuilletage. */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button onClick={() => go(-1)} disabled={i === 0} className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"><ChevronLeft /></button>
        <span className="text-sm font-black uppercase tracking-widest text-slate-500">Loi {i + 1} / {laws.length}</span>
        <button onClick={() => go(1)} disabled={i === laws.length - 1} className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"><ChevronRight /></button>
      </div>
    </div>
  );
}
