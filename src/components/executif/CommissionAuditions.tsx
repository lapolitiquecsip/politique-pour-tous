"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Lock, Sparkles, Mic, ChevronDown, Users } from "lucide-react";
import Link from "next/link";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

type Report = {
  ref: string; commission: string | null; title: string | null;
  meeting_date: string | null; cr_url: string | null; video_url: string | null; summary: string | null;
};

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

const NAMED: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", laquo: "«", raquo: "»", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", rsquo: "’", hellip: "…" };
// Décode les entités HTML restées brutes dans les données officielles (ex. « &#XA0; » = espace insécable).
function decode(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/ /g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// Extrait les personnes auditionnées/citées (« M./Mme Prénom Nom »), hors titres institutionnels génériques.
function extractPeople(title: string): string[] {
  const out: string[] = [];
  const re = /\b(M\.|Mme|Mlle|MM\.)\s+([A-ZÉÈÀÂÎÔ][\p{L}'’-]+(?:[-\s]+[A-ZÉÈÀÂÎÔ][\p{L}'’-]+)*)/gu;
  for (const m of title.matchAll(re)) {
    const name = m[2].trim();
    if (/^(le|la|les|Président|Rapporteur|Ministre)\b/i.test(name)) continue;
    const full = `${m[1]} ${name}`;
    if (!out.includes(full)) out.push(full);
  }
  return out.slice(0, 3);
}

// Titre court et explicite : décode, retire le charabia juridique et les clauses accessoires.
function cleanTitle(raw: string): string {
  let t = decode(raw).replace(/\s*;\s*/g, ", ");
  t = t.replace(/,?\s*en application de l['’]article[^,]*(?:du code[^,]*)?,?/gi, " ");
  t = t.replace(/,?\s*dont la nomination[^.]*/gi, "");
  t = t.replace(/,\s*(de|du|des|d['’])\s+(M\.|Mme|MM\.|Mlle)/g, " $1 $2");
  t = t.replace(/\s{2,}/g, " ").replace(/^[\s,]+/, "").replace(/[\s,]+$/, "").trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "Réunion de commission";
}

// Rend un résumé (contexte + puces « - ») en liste lisible.
function SummaryBody({ text }: { text: string }) {
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const intro = lines.find(l => !l.startsWith("-"));
  const bullets = lines.filter(l => l.startsWith("-")).map(l => l.replace(/^-\s*/, ""));
  return (
    <div className="space-y-2">
      {intro && <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{intro}</p>}
      {bullets.length > 0 && (
        <ul className="space-y-1.5">
          {bullets.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-300">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />{b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AuditionCard({ r, isPremium }: { r: Report; isPremium: boolean }) {
  const [open, setOpen] = useState(false);
  const commission = r.commission ? decode(r.commission) : "";
  const people = r.title ? extractPeople(decode(r.title)) : [];
  const title = r.title ? cleanTitle(r.title) : "Réunion de commission";
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all hover:border-emerald-300 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900">
      <button onClick={() => setOpen(o => !o)} className="flex w-full items-start gap-4 p-5 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15">
          <Mic size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{fmtDate(r.meeting_date)}{commission ? ` · ${commission}` : ""}</p>
          <p className="mt-1 text-sm font-bold leading-snug text-slate-900 dark:text-white line-clamp-2">{title}</p>
          {people.length > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              <Users size={12} className="shrink-0 text-emerald-500" />
              <span className="truncate">Avec {people.join(", ")}</span>
            </p>
          )}
        </div>
        <ChevronDown size={18} className={`mt-1 shrink-0 text-slate-300 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600">
            <Sparkles size={12} /> Résumé de l'audition
          </p>
          {isPremium ? (
            r.summary ? <SummaryBody text={r.summary} />
              : <p className="text-sm italic text-slate-400">Résumé en cours de génération…</p>
          ) : (
            // Aperçu flouté + invitation premium.
            <div className="relative">
              <div className="pointer-events-none select-none blur-[5px]">
                {r.summary ? <SummaryBody text={r.summary} /> : <p className="text-sm text-slate-500">Résumé détaillé de ce qui a été dit pendant l'audition…</p>}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
                <span className="flex items-center gap-1.5 rounded-full bg-amber-400/90 px-3 py-1 text-[11px] font-black uppercase tracking-widest text-slate-950"><Lock size={12} /> Réservé premium</span>
                <Link href="/premium" className="text-[11px] font-black uppercase tracking-widest text-amber-600 hover:underline">Débloquer les résumés →</Link>
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-wrap gap-3">
            {r.cr_url && <a href={r.cr_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600"><ExternalLink size={12} /> Compte rendu officiel</a>}
            {r.video_url && <a href={r.video_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600"><ExternalLink size={12} /> Vidéo</a>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CommissionAuditions() {
  const { isPremium } = usePremium();
  const [reports, setReports] = useState<Report[] | null>(null);

  useEffect(() => {
    let active = true;
    api.getCommissionReports(12).then(d => { if (active) setReports(d as Report[]); }).catch(() => setReports([]));
    return () => { active = false; };
  }, []);

  if (reports === null) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-500" /></div>;
  if (reports.length === 0) return null;

  return (
    <div className="mt-16">
      <div className="mb-6 flex items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-lg"><Mic size={22} /></span>
        <div>
          <h3 className="font-staatliches text-3xl uppercase tracking-tight text-slate-900 dark:text-white">Auditions de <span className="text-emerald-600">commission</span></h3>
          <p className="mt-0.5 text-sm text-slate-500">Ce qui a été dit lors des auditions, résumé par l'IA à partir du compte rendu officiel. <span className="font-bold text-amber-600">Résumés réservés aux membres premium.</span></p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {reports.map(r => <AuditionCard key={r.ref} r={r} isPremium={isPremium} />)}
      </div>
    </div>
  );
}
