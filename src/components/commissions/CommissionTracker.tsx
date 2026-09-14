"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Loader2, Lock, Search, ChevronDown, Users, ExternalLink, Download,
  Mic, Target, Quote, ListChecks, ArrowRight, Briefcase, X, CalendarDays,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import LockedSection from "@/components/premium/LockedSection";
import {
  cleanTitle, decode, extractPeople, shortCommission, fmtMeetingDate,
  type CommissionMeeting,
} from "@/lib/commissions";

const PAGE = 12;

/** Une commission dans le menu de navigation : son nom, son volume, sa dernière réunion. */
type CommissionSummary = { name: string; count: number; last: string | null };

type Props = {
  chamber: "AN" | "SENAT";
  chamberLabel: string;
  /** Couleur d'accent de la chambre : vert pour l'Assemblée, rouge pour le Sénat. */
  accent?: "emerald" | "red";
};

/** Classes explicites — Tailwind ne peut pas deviner une classe construite à la volée. */
const ACCENTS = {
  emerald: {
    text: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-500/15",
    chip: "bg-emerald-600 text-white", ring: "hover:border-emerald-300",
    grad: "from-emerald-500 to-teal-500", dot: "bg-emerald-500",
    hover: "hover:text-emerald-600",
  },
  red: {
    text: "text-red-600", bg: "bg-red-50 dark:bg-red-500/15",
    chip: "bg-red-600 text-white", ring: "hover:border-red-300",
    grad: "from-red-500 to-rose-600", dot: "bg-red-500",
    hover: "hover:text-red-600",
  },
};

/* ───────────────────────── Invitation à passer Pro ───────────────────────── */
function ProLock({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 text-center ${compact ? "" : "py-6"}`}>
      <span className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-white shadow-lg">
        <Lock size={12} /> Réservé Pro
      </span>
      <Link href="/premium" className="text-[11px] font-black uppercase tracking-widest text-fuchsia-600 hover:underline">
        Débloquer l&apos;analyse détaillée →
      </Link>
    </div>
  );
}

/* ─────────────────── Analyse détaillée d'une réunion (Pro) ─────────────────── */
function Analysis({ m, accent }: { m: CommissionMeeting; accent: typeof ACCENTS.emerald }) {
  const a = m.analysis || {};
  const hasStructured =
    !!(a.contexte || a.points_cles?.length || a.chiffres?.length || a.positions?.length || a.suites?.length || a.citations?.length);

  // Repli : tant que l'analyse structurée n'a pas été générée, on affiche le résumé.
  if (!hasStructured) {
    return m.summary
      ? <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700 dark:text-slate-300">{m.summary}</p>
      : <p className="text-sm italic text-slate-400">Analyse en cours de génération…</p>;
  }

  return (
    <div className="space-y-5">
      {a.contexte && (
        <div>
          <p className={`mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent.text}`}>
            <Target size={12} /> Contexte
          </p>
          <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{a.contexte}</p>
        </div>
      )}

      {!!a.points_cles?.length && (
        <div>
          <p className={`mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${accent.text}`}>
            <ListChecks size={12} /> Ce qui s&apos;est dit
          </p>
          <ul className="space-y-1.5">
            {a.points_cles.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-300">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`} />{p}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!!a.chiffres?.length && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-amber-600">Chiffres avancés</p>
          <div className="flex flex-wrap gap-2">
            {a.chiffres.map((c, i) => (
              <div key={i} className="rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-2 dark:border-amber-500/30 dark:bg-amber-500/10">
                <p className="font-staatliches text-xl leading-none text-amber-700 dark:text-amber-400">{c.valeur}</p>
                <p className="mt-1 text-[11px] leading-tight text-slate-600 dark:text-slate-400">{c.quoi}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!a.positions?.length && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-violet-600">Positions défendues</p>
          <div className="space-y-2">
            {a.positions.map((p, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <p className="text-[12px] font-black text-slate-900 dark:text-white">
                  {p.orateur}
                  {p.groupe && <span className="ml-2 rounded-full bg-violet-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{p.groupe}</span>}
                </p>
                <p className="mt-1 text-sm leading-snug text-slate-600 dark:text-slate-300">{p.position}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {!!a.citations?.length && (
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <Quote size={12} /> Verbatim
          </p>
          <div className="space-y-2">
            {a.citations.map((c, i) => (
              <blockquote key={i} className="border-l-4 border-slate-200 pl-3 dark:border-slate-700">
                <p className="text-sm italic leading-snug text-slate-700 dark:text-slate-300">« {c.texte} »</p>
                <p className="mt-0.5 text-[11px] font-bold text-slate-400">— {c.orateur}</p>
              </blockquote>
            ))}
          </div>
        </div>
      )}

      {!!a.suites?.length && (
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-sky-600">Suites annoncées</p>
          <ul className="space-y-1.5">
            {a.suites.map((p, i) => (
              <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-300">
                <ArrowRight size={14} className="mt-0.5 shrink-0 text-sky-500" />{p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── Une réunion, pliable ─────────────────────────── */
function MeetingCard({ m, isPro, accent }: { m: CommissionMeeting; isPro: boolean; accent: typeof ACCENTS.emerald }) {
  const [open, setOpen] = useState(false);
  const commission = shortCommission(m.commission);
  const title = cleanTitle(m.title || "");
  const people = m.speakers?.length
    ? m.speakers.slice(0, 3).map(s => s.name)
    : extractPeople(decode(m.title || ""));

  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all ${accent.ring} hover:shadow-lg dark:border-slate-800 dark:bg-slate-900`}>
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-4 p-5 text-left" aria-expanded={open}>
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${accent.bg} ${accent.text}`}>
          <Mic size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`flex flex-wrap items-center gap-x-2 text-[10px] font-black uppercase tracking-widest ${accent.text}`}>
            <span>{fmtMeetingDate(m.meeting_date)}</span>
            <span className="text-slate-300">·</span>
            <span className="text-slate-500">{commission}</span>
          </p>
          <p className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{title}</p>
          {people.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Users size={12} className={`shrink-0 ${accent.text}`} />
              <span className="truncate">Avec {people.join(", ")}</span>
            </p>
          )}
        </div>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          {isPro ? (
            <Analysis m={m} accent={accent} />
          ) : (
            // Aperçu flouté : le lecteur voit qu'il y a de la matière, sans la lire.
            <div className="relative min-h-[180px]">
              <div aria-hidden className="pointer-events-none select-none blur-[6px]">
                <Analysis m={m} accent={accent} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ProLock />
              </div>
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
            {m.cr_url && (
              <a href={m.cr_url} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 ${accent.hover}`}>
                <ExternalLink size={12} /> Compte rendu officiel
              </a>
            )}
            {m.video_url && (
              <a href={m.video_url} target="_blank" rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 ${accent.hover}`}>
                <ExternalLink size={12} /> Vidéo de la réunion
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Composant ═══════════════════════════════ */
export default function CommissionTracker({ chamber, chamberLabel, accent = "emerald" }: Props) {
  const { isPro, isPremium } = usePremium();
  const a = ACCENTS[accent];

  const [commissions, setCommissions] = useState<CommissionSummary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [meetings, setMeetings] = useState<CommissionMeeting[] | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [exhausted, setExhausted] = useState(false);
  // Empêche une réponse lente d'un filtre abandonné d'écraser un résultat plus récent.
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    api.getCommissionList(chamber).then(rows => { if (active) setCommissions(rows as CommissionSummary[]); }).catch(() => {});
    return () => { active = false; };
  }, [chamber]);

  // La recherche n'interroge la base qu'une fois la frappe stabilisée.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const id = ++requestId.current;
    setMeetings(null);
    setExhausted(false);
    api.getCommissionMeetings({ chamber, commission: selected, search: debounced || null, limit: PAGE })
      .then(rows => {
        if (requestId.current !== id) return;
        setMeetings(rows as CommissionMeeting[]);
        setExhausted((rows as CommissionMeeting[]).length < PAGE);
      })
      .catch(() => { if (requestId.current === id) setMeetings([]); });
  }, [chamber, selected, debounced]);

  const loadMore = useCallback(async () => {
    if (!meetings || loadingMore || exhausted) return;
    setLoadingMore(true);
    const id = requestId.current;
    try {
      const rows = await api.getCommissionMeetings({
        chamber, commission: selected, search: debounced || null, limit: PAGE, offset: meetings.length,
      }) as CommissionMeeting[];
      if (requestId.current !== id) return;
      setMeetings(prev => [...(prev ?? []), ...rows]);
      if (rows.length < PAGE) setExhausted(true);
    } finally {
      setLoadingMore(false);
    }
  }, [meetings, loadingMore, exhausted, chamber, selected, debounced]);

  /** Export CSV de ce qui est affiché — un des arguments de l'offre Pro. */
  const exportCsv = () => {
    if (!meetings?.length) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Date", "Commission", "Objet", "Points clés", "Compte rendu"];
    const lines = meetings.map(m => [
      m.meeting_date ?? "",
      decode(m.commission || ""),
      cleanTitle(m.title || ""),
      (m.analysis?.points_cles ?? []).join(" • ") || (m.summary ?? "").replace(/\s+/g, " "),
      m.cr_url ?? "",
    ].map(esc).join(";"));
    // BOM pour qu'Excel ouvre l'UTF-8 correctement.
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `commissions-${chamber.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const total = useMemo(() => commissions.reduce((n, c) => n + c.count, 0), [commissions]);

  return (
    <div id="commissions" className="scroll-mt-24 mt-16">
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${a.grad} text-white shadow-lg`}>
          <Briefcase size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-staatliches text-3xl uppercase tracking-tight text-slate-900 dark:text-white">
              Suivi des <span className={a.text}>commissions</span>
            </h3>
            <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow">Pro</span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Ce qui s&apos;est dit dans chaque commission {chamberLabel === "Sénat" ? "du" : "de l'"}{chamberLabel}, réunion par réunion.
            {total > 0 && <> {total.toLocaleString("fr-FR")} réunions indexées.</>}
          </p>
        </div>
        {isPro && meetings?.length ? (
          <button onClick={exportCsv}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-400 dark:border-slate-700 dark:text-slate-300">
            <Download size={13} /> Export CSV
          </button>
        ) : null}
      </div>

      {/* Sans abonnement, la section entière est remplacée par son argumentaire :
          un contenu flouté frustre sans informer et sous-vend ce qu'on protège. */}
      {!isPremium ? (
        <LockedSection
          proOnly
          icon={<Briefcase size={26} />}
          title={`Ce qui s'est dit en commission`}
          pitch={`${total > 0 ? total.toLocaleString("fr-FR") + " réunions" : "Chaque réunion"} de commission ${chamberLabel === "Sénat" ? "du Sénat" : "de l'Assemblée nationale"}, analysées une par une à partir du compte rendu officiel.`}
          bullets={[
            "Ce qui a réellement été dit, réunion par réunion",
            "Positions défendues, orateur par orateur",
            "Chiffres avancés, datés de leur exercice",
            "Verbatim vérifié mot pour mot dans le compte rendu",
            "Suites annoncées : rapports, votes, saisines",
            "Recherche plein texte et export CSV",
          ]}
        />
      ) : (
      <>
      {/* Recherche plein texte */}
      <div className="relative mb-4">
        <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Chercher un sujet, une personne auditionnée, un chiffre…"
          className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-10 text-sm text-slate-900 outline-none transition focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-white"
        />
        {search && (
          <button onClick={() => setSearch("")} aria-label="Effacer la recherche"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={15} />
          </button>
        )}
      </div>

      {/* Filtre par commission */}
      {commissions.length > 0 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          <button onClick={() => setSelected(null)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${selected === null ? a.chip : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>
            Toutes
          </button>
          {commissions.slice(0, 10).map(c => (
            <button key={c.name} onClick={() => setSelected(c.name === selected ? null : c.name)}
              title={decode(c.name)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${selected === c.name ? a.chip : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"}`}>
              {shortCommission(c.name)} <span className="opacity-50">{c.count}</span>
            </button>
          ))}
        </div>
      )}

      {/* Bandeau d'accroche pour les non-Pro */}
      {!isPro && (
        <div className="mb-5 rounded-3xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-purple-50 p-5 dark:border-fuchsia-500/30 dark:from-fuchsia-500/10 dark:to-purple-500/10">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg">
              <Lock size={17} />
            </span>
            <p className="text-sm font-black leading-tight text-slate-900 dark:text-white">
              L&apos;analyse détaillée est réservée à l&apos;abonnement Pro
            </p>
          </div>
          <p className="mt-2.5 text-[13px] leading-snug text-slate-600 dark:text-slate-400">
            Le calendrier des réunions reste ouvert à tous. Positions défendues, chiffres avancés, verbatim et suites : côté Pro.
          </p>
          <Link href="/premium"
            className="mt-3 inline-flex rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition hover:brightness-110">
            Découvrir le Pro
          </Link>
        </div>
      )}

      {/* Liste */}
      {meetings === null ? (
        <div className="flex justify-center py-10"><Loader2 className={`animate-spin ${a.text}`} /></div>
      ) : meetings.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 py-12 text-center dark:border-slate-800">
          <CalendarDays size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">
            {debounced ? `Aucune réunion ne correspond à « ${debounced} ».` : "Aucune réunion indexée pour l'instant."}
          </p>
          {!debounced && (
            <p className="mx-auto mt-1 max-w-md text-[13px] text-slate-400">
              Les comptes rendus sont récupérés chaque nuit depuis les sources officielles.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {meetings.map(m => <MeetingCard key={m.ref} m={m} isPro={isPro} accent={a} />)}
          </div>
          {!exhausted && (
            <div className="mt-6 flex justify-center">
              <button onClick={loadMore} disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-400 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300">
                {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronDown size={14} />}
                Charger plus de réunions
              </button>
            </div>
          )}
        </>
      )}
      </>
      )}
    </div>
  );
}
