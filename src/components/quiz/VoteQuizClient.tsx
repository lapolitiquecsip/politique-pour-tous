"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AN_GROUPS_ORDERED, type AnGroup } from "@/lib/data/partyGroups";
import { Loader2, CheckCircle2, XCircle, MinusCircle, RotateCcw, ChevronLeft } from "lucide-react";

type Choice = "pour" | "contre" | "abst";
type KeyVote = { id: string; title: string; objet: string; date: string; issues: string[]; groups: { po: string; pour: number; contre: number; abstention: number; total: number }[] };

const cleanTitle = (t?: string | null, objet?: string | null) => {
  const base = (objet && objet.length > 8 ? objet : t) || "";
  return base.replace(/^l'ensemble (de |du |de la |des )?(la |le |les )?/i, "").replace(/^(projet|proposition) de loi\s*/i, "").trim().replace(/^\w/, c => c.toUpperCase());
};
// Position majoritaire d'un groupe sur un vote.
function groupPos(g?: { pour: number; contre: number; abstention: number; total: number }): Choice | null {
  if (!g || !g.total) return null;
  if (g.pour > g.contre) return "pour";
  if (g.contre > g.pour) return "contre";
  return "abst";
}

// Sélectionne ~N votes CLIVANTS (les groupes se divisent) et variés (max 2 par thème) : ce sont
// ceux qui discriminent le mieux les positions de l'utilisateur.
function pickQuizVotes(votes: KeyVote[], n = 15): KeyVote[] {
  const scored = votes.map(v => {
    const pos = AN_GROUPS_ORDERED.map(g => groupPos(v.groups.find(x => x.po === g.po))).filter(Boolean) as Choice[];
    const pour = pos.filter(p => p === "pour").length, contre = pos.filter(p => p === "contre").length;
    return { v, split: Math.min(pour, contre), covered: pos.length };
  }).filter(s => s.split >= 2 && s.covered >= 6);
  scored.sort((a, b) => b.split - a.split || b.v.date.localeCompare(a.v.date));
  const out: KeyVote[] = [], perIssue: Record<string, number> = {};
  for (const s of scored) {
    const iss = s.v.issues[0] || "_";
    if ((perIssue[iss] || 0) >= 2) continue;
    perIssue[iss] = (perIssue[iss] || 0) + 1;
    out.push(s.v);
    if (out.length >= n) break;
  }
  return out;
}

export default function VoteQuizClient() {
  const [all, setAll] = useState<KeyVote[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, Choice>>({});
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let active = true;
    api.getKeyVotes().then(v => { if (active) setAll(v as KeyVote[]); }).catch(() => setAll([]));
    return () => { active = false; };
  }, []);

  const quiz = useMemo(() => (all ? pickQuizVotes(all) : []), [all]);
  const current = quiz[step];

  // Résultat : % d'accord avec chaque groupe sur les votes RÉPONDUS (hors « passer »).
  const results = useMemo(() => {
    const answered = quiz.filter(v => answers[v.id]);
    if (!answered.length) return [];
    return AN_GROUPS_ORDERED.map((g: AnGroup) => {
      let match = 0, total = 0;
      for (const v of answered) {
        const gp = groupPos(v.groups.find(x => x.po === g.po));
        if (!gp) continue;
        total++; if (gp === answers[v.id]) match++;
      }
      return { g, pct: total ? Math.round((match / total) * 100) : 0, total };
    }).filter(r => r.total >= 3).sort((a, b) => b.pct - a.pct);
  }, [answers, quiz]);

  function answer(c: Choice) {
    setAnswers(a => ({ ...a, [current.id]: c }));
    if (step + 1 >= quiz.length) setDone(true); else setStep(step + 1);
  }
  function reset() { setAnswers({}); setStep(0); setDone(false); }

  if (!all) return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-red-600" /></div>;
  if (quiz.length === 0) return <div className="py-24 text-center text-slate-500">Le test sera disponible très bientôt.</div>;

  // ── Écran RÉSULTAT ──
  if (done) {
    const top = results[0];
    return (
      <div className="mx-auto max-w-2xl px-4 pb-24">
        <p className="text-center text-sm font-black uppercase tracking-widest text-slate-400">Votre résultat</p>
        {top && (
          <div className="mt-3 rounded-3xl p-8 text-center text-white shadow-xl" style={{ background: top.g.color }}>
            <p className="text-sm font-bold opacity-80">Le groupe le plus proche de vous</p>
            <h2 className="mt-1 font-staatliches text-4xl uppercase leading-none">{top.g.name}</h2>
            <p className="mt-3 text-5xl font-black">{top.pct}%</p>
            <p className="text-sm font-bold opacity-80">d&apos;accord sur {top.total} votes</p>
          </div>
        )}
        <div className="mt-6 space-y-2">
          {results.map(r => (
            <div key={r.g.po} className="flex items-center gap-3">
              <span className="w-14 shrink-0 text-sm font-black" style={{ color: r.g.color }}>{r.g.short}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <span className="block h-full rounded-full" style={{ width: `${r.pct}%`, background: r.g.color }} />
              </div>
              <span className="w-10 shrink-0 text-right text-sm font-black tabular-nums text-slate-700">{r.pct}%</span>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 font-black text-white transition hover:bg-slate-700"><RotateCcw size={16} /> Refaire le test</button>
          <Link href="/lois" className="inline-flex items-center gap-2 rounded-full border border-slate-300 px-6 py-3 font-black text-slate-700 transition hover:border-slate-500">Voir les votes par enjeu</Link>
        </div>
        <p className="mt-6 text-center text-[11px] italic text-slate-400">Basé sur de vrais votes solennels de l&apos;Assemblée nationale (open data officiel). Proximité = part des votes où votre choix rejoint la position majoritaire du groupe.</p>
      </div>
    );
  }

  // ── Écran QUESTION ──
  return (
    <div className="mx-auto max-w-2xl px-4 pb-24">
      <div className="mb-6">
        <div className="flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-400">
          <span>Question {step + 1} / {quiz.length}</span>
          {step > 0 && <button onClick={() => setStep(step - 1)} className="inline-flex items-center gap-1 hover:text-slate-700"><ChevronLeft size={13} /> Précédent</button>}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <span className="block h-full rounded-full bg-red-600 transition-all" style={{ width: `${((step) / quiz.length) * 100}%` }} />
        </div>
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Un vote réel à l&apos;Assemblée</p>
        <h2 className="mt-2 text-2xl font-bold leading-snug text-slate-900">{cleanTitle(current.title, current.objet)}</h2>
        <p className="mt-6 text-sm font-bold text-slate-500">Vous auriez voté…</p>
        <div className="mt-3 grid gap-3">
          <button onClick={() => answer("pour")} className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-5 py-4 text-lg font-black text-white transition hover:bg-emerald-600"><CheckCircle2 size={20} /> Pour</button>
          <button onClick={() => answer("contre")} className="flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-5 py-4 text-lg font-black text-white transition hover:bg-rose-600"><XCircle size={20} /> Contre</button>
          <button onClick={() => answer("abst")} className="flex items-center justify-center gap-2 rounded-2xl bg-slate-200 px-5 py-3 text-sm font-black text-slate-600 transition hover:bg-slate-300"><MinusCircle size={18} /> Sans opinion / passer</button>
        </div>
      </div>
    </div>
  );
}
