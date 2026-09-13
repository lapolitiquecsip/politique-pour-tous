"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Loader2, Lock, Radio, Download, ChevronDown, TrendingUp, TrendingDown,
  AlertTriangle, ExternalLink, Minus, Eye, Users2,
} from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";
import {
  computeMetrics, sumMetric, compact, signed, PLATFORM_META,
  type Metrics, type SocialAccount, type Snapshot,
} from "@/lib/socialStats";

type Candidate = {
  id: string;
  slug: string;
  full_name: string;
  party: string | null;
  photo_url: string | null;
};

type Scope = "all" | "official" | "support";
type Period = 7 | 30;

/* ── Courbe d'audience minimaliste, tracée à partir des relevés bruts ── */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return <div className="h-8 w-24" />;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const d = points
    .map((v, i) => `${(i / (points.length - 1)) * 96},${32 - ((v - min) / span) * 28 - 2}`)
    .join(" ");
  return (
    <svg viewBox="0 0 96 32" className="h-8 w-24 overflow-visible" aria-hidden>
      <polyline points={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── Flèche de tendance ── */
function Trend({ value }: { value: number | null }) {
  if (value == null) return <span className="text-slate-300"><Minus size={14} /></span>;
  if (value > 0) return <span className="flex items-center gap-1 text-emerald-600"><TrendingUp size={14} /> {signed(value)}</span>;
  if (value < 0) return <span className="flex items-center gap-1 text-rose-600"><TrendingDown size={14} /> {signed(value)}</span>;
  return <span className="flex items-center gap-1 text-slate-400"><Minus size={14} /> 0</span>;
}

/* ── Chiffre masqué pour les non-Pro ── */
function Masked({ children, isPro }: { children: React.ReactNode; isPro: boolean }) {
  if (isPro) return <>{children}</>;
  return <span className="select-none blur-[5px]" aria-hidden>{children}</span>;
}

/* ── Détail par plateforme ── */
function AccountRow({ m, period, isPro }: { m: Metrics; period: Period; isPro: boolean }) {
  const meta = PLATFORM_META[m.account.platform];
  const views = period === 7 ? m.views7 : m.views30;
  const delta = period === 7 ? m.followersDelta7 : m.followersDelta30;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 py-3 dark:border-slate-800">
      <span className="flex items-center gap-2 min-w-[150px]">
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: meta.color }} />
        <span className="text-[13px] font-bold text-slate-900 dark:text-white">{meta.label}</span>
        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${m.account.kind === "official" ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"}`}>
          {m.account.kind === "official" ? "Officiel" : "Soutien"}
        </span>
      </span>

      <span className="min-w-0 flex-1 truncate text-[12px] text-slate-400">
        {m.account.url
          ? <a href={m.account.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-slate-600 hover:underline">{m.account.handle} <ExternalLink size={10} /></a>
          : m.account.handle}
        {m.account.label && <span className="ml-2 italic">{m.account.label}</span>}
      </span>

      {m.status === "unavailable" ? (
        <span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <AlertTriangle size={12} /> Source indisponible
        </span>
      ) : (
        <>
          <span className="w-[104px] text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-200">
            <Masked isPro={isPro}>{compact(m.followers)}</Masked> <span className="text-[10px] text-slate-400">abonnés</span>
          </span>
          <span className="w-[92px] text-right text-[12px] tabular-nums">
            <Masked isPro={isPro}><Trend value={delta} /></Masked>
          </span>
          <span className="w-[104px] text-right text-[13px] tabular-nums text-slate-700 dark:text-slate-200">
            {meta.hasViews
              ? <><Masked isPro={isPro}>{compact(views)}</Masked> <span className="text-[10px] text-slate-400">vues</span></>
              : <span className="text-[11px] text-slate-300">pas de vues publiques</span>}
          </span>
          {m.status === "stale" && (
            <span title={`Dernier relevé il y a ${m.staleDays} jours`} className="text-[10px] font-black uppercase tracking-wider text-amber-500">
              périmé
            </span>
          )}
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════ Composant ═══════════════════════════════ */
export default function CandidateSocialTracker({ candidates }: { candidates: Candidate[] }) {
  const { isPro } = usePremium();
  const [accounts, setAccounts] = useState<SocialAccount[] | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [period, setPeriod] = useState<Period>(7);
  const [scope, setScope] = useState<Scope>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const accs = await api.getCandidateSocialAccounts() as SocialAccount[];
      if (!active) return;
      setAccounts(accs);
      if (!accs.length) return;
      const snaps = await api.getCandidateSocialSnapshots(accs.map(a => a.id), 40) as Snapshot[];
      if (active) setSnapshots(snaps);
    })().catch(() => { if (active) setAccounts([]); });
    return () => { active = false; };
  }, []);

  /** Un bloc par candidat, trié par vues gagnées sur la période. */
  const rows = useMemo(() => {
    if (!accounts?.length) return [];
    const kept = accounts.filter(a => scope === "all" || a.kind === scope);
    const byCandidate = new Map<string, Metrics[]>();
    for (const acc of kept) {
      const list = byCandidate.get(acc.candidate_id) ?? [];
      list.push(computeMetrics(acc, snapshots));
      byCandidate.set(acc.candidate_id, list);
    }

    return candidates
      .map(c => {
        const metrics = byCandidate.get(c.id) ?? [];
        if (!metrics.length) return null;
        const viewsKey = period === 7 ? "views7" : "views30";
        // Série d'audience cumulée, pour la courbe.
        const byDate = new Map<string, number>();
        for (const m of metrics) {
          for (const s of snapshots) {
            if (s.account_id !== m.account.id || s.followers == null) continue;
            byDate.set(s.captured_on, (byDate.get(s.captured_on) ?? 0) + s.followers);
          }
        }
        const spark = [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(e => e[1]);
        return {
          candidate: c,
          metrics: metrics.sort((a, b) => (b.followers ?? 0) - (a.followers ?? 0)),
          followers: sumMetric(metrics, "followers"),
          views: sumMetric(metrics, viewsKey as "views7" | "views30"),
          growth: sumMetric(metrics, "followersDelta30"),
          spark,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => (b.views ?? -1) - (a.views ?? -1) || (b.followers ?? 0) - (a.followers ?? 0));
  }, [accounts, snapshots, candidates, scope, period]);

  const exportCsv = () => {
    if (!rows.length) return;
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const head = ["Candidat", "Parti", "Plateforme", "Compte", "Type", "Abonnés", `Abonnés +/- ${period}j`, `Vues ${period}j`, "Statut", "Dernier relevé"];
    const lines: string[] = [];
    for (const r of rows) {
      for (const m of r.metrics) {
        lines.push([
          r.candidate.full_name, r.candidate.party ?? "",
          PLATFORM_META[m.account.platform].label, m.account.handle,
          m.account.kind === "official" ? "Officiel" : "Soutien",
          m.followers ?? "", period === 7 ? m.followersDelta7 ?? "" : m.followersDelta30 ?? "",
          period === 7 ? m.views7 ?? "" : m.views30 ?? "",
          m.status, m.latest?.captured_on ?? "",
        ].map(esc).join(";"));
      }
    }
    const blob = new Blob(["﻿" + [head.map(esc).join(";"), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `veille-reseaux-candidats-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div id="veille" className="mx-auto max-w-6xl scroll-mt-24 px-4 pb-24">
      {/* En-tête */}
      <div className="mb-6 flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg">
          <Radio size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-staatliches text-3xl uppercase tracking-tight text-slate-900">
              Dynamiques <span className="text-fuchsia-600">réseaux sociaux</span>
            </h2>
            <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white shadow">Pro</span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Comptes personnels et comptes de soutien de chaque candidat. Audience, vues gagnées sur la période, tendances comparées.
          </p>
        </div>
        {isPro && rows.length > 0 && (
          <button onClick={exportCsv}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-slate-600 transition hover:border-slate-400">
            <Download size={13} /> Export CSV
          </button>
        )}
      </div>

      {/* Réglages */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {([[7, "7 jours"], [30, "30 jours"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${period === v ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="inline-flex rounded-full border border-slate-200 bg-white p-1">
          {([["all", "Tous les comptes"], ["official", "Officiels"], ["support", "Soutien"]] as const).map(([v, label]) => (
            <button key={v} onClick={() => setScope(v)}
              className={`rounded-full px-4 py-1.5 text-[11px] font-black uppercase tracking-widest transition ${scope === v ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Accroche non-Pro */}
      {!isPro && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-3xl border border-fuchsia-200 bg-gradient-to-r from-fuchsia-50 to-purple-50 p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg">
            <Lock size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-slate-900">Les chiffres sont réservés à l&apos;abonnement Pro</p>
            <p className="text-[13px] text-slate-600">
              Vous voyez quels comptes sont suivis. Audience, vues par semaine et tendances : côté Pro.
            </p>
          </div>
          <Link href="/premium"
            className="shrink-0 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2.5 text-[11px] font-black uppercase tracking-widest text-white shadow-lg transition hover:brightness-110">
            Découvrir le Pro
          </Link>
        </div>
      )}

      {/* Contenu */}
      {accounts === null ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-fuchsia-500" /></div>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 py-14 text-center">
          <Radio size={28} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-bold text-slate-500">Aucun compte suivi pour l&apos;instant.</p>
          <p className="mx-auto mt-1 max-w-lg text-[13px] text-slate-400">
            Les comptes des candidats sont renseignés puis relevés chaque nuit. Les tendances apparaissent
            dès qu&apos;au moins deux relevés existent.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, rank) => {
            const open = openId === r.candidate.id;
            return (
              <div key={r.candidate.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all hover:border-fuchsia-300 hover:shadow-lg">
                <button onClick={() => setOpenId(open ? null : r.candidate.id)} aria-expanded={open}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-3 p-4 text-left sm:flex-nowrap">
                  <span className="w-6 shrink-0 text-center font-staatliches text-xl text-slate-300">{rank + 1}</span>

                  {r.candidate.photo_url
                    ? <img src={r.candidate.photo_url} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
                    : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-black text-slate-400">{r.candidate.full_name.charAt(0)}</span>}

                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-black text-slate-900">{r.candidate.full_name}</span>
                    <span className="block truncate text-[11px] text-slate-400">
                      {r.candidate.party} · {r.metrics.length} compte{r.metrics.length > 1 ? "s" : ""} suivi{r.metrics.length > 1 ? "s" : ""}
                    </span>
                  </span>

                  <span className="hidden sm:block"><Sparkline points={r.spark} color="#c026d3" /></span>

                  <span className="w-[96px] shrink-0 text-right">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Audience</span>
                    <span className="flex items-center justify-end gap-1 text-sm font-black tabular-nums text-slate-900">
                      <Users2 size={12} className="text-slate-300" /><Masked isPro={isPro}>{compact(r.followers)}</Masked>
                    </span>
                  </span>

                  <span className="w-[104px] shrink-0 text-right">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Vues {period} j</span>
                    <span className="flex items-center justify-end gap-1 text-sm font-black tabular-nums text-fuchsia-600">
                      <Eye size={12} className="text-fuchsia-300" /><Masked isPro={isPro}>{compact(r.views)}</Masked>
                    </span>
                  </span>

                  <ChevronDown size={18} className={`shrink-0 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} />
                </button>

                {open && (
                  <div className="px-4 pb-4">
                    {r.metrics.map(m => <AccountRow key={m.account.id} m={m} period={period} isPro={isPro} />)}
                    {!isPro && (
                      <div className="mt-4 text-center">
                        <Link href="/premium" className="text-[11px] font-black uppercase tracking-widest text-fuchsia-600 hover:underline">
                          Débloquer les chiffres avec l&apos;abonnement Pro →
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <p className="pt-3 text-center text-[11px] italic text-slate-400">
            Relevés quotidiens. Les vues correspondent aux vues réellement gagnées sur la période, mesurées entre deux relevés.
            Un compte marqué « source indisponible » n&apos;affiche aucun chiffre plutôt qu&apos;un chiffre périmé.
          </p>
        </div>
      )}
    </div>
  );
}
