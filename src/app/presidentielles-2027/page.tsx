"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, Loader2, X, CalendarDays, ExternalLink, Briefcase, GraduationCap, Users, ShieldCheck, Landmark, ArrowRight, Vote, ChevronDown, Globe2, HeartPulse, Wheat, Leaf, Flag, TrendingUp, HelpCircle, FileText } from "lucide-react";
import { api } from "@/lib/api";
import VideoFeed from "@/components/executif/VideoFeed";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import ThemesView from "@/components/presidentielles/ThemesView";

type Candidate = {
  id: string;
  slug: string;
  full_name: string;
  party: string | null;
  political_side: string | null;
  category: string | null;
  declared_at: string | null;
  photo_url: string | null;
  summary: string | null;
  bio: Record<string, any> | null;
  program: string | null;
  source_urls: string[] | null;
  legal_issues: string | null;
};

// Couleurs par bord politique — dans l'esprit coloré du site.
const SIDES: Record<string, { label: string; from: string; to: string; badge: string; borderb: string }> = {
  "extreme-gauche": { label: "Extrême gauche", from: "from-rose-500", to: "to-red-600", badge: "bg-red-600", borderb: "border-red-700" },
  gauche: { label: "Gauche", from: "from-pink-500", to: "to-rose-600", badge: "bg-rose-600", borderb: "border-rose-700" },
  centre: { label: "Centre", from: "from-amber-400", to: "to-orange-500", badge: "bg-orange-500", borderb: "border-orange-600" },
  droite: { label: "Droite", from: "from-sky-500", to: "to-blue-600", badge: "bg-blue-600", borderb: "border-blue-700" },
  "extreme-droite": { label: "Extrême droite", from: "from-indigo-500", to: "to-violet-700", badge: "bg-indigo-600", borderb: "border-indigo-700" },
  autre: { label: "Autre", from: "from-slate-500", to: "to-slate-700", badge: "bg-slate-600", borderb: "border-slate-700" },
};

function sideOf(c: Candidate) {
  return SIDES[(c.political_side || "autre").toLowerCase()] || SIDES.autre;
}

const BIO_FIELDS: Array<[string, string]> = [
  ["famille", "Famille"],
  ["parents", "Parents"],
  ["etudes", "Études"],
  ["parcours", "Parcours politique"],
  ["jobs", "Métiers & jobs"],
  ["passions", "Passions & hobbies"],
  ["positions", "Positions"],
  ["faits_marquants", "Faits marquants"],
  ["realisations", "Réalisations concrètes"],
  ["publications", "Publications & écrits"],
  ["controverses", "Controverses"],
  ["chronologie", "Chronologie"],
];

// Couleur d'accent par rubrique (classes explicites pour ne pas être purgées).
const FIELD_COLORS: Record<string, { head: string; bar: string }> = {
  famille: { head: "text-rose-600", bar: "bg-rose-500" },
  parents: { head: "text-amber-600", bar: "bg-amber-500" },
  etudes: { head: "text-blue-600", bar: "bg-blue-500" },
  parcours: { head: "text-violet-600", bar: "bg-violet-500" },
  jobs: { head: "text-cyan-600", bar: "bg-cyan-500" },
  passions: { head: "text-fuchsia-600", bar: "bg-fuchsia-500" },
  positions: { head: "text-emerald-600", bar: "bg-emerald-500" },
  faits_marquants: { head: "text-yellow-600", bar: "bg-yellow-500" },
  realisations: { head: "text-teal-600", bar: "bg-teal-500" },
  publications: { head: "text-red-600", bar: "bg-red-500" },
  controverses: { head: "text-slate-700", bar: "bg-slate-600" },
  chronologie: { head: "text-indigo-600", bar: "bg-indigo-500" },
};

function toPoints(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

// Souligne au « feutre rouge » (trait droit, épais) UNIQUEMENT les chiffres
// importants : pourcentages et montants (pas les simples années).
const NUM_RE = /(\d+(?:[.,]\d+)?\s?%|\d[\d .]*\s?(?:€|milliards?|millions?|Md€|M€))/gi;
function NumHighlight({ text }: { text: string }) {
  const parts = text.split(NUM_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1
          ? <span key={i} className="font-bold text-slate-900 underline decoration-red-500 decoration-solid decoration-[3px] underline-offset-[3px]">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// Frise chronologique HORIZONTALE (scroll latéral) pour ne pas allonger la page.
function Timeline({ points }: { points: string[] }) {
  return (
    <div className="mt-4 flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">
      {points.map((p, i) => {
        const idx = p.indexOf(" : ");
        const date = idx > 0 ? p.slice(0, idx) : "";
        const desc = idx > 0 ? p.slice(idx + 3) : p;
        return (
          <div key={i} className="relative w-[220px] shrink-0 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <div className="mb-2 h-1 w-8 rounded-full bg-red-500" />
            {date && <p className="font-staatliches text-2xl uppercase leading-none text-red-600">{date}</p>}
            <p className="mt-2 text-sm leading-6 text-slate-700"><NumHighlight text={desc} /></p>
          </div>
        );
      })}
    </div>
  );
}

function computeAge(date?: string): number | null {
  if (!date) return null;
  const year = Number(date.slice(0, 4));
  if (!year || year < 1900) return null;
  const birth = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(date) : new Date(year, 0, 1);
  const diff = Date.now() - birth.getTime();
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000));
}

// Vignettes de faits-clés illustrées (âge, naissance+drapeau, parti, profession…).
function Chip({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-bold text-slate-700">{children}</span>;
}

function FactChips({ candidate }: { candidate: Candidate }) {
  const bio = candidate.bio;
  const n = bio?.naissance;
  const age = computeAge(n?.date);
  const side = sideOf(candidate);
  const chips: React.ReactNode[] = [];

  if (age !== null) chips.push(<Chip key="age"><span className="font-black text-slate-900 underline decoration-red-500 decoration-solid decoration-[3px] underline-offset-[3px]">{age}</span> ans</Chip>);
  if (n?.ville) chips.push(<Chip key="lieu">{n.pays_code && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://flagcdn.com/${String(n.pays_code).toLowerCase()}.svg`} alt={n.pays || ""} className="h-4 w-6 rounded-sm object-cover shadow-sm" />
  )}Né·e à {n.ville}{n.pays ? `, ${n.pays}` : ""}</Chip>);
  if (candidate.party) chips.push(<Chip key="parti"><span className={`h-2.5 w-2.5 rounded-full ${side.badge}`} />{candidate.party}</Chip>);
  if (bio?.profession) chips.push(<Chip key="prof"><Briefcase size={15} className="text-slate-400" />{bio.profession}</Chip>);
  if (bio?.formation) chips.push(<Chip key="form"><GraduationCap size={16} className="text-slate-400" />{bio.formation}</Chip>);
  if (bio?.enfants) chips.push(<Chip key="enf"><Users size={15} className="text-slate-400" />{bio.enfants}</Chip>);

  if (chips.length === 0) return null;
  return <div className="mb-6 flex flex-wrap gap-2">{chips}</div>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function CandidateAvatar({ c, className }: { c: Candidate; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !c.photo_url) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br ${sideOf(c).from} ${sideOf(c).to} font-black text-white ${className}`}>
        {initials(c.full_name)}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={c.photo_url} alt={c.full_name} onError={() => setFailed(true)} className={`object-cover object-center ${className}`} />;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

// Icône + couleur d'un thème de programme (différenciation visuelle).
function themeStyle(name: string): { Icon: any; c: string; bg: string; dot: string } {
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

function CandidateModal({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const side = sideOf(candidate);
  const [news, setNews] = useState<any[] | null>(null);
  const [proposals, setProposals] = useState<any[]>([]);
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set());   // panneaux bio dépliés
  const togglePanel = (k: string) => setOpenPanels(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [openContext, setOpenContext] = useState<Set<string>>(new Set());  // « ? » contexte par thème
  const toggleContext = (k: string) => setOpenContext(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [openExpl, setOpenExpl] = useState<Set<string>>(new Set());         // « ? » explication par proposition
  const toggleExpl = (k: string) => setOpenExpl(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [showLegal, setShowLegal] = useState(false);
  const [mandate, setMandate] = useState<{ type: string; slug: string } | null>(null);
  const [partyLink, setPartyLink] = useState<{ slug: string; name: string } | null>(null);
  useEffect(() => {
    let active = true;
    api.getCandidateNews(candidate.id).then(rows => { if (active) setNews(rows); }).catch(() => setNews([]));
    api.getCandidateProposals(candidate.id).then(rows => { if (active) setProposals(rows as any[]); }).catch(() => {});
    api.findMandateByName(candidate.full_name).then(m => { if (active) setMandate(m); }).catch(() => {});
    api.findPartyByAlias(candidate.party).then(p => { if (active) setPartyLink(p); }).catch(() => {});
    return () => { active = false; };
  }, [candidate.id, candidate.full_name, candidate.party]);

  // Fermeture au clavier (Échap). Le clic hors du panneau et la croix ferment aussi.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const issues = (candidate.legal_issues || "").trim();
  // 3 états : inconnu (pas encore renseigné) / vierge / affaires à consulter.
  const legalState: "unknown" | "clean" | "flagged" =
    !issues ? "unknown"
      : (issues.toLowerCase().includes("aucune") || issues.toLowerCase().includes("casier vierge")) ? "clean"
      : "flagged";
  const legalStyle = {
    unknown: { dot: "bg-slate-400", text: "text-slate-500", label: "Vérification en cours", bar: "bg-slate-300", btn: "border-slate-300/40 bg-slate-500/10 text-slate-600 hover:bg-slate-600 hover:text-white" },
    clean: { dot: "bg-emerald-500", text: "text-emerald-600", label: "Dossier vierge", bar: "bg-emerald-500", btn: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white" },
    flagged: { dot: "bg-amber-500", text: "text-amber-600", label: "Affaires à consulter", bar: "bg-amber-500", btn: "border-amber-500/20 bg-amber-500/10 text-amber-600 hover:bg-amber-500 hover:text-white" },
  }[legalState];
  // Adaptateur pour réutiliser la modale des députés (attend first_name/last_name).
  const legalPerson = { first_name: candidate.full_name, last_name: "", legal_issues: candidate.legal_issues, an_id: null, hatvp_url: null };

  return (
    <>
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 md:p-10" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* En-tête coloré */}
        <div className={`relative bg-gradient-to-br ${side.from} ${side.to} p-6 md:p-8`}>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30" aria-label="Fermer"><X /></button>
          <div className="flex flex-col items-center gap-5 text-center text-white md:flex-row md:items-end md:text-left">
            <CandidateAvatar c={candidate} className="h-32 w-32 shrink-0 rounded-full border-4 border-white/80 shadow-xl text-3xl" />
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="rounded-full bg-white/25 px-3 py-1 text-[11px] font-black uppercase tracking-widest">{side.label}{candidate.party ? ` · ${candidate.party}` : ""}</span>
                {candidate.category?.startsWith("Primaire") && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/40 ring-1 ring-white/50">
                    <Vote size={13} strokeWidth={2.5} /> {candidate.category}
                  </span>
                )}
              </div>
              <h2 className="mt-3 text-4xl font-staatliches uppercase leading-none md:text-5xl">{candidate.full_name}</h2>
              {candidate.declared_at
                ? <p className="mt-2 text-sm font-bold text-white/80">Candidature déclarée le {formatDate(candidate.declared_at)}</p>
                : candidate.category?.startsWith("Primaire") && <p className="mt-2 text-sm font-bold text-white/80">Candidat·e à la {candidate.category.toLowerCase()}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {candidate.summary && <p className="mb-4 text-lg leading-7 text-slate-700">{candidate.summary}</p>}

          {/* Fil conducteur : fiche du parti */}
          {partyLink && (
            <Link href={`/partis/${partyLink.slug}`}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-slate-800 transition hover:border-slate-300 hover:bg-slate-100">
              <span className="flex items-center gap-2 text-sm font-bold"><Landmark size={17} /> Voir la fiche du parti — {partyLink.name}</span>
              <ArrowRight size={17} />
            </Link>
          )}

          {/* Fil conducteur : lien vers la fiche parlementaire de la même personne */}
          {mandate && (
            <Link
              href={`/${mandate.type === "senateur" ? "senateurs" : "deputes"}/${mandate.slug}/`}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 px-5 py-3 text-blue-800 transition hover:border-blue-300 hover:bg-blue-100"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <Landmark size={17} />
                Voir aussi sa fiche {mandate.type === "senateur" ? "de sénateur·rice" : "de député·e"}
              </span>
              <ArrowRight size={17} />
            </Link>
          )}

          <FactChips candidate={candidate} />

          {/* Situation juridique — suivi en temps réel des affaires judiciaires */}
          <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 h-full w-2 ${legalStyle.bar}`} />
            <div className="flex items-center justify-between gap-4 pl-2">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Intégrité &amp; Transparence</p>
                <h3 className="text-lg font-bold text-slate-900">Situation judiciaire</h3>
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${legalStyle.dot}`} />
                  <span className={`text-[10px] font-black uppercase tracking-widest ${legalStyle.text}`}>
                    {legalStyle.label}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowLegal(true)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${legalStyle.btn}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Consulter
              </button>
            </div>
          </div>

          <div className="grid items-start gap-4 sm:grid-cols-2">
            {BIO_FIELDS.map(([key, label]) => {
              const points = toPoints(candidate.bio?.[key]);
              if (points.length === 0) return null;
              const isTimeline = key === "parcours" || key === "chronologie";
              const wide = isTimeline ? "sm:col-span-2" : "";
              const color = FIELD_COLORS[key];
              const isOpen = openPanels.has(key);
              return (
                <div key={key} className={`min-w-0 self-start overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm ${wide}`}>
                  {/* En-tête cliquable : déplie/replie le panneau (gain de place). */}
                  <button onClick={() => togglePanel(key)} aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 p-5 text-left">
                    <div>
                      <h3 className={`font-staatliches text-2xl uppercase leading-none ${color.head}`}>{label}</h3>
                      <div className={`mt-1.5 h-1 w-12 rounded-full ${color.bar}`} />
                    </div>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">{points.length}</span>
                      <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="px-5 pb-5">
                          {isTimeline ? (
                            <Timeline points={points} />
                          ) : (
                            <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 marker:text-slate-300">
                              {points.map((p, i) => <li key={i} className="break-words [overflow-wrap:anywhere]"><NumHighlight text={p} /></li>)}
                            </ul>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {candidate.program && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-800">Programme</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-950">{candidate.program}</p>
            </section>
          )}

          {/* Son programme : toutes les idées par thème + contexte au clic sur « ? » */}
          {proposals.length > 0 && (() => {
            const groups: Record<string, { ctx: string | null; items: any[] }> = {};
            for (const p of proposals) {
              const k = p.theme || "Propositions";
              (groups[k] ||= { ctx: null, items: [] });
              if (p.subsection === "__contexte__") groups[k].ctx = p.text; else groups[k].items.push(p);
            }
            const src = proposals.find(p => p.source_url)?.source_url;
            return (
              <section className="mt-8">
                <h3 className="text-2xl font-staatliches uppercase text-slate-950">Son programme</h3>
                <p className="mt-1 text-xs text-slate-500">Toutes ses idées, par thème — issues du programme officiel. Cliquez sur <HelpCircle size={12} className="inline -mt-0.5" /> pour comprendre pourquoi.</p>
                <div className="mt-4 space-y-4">
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
              </section>
            );
          })()}

          {/* Fil d'actu quotidien */}
          <section className="mt-8">
            <h3 className="text-2xl font-staatliches uppercase text-slate-950">Fil d'actualité</h3>
            {news === null ? (
              <p className="mt-3 text-sm text-slate-400">Chargement…</p>
            ) : news.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucune actualité recensée pour l'instant — le fil se met à jour chaque jour.</p>
            ) : (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:thin]">
                {news.map(item => (
                  <a key={item.id} href={item.source_url || "#"} target="_blank" rel="noreferrer" className="flex w-[280px] shrink-0 snap-start flex-col rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase tracking-widest">{item.news_type || "actu"}</span>
                      <span><CalendarDays className="mr-1 inline" size={13} />{formatDate(item.date)}</span>
                    </div>
                    <p className="mt-2 font-bold text-slate-900 line-clamp-2">{item.title}</p>
                    {item.summary && <p className="mt-1 text-sm leading-6 text-slate-600 line-clamp-3">{item.summary}</p>}
                    {item.source_name && <p className="mt-auto pt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700">{item.source_name}<ExternalLink size={12} /></p>}
                  </a>
                ))}
              </div>
            )}
          </section>

          {/* Fil vidéo (chaîne YouTube officielle) — masqué si pas de chaîne vérifiée */}
          <div className="mt-8">
            <VideoFeed source="candidate" candidateId={candidate.id} />
          </div>

          {candidate.source_urls && candidate.source_urls.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Sources</h3>
              <div className="mt-2 flex flex-col gap-1">
                {candidate.source_urls.filter(Boolean).map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline"><ExternalLink size={13} />{url}</a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
    <LegalStatusModal isOpen={showLegal} onClose={() => setShowLegal(false)} deputy={legalPerson} />
    </>
  );
}

const STANCE_META: Record<string, { label: string; dot: string; text: string; ring: string }> = {
  pour: { label: "Pour", dot: "bg-emerald-500", text: "text-emerald-300", ring: "ring-emerald-500/30" },
  nuance: { label: "Nuancé", dot: "bg-amber-500", text: "text-amber-300", ring: "ring-amber-500/30" },
  contre: { label: "Contre", dot: "bg-rose-500", text: "text-rose-300", ring: "ring-rose-500/30" },
};

function PositionsView({ candidates }: { candidates: Candidate[] }) {
  const [issues, setIssues] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<{ c: Candidate; issue: any; pos: any } | null>(null);

  useEffect(() => {
    Promise.all([api.getIssues(), api.getCandidatePositions()])
      .then(([iss, pos]) => { setIssues(iss); setPositions(pos); })
      .finally(() => setLoading(false));
  }, []);

  const bySlug = useMemo(() => new Map(candidates.map(c => [c.slug, c])), [candidates]);
  const posMap = useMemo(() => {
    const m = new Map<string, any>();
    for (const p of positions) m.set(`${p.candidate_slug}|${p.issue_slug}`, p);
    return m;
  }, [positions]);
  const categories = useMemo(() => {
    const order: string[] = [];
    const map = new Map<string, any[]>();
    // Ne montrer ici que les enjeux « comparateur candidats » (ceux qui portent une proposition
    // Pour/Contre). Les enjeux ajoutés pour la recherche des élus (sans proposition) sont exclus.
    for (const i of issues) { if (!i.proposition) continue; if (!map.has(i.category)) { map.set(i.category, []); order.push(i.category); } map.get(i.category)!.push(i); }
    return order.map(cat => ({ cat, items: map.get(cat)! }));
  }, [issues]);

  if (loading) return <div className="flex justify-center py-24 text-slate-400"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  if (issues.length === 0) return <div className="mx-auto max-w-3xl px-4 pb-24 text-center text-slate-500">Les positions seront disponibles très bientôt.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <p className="mb-8 text-center text-sm text-slate-500">Position de chaque candidat sur les grands enjeux — cliquez sur un candidat pour le détail et la source.</p>
      {categories.map(({ cat, items }) => (
        <div key={cat} className="mb-12">
          <h2 className="mb-5 text-xl font-staatliches uppercase tracking-wide text-slate-800">{cat}</h2>
          <div className="space-y-4">
            {items.map(issue => {
              const groups: Record<string, Candidate[]> = { pour: [], nuance: [], contre: [] };
              for (const c of candidates) {
                const p = posMap.get(`${c.slug}|${issue.slug}`);
                if (p && groups[p.stance]) groups[p.stance].push(c);
              }
              return (
                <div key={issue.slug} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{issue.title}</p>
                  <h3 className="mb-4 text-lg font-bold text-slate-900">{issue.proposition} ?</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    {(["pour", "nuance", "contre"] as const).map(stance => (
                      <div key={stance}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${STANCE_META[stance].dot}`} />
                          <span className={`text-[11px] font-black uppercase tracking-widest ${STANCE_META[stance].text}`}>{STANCE_META[stance].label} ({groups[stance].length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {groups[stance].length === 0 ? <span className="text-xs text-slate-300">—</span> : groups[stance].map(c => (
                            <button key={c.slug} onClick={() => setDetail({ c, issue, pos: posMap.get(`${c.slug}|${issue.slug}`) })}
                              className={`inline-flex items-center gap-2 rounded-full bg-slate-50 py-1 pl-1 pr-3 ring-1 ${STANCE_META[stance].ring} transition hover:bg-slate-100`}>
                              <CandidateAvatar c={c} className="h-6 w-6 rounded-full text-[9px]" />
                              <span className="text-xs font-bold text-slate-800">{c.full_name}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <CandidateAvatar c={detail.c} className="h-12 w-12 rounded-full text-sm" />
              <div>
                <p className="font-black text-slate-900">{detail.c.full_name}</p>
                <p className="text-xs font-bold text-slate-500">{detail.issue.title}</p>
              </div>
              <button onClick={() => setDetail(null)} className="ml-auto rounded-full bg-slate-100 p-2"><X size={18} /></button>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${detail.pos?.stance === "pour" ? "bg-emerald-100 text-emerald-700" : detail.pos?.stance === "contre" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
              {STANCE_META[detail.pos?.stance]?.label ?? "—"} · {detail.issue.proposition}
            </span>
            <p className="mt-4 text-sm leading-6 text-slate-700">{detail.pos?.summary || "Position non détaillée."}</p>
            {detail.pos?.source_url && (
              <a href={detail.pos.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 hover:underline">
                <ExternalLink size={14} /> Source ({detail.pos.source_type === "wikipedia" ? "Wikipédia" : detail.pos.source_type === "vote" ? "Vote au Parlement" : detail.pos.source_type === "programme" ? "Programme officiel" : detail.pos.source_type})
              </a>
            )}
            <p className="mt-3 text-[11px] italic text-slate-400">Position résumée automatiquement à partir de la source. Vérifiez la source pour le détail exact.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CandidatesContent() {
  const params = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<string>("Tous");
  const [view, setView] = useState<"candidats" | "positions" | "enjeux">("candidats");
  // Flottement perpétuel des cartes : uniquement sur grand écran et hors « mouvement réduit ».
  // Sur mobile, N animations infinies (y + rotate) simultanées saccadent → on les coupe.
  const [floaty, setFloaty] = useState(false);

  useEffect(() => {
    api.getCandidates().then(data => { setCandidates(data as Candidate[]); }).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const check = () => setFloaty(
      window.matchMedia("(min-width: 768px)").matches &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    );
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sideTabs = ["Tous", ...Object.keys(SIDES)];
  const filtered = useMemo(() => candidates.filter(c => {
    const matchSide = side === "Tous" || (c.political_side || "autre").toLowerCase() === side;
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase());
    return matchSide && matchSearch;
  }), [candidates, side, search]);

  // Modale pilotée par état local : en export statique, useSearchParams ne se
  // rafraîchit pas de façon fiable sur router.replace (la croix ne fermait rien).
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  // Deep-link initial (?candidat=slug) appliqué UNE seule fois, une fois les candidats
  // chargés — sinon la fermeture pourrait être annulée par une relecture des params.
  const deepLinkDone = useRef(false);
  useEffect(() => {
    if (deepLinkDone.current || candidates.length === 0) return;
    deepLinkDone.current = true;
    const s = params.get("candidat");
    if (s && candidates.some(c => c.slug === s)) setSelectedSlug(s);
  }, [candidates, params]);
  const selected = selectedSlug ? candidates.find(c => c.slug === selectedSlug) ?? null : null;
  // L'état local pilote l'ouverture/fermeture ; la mise à jour de l'URL est secondaire et ne
  // doit jamais empêcher la fermeture (d'où le try/catch en export statique).
  // URL mise à jour EN SILENCE (history), sans navigation Next → la modale s'ouvre direct,
  // sans revenir d'abord sur la liste. (router.replace provoquait ce flash en export statique.)
  const open = (c: Candidate) => { setSelectedSlug(c.slug); try { window.history.replaceState(null, "", `/presidentielles-2027/?candidat=${c.slug}`); } catch {} };
  const close = () => { setSelectedSlug(null); try { window.history.replaceState(null, "", "/presidentielles-2027/"); } catch {} };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 py-24 text-center">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />
        <div className="absolute right-1/4 top-10 h-96 w-96 translate-x-1/2 rounded-full bg-red-500/10 blur-[120px]" />
        <div className="relative mx-auto max-w-5xl">
          <span className="rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-slate-500 shadow-sm">Mis à jour chaque jour</span>
          <h1 className="mt-6 text-6xl font-staatliches uppercase leading-none tracking-tight text-slate-900 md:text-8xl">
            Présidentielles <span className="bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">2027</span>
          </h1>
          <div className="mx-auto mt-6 h-1.5 w-40 rounded-full bg-gradient-to-r from-blue-600 to-red-600" />
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium italic tracking-tight text-slate-500 md:text-xl">
            Tous les candidats officiellement déclarés, leur parcours détaillé et l'actualité de la campagne, actualisés automatiquement.
          </p>
          {/* Onglets Candidats / Positions */}
          <div className="mt-8 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-sm">
            {([["candidats", "Candidats"], ["positions", "Positions"], ["enjeux", "Enjeux"]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setView(key)}
                className={`rounded-full px-6 py-2 text-sm font-black uppercase tracking-widest transition ${view === key ? "bg-slate-900 text-white" : "text-slate-500 hover:text-slate-900"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "enjeux" ? (
        <ThemesView />
      ) : view === "positions" ? (
        <PositionsView candidates={candidates} />
      ) : (
      <div className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {sideTabs.map(tab => (
              <button key={tab} onClick={() => setSide(tab)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${side === tab ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}>
                {tab === "Tous" ? "Tous" : SIDES[tab].label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un candidat…"
              className="w-full rounded-full border border-slate-200 bg-white py-3 pl-10 pr-4 text-slate-900 shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-24 text-slate-400"><Loader2 className="mb-4 h-12 w-12 animate-spin" /><p>Chargement des candidats…</p></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white py-20 text-center text-slate-500">
            <div className="mb-3 text-5xl">🗳️</div>
            <p className="text-lg font-bold">Aucun candidat pour ce filtre.</p>
            <p className="mt-1 text-sm">Les nouveaux candidats déclarés sont ajoutés automatiquement chaque jour.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map((c, i) => {
              const s = sideOf(c);
              return (
                <motion.button
                  key={c.id}
                  onClick={() => open(c)}
                  // Entrée en cascade ; flottement + balancement perpétuel UNIQUEMENT sur desktop
                  // (sur mobile, N animations infinies simultanées saccadent → on garde juste l'entrée).
                  initial={{ opacity: 0, y: 24 }}
                  animate={floaty ? { opacity: 1, y: [0, -12, 0], rotate: [0, 1.5, -1.5, 0] } : { opacity: 1, y: 0, rotate: 0 }}
                  transition={floaty ? {
                    opacity: { duration: 0.4, delay: (i % 12) * 0.05 },
                    y: { duration: 4 + (i % 5) * 0.5, repeat: Infinity, ease: "easeInOut", delay: (i % 6) * 0.25 },
                    rotate: { duration: 4 + (i % 5) * 0.5, repeat: Infinity, ease: "easeInOut", delay: (i % 6) * 0.25 },
                  } : { opacity: { duration: 0.4, delay: (i % 12) * 0.05 }, y: { duration: 0.4, delay: (i % 12) * 0.05 } }}
                  whileHover={{ scale: 1.05, rotate: 0, transition: { duration: 0.2 } }}
                  className={`group overflow-hidden rounded-2xl border-b-4 bg-white text-left shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 transition-shadow hover:shadow-xl ${s.borderb}`}
                >
                  <div className="relative">
                    {/* Photo claire, sans voile sombre, cadrage portrait centré sur le visage. */}
                    <CandidateAvatar c={c} className="aspect-[4/5] w-full text-3xl" />
                    <span className={`absolute left-2.5 top-2.5 rounded-full ${s.badge} px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shadow-lg ring-1 ring-white/30`}>{s.label}</span>
                    {c.category?.startsWith("Primaire") && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/40 ring-1 ring-white/50 backdrop-blur-sm">
                        <Vote size={10} strokeWidth={2.5} /> Primaire
                      </span>
                    )}
                  </div>
                  {/* Bandeau plein coloré façon bulle FAQ : nom + parti en blanc. */}
                  <div className={`bg-gradient-to-br ${s.from} ${s.to} px-3.5 py-2.5 text-white`}>
                    <h3 className="text-lg font-staatliches uppercase leading-none drop-shadow-sm">{c.full_name}</h3>
                    {c.party && <p className="mt-0.5 text-xs font-bold text-white/85">{c.party}</p>}
                  </div>
                  <div className="p-3.5">
                    {c.summary && <p className="line-clamp-2 text-xs leading-5 text-slate-600">{c.summary}</p>}
                    <span className={`mt-3 inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${s.from} ${s.to} px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-transform group-hover:translate-x-0.5`}>Voir la fiche →</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
      )}

      {selected && <CandidateModal candidate={selected} onClose={close} />}
    </div>
  );
}

export default function Presidentielles2027Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <CandidatesContent />
    </Suspense>
  );
}
