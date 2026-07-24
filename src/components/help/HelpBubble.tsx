"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Lightbulb, BookOpen } from "lucide-react";
import { NOTIONS } from "@/lib/help-notions";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Bulle d'aide flottante, présente sur tout le site.
 * - Toujours en mouvement (flottement + halo qui pulse) pour attirer l'œil sans gêner.
 * - Au clic : un panneau qui explique les notions compliquées DE LA PAGE consultée,
 *   avec une recherche sur l'ensemble du glossaire.
 */
export default function HelpBubble() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  // Notions pertinentes pour la page courante (préfixe de route) + notions générales.
  const { pageNotions, generalNotions } = useMemo(() => {
    const onPage = NOTIONS.filter(n => n.routes.some(r => r !== "*" && (pathname === r || pathname.startsWith(r + "/") || (r === "/" && pathname === "/"))));
    const general = NOTIONS.filter(n => n.routes.includes("*"));
    return { pageNotions: onPage, generalNotions: general };
  }, [pathname]);

  const results = useMemo(() => {
    const s = norm(q.trim());
    if (!s) return null;
    return NOTIONS.filter(n => norm(n.term).includes(s) || norm(n.def).includes(s));
  }, [q]);

  return (
    <>
      {/* Bouton flottant en forme de nuage, animé en permanence. */}
      <motion.button
        onClick={() => setOpen(true)}
        aria-label="Aide : comprendre cette page"
        className="fixed bottom-5 left-5 z-[60] flex items-center justify-center"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        <span className="absolute inline-flex h-16 w-20 animate-ping rounded-[50%] bg-sky-400/30" />
        <span className="relative flex h-14 w-20 items-center justify-center rounded-[50%] bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-xl shadow-sky-500/40">
          {/* petites bosses du nuage */}
          <span className="absolute -top-2 left-4 h-6 w-6 rounded-full bg-sky-400" />
          <span className="absolute -top-3 left-8 h-8 w-8 rounded-full bg-sky-500" />
          <span className="absolute -top-2 right-4 h-6 w-6 rounded-full bg-blue-500" />
          <Lightbulb size={20} className="relative z-10" />
        </span>
        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
          Besoin d'aide ?
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-white dark:bg-slate-900 shadow-2xl"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600">
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Comprendre cette page</h3>
                    <p className="text-[11px] text-slate-500">Les notions clés, expliquées simplement</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="rounded-full bg-slate-100 dark:bg-slate-800 p-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700">
                  <X size={18} />
                </button>
              </div>

              <div className="border-b border-slate-100 dark:border-slate-800 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Chercher un mot (49-3, épargne brute, EPCI…)"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-slate-900 dark:text-white outline-none focus:border-sky-300"
                  />
                </div>
              </div>

              <div className="overflow-y-auto p-4 space-y-5">
                {results ? (
                  <NotionList title={`Résultats (${results.length})`} items={results} empty="Aucune notion trouvée." />
                ) : (
                  <>
                    {pageNotions.length > 0 && <NotionList title="Sur cette page" items={pageNotions} highlight />}
                    <NotionList title="À connaître partout" items={generalNotions} />
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function NotionList({ title, items, highlight, empty }: { title: string; items: any[]; highlight?: boolean; empty?: string }) {
  if (items.length === 0) return empty ? <p className="py-6 text-center text-sm italic text-slate-400">{empty}</p> : null;
  return (
    <div>
      <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">{title}</p>
      <div className="space-y-2">
        {items.map((n, i) => (
          <details key={i} className={`group rounded-2xl border p-3 ${highlight ? "border-sky-100 bg-sky-50/50 dark:border-slate-800 dark:bg-slate-800/40" : "border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40"}`}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
              <span className="text-sm font-bold text-slate-900 dark:text-white">{n.term}</span>
              <span className="text-sky-500 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
            </summary>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{n.def}</p>
            {n.example && <p className="mt-1.5 text-[12px] italic text-slate-400">Ex. : {n.example}</p>}
          </details>
        ))}
      </div>
    </div>
  );
}
