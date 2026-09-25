"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { X, Search, GraduationCap } from "lucide-react";
import { NOTIONS } from "@/lib/help-notions";
import { parcoursForPath } from "@/lib/help-parcours";
import HelpDiagram from "@/components/help/HelpDiagram";

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
  // Le glisser de la feuille ne part que de sa poignée (voir plus bas).
  const poignee = useDragControls();

  // Masquée sur la page Premium (vitrine) ET sur les FICHES individuelles (élus, partis) : la bulle
  // flottante recouvre le contenu détaillé et gêne la lecture. Elle reste sur les pages de liste et
  // les pages thématiques (où le parcours pédagogique a du sens).
  const isFiche = /^\/(deputes|senateurs|eurodeputes|ministres|maires|partis)\/[^/]+/.test(pathname);
  // Ni sur la page d'offre, ni dans l'espace personnel : ce sont des pages où
  // l'abonné vient gérer son compte, pas apprendre à lire le site.
  const hidden = pathname === "/" || pathname.startsWith("/premium")
    || pathname.startsWith("/dashboard") || isFiche;
  const parcours = useMemo(() => parcoursForPath(pathname), [pathname]);

  // La croix n'était pas la seule sortie — le fond réagissait déjà au clic — mais sur
  // téléphone la feuille couvre l'écran : il ne reste presque rien à toucher à côté.
  // Échap au clavier, et un glissement vers le bas au doigt (plus bas), complètent.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  // Sur la page Europe, la bulle d'aide prend les couleurs du drapeau de l'UE (bleu + or).
  const eu = pathname.startsWith("/eurodeputes");
  const th = eu
    ? { cloud: "from-[#0047b3] via-[#003399] to-[#001f5c]", bulle: "from-[#0047b3] to-[#002a7a]", ring: "bg-[#FFCC00]/40", header: "from-[#003399] via-[#002a7a] to-[#003399]", eyebrow: "text-[#FFD54A]", badge: "from-[#003399]/10 to-[#FFCC00]/25", num: "from-[#003399] to-[#001f5c]", line: "from-[#FFCC00] dark:from-[#b8940a]", tip: "from-[#003399]/10 to-[#FFCC00]/15 dark:from-slate-800/50 dark:to-slate-800/50", tipIcon: "text-[#003399] dark:text-[#FFD54A]", teaser: "text-[#FFD54A]", teaserRing: "ring-[#FFCC00]/40" }
    : { cloud: "from-sky-400 via-blue-500 to-indigo-600", bulle: "from-sky-400 to-blue-500", ring: "bg-sky-400/30", header: "from-blue-600 via-indigo-600 to-sky-500", eyebrow: "text-white/70", badge: "from-sky-100 to-indigo-100 dark:from-slate-800 dark:to-slate-800", num: "from-blue-600 to-indigo-600", line: "from-sky-300 dark:from-sky-700", tip: "from-sky-50 to-indigo-50 dark:from-slate-800/50 dark:to-slate-800/50", tipIcon: "text-sky-500", teaser: "text-sky-300", teaserRing: "ring-sky-400/30" };

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

  if (hidden) return null;   // pas de bulle d'aide sur la page Premium

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
            className={`hidden sm:block fixed bottom-[92px] left-5 z-[60] max-w-[250px] rounded-2xl bg-slate-900 p-3.5 text-left shadow-2xl shadow-sky-900/30 ring-1 ${th.teaserRing}`}
          >
            <p className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${th.teaser}`}>
              <GraduationCap size={13} /> Comment ça marche ?
            </p>
            <p className="mt-1 text-sm font-bold leading-snug text-white">{parcours.title}</p>
            <p className={`mt-1 text-[11px] font-bold ${th.teaser}`}>Cliquez pour comprendre →</p>
            <span className="absolute -bottom-1.5 left-9 h-3 w-3 rotate-45 bg-slate-900" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bouton flottant en forme de nuage. Réduit (~-32%) sur mobile pour prendre moins de place. */}
      <div className="fixed bottom-5 left-5 z-[60] origin-bottom-left scale-[.68] sm:scale-100">
      <motion.button
        onClick={() => { setOpen(true); setTeaser(false); }}
        aria-label="Aide : comprendre cette page"
        className="group relative flex items-center justify-center"
        animate={{ y: [0, -7, 0] }}
        transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
      >
        {/* Halo : pulse plus marqué juste après un changement de page. */}
        <span className={`absolute inline-flex h-16 w-20 animate-ping rounded-[50%] ${th.ring}`} />
        {teaser && <span className={`absolute inline-flex h-16 w-20 animate-pulse rounded-[50%] ${th.ring}`} />}
        {/* Le nuage « pope » à chaque changement de page (key = pathname → rejoue l'anim). */}
        <motion.span
          key={pathname}
          initial={{ scale: 1.35, rotate: -12 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 11 }}
          className={`relative flex h-14 w-20 items-center justify-center rounded-[50%] bg-gradient-to-br ${th.cloud} text-white shadow-xl shadow-sky-500/40`}
        >
          {/* Les trois bulles qui donnent au nuage sa silhouette. Elles portent le
              même dégradé que le corps, sans quoi on verrait trois pastilles
              posées dessus plutôt qu'un seul volume. */}
          <span className={`absolute -top-2 left-4 h-6 w-6 rounded-full bg-gradient-to-br ${th.bulle}`} />
          <span className={`absolute -top-3 left-8 h-8 w-8 rounded-full bg-gradient-to-br ${th.bulle}`} />
          <span className={`absolute -top-2 right-4 h-6 w-6 rounded-full bg-gradient-to-br ${th.bulle}`} />
          {/* Un point d'interrogation, plutôt qu'une ampoule ou un drapeau.
              L'ampoule disait « idée » là où le bouton répond à une question ; et
              le drapeau 🇪🇺 ne s'affiche pas sous Windows, qui ne dessine pas les
              indicateurs régionaux et retombe sur les deux lettres « EU ». La
              page Europe montrait donc une pastille bleue marquée EU, dont
              personne ne pouvait deviner l'usage. */}
          <span className="relative z-10 select-none font-staatliches text-[28px] leading-none text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
            ?
          </span>
        </motion.span>
        <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100">
          Comprendre cette page
        </span>
      </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-slate-950/60 p-0 sm:p-4"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[2rem] sm:rounded-[2rem] bg-card dark:bg-slate-900 shadow-2xl"
              initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 26, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
              // Feuille que l'on chasse vers le bas au doigt, comme partout ailleurs
              // sur téléphone. Le seuil évite qu'un défilement un peu vif la referme.
              //
              // `dragListener={false}` est ESSENTIEL et n'est pas un détail de
              // réglage : sans lui, le glisser écoute toute la surface de la
              // feuille et avale l'appui sur ce qu'elle contient. La croix ne
              // fermait donc rien — ni au doigt, ni à la souris — parce que le
              // geste commençait avant que le clic n'ait lieu. Le glisser ne part
              // plus que de la poignée, ci-dessous, qui est là pour ça.
              drag="y"
              dragListener={false}
              dragControls={poignee}
              dragDirectionLock
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0, bottom: 0.4 }}
              onDragEnd={(_, info) => { if (info.offset.y > 120 || info.velocity.y > 700) setOpen(false); }}
            >
              {/* Poignée : dit sans mot que la feuille se chasse vers le bas, et
                  c'est désormais le seul endroit d'où le geste peut partir. Elle
                  n'existe que sur téléphone ; sur ordinateur, la feuille ne se
                  glisse pas du tout, ce qui rend le texte sélectionnable. */}
              <span
                aria-hidden
                onPointerDown={e => poignee.start(e)}
                style={{ touchAction: "none" }}
                className="mx-auto mt-2 h-1.5 w-10 shrink-0 cursor-grab rounded-full bg-white/40 active:cursor-grabbing sm:hidden"
              />
              {/* En-tête — richement mis en page, ton pédagogique. */}
              {/* shrink-0 indispensable : en colonne flexible, la liste d'étapes
                  comprimait l'en-tête et coupait la deuxième ligne du titre. */}
              <div className={`relative shrink-0 overflow-hidden bg-gradient-to-br ${th.header} p-6 text-white`}>
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
                    <p className={`text-[10px] font-black uppercase tracking-[0.25em] ${eu ? th.eyebrow : "text-white/70"}`}>
                      {parcours ? `Comprendre en ${parcours.steps.length} étapes` : "Aide & lexique"}
                    </p>
                    <h3 className="mt-0.5 font-staatliches text-xl uppercase leading-[1.05] tracking-tight md:text-2xl">
                      {parcours ? parcours.title : "Comprendre le site"}
                    </h3>
                    <p className="mt-1.5 text-[12px] leading-snug text-white/85">{parcours ? parcours.intro : "Les notions clés, expliquées simplement."}</p>
                  </div>
                </div>
              </div>

              {/* Recherche */}
              <div className="shrink-0 border-b border-border dark:border-slate-800 p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                  <input
                    value={q} onChange={e => setQ(e.target.value)}
                    placeholder="Chercher un mot (49-3, épargne brute, EPCI…)"
                    className="w-full rounded-xl border border-border dark:border-slate-700 bg-card dark:bg-slate-900 py-2.5 pl-9 pr-3 text-sm text-foreground dark:text-white outline-none focus:border-sky-300"
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
                      // Ouvert d'office quand il n'y a qu'un seul résultat : la définition s'affiche
                      // immédiatement. La croix (+ pivoté en ×) reste cliquable pour replier.
                      <details key={i} open={results.length === 1} className="group overflow-hidden rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-50 to-white shadow-sm ring-1 ring-sky-500/5 dark:border-slate-700 dark:from-slate-800/60 dark:to-slate-900">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 transition hover:bg-sky-100/50 dark:hover:bg-slate-700/40">
                          <span className="flex items-center gap-2 text-sm font-black text-sky-900 dark:text-sky-200">
                            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-sky-400 to-blue-600" />
                            {n.term}
                          </span>
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white shadow-sm transition-transform group-open:rotate-45 text-lg leading-none" aria-label="Ouvrir ou replier">+</span>
                        </summary>
                        <div className="border-t border-sky-100/70 px-3 pb-3 pt-2.5 dark:border-slate-700/60">
                          <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">{n.def}</p>
                          {n.example && (
                            <p className="mt-2 rounded-xl bg-sky-100/50 px-3 py-2 text-[12px] italic leading-relaxed text-sky-800 dark:bg-sky-500/10 dark:text-sky-200">
                              <span className="font-black not-italic">Ex. </span>{n.example}
                            </p>
                          )}
                        </div>
                      </details>
                    ))}
                  </div>
                ) : parcours ? (
                  // Parcours éducatif : étapes illustrées, reliées par un fil dégradé.
                  <>
                    <ol className="relative space-y-4">
                      {parcours.steps.map((st, i) => (
                        <li key={i} className="relative flex gap-4">
                          {i < parcours.steps.length - 1 && <span className={`absolute left-6 top-14 bottom-[-18px] w-0.5 bg-gradient-to-b ${th.line} to-transparent`} />}
                          <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${th.badge} text-3xl shadow-sm`}>
                            {st.emoji}
                            <span className={`absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br ${th.num} text-[11px] font-black text-white ring-2 ring-white dark:ring-slate-900`}>{i + 1}</span>
                          </div>
                          <div className="flex-1 rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
                            <h4 className="font-staatliches text-lg uppercase leading-none tracking-wide text-foreground dark:text-white">{st.title}</h4>
                            <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground dark:text-slate-300">{st.text}</p>
                            {st.diagram && <HelpDiagram name={st.diagram} />}
                          </div>
                        </li>
                      ))}
                    </ol>
                    <div className={`mt-5 flex items-center gap-3 rounded-2xl bg-gradient-to-br ${th.tip} p-4`}>
                      <Search size={18} className={`shrink-0 ${th.tipIcon}`} />
                      <p className="text-[12px] leading-snug text-muted-foreground dark:text-slate-300">Un mot vous échappe ? Cherchez-le dans la barre ci-dessus (49-3, épargne brute, navette, EPCI…) — le lexique complet est à portée de clic.</p>
                    </div>
                  </>
                ) : (
                  <p className="py-8 text-center text-sm text-muted-foreground">
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
