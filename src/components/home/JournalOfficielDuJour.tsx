"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Newspaper, ExternalLink, ChevronDown, Loader2, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import LockedSection from "@/components/premium/LockedSection";

/**
 * Le Journal officiel du jour, réservé aux abonnés Pro.
 *
 * Le livre feuilletable juste en dessous montre les LOIS promulguées, soit quelques
 * textes par mois. Cette rubrique-ci montre TOUT le reste : la centaine de décrets,
 * arrêtés, décisions et avis publiés chaque matin, que personne ne lit et qui font
 * pourtant l'essentiel du droit applicable. C'est là que se trouve la valeur pour un
 * professionnel — un arrêté de tarification paraît sans que rien ne l'annonce.
 *
 * Les données viennent du flux OPENDATA de la DILA (voir scripts/update-jorf.ts).
 */

type Texte = { id: string; titre: string; nature: string };
type Groupe = { titre: string; textes: Texte[] };
type Rubrique = { titre: string; groupes: Groupe[] };
type Edition = {
  date: string; num: string; title: string; eli_url: string | null;
  text_count: number; counts: Record<string, number> | null;
  digest: string | null; published_at: string | null;
};

/** Libellés et couleur par nature d'acte. La couleur sert de repère, jamais seule. */
const NATURES: Record<string, { un: string; plusieurs: string; classe: string }> = {
  loi: { un: "Loi", plusieurs: "lois", classe: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300" },
  ordonnance: { un: "Ordonnance", plusieurs: "ordonnances", classe: "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300" },
  decret: { un: "Décret", plusieurs: "décrets", classe: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300" },
  arrete: { un: "Arrêté", plusieurs: "arrêtés", classe: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300" },
  decision: { un: "Décision", plusieurs: "décisions", classe: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  deliberation: { un: "Délibération", plusieurs: "délibérations", classe: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300" },
  circulaire: { un: "Circulaire", plusieurs: "circulaires", classe: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  avis: { un: "Avis", plusieurs: "avis", classe: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300" },
  communication: { un: "Communiqué", plusieurs: "communiqués", classe: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  rapport: { un: "Rapport", plusieurs: "rapports", classe: "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200" },
  autre: { un: "Autre", plusieurs: "autres", classe: "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300" },
};
const nat = (n: string) => NATURES[n] ?? NATURES.autre;

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
function jourCourt(d: string) {
  const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? { jour: +m[3], mois: MOIS[+m[2] - 1] } : { jour: 0, mois: "" };
}

export default function JournalOfficielDuJour() {
  const { isPro, loading: aboEnCours } = usePremium();
  const [editions, setEditions] = useState<Edition[] | null>(null);
  const [choisi, setChoisi] = useState(0);
  const [sections, setSections] = useState<Rubrique[] | null>(null);
  const [sectionsPour, setSectionsPour] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<string | null>(null);
  const [deployees, setDeployees] = useState<Set<string>>(new Set());

  // La liste légère est chargée pour tout le monde : le nombre réel de textes du jour
  // est l'argument le plus convaincant du panneau d'abonnement.
  useEffect(() => {
    let vivant = true;
    api.getJorfEditions(7)
      .then(r => { if (vivant) setEditions(r as Edition[]); })
      .catch(() => { if (vivant) setEditions([]); });
    return () => { vivant = false; };
  }, []);

  const edition = editions?.[choisi] ?? null;

  // Le sommaire n'est demandé que pour l'édition consultée, et seulement aux abonnés.
  useEffect(() => {
    if (!isPro || !edition) return;
    let vivant = true;
    setSections(null);
    api.getJorfSections(edition.date)
      .then(r => { if (vivant) { setSections(r as Rubrique[]); setSectionsPour(edition.date); } })
      .catch(() => { if (vivant) setSections([]); });
    return () => { vivant = false; };
  }, [isPro, edition?.date]);

  // La première rubrique s'ouvre d'office — c'est « Décrets, arrêtés, circulaires »,
  // celle qui porte le fond. Les autres restent repliées pour ne pas noyer le mobile.
  useEffect(() => { setDeployees(new Set(sections?.[0] ? [sections[0].titre] : [])); }, [sectionsPour]);

  const repartition = useMemo(() => {
    const c = edition?.counts ?? {};
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }, [edition]);

  const visibles = useMemo(() => {
    if (!sections) return null;
    if (!filtre) return sections;
    return sections
      .map(r => ({ ...r, groupes: r.groupes.map(g => ({ ...g, textes: g.textes.filter(t => t.nature === filtre) })).filter(g => g.textes.length) }))
      .filter(r => r.groupes.length);
  }, [sections, filtre]);

  // On attend aussi de connaître le niveau d'abonnement : sans cela, un abonné Pro
  // verrait passer une fraction de seconde le panneau qui l'invite à s'abonner.
  if (editions === null || aboEnCours) {
    return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-red-600" /></div>;
  }
  // Tant que le cron n'a rien déposé, la rubrique s'efface au lieu de s'excuser.
  if (!edition) return null;

  if (!isPro) {
    return (
      <div className="mb-10">
        <LockedSection
          proOnly
          icon={<Newspaper size={26} />}
          title="Le Journal officiel du jour"
          pitch={`Chaque matin, l'intégralité du Journal officiel — ${edition.text_count} textes publiés le ${jourCourt(edition.date).jour} ${jourCourt(edition.date).mois} — classés par rubrique et par ministère, avec le point de ce qu'il faut en retenir.`}
          bullets={[
            "Tous les décrets, arrêtés, décisions et avis du jour",
            "Classés par rubrique et par ministère",
            "Le résumé du jour, en un paragraphe",
            "Mis à jour automatiquement dès la parution",
          ]}
        />
      </div>
    );
  }

  const { jour, mois } = jourCourt(edition.date);

  return (
    <div className="mb-10 overflow-hidden rounded-[2rem] border-2 border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white shadow-xl">
      <div className="border-b border-white/10 p-5 sm:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
            <Newspaper size={12} /> Pro
          </span>
          <h3 className="font-staatliches text-2xl uppercase leading-none tracking-tight sm:text-3xl">
            Le Journal officiel du jour
          </h3>
        </div>

        {/* Rail des dernières éditions : on glisse sur le côté plutôt que d'empiler. */}
        <div className="-mx-5 mt-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [touch-action:pan-x] sm:-mx-7 sm:px-7 [&::-webkit-scrollbar]:hidden">
          {editions.map((e, i) => {
            const d = jourCourt(e.date);
            const actif = i === choisi;
            return (
              <button
                key={e.date}
                onClick={() => { setChoisi(i); setFiltre(null); }}
                className={`shrink-0 snap-start rounded-xl px-3 py-2 text-center transition ${
                  actif ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
              >
                <span className="block font-staatliches text-lg leading-none tabular-nums">{d.jour}</span>
                <span className="block text-[9px] font-black uppercase tracking-widest opacity-70">{d.mois}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-4 text-sm font-bold text-white/90">
          {edition.title}
          {edition.eli_url && (
            <a href={edition.eli_url} target="_blank" rel="noopener noreferrer"
              className="ml-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-fuchsia-300 hover:text-fuchsia-200">
              Légifrance <ExternalLink size={9} />
            </a>
          )}
        </p>

        {/* Répartition par nature, qui sert aussi de filtre. */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            onClick={() => setFiltre(null)}
            className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
              filtre === null ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {edition.text_count} textes
          </button>
          {repartition.map(([n, c]) => (
            <button
              key={n}
              onClick={() => setFiltre(filtre === n ? null : n)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest transition ${
                filtre === n ? "bg-white text-slate-900" : "bg-white/10 text-white/70 hover:bg-white/20"
              }`}
            >
              {c} {c > 1 ? nat(n).plusieurs : nat(n).un.toLowerCase()}
            </button>
          ))}
        </div>

        {edition.digest && (
          <div className="mt-4 flex gap-3 rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
            <Sparkles size={16} className="mt-0.5 shrink-0 text-fuchsia-300" />
            <p className="text-[13px] leading-relaxed text-white/85">{edition.digest}</p>
          </div>
        )}
      </div>

      {/* Sommaire complet, replié rubrique par rubrique. */}
      <div className="p-5 sm:p-7">
        {visibles === null ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-fuchsia-400" /></div>
        ) : visibles.length === 0 ? (
          <p className="py-6 text-center text-sm italic text-white/50">Aucun texte de cette nature ce jour-là.</p>
        ) : (
          <div className="space-y-2">
            {visibles.map(r => {
              const ouverte = deployees.has(r.titre);
              const nb = r.groupes.reduce((n, g) => n + g.textes.length, 0);
              return (
                <div key={r.titre} className="overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
                  <button
                    onClick={() => setDeployees(s => {
                      const n = new Set(s);
                      if (n.has(r.titre)) n.delete(r.titre); else n.add(r.titre);
                      return n;
                    })}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                  >
                    <span className="min-w-0 flex-1 text-[13px] font-bold leading-snug">{r.titre}</span>
                    <span className="shrink-0 text-[10px] font-black tabular-nums text-white/50">{nb}</span>
                    <ChevronDown size={16} className={`shrink-0 text-white/50 transition-transform ${ouverte ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {ouverte && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-4 px-4 pb-4">
                          {r.groupes.map(g => (
                            <div key={g.titre}>
                              <p className="mb-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-300/80">{g.titre}</p>
                              <ul className="space-y-1">
                                {g.textes.map(t => (
                                  <li key={t.id}>
                                    <a
                                      href={`https://www.legifrance.gouv.fr/jorf/id/${t.id}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="group flex items-start gap-2 rounded-lg px-2 py-1.5 transition hover:bg-white/[0.06]"
                                    >
                                      <span className={`mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${nat(t.nature).classe}`}>
                                        {nat(t.nature).un}
                                      </span>
                                      <span className="min-w-0 flex-1 text-[12px] leading-snug text-white/80 group-hover:text-white">
                                        {t.titre}
                                      </span>
                                      <ExternalLink size={11} className="mt-0.5 shrink-0 text-white/25 group-hover:text-fuchsia-300" />
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-4 text-[10px] italic leading-snug text-white/40">
          Source : flux officiel de la DILA (Direction de l&apos;information légale et administrative).
          Chaque intitulé renvoie au texte intégral sur Légifrance.
        </p>
      </div>
    </div>
  );
}
