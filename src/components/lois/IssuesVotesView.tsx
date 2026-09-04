"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { AN_GROUPS_ORDERED } from "@/lib/data/partyGroups";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

const MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juill.", "août", "sept.", "oct.", "nov.", "déc."];
const frDate = (d?: string | null) => { const m = String(d || "").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} ${MOIS[+m[2] - 1]} ${m[1]}` : ""; };
const cleanTitle = (t?: string | null, objet?: string | null) => {
  const base = (objet && objet.length > 8 ? objet : t) || "";
  return base.replace(/^l'ensemble (de |du |de la |des )?(la |le |les )?/i, "").replace(/^(projet|proposition) de loi\s*/i, "").trim().replace(/^\w/, c => c.toUpperCase());
};

type Vote = { id: string; title: string; objet: string; date: string; resultat: string; issues: string[]; groups: { po: string; pour: number; contre: number; abstention: number; total: number }[] };

// Position d'un groupe sur un vote : majorité pour / contre / abstention.
function groupPos(g?: { pour: number; contre: number; abstention: number; total: number }) {
  if (!g || !g.total) return null;
  if (g.pour > g.contre) return "pour" as const;
  if (g.contre > g.pour) return "contre" as const;
  return "abst" as const;
}
const POS_CLS = { pour: "bg-emerald-500 text-white", contre: "bg-rose-500 text-white", abst: "bg-slate-300 text-slate-600" };

// Vue ENJEUX : on entre par thème et on voit les VOTES CLÉS (votes solennels) + comment chaque
// groupe de l'Assemblée a voté. Inspiré de leurs-votes.fr, sur données officielles.
export default function IssuesVotesView() {
  const [votes, setVotes] = useState<Vote[] | null>(null);
  const [issues, setIssues] = useState<any[]>([]);
  const [sel, setSel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      const [v, i] = await Promise.all([api.getKeyVotes(), api.getIssues()]);
      if (active) { setVotes(v as Vote[]); setIssues(i as any[]); }
    })();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const v of votes || []) for (const iss of v.issues) m.set(iss, (m.get(iss) || 0) + 1);
    return m;
  }, [votes]);

  const activeIssues = useMemo(() => issues.filter(i => (counts.get(i.slug) || 0) >= 2), [issues, counts]);
  const current = sel || activeIssues[0]?.slug || null;
  const filtered = useMemo(() => (votes || []).filter(v => current && v.issues.includes(current)), [votes, current]);
  const currentIssue = activeIssues.find(i => i.slug === current);

  if (!votes) return <div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>;
  if (activeIssues.length === 0) return <div className="mt-8 rounded-2xl bg-slate-50 p-8 text-center text-slate-500">Les votes par enjeu seront disponibles très bientôt.</div>;

  return (
    <div className="mt-8">
      <div className="mb-2 text-4xl font-staatliches uppercase text-slate-900 md:text-6xl">Les votes par enjeu</div>
      <p className="mb-4 text-slate-500">Choisissez un thème : voyez les <b>votes clés</b> de l&apos;Assemblée et comment chaque groupe s&apos;est prononcé.</p>
      <a href="/vous-votez-comme-qui" className="mb-6 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-700">
        🗳️ Et vous, vous votez comme qui&nbsp;? Faites le test →
      </a>

      {/* Sélecteur d'enjeux */}
      <div className="flex flex-wrap gap-2">
        {activeIssues.map(i => {
          const on = i.slug === current;
          return (
            <button key={i.slug} onClick={() => setSel(i.slug)}
              className={`rounded-full px-4 py-2 text-sm font-black transition ${on ? "bg-slate-950 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400"}`}>
              {i.title} <span className={`ml-1 text-xs ${on ? "text-white/60" : "text-slate-400"}`}>{counts.get(i.slug)}</span>
            </button>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] font-black uppercase tracking-widest text-slate-500">
        <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded bg-emerald-500" /> A voté pour</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded bg-rose-500" /> A voté contre</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-4 rounded bg-slate-300" /> Abstention</span>
      </div>

      {currentIssue?.proposition && (
        <p className="mt-3 rounded-2xl border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm italic text-slate-600">
          Enjeu « {currentIssue.title} » — {currentIssue.proposition}.
        </p>
      )}

      {/* Liste des votes clés du thème */}
      <div className="mt-4 space-y-4">
        {filtered.map(v => {
          const adopted = /adopt/i.test(v.resultat || "");
          return (
            <div key={v.id} className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-400">{frDate(v.date)}</span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${adopted ? "bg-emerald-500 text-white" : "bg-slate-400 text-white"}`}>
                  {adopted ? <CheckCircle2 size={11} /> : <XCircle size={11} />}{adopted ? "Adopté" : "Rejeté"}
                </span>
              </div>
              <h3 className="mt-2 text-lg font-bold leading-snug text-slate-900">{cleanTitle(v.title, v.objet)}</h3>
              {/* Position de chaque groupe */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {AN_GROUPS_ORDERED.map(g => {
                  const pos = groupPos(v.groups.find(x => x.po === g.po));
                  if (!pos) return null;
                  return (
                    <span key={g.po} title={`${g.name} — ${pos === "pour" ? "pour" : pos === "contre" ? "contre" : "abstention"}`}
                      className={`inline-flex items-center rounded-lg px-2 py-1 text-[11px] font-black ${POS_CLS[pos]}`}>
                      {g.short}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-[11px] italic text-slate-400">
        Votes « sur l&apos;ensemble » d&apos;un texte à l&apos;Assemblée nationale (open data officiel), tagués par thème. Position = majorité du groupe sur le vote.
      </p>
    </div>
  );
}
