"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, Search, Lightbulb, GraduationCap } from "lucide-react";
import { NOTIONS } from "@/lib/help-notions";
import { parcoursForPath } from "@/lib/help-parcours";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/**
 * Bulle d'aide flottante, présente sur tout le site.
 * - Toujours en mouvement (flottement + halo qui pulse) pour attirer l'œil sans gêner.
 * - Au clic : un PARCOURS ÉDUCATIF de la page (étapes illustrées expliquant le
 *   fonctionnement), plus une recherche sur l'ensemble du glossaire.
 */
export default function HelpBubble() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [teaser, setTeaser] = useState(false);

  const parcours = useMemo(() => parcoursForPath(pathname), [pathname]);

  // À chaque changement de page : le bouton « pope » et une bulle incite à cliquer pour
  // comprendre le fonctionnement de l'organe/de la page. Disparaît après quelques secondes.
  useEffect(() => {
    if (!parcours) { setTeaser(false); return; }
    setTeaser(true);
    const t = setTimeout(() => setTeaser(false), 6500);
    return () => clearTimeout(t);
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const results = useMemo(() => {
    const s = norm(q.trim());
    if (!s) return null;
    return NOTIONS.filter(n => norm(n.term).includes(s) || norm(n.def).includes(s));
  }, [q]);

  return (
    <>
      {/* Bulle incitative — apparaît au changement de page pour donner envie de cliquer. */}
      <AnimatePresence>
        {teaser && !open && parcours && (
          <motion.button
            onClick={() => { setOpen(true); setTeaser(false); }}
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 260, damping: 18 }}
            className="fixed bottom-[92px] left-5 z-[60] max-w-[250px] rounded-2xl bg-slate-900 p-3.5 text-left shadow-2xl shadow-sky-900/30 ring-1 ring-sky-400/30"
          >
            <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-sky-300">
              <GraduationCap size={13} /> Comment ça marche ?
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-white">{parcours.title}</p>
            <p className="mt-1 text-[11px] font-bold text-sky-300">Cliquez pour comprendre →</p>
            <span className="absolute -bottom-1.5 left-9 h-3 w-3 rotate-45 bg-slate-900" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bouton flottant en forme de nuage, animé en permanence. */}
      <motion.button
        onClick={() => { setOpen(true); setTeaser(false); }}
        aria-label="Aide : comprendre cette page"
        className="group fixed bottom-5 left-5 z-[60] flex items-center justify-center"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* Halo : pulse plus marqué juste après un changement de page. */}
        <span className="absolute inline-flex h-16 w-20 animate-ping rounded-[50%] bg-sky-400/30" />
        {teaser && <span className="absolute inline-flex h-16 w-20 animate-pulse rounded-[50%] bg-sky-400/40" />}
        {/* Le nuage « pope » à chaque changement de page (key = pathname → rejoue l'anim). */}
        <motion.span
          key={pathname}
          initial={{ scale: 1.35, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 11 }}
          className="relative flex h-14 w-20 items-center justify-center rounded-[50%] bg-gradient-to-br from-sky-400 to-blue-600 text-white shadow-xl shadow-sky-500/40"
        >
          <span className="absolute -top-2 left-4 h-6 w-6 rounded-full bg-sky-400" />
          <span className="absolute -top-3 left-8 h-8 w-8 rounded-full bg-sky-500" />
          <span className="absolute -top-2 right-4 h-6 w-6 rounded-full bg-blue-500" />
          <Lightbulb size={20} className="relative z-10" />
        </motion.span>
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
          Comprendre cette page
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
              className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-white dark:bg-slate-900 shadow-2xl"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              {/* En-tête — richement mis en page, ton pédagogique. */}
              <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-indigo-600 to-sky-500 p-6 text-white">
                <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute -bottom-12 left-10 h-28 w-28 rounded-full bg-sky-300/20 blur-2xl" />
                <button onClick={() => setOpen(false)} className="absolute right-4 top-4 rounded-full bg-white/15 p-2 text-white transition hover:bg-white/25">
                  <X size={18} />
                </button>
                <div className="relative flex items-start gap-4 pr-10">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30 backdrop-blur">
                    <GraduationCap size={26} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/70">
                      {parcours ? `Comprendre en ${parcours.steps.length} étapes` : "Aide & lexique"}
                    </p>
                    <h3 className="mt-0.5 font-staatliches text-2xl uppercase leading-none tracking-tight md:text-3xl">
                      {parcours ? parcours.title : "Comprendre le site"}
                    </h3>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">{parcours ? parcours.intro : "Les notions clés, expliquées simplement."}</p>
                  </div>
                </div>
              </div>

              {/* Recherche */}
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

              <div className="overflow-y-auto p-4">
                {results ? (
                  // Recherche : liste dépliable du glossaire.
                  <div className="space-y-2">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Résultats ({results.length})</p>
                    {results.length === 0 && <p className="py-6 text-center text-sm italic text-slate-400">Aucune notion trouvée.</p>}
                    {results.map((n, i) => (
                      <details key={i} className="group rounded-2xl border border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 p-3">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{n.term}</span>
                          <span className="text-sky-500 transition-transform group-open:rotate-45 text-lg leading-none">+</span>
                        </summary>
                        <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{n.def}</p>
                        {n.example && <p className="mt-1.5 text-[12px] italic text-slate-400">Ex. : {n.example}</p>}
                      </details>
                    ))}
                  </div>
                ) : parcours ? (
                  // Parcours éducatif : étapes illustrées, reliées par un fil dégradé.
                  <>
                    <ol className="relative space-y-4">
                      {parcours.steps.map((st, i) => (
                        <li key={i} className="relative flex gap-4">
                          {i < parcours.steps.length - 1 && <span className="absolute left-6 top-14 bottom-[-18px] w-0.5 bg-gradient-to-b from-sky-300 to-transparent dark:from-sky-700" />}
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-100 to-indigo-100 text-3xl shadow-sm dark:from-slate-800 dark:to-slate-800">
                            {st.emoji}
                            <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-[11px] font-black text-white ring-2 ring-white dark:ring-slate-900">{i + 1}</span>
                          </div>
                          <div className="flex-1 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:border-sky-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                            <h4 className="font-staatliches text-lg uppercase leading-none tracking-wide text-slate-900 dark:text-white">{st.title}</h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{st.text}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className="mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 p-4 dark:from-slate-800/50 dark:to-slate-800/50">
                      <Search size={18} className="shrink-0 text-sky-500" />
                      <p className="text-[12px] leading-snug text-slate-600 dark:text-slate-300">Un mot vous échappe ? Cherchez-le dans la barre ci-dessus (49-3, épargne brute, navette, EPCI…) — le lexique complet est à portée de clic.</p>
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-slate-500">
                    Utilisez la recherche ci-dessus pour comprendre un terme précis.
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
