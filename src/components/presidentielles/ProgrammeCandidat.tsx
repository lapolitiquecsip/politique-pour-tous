"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, HelpCircle, ExternalLink, Globe2, GraduationCap, ShieldCheck, HeartPulse, Wheat, Leaf, Flag,
  TrendingUp, Landmark, FileText, Coins, Building2, Home, FlaskConical, Briefcase, PlayCircle, TrainFront, Palette, Scale, Mountain,
} from "lucide-react";
import MentionIA from "@/components/shared/MentionIA";

export type Proposition = { theme: string | null; subsection: string | null; text: string; source_url: string | null; explanation: string | null };
export type SourceProgramme = { source_url: string; titre: string | null; traite_le: string };

// Icône + couleur d'un thème de programme (différenciation visuelle).
export function themeStyle(name: string): { Icon: any; c: string; bg: string; dot: string } {
  const h = (name || "").toLowerCase();
  if (/immigr/.test(h)) return { Icon: Globe2, c: "text-amber-600 dark:text-amber-300", bg: "bg-amber-50 dark:bg-amber-500/10", dot: "bg-amber-500" };
  if (/éduc|educ|école|ecole/.test(h)) return { Icon: GraduationCap, c: "text-sky-600 dark:text-sky-300", bg: "bg-sky-50 dark:bg-sky-500/10", dot: "bg-sky-500" };
  if (/recherche|innovation/.test(h)) return { Icon: FlaskConical, c: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-50 dark:bg-cyan-500/10", dot: "bg-cyan-500" };
  if (/sécur|secur|justice|défense|defense/.test(h)) return { Icon: ShieldCheck, c: "text-rose-600 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10", dot: "bg-rose-500" };
  if (/santé|sante|retraite|protection sociale/.test(h)) return { Icon: HeartPulse, c: "text-pink-600 dark:text-pink-300", bg: "bg-pink-50 dark:bg-pink-500/10", dot: "bg-pink-500" };
  if (/agricult|rural/.test(h)) return { Icon: Wheat, c: "text-lime-700 dark:text-lime-300", bg: "bg-lime-50 dark:bg-lime-500/10", dot: "bg-lime-500" };
  if (/écolog|ecolog|énerg|energ|environ/.test(h)) return { Icon: Leaf, c: "text-emerald-600 dark:text-emerald-300", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500" };
  if (/europ|internation/.test(h)) return { Icon: Flag, c: "text-blue-600 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10", dot: "bg-blue-500" };
  if (/fiscal|impôt|impot/.test(h)) return { Icon: Coins, c: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-50 dark:bg-yellow-500/10", dot: "bg-yellow-500" };
  if (/dépenses|depenses|état|etat|collectivit/.test(h)) return { Icon: Building2, c: "text-slate-700 dark:text-slate-200", bg: "bg-slate-100 dark:bg-slate-500/10", dot: "bg-slate-500" };
  if (/logement/.test(h)) return { Icon: Home, c: "text-orange-700 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-500/10", dot: "bg-orange-500" };
  if (/transport|numérique|numerique|mobilit/.test(h)) return { Icon: TrainFront, c: "text-blue-700 dark:text-blue-300", bg: "bg-blue-50 dark:bg-blue-500/10", dot: "bg-blue-500" };
  if (/culture|sport|associati/.test(h)) return { Icon: Palette, c: "text-fuchsia-700 dark:text-fuchsia-300", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10", dot: "bg-fuchsia-500" };
  if (/égalité|egalite|discrimin|droits des femmes/.test(h)) return { Icon: Scale, c: "text-purple-700 dark:text-purple-300", bg: "bg-purple-50 dark:bg-purple-500/10", dot: "bg-purple-500" };
  if (/tourisme/.test(h)) return { Icon: Mountain, c: "text-green-700 dark:text-green-300", bg: "bg-green-50 dark:bg-green-500/10", dot: "bg-green-500" };
  if (/emploi|travail/.test(h)) return { Icon: Briefcase, c: "text-teal-700 dark:text-teal-300", bg: "bg-teal-50 dark:bg-teal-500/10", dot: "bg-teal-500" };
  if (/économ|econom|budget|ambition|prosp/.test(h)) return { Icon: TrendingUp, c: "text-violet-600 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/10", dot: "bg-violet-500" };
  if (/institution|destin|civique|démocr|democr|maître|maitre|renouveau/.test(h)) return { Icon: Landmark, c: "text-indigo-600 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-500/10", dot: "bg-indigo-500" };
  return { Icon: FileText, c: "text-muted-foreground", bg: "bg-muted", dot: "bg-slate-400" };
}

const estVideo = (u: string | null) => !!u && /youtube\.com|youtu\.be/.test(u);

// Intitulés des plans connus ; sinon, le dernier segment de l'adresse, remis en clair.
const PLANS_CONNUS: Record<string, string> = {
  esr: "Enseignement supérieur, recherche et formation continue",
  ruralite: "Ruralités",
  "btp-logement": "BTP et logement",
  automobile: "Automobile",
};
function nomDuPlan(u: string, sources: SourceProgramme[]): string {
  const s = sources.find(x => x.source_url === u);
  if (s?.titre) return s.titre;
  const segments = new URL(u).pathname.split("/").filter(Boolean);
  const dernier = segments[segments.length - 1] || "";
  const genre = segments.includes("plans-investissement") ? "Plan d'investissement" : segments.includes("plans-thematiques") ? "Plan thématique" : "";
  const nom = PLANS_CONNUS[dernier] ?? (dernier.replace(/[-_]+/g, " ").replace(/^./, c => c.toUpperCase()) || "Programme");
  return genre ? `${genre} · ${nom}` : nom;
}

/** Programme d'un candidat par thème (contexte + propositions + « ? »), avec sa source exacte. */
export default function ProgrammeCandidat({ proposals, sources = [], titre = "Son programme", nomCandidat }: {
  proposals: Proposition[]; sources?: SourceProgramme[]; titre?: string; nomCandidat?: string;
}) {
  const [openTheme, setOpenTheme] = useState<Set<string>>(new Set());
  const [openExpl, setOpenExpl] = useState<Set<string>>(new Set());
  const bascule = (set: Set<string>, k: string) => { const n = new Set(set); n.has(k) ? n.delete(k) : n.add(k); return n; };
  if (!proposals.length) return null;

  const groups: Record<string, { ctx: string | null; items: Proposition[] }> = {};
  for (const p of proposals) {
    const k = p.theme || "Propositions";
    (groups[k] ||= { ctx: null, items: [] });
    if (p.subsection === "__contexte__") groups[k].ctx = p.text; else groups[k].items.push(p);
  }
  const urls = [...new Set(proposals.map(p => p.source_url).filter(Boolean) as string[])];
  const libelleSource = (u: string) => {
    const s = sources.find(x => x.source_url === u);
    if (estVideo(u)) return `${s?.titre || "Présentation officielle"} — vidéo de la chaîne officielle${s ? `, analysée le ${new Date(s.traite_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}`;
    return "Programme officiel (site du mouvement)";
  };

  // Programme publié en plusieurs plans (J.-L. Mélenchon : 4 plans, 55 thèmes en octobre 2026) :
  // cinquante thèmes à plat se parcouraient sans fin. Les thèmes sont alors rangés sous leur
  // plan, replié : quelques lignes d'abord, les thèmes du plan ouvert ensuite.
  const parPlan = urls.length > 1 && Object.keys(groups).length > 12;
  const plans = parPlan ? urls.map(u => ({
    url: u, nom: nomDuPlan(u, sources),
    themes: [...new Set(proposals.filter(p => p.source_url === u).map(p => p.theme || "Propositions"))],
    n: proposals.filter(p => p.source_url === u && p.subsection !== "__contexte__").length,
  })) : [];
  const unTheme = (theme: string, g: { ctx: string | null; items: Proposition[] }) => {
    const { Icon, c, bg, dot } = themeStyle(theme);
    const isOpen = openTheme.has(theme);
    return (
      <div key={theme} className="overflow-hidden rounded-2xl border border-border">
        <button onClick={() => setOpenTheme(s => bascule(s, theme))} aria-expanded={isOpen}
          className={`flex w-full items-center gap-2.5 ${bg} px-4 py-3 text-left transition hover:brightness-95`}>
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-card ${c} shadow-sm`}><Icon size={16} /></span>{" "}
          {/* Intitulé long (titres de section d'un plan) : casse normale, sinon trois lignes en capitales. */}
          <p className={`min-w-0 font-black ${theme.length > 38 ? "text-[14px] leading-snug" : "text-sm uppercase tracking-widest"} ${c}`}>{theme}</p>{" "}
          <span className="shrink-0 whitespace-nowrap text-[10px] font-black text-muted-foreground">· {g.items.length}</span>{" "}
          <ChevronDown size={18} className={`ml-auto shrink-0 ${c} transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>{" "}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              {g.ctx && <p className="border-b border-border bg-muted px-4 py-3 text-sm italic leading-6 text-muted-foreground">💡 {g.ctx}</p>}{" "}
              <ul className="divide-y divide-slate-50 bg-card dark:divide-slate-800">
                {g.items.map((p, i) => {
                  const exKey = `${theme}#${i}`;
                  const exOpen = openExpl.has(exKey);
                  return (
                    <li key={i} className="px-4 py-2.5 text-sm leading-6 text-slate-700 dark:text-slate-200">
                      <div className="flex items-start gap-2.5">
                        <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />{" "}
                        <span className="flex-1">{p.text}</span>{" "}
                        {p.explanation && (
                          <button onClick={() => setOpenExpl(s => bascule(s, exKey))} title="Comprendre cette proposition"
                            className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${exOpen ? "border-violet-300 bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" : "border-violet-200 bg-card text-violet-500 hover:bg-violet-50 dark:border-violet-500/25"}`}>
                            <HelpCircle size={14} />
                          </button>
                        )}
                      </div>{" "}
                      <AnimatePresence initial={false}>
                        {exOpen && p.explanation && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <p className="ml-4 mt-2 rounded-xl border-l-2 border-violet-300 bg-violet-50/70 px-3 py-2.5 text-[13px] leading-6 text-muted-foreground dark:bg-violet-500/10">{p.explanation}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>{" "}
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>{" "}
      </div>
    );
  };

  return (
    <section className="mt-8">
      <h3 className="text-2xl font-staatliches uppercase text-foreground">{titre}</h3>{" "}
      <p className="mt-1 text-xs text-muted-foreground">
        Toutes {nomCandidat ? `les idées de ${nomCandidat}` : "ses idées"}, par {parPlan ? "plan puis par thème" : "thème"} — issues {urls.some(estVideo) && !urls.every(estVideo) ? "du programme officiel et de ses présentations" : urls.every(estVideo) ? "de sa présentation officielle" : "du programme officiel"}.
        Cliquez sur <HelpCircle size={12} className="inline -mt-0.5" /> pour comprendre pourquoi.
      </p>{" "}
      {parPlan ? (
        <div className="mt-4 space-y-3">
          {plans.map(pl => {
            const ouvert = openTheme.has(`plan:${pl.url}`);
            return (
              <div key={pl.url} className="overflow-hidden rounded-2xl border border-border bg-card">
                <button onClick={() => setOpenTheme(s => bascule(s, `plan:${pl.url}`))} aria-expanded={ouvert}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">{estVideo(pl.url) ? <PlayCircle size={17} /> : <FileText size={17} />}</span>{" "}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-snug text-foreground">{pl.nom}</span>{" "}
                    <span className="block text-[12px] font-bold text-muted-foreground">{pl.n} proposition{pl.n > 1 ? "s" : ""} · {pl.themes.length} thème{pl.themes.length > 1 ? "s" : ""}</span>
                  </span>{" "}
                  <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${ouvert ? "rotate-180" : ""}`} />
                </button>{" "}
                {ouvert && (
                  <div className="space-y-2.5 border-t border-border p-3">
                    {pl.themes.filter(t => groups[t]).map(t => unTheme(t, groups[t]))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {Object.entries(groups).map(([t, g]) => unTheme(t, g))}
        </div>
      )}{" "}
      <div className="mt-3 flex flex-col gap-1.5">
        {urls.map(u => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-700 hover:underline dark:text-blue-300">
            {estVideo(u) ? <PlayCircle size={12} /> : <ExternalLink size={12} />} {libelleSource(u)}{" "}
          </a>
        ))}
      </div>{" "}
      <MentionIA texte="Propositions restructurées par IA à partir des sources officielles citées (chiffres vérifiés contre le texte ou le discours) ; les explications « ? » sont rédigées par IA. Seule la source officielle fait foi." />
    </section>
  );
}
