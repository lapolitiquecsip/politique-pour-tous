"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, BookOpen, ArrowRight, Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { categoryLabel, type LegislativeListItem, type LegislativeDossierDetail } from "@/lib/legislative";
import DossierModal from "@/components/lois/DossierModal";

// Journal Officiel présenté comme un LIVRE que l'on feuillette : une page = un jour + une loi
// promulguée. Mise en page uniquement — données réelles (lois publiées au JORF).
const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
function frDate(d?: string | null) {
  const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { jour: +m[3], mois: MOIS[+m[2] - 1], annee: m[1] } : null;
}

const PAGE = 40;

export default function JournalOfficielBook() {
  const [laws, setLaws] = useState<LegislativeListItem[] | null>(null);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [detail, setDetail] = useState<LegislativeDossierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Ouvre la fiche complète de la loi EN PANNEAU, sans quitter la page d'accueil.
  const openDossier = async (id: string) => {
    setDetailLoading(true); setDetail(null);
    try { setDetail(await api.getLegislativeDossier(id)); } finally { setDetailLoading(false); }
  };

  // Récupère l'« impact citoyen » (À partir de maintenant…) pour un lot de lois et l'attache.
  const attachImpacts = async (rows: any[]) => {
    try {
      const impacts = await api.getLawCitizenImpacts(rows.map(r => r.id));
      const byId = new Map(impacts.map((x: any) => [x.dossier_id, x.impact]));
      for (const r of rows) r.impact = byId.get(r.id) || null;
    } catch { /* le livre affiche le résumé standard en repli */ }
    return rows;
  };

  useEffect(() => {
    let active = true;
    api.getPromulgatedLaws({ limit: PAGE }).then(async rows => {
      await attachImpacts(rows);
      if (active) { setLaws(rows); setHasMore(rows.length === PAGE); }
    }).catch(() => setLaws([]));
    return () => { active = false; };
  }, []);

  // Charge la suite du Journal quand on approche de la dernière page chargée.
  const loadMore = async () => {
    if (!laws || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const last = laws[laws.length - 1];
    try {
      const rows = await api.getPromulgatedLaws({ limit: PAGE, cursorDate: last.promulgated_at || undefined, cursorId: last.jorf_id || undefined });
      await attachImpacts(rows);
      setLaws(cur => [...(cur || []), ...rows]);
      setHasMore(rows.length === PAGE);
    } finally { setLoadingMore(false); }
  };

  if (!laws) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div>;
  if (laws.length === 0) return null;

  const go = (d: number) => {
    setDir(d);
    setI(v => {
      const next = Math.max(0, Math.min(laws.length - 1, v + d));
      if (d > 0 && next >= laws.length - 3) void loadMore(); // précharge la suite
      return next;
    });
  };
  const law = laws[i];
  const date = frDate(law.promulgated_at);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Le livre : reliure centrale, page gauche (date) + page droite (loi) qui se tourne. */}
      <div className="relative mx-auto" style={{ perspective: 2200 }}>
        <div className="grid grid-cols-1 overflow-hidden rounded-[1.5rem] shadow-2xl md:grid-cols-2 md:rounded-[2rem]">
          {/* Page gauche — le jour, façon frontispice, dégradé de la marque. */}
          <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-red-600 via-rose-600 to-fuchsia-700 p-10 text-white md:flex"
            style={{ backgroundImage: "linear-gradient(135deg, #dc2626, #e11d5f 45%, #a21caf), repeating-linear-gradient(180deg, transparent, transparent 33px, rgba(255,255,255,0.06) 34px)" }}>
            <div className="pointer-events-none absolute -left-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-12 right-6 h-36 w-36 rounded-full bg-fuchsia-300/20 blur-2xl" />
            <div className="relative flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-white/80">
              <BookOpen size={14} /> Journal Officiel
            </div>
            {date && (
              <div className="relative">
                <p className="font-staatliches text-9xl leading-none drop-shadow-sm">{String(date.jour).padStart(2, "0")}</p>
                <p className="mt-1 text-3xl font-bold capitalize">{date.mois}</p>
                <p className="text-lg text-white/70">{date.annee}</p>
              </div>
            )}
            <p className="relative text-[11px] italic text-white/70">Lois promulguées de la République française.</p>
            {/* Ombre de reliure au centre. */}
            <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/25 to-transparent" />
          </div>

          {/* Page droite — la loi (se tourne). Swipe horizontal (mobile) pour feuilleter. */}
          <motion.div
            className="relative min-h-[440px] touch-pan-y bg-white dark:bg-slate-900"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_e, info) => {
              if (info.offset.x < -55 || info.velocity.x < -350) go(1);
              else if (info.offset.x > 55 || info.velocity.x > 350) go(-1);
            }}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-600 via-rose-500 to-fuchsia-600" />
            <div className="pointer-events-none absolute -right-10 top-10 h-40 w-40 rounded-full bg-rose-500/5 blur-3xl" />
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
                  <span className="rounded-full bg-gradient-to-r from-red-600 to-fuchsia-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-sm">{categoryLabel(law.category)}</span>
                  <span className="text-[11px] font-bold text-slate-400 md:hidden">{date ? `${date.jour} ${date.mois} ${date.annee}` : ""}</span>
                  {law.nor && <span className="hidden font-mono text-[11px] text-slate-400 md:inline">NOR : {law.nor}</span>}
                </div>
                <h3 className="font-staatliches text-3xl uppercase leading-tight text-slate-900 dark:text-white md:text-4xl">{(law as any).display_title || law.title}</h3>
                <p className="mt-4 flex-1 overflow-hidden text-[15px] leading-7 text-slate-600 dark:text-slate-300 line-clamp-[8]">{(law as any).impact || law.summary || "Texte promulgué et publié au Journal officiel."}</p>
                <button type="button" onClick={() => openDossier(law.id)} className="mt-4 inline-flex items-center gap-2 self-start rounded-full bg-gradient-to-r from-red-600 to-fuchsia-600 px-5 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-500/30 transition hover:shadow-rose-500/50">
                  Lire la loi & son parcours <ArrowRight size={14} />
                </button>
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Commandes de feuilletage. */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <button onClick={() => go(-1)} disabled={i === 0} className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200"><ChevronLeft /></button>
        <span className="text-sm font-black uppercase tracking-widest text-slate-500">Loi {i + 1} / {laws.length}{hasMore ? "+" : ""}</span>
        <button onClick={() => go(1)} disabled={i === laws.length - 1 && !hasMore} className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-red-300 hover:text-red-600 disabled:opacity-40 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-200">{loadingMore && i >= laws.length - 1 ? <Loader2 size={18} className="animate-spin" /> : <ChevronRight />}</button>
      </div>

      {/* Fiche complète de la loi, ouverte EN PANNEAU sur la home (fermable). */}
      <DossierModal detail={detail} loading={detailLoading} onClose={() => { setDetail(null); setDetailLoading(false); }} />
    </div>
  );
}
