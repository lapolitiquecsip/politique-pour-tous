"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { Globe2, GraduationCap, ShieldCheck, HeartPulse, Wheat, Leaf, Flag, TrendingUp, Landmark, FileText, HelpCircle, ExternalLink, Loader2 } from "lucide-react";

// Style (icône + couleurs) par thème du programme. Partagé entre la fiche candidat et la fiche parti.
export function themeStyle(name: string): { Icon: any; c: string; bg: string; dot: string } {
  const h = (name || "").toLowerCase();
  if (/immigr/.test(h)) return { Icon: Globe2, c: "text-amber-600", bg: "bg-amber-50", dot: "bg-amber-500" };
  if (/éduc|educ|école|ecole/.test(h)) return { Icon: GraduationCap, c: "text-sky-600", bg: "bg-sky-50", dot: "bg-sky-500" };
  if (/sécur|secur|justice/.test(h)) return { Icon: ShieldCheck, c: "text-rose-600", bg: "bg-rose-50", dot: "bg-rose-500" };
  if (/santé|sante/.test(h)) return { Icon: HeartPulse, c: "text-pink-600", bg: "bg-pink-50", dot: "bg-pink-500" };
  if (/agricult|rural/.test(h)) return { Icon: Wheat, c: "text-lime-700", bg: "bg-lime-50", dot: "bg-lime-500" };
  if (/écolog|ecolog|énerg|energ|environ/.test(h)) return { Icon: Leaf, c: "text-emerald-600", bg: "bg-emerald-50", dot: "bg-emerald-500" };
  if (/europ|internation/.test(h)) return { Icon: Flag, c: "text-blue-600", bg: "bg-blue-50", dot: "bg-blue-500" };
  if (/économ|econom|ambition|prosp|emploi|travail/.test(h)) return { Icon: TrendingUp, c: "text-violet-600", bg: "bg-violet-50", dot: "bg-violet-500" };
  if (/institution|destin|civique|démocr|democr|maître|maitre|renouveau/.test(h)) return { Icon: Landmark, c: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-500" };
  return { Icon: FileText, c: "text-slate-600", bg: "bg-slate-50", dot: "bg-slate-400" };
}

// Programme d'un candidat, groupé par thème, avec le contexte « ? » par thème et l'explication
// « ? » par proposition. Rendu null si le candidat n'a pas de programme scrapé. Auto-chargé.
export default function CandidateProgram({ candidateId, title = true, heading, className = "", emptyMessage }: { candidateId: string; title?: boolean; heading?: string; className?: string; emptyMessage?: string }) {
  const [proposals, setProposals] = useState<any[] | null>(null);
  const [openContext, setOpenContext] = useState<Set<string>>(new Set());
  const [openExpl, setOpenExpl] = useState<Set<string>>(new Set());
  const toggleContext = (k: string) => setOpenContext(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const toggleExpl = (k: string) => setOpenExpl(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });

  useEffect(() => {
    let active = true;
    api.getCandidateProposals(candidateId).then(r => { if (active) setProposals(r as any[]); }).catch(() => { if (active) setProposals([]); });
    return () => { active = false; };
  }, [candidateId]);

  if (proposals === null) return <div className="flex justify-center py-8"><Loader2 className="animate-spin text-slate-400" size={22} /></div>;
  if (proposals.length === 0) return emptyMessage ? <p className="py-4 text-center text-sm italic text-slate-400">{emptyMessage}</p> : null;

  const groups: Record<string, { ctx: string | null; items: any[] }> = {};
  for (const p of proposals) {
    const k = p.theme || "Propositions";
    (groups[k] ||= { ctx: null, items: [] });
    if (p.subsection === "__contexte__") groups[k].ctx = p.text; else groups[k].items.push(p);
  }
  const src = proposals.find(p => p.source_url)?.source_url;

  return (
    <div className={className}>
      {heading && <h3 className="mb-1 text-2xl font-staatliches uppercase text-slate-950">{heading}</h3>}
      {title && <p className="mb-3 text-xs text-slate-500">Toutes ses idées, par thème — issues du programme officiel. Cliquez sur <HelpCircle size={12} className="inline -mt-0.5" /> pour comprendre pourquoi.</p>}
      <div className="space-y-4">
        {Object.entries(groups).map(([theme, g]) => {
          const { Icon, c, bg, dot } = themeStyle(theme);
          const ctxOpen = openContext.has(theme);
          return (
            <div key={theme} className="overflow-hidden rounded-2xl border border-slate-200">
              <div className={`flex items-center gap-2.5 ${bg} px-4 py-3`}>
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white ${c} shadow-sm`}><Icon size={16} /></span>
                <p className={`text-sm font-black uppercase tracking-widest ${c}`}>{theme}</p>
                <span className="text-[10px] font-black text-slate-400">· {g.items.length}</span>
                {g.ctx && (
                  <button onClick={() => toggleContext(theme)} title="Pourquoi ?"
                    className={`ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white ${c} shadow-sm transition ${ctxOpen ? "ring-2 ring-current" : ""}`}>
                    <HelpCircle size={15} />
                  </button>
                )}
              </div>
              <AnimatePresence initial={false}>
                {ctxOpen && g.ctx && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <p className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm italic leading-6 text-slate-600">💡 {g.ctx}</p>
                  </motion.div>
                )}
              </AnimatePresence>
              <ul className="divide-y divide-slate-50 bg-white">
                {g.items.map((p, i) => {
                  const exKey = `${theme}#${i}`;
                  const exOpen = openExpl.has(exKey);
                  return (
                    <li key={i} className="px-4 py-2.5 text-sm leading-6 text-slate-700">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
                        <span className="flex-1">{p.text}</span>
                        {p.explanation && (
                          <button onClick={() => toggleExpl(exKey)} title="Comprendre cette proposition"
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${exOpen ? "border-violet-300 bg-violet-100 text-violet-700" : "border-violet-200 bg-white text-violet-500 hover:bg-violet-50"}`}>
                            <HelpCircle size={14} />
                          </button>
                        )}
                      </div>
                      <AnimatePresence initial={false}>
                        {exOpen && p.explanation && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <p className="ml-4 mt-2 rounded-xl border-l-2 border-violet-300 bg-violet-50/70 px-3 py-2.5 text-[13px] leading-6 text-slate-600">{p.explanation}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      {src && <a href={src} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-700 hover:underline"><ExternalLink size={12} /> Programme officiel</a>}
    </div>
  );
}
