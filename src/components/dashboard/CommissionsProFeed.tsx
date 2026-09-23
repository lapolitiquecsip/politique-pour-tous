"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, ChevronDown, Loader2, Mic, Users, ExternalLink, Video, Search, X } from "lucide-react";
import { api } from "@/lib/api";
import { CommissionAnalysis, ACCENTS } from "@/components/commissions/CommissionAnalysis";
import { shortCommission, cleanTitle, decode, extractPeople, type CommissionMeeting } from "@/lib/commissions";

/**
 * Le fil quotidien des commissions, dans l'espace personnel d'un abonné Pro.
 *
 * Le suivi complet vit sur les pages de l'Assemblée et du Sénat, chambre par chambre.
 * Ici, l'ordre est chronologique et les deux chambres se mêlent : un professionnel veut
 * savoir ce qui s'est dit AUJOURD'HUI, pas parcourir une chambre. Chaque réunion se
 * déplie sur son analyse, sans changer de page.
 *
 * Aucune saisie : la table est remplie par le cron qui relève les comptes rendus
 * officiels et les fait analyser.
 */

const PAGE = 24;

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

/** « 2026-09-23 » → « mercredi 23 septembre ». Le jour de la semaine situe mieux. */
function jourLong(iso: string): string {
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return iso;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const semaine = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"][d.getUTCDay()];
  return `${semaine} ${+m[3]} ${MOIS[+m[2] - 1]}`;
}

const aujourdhui = () => new Date().toISOString().slice(0, 10);

/** Une réunion dans le fil, repliée sur son titre, dépliable sur son analyse. */
function Ligne({ m }: { m: CommissionMeeting }) {
  const [ouvert, setOuvert] = useState(false);
  const senat = m.chamber === "SENAT";
  const accent = senat ? ACCENTS.red : ACCENTS.emerald;
  const gens = m.speakers?.length
    ? m.speakers.slice(0, 3).map(s => s.name)
    : extractPeople(decode(m.title || ""));
  // Une analyse structurée existe-t-elle, ou seulement le compte rendu brut ?
  const a: any = m.analysis || {};
  const analysee = !!(a.contexte || a.points_cles?.length || a.positions?.length || a.citations?.length);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">
      <button
        onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
        className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-white/[0.04]"
      >
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${senat ? "bg-red-500/15 text-red-300" : "bg-emerald-500/15 text-emerald-300"}`}>
          <Mic size={16} />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-widest">
            <span className={senat ? "text-red-300" : "text-emerald-300"}>{senat ? "Sénat" : "Assemblée"}</span>
            <span className="text-white/25">·</span>
            <span className="text-white/45">{shortCommission(m.commission)}</span>
            {!analysee && (
              <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[8px] tracking-wider text-amber-300">
                Analyse en attente
              </span>
            )}
          </span>
          <span className="mt-1 block text-[13px] font-bold leading-snug text-white line-clamp-2">
            {cleanTitle(m.title || "")}
          </span>
          {gens.length > 0 && (
            <span className="mt-1 flex items-center gap-1.5 text-[11px] text-white/45">
              <Users size={11} className="shrink-0" />
              <span className="truncate">Avec {gens.join(", ")}</span>
            </span>
          )}
        </span>

        <ChevronDown size={16} className={`mt-1 shrink-0 text-white/30 transition-transform ${ouvert ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {ouvert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {/* Le panneau est sombre en permanence, quel que soit le thème du site :
                l'analyse doit donc l'être aussi. Lui imposer un fond blanc faisait
                rendre ses variantes `dark:` en clair sur clair — illisible. */}
            <div className="mx-4 mb-4 rounded-xl bg-white/[0.05] p-4 ring-1 ring-white/10">
              <CommissionAnalysis m={m} accent={accent} sombre />
              <div className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-3">
                {m.cr_url && (
                  <a href={m.cr_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white">
                    <ExternalLink size={12} /> Compte rendu officiel
                  </a>
                )}
                {m.video_url && (
                  <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white">
                    <Video size={12} /> Vidéo de la séance
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function CommissionsProFeed() {
  const [reunions, setReunions] = useState<CommissionMeeting[] | null>(null);
  const [recherche, setRecherche] = useState("");
  const [differee, setDifferee] = useState("");
  const [commission, setCommission] = useState<string | null>(null);
  const [encore, setEncore] = useState(false);
  const [epuise, setEpuise] = useState(false);

  // La frappe n'interroge la base qu'une fois stabilisée.
  useEffect(() => {
    const t = setTimeout(() => setDifferee(recherche.trim()), 350);
    return () => clearTimeout(t);
  }, [recherche]);

  useEffect(() => {
    let vivant = true;
    setReunions(null); setEpuise(false);
    api.getCommissionMeetings({ commission, search: differee || null, limit: PAGE })
      .then(r => { if (vivant) { setReunions(r as CommissionMeeting[]); setEpuise((r as unknown[]).length < PAGE); } })
      .catch(() => { if (vivant) setReunions([]); });
    return () => { vivant = false; };
  }, [commission, differee]);

  const charger = async () => {
    if (!reunions || encore || epuise) return;
    setEncore(true);
    try {
      const r = await api.getCommissionMeetings({
        commission, search: differee || null, limit: PAGE, offset: reunions.length,
      }) as CommissionMeeting[];
      setReunions(prev => [...(prev ?? []), ...r]);
      if (r.length < PAGE) setEpuise(true);
    } finally { setEncore(false); }
  };

  /** Commissions présentes dans ce qui est chargé, les plus fournies d'abord. */
  const commissions = useMemo(() => {
    const c = new Map<string, number>();
    for (const m of reunions ?? []) if (m.commission) c.set(m.commission, (c.get(m.commission) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [reunions]);

  /** Réunions regroupées par jour, du plus récent au plus ancien. */
  const parJour = useMemo(() => {
    const j = new Map<string, CommissionMeeting[]>();
    for (const m of reunions ?? []) {
      const d = String(m.meeting_date).slice(0, 10);
      if (!j.has(d)) j.set(d, []);
      j.get(d)!.push(m);
    }
    return [...j.entries()];
  }, [reunions]);

  const total = reunions?.length ?? 0;
  const aujourd = parJour.find(([d]) => d === aujourdhui())?.[1].length ?? 0;

  return (
    <div className="rounded-[2rem] border-2 border-fuchsia-400/40 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 p-5 text-white shadow-xl sm:p-7">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1 text-[10px] font-black uppercase tracking-widest">
          <Briefcase size={12} /> Pro
        </span>
        <h3 className="font-staatliches text-2xl uppercase leading-none tracking-tight sm:text-3xl">
          Le fil des commissions
        </h3>
      </div>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">
        Les réunions et auditions des deux chambres, jour par jour, de la plus récente à la
        plus ancienne. Dépliez-en une pour lire ce qui s&apos;y est dit.
        {aujourd > 0 && <strong className="font-bold text-fuchsia-300"> {aujourd} aujourd&apos;hui.</strong>}
      </p>

      <div className="relative mt-5">
        <Search size={15} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          type="search" value={recherche} onChange={e => setRecherche(e.target.value)}
          placeholder="Chercher un sujet, une personne auditionnée…"
          className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-10 text-sm text-white placeholder:text-white/35 outline-none transition focus:border-fuchsia-400/60"
        />
        {recherche && (
          <button onClick={() => setRecherche("")} aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 hover:bg-white/10">
            <X size={15} />
          </button>
        )}
      </div>

      {commissions.length > 0 && (
        <div className="-mx-5 mt-3 flex gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] sm:-mx-7 sm:px-7 [&::-webkit-scrollbar]:hidden">
          <button onClick={() => setCommission(null)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${commission === null ? "bg-white text-slate-900" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
            Toutes
          </button>
          {commissions.map(([nom, n]) => (
            <button key={nom} onClick={() => setCommission(nom === commission ? null : nom)} title={decode(nom)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${commission === nom ? "bg-white text-slate-900" : "bg-white/10 text-white/60 hover:bg-white/20"}`}>
              {shortCommission(nom)} <span className="opacity-50">{n}</span>
            </button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {reunions === null ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-fuchsia-400" /></div>
        ) : total === 0 ? (
          <p className="py-10 text-center text-sm italic text-white/45">
            {differee ? `Aucune réunion ne correspond à « ${differee} ».` : "Aucune réunion indexée pour l'instant."}
          </p>
        ) : (
          <div className="space-y-6">
            {parJour.map(([jour, lot]) => (
              <div key={jour}>
                <p className="mb-2 flex items-baseline gap-2 text-[10px] font-black uppercase tracking-widest text-white/40">
                  {jourLong(jour)}
                  {jour === aujourdhui() && <span className="rounded-full bg-fuchsia-500/25 px-2 py-0.5 text-fuchsia-200">Aujourd&apos;hui</span>}
                  <span className="text-white/25">{lot.length} réunion{lot.length > 1 ? "s" : ""}</span>
                </p>
                <div className="space-y-2">
                  {lot.map(m => <Ligne key={m.ref} m={m} />)}
                </div>
              </div>
            ))}

            {!epuise && (
              <div className="flex justify-center pt-1">
                <button onClick={charger} disabled={encore}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:border-white/40 disabled:opacity-50">
                  {encore ? <Loader2 size={13} className="animate-spin" /> : <ChevronDown size={13} />}
                  Jours précédents
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <p className="mt-4 text-[10px] italic leading-snug text-white/35">
        Comptes rendus relevés chaque nuit sur les sites de l&apos;Assemblée et du Sénat, puis
        analysés automatiquement. Une réunion marquée « analyse en attente » affiche le
        compte rendu tel que publié, sans reformulation.
      </p>
    </div>
  );
}
