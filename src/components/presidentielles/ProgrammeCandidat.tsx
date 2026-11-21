"use client";

import { useState, type CSSProperties } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown, HelpCircle, ExternalLink, Globe2, GraduationCap, ShieldCheck, HeartPulse, Wheat, Leaf, Flag,
  TrendingUp, Landmark, FileText, Coins, Building2, Home, FlaskConical, Briefcase, PlayCircle, TrainFront, Palette, Scale, Mountain,
  Baby, Cpu, Factory, Palmtree, ThermometerSun, Search, X,
} from "lucide-react";
import MentionIA from "@/components/shared/MentionIA";

export type Proposition = { theme: string | null; subsection: string | null; text: string; source_url: string | null; explanation: string | null };
export type SourceProgramme = { source_url: string; titre: string | null; traite_le: string };

// Icône + couleur d'un thème de programme (différenciation visuelle).
export function themeStyle(name: string): { Icon: any; c: string; bg: string; dot: string } {
  const h = (name || "").toLowerCase();
  // Thèmes d'É. Philippe (edouardphilippe.fr) que les règles suivantes ne reconnaissaient pas.
  if (/outre-mer|ultramarin/.test(h)) return { Icon: Palmtree, c: "text-cyan-700 dark:text-cyan-300", bg: "bg-cyan-50 dark:bg-cyan-500/10", dot: "bg-cyan-500" };
  if (/famille|enfance/.test(h)) return { Icon: Baby, c: "text-rose-500 dark:text-rose-300", bg: "bg-rose-50 dark:bg-rose-500/10", dot: "bg-rose-400" };
  if (/intelligence artificielle/.test(h)) return { Icon: Cpu, c: "text-indigo-700 dark:text-indigo-300", bg: "bg-indigo-50 dark:bg-indigo-500/10", dot: "bg-indigo-500" };
  if (/climat/.test(h)) return { Icon: ThermometerSun, c: "text-orange-600 dark:text-orange-300", bg: "bg-orange-50 dark:bg-orange-500/10", dot: "bg-orange-500" };
  if (/entreprise|industri/.test(h)) return { Icon: Factory, c: "text-violet-600 dark:text-violet-300", bg: "bg-violet-50 dark:bg-violet-500/10", dot: "bg-violet-500" };
  if (/finances publiques|comptes publics|dette/.test(h)) return { Icon: Coins, c: "text-yellow-700 dark:text-yellow-300", bg: "bg-yellow-50 dark:bg-yellow-500/10", dot: "bg-yellow-500" };
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
  sante: "Santé",
};
// Livre-programme « L'Avenir en commun » (melenchon2027.fr/programme/livre/<partie>/chapitreN) :
// une source par chapitre, rangée sous sa partie.
const LIVRE = /\/programme\/livre\/([^/]+)\/chapitre\d+\/?$/;
const PARTIES_LIVRE: Record<string, string> = {
  "pour-une-bifurcation-ecologique-et-sociale": "Partie 1 · Pour une bifurcation écologique et sociale",
  "une-economie-au-service-des-besoins": "Partie 2 · Une économie au service des besoins",
  "mettre-en-securite-sociale": "Partie 3 · Mettre en sécurité sociale",
  "le-gout-du-futur-aux-nouvelles-frontieres-de-l-humanite": "Partie 4 · Le goût du futur : aux nouvelles frontières de l'humanité",
  "fonder-la-6e-republique": "Partie 5 · Fonder la 6e République",
  "un-monde-ordonne": "Partie 6 · Un monde ordonné",
  // « Réussir à nouveau » (D. de Villepin)
  "villepin-1": "Partie 1 · Dire la vérité",
  "villepin-2": "Partie 2 · Redresser l'État",
  "villepin-3": "Partie 3 · Vivre ensemble",
  "villepin-4": "Partie 4 · Continuer la France",
};
// Programme « Réussir à nouveau » de D. de Villepin (lafrancehumaniste.fr) : 25 chapitres en 4 parties,
// une source par chapitre, rangée sous sa partie comme le livre de Mélenchon (chapitres 1-3, 4-11, 12-18, 19-25).
const VILLEPIN = /^https:\/\/lafrancehumaniste\.fr\/programme\/reussir-a-nouveau\/chapitre-(\d+)\.html$/;
const VILLEPIN_SOMMAIRE = "https://lafrancehumaniste.fr/programme/reussir-a-nouveau/";
const villepinPartie = (ch: number) => (ch <= 3 ? 1 : ch <= 11 ? 2 : ch <= 18 ? 3 : 4);
const partieDuLivre = (u: string) => {
  const v = u.match(VILLEPIN);
  return v ? `villepin-${villepinPartie(Number(v[1]))}` : u.match(LIVRE)?.[1] ?? null;
};
const sommaireDuLivre = (u: string) => (VILLEPIN.test(u) ? VILLEPIN_SOMMAIRE : u.replace(/\/programme\/livre\/.*$/, "/programme/livre/"));
// Programme d'É. Philippe : une page par thème (edouardphilippe.fr/programme/<thème>) ;
// accroche et propositions phares reprises telles quelles, mesures tirées des questions-réponses.
const PHILIPPE = /^https:\/\/www\.edouardphilippe\.fr\/programme\/[^/]+\/?$/;
const PHILIPPE_SOMMAIRE = "https://www.edouardphilippe.fr/programme";
function nomDuPlan(u: string, sources: SourceProgramme[]): string {
  const s = sources.find(x => x.source_url === u);
  if (s?.titre) return s.titre;
  const segments = new URL(u).pathname.split("/").filter(Boolean);
  const dernier = segments[segments.length - 1] || "";
  const genre = segments.includes("plans-investissement") ? "Plan d'investissement" : segments.includes("plans-thematiques") ? "Plan thématique" : "";
  const nom = PLANS_CONNUS[dernier] ?? (dernier.replace(/[-_]+/g, " ").replace(/^./, c => c.toUpperCase()) || "Programme");
  return genre ? `${genre} · ${nom}` : nom;
}

// ---------------------------------------------------------------- lecture d'une proposition
// Accroche officielle (D. de Villepin : le début de chaque proposition, en gras sur son site) rangée par le
// script dans subsection = "__titre__<numéro>__<accroche>". Sinon, un texte long dont la première phrase
// est courte prend cette phrase pour titre. Le reste est le détail, replié au-delà de trois lignes.
const TITRE = /^__titre__(\d*)__([\s\S]*)$/;
const CLAMP: CSSProperties = { display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" };
export function decoupe(p: Proposition): { n: string | null; titre: string | null; corps: string } {
  const m = p.subsection?.match(TITRE);
  const n = m?.[1] || null;
  if (m && m[2].trim()) {
    const titre = m[2].trim();
    let corps = p.text.startsWith(titre) ? p.text.slice(titre.length) : p.text;
    corps = corps.replace(/^[\s.,;:]+/, "").trim();
    // L'accroche coupe souvent une phrase : le détail la continue (« … pour les déficits »).
    if (corps && /^[a-zà-ÿ(«]/.test(corps)) corps = "… " + corps;
    return { n, titre, corps };
  }
  if (p.text.length > 220) {
    const i = p.text.search(/[.!?](\s|$)/);
    if (i > 20 && i < 170) return { n, titre: p.text.slice(0, i + 1), corps: p.text.slice(i + 1).trim() };
  }
  return { n, titre: null, corps: p.text };
}

/** Texte d'introduction d'un thème : trois lignes, puis « Lire l'introduction ». */
function Constat({ texte, dot }: { texte: string; dot: string }) {
  const [ouvert, setOuvert] = useState(false);
  const long = texte.length > 260;
  return (
    <div className="mx-3 mb-3 mt-1 flex gap-3 rounded-xl bg-muted/70 px-4 py-3">
      <span className={`w-1 shrink-0 rounded-full ${dot}`} />
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">Le constat</p>
        <p className="mt-1 text-[13.5px] leading-6 text-slate-600 dark:text-slate-300" style={long && !ouvert ? CLAMP : undefined}>{texte}</p>
        {long && (
          <button onClick={() => setOuvert(o => !o)} className="mt-1 text-[12px] font-black text-blue-700 hover:underline dark:text-blue-300">
            {ouvert ? "Réduire" : "Lire l'introduction"}
          </button>
        )}
      </div>
    </div>
  );
}

/** Une proposition : numéro, accroche en titre, détail replié, explication « ? ». */
function PropositionCarte({ p, dot, retrait, etiquette, surligne }: { p: Proposition; dot: string; retrait?: boolean; etiquette?: string; surligne?: string[] }) {
  const [detail, setDetail] = useState(false);
  const [expl, setExpl] = useState(false);
  const cle = p.subsection === "__mesure_cle__";
  const { n, titre, corps } = decoupe(p);
  const long = corps.length > 240;
  const marque = (t: string) => {
    if (!surligne?.length) return t;
    const re = new RegExp(`(${surligne.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return t.split(re).map((x, i) => (i % 2 ? <mark key={i} className="rounded bg-amber-200/80 px-0.5 text-inherit dark:bg-amber-400/30">{x}</mark> : x));
  };
  return (
    <li className={`rounded-xl border px-4 py-3.5 ${cle ? "border-amber-300 bg-amber-50/70 dark:border-amber-500/40 dark:bg-amber-500/10" : "border-border bg-card"} ${retrait ? "ml-4" : ""}`}>
      {etiquette && <p className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-muted-foreground">{etiquette}</p>}
      <div className="flex items-start gap-3">
        {n
          ? <span className={`mt-0.5 shrink-0 rounded-lg px-1.5 py-0.5 font-mono text-[11px] font-black text-white ${dot}`}>{n.padStart(3, "0")}</span>
          : cle
            ? <span className="mt-0.5 shrink-0 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white dark:bg-amber-400 dark:text-slate-900">Mesure clé</span>
            : <span className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />}{" "}
        <div className="min-w-0 flex-1">
          {titre && <p className="text-[15px] font-black leading-snug text-foreground">{marque(titre)}</p>}
          {corps && (
            <p className={`${titre ? "mt-1.5 text-[14px] text-slate-600 dark:text-slate-300" : `text-[14.5px] text-slate-700 dark:text-slate-200 ${cle ? "font-bold" : ""}`} leading-6`}
              style={long && !detail ? CLAMP : undefined}>{marque(corps)}</p>
          )}
          {(long || p.explanation) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {long && (
                <button onClick={() => setDetail(d => !d)} className="text-[12px] font-black text-blue-700 hover:underline dark:text-blue-300">
                  {detail ? "Réduire" : "Lire le détail"}
                </button>
              )}
              {p.explanation && (
                <button onClick={() => setExpl(e => !e)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[12px] font-black transition ${expl ? "border-violet-300 bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300" : "border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-500/25 dark:text-violet-300"}`}>
                  <HelpCircle size={13} /> Comprendre
                </button>
              )}
            </div>
          )}
          <AnimatePresence initial={false}>
            {expl && p.explanation && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <p className="mt-2 rounded-xl border-l-2 border-violet-300 bg-violet-50/70 px-3 py-2.5 text-[13px] leading-6 text-muted-foreground dark:bg-violet-500/10">{p.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </li>
  );
}

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Programme d'un candidat par thème (contexte + propositions + « ? »), avec sa source exacte. */
export default function ProgrammeCandidat({ proposals, sources = [], titre = "Son programme", nomCandidat }: {
  proposals: Proposition[]; sources?: SourceProgramme[]; titre?: string; nomCandidat?: string;
}) {
  const [openTheme, setOpenTheme] = useState<Set<string>>(new Set());
  const [recherche, setRecherche] = useState("");
  const bascule = (set: Set<string>, k: string) => { const n = new Set(set); n.has(k) ? n.delete(k) : n.add(k); return n; };
  if (!proposals.length) return null;
  const toutes = proposals.filter(p => p.subsection !== "__contexte__");
  // Recherche dans tout le programme (au-delà de 25 propositions) : mots sans accents, tous présents.
  const mots = sansAccent(recherche).split(/\s+/).filter(m => m.length >= 2);
  const trouvees = mots.length
    ? toutes
        .filter(p => { const t = sansAccent(`${p.theme} ${p.subsection?.match(TITRE)?.[2] ?? ""} ${p.text}`); return mots.every(m => t.includes(m)); })
        // D'abord celles dont le thème ou le titre parle du sujet, ensuite celles qui le citent en passant.
        .map(p => ({ p, rang: mots.every(m => sansAccent(`${p.theme} ${decoupe(p).titre ?? ""}`).includes(m)) ? 0 : 1 }))
        .sort((a, b) => a.rang - b.rang).map(x => x.p)
    : [];

  const groups: Record<string, { ctx: string | null; items: Proposition[] }> = {};
  for (const p of proposals) {
    const k = p.theme || "Propositions";
    (groups[k] ||= { ctx: null, items: [] });
    if (p.subsection === "__contexte__") groups[k].ctx = p.text; else groups[k].items.push(p);
  }
  const urls = [...new Set(proposals.map(p => p.source_url).filter(Boolean) as string[])];
  // Sources affichées en bas : le livre une seule fois (son sommaire), pas ses 23 chapitres.
  // Idem pour les 15 pages thématiques d'É. Philippe : un lien vers son sommaire.
  const urlsAffichees = [...new Set(urls.map(u => partieDuLivre(u) ? sommaireDuLivre(u) : PHILIPPE.test(u) ? PHILIPPE_SOMMAIRE : u))];
  const philippe = urls.some(u => PHILIPPE.test(u));
  const villepin = urls.some(u => VILLEPIN.test(u));
  const libelleSource = (u: string) => {
    const s = sources.find(x => x.source_url === u);
    if (estVideo(u)) return `${s?.titre || "Présentation officielle"} — vidéo de la chaîne officielle${s ? `, analysée le ${new Date(s.traite_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}` : ""}`;
    if (u === VILLEPIN_SOMMAIRE) return "« Réussir à nouveau », programme officiel (texte repris chapitre par chapitre)";
    if (/\/programme\/livre\/$/.test(u)) return "L'Avenir en commun, livre-programme (texte officiel, chapitre par chapitre)";
    if (u === PHILIPPE_SOMMAIRE) return "Programme officiel (edouardphilippe.fr, thème par thème)";
    return "Programme officiel (site du mouvement)";
  };

  // Programme publié en plusieurs plans (J.-L. Mélenchon : 4 plans, 55 thèmes en octobre 2026) :
  // cinquante thèmes à plat se parcouraient sans fin. Les thèmes sont alors rangés sous leur
  // plan, replié : quelques lignes d'abord, les thèmes du plan ouvert ensuite.
  // Une page par thème (É. Philippe : 15 pages, 15 thèmes) : rien à regrouper, thèmes à plat.
  const parPlan = urls.length > 1 && Object.keys(groups).length > 12 && urls.length < Object.keys(groups).length;
  // Les chapitres d'un livre-programme sont regroupés par partie (6 lignes au lieu de 23) ;
  // à l'intérieur, chaque chapitre a son intertitre.
  type Plan = { url: string; nom: string; livre: boolean; chapitres: { url: string; titre: string; themes: string[] }[]; n: number };
  const plans: Plan[] = [];
  if (parPlan) {
    for (const u of urls) {
      const partie = partieDuLivre(u);
      const cle = partie ? `livre:${partie}` : u;
      let pl = plans.find(x => x.url === cle);
      if (!pl) {
        pl = { url: cle, nom: partie ? (PARTIES_LIVRE[partie] ?? partie.replace(/-/g, " ")) : nomDuPlan(u, sources), livre: !!partie, chapitres: [], n: 0 };
        plans.push(pl);
      }
      pl.chapitres.push({
        url: u, titre: partie ? nomDuPlan(u, sources) : "",
        themes: [...new Set(proposals.filter(p => p.source_url === u).map(p => p.theme || "Propositions"))],
      });
      const lignes = proposals.filter(p => p.source_url === u && p.subsection !== "__contexte__");
      // Une mesure qui chapeaute des sous-mesures compte pour une (décompte officiel du livre : 1 069).
      pl.n += lignes.length + new Set(lignes.map(p => p.subsection).filter(s => s && !s.startsWith("__"))).size;
    }
    // Le livre-programme d'abord (c'est le programme), les plans détaillés ensuite.
    plans.sort((a, b) => Number(b.livre) - Number(a.livre));
  }
  const nLivre = plans.filter(p => p.livre).reduce((s, p) => s + p.n, 0);
  const unTheme = (theme: string, g: { ctx: string | null; items: Proposition[] }) => {
    const { Icon, c, bg, dot } = themeStyle(theme);
    const isOpen = openTheme.has(theme);
    return (
      <div key={theme} className={`overflow-hidden rounded-2xl border bg-card transition ${isOpen ? "border-slate-300 shadow-sm dark:border-slate-600" : "border-border"}`}>
        <button onClick={() => setOpenTheme(s => bascule(s, theme))} aria-expanded={isOpen}
          className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted/60">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg} ${c}`}><Icon size={18} /></span>{" "}
          <span className="min-w-0 flex-1">
            <span className="block text-[15px] font-black leading-snug text-foreground">{theme}</span>{" "}
            <span className="mt-0.5 block text-[12px] font-bold text-muted-foreground">{g.items.length} proposition{g.items.length > 1 ? "s" : ""}</span>
          </span>{" "}
          <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>{" "}
        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              {g.ctx && <Constat texte={g.ctx} dot={dot} />}{" "}
              <ol className="space-y-2.5 px-3 pb-3 pt-1">
                {g.items.map((p, i) => {
                  // Sous-mesure : son intitulé (la mesure qui la chapeaute) s'affiche une fois, au-dessus.
                  const chapeau = p.subsection && !p.subsection.startsWith("__") ? p.subsection : null;
                  const nouveauChapeau = chapeau && g.items[i - 1]?.subsection !== chapeau;
                  return [
                    nouveauChapeau && <li key={`c${i}`} className="px-1 pt-2 text-[14px] font-black leading-snug text-foreground">{chapeau}</li>,
                    <PropositionCarte key={i} p={p} dot={dot} retrait={!!chapeau} />,
                  ];
                })}
              </ol>
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
        Toutes {nomCandidat ? `les idées de ${nomCandidat}` : "ses idées"}, par {villepin ? "partie, chapitre puis thème" : parPlan ? "plan puis par thème" : "thème"} — issues {urls.some(estVideo) && !urls.every(estVideo) ? "du programme officiel et de ses présentations" : urls.every(estVideo) ? "de sa présentation officielle" : "du programme officiel"}.
        Touchez « Comprendre » sous une proposition pour savoir ce qu&apos;elle change.
      </p>{" "}
      {toutes.length > 25 && (
        <div className="mt-4">
          <label className="flex items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 shadow-sm focus-within:border-blue-400">
            <Search size={18} className="shrink-0 text-muted-foreground" />
            <input type="text" inputMode="search" enterKeyHint="search" value={recherche} onChange={e => setRecherche(e.target.value)}
              placeholder="Chercher un sujet : retraites, impôts…"
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground" />
            {recherche && <button onClick={() => setRecherche("")} aria-label="Effacer" className="text-muted-foreground hover:text-foreground"><X size={16} /></button>}
          </label>
          {!mots.length && (
            <div className="mt-2.5 flex flex-wrap gap-2">
              {["retraites", "impôts", "école", "santé", "immigration", "écologie", "Europe"].map(m => (
                <button key={m} onClick={() => setRecherche(m)} className="rounded-full border border-border bg-card px-3 py-1 text-[12.5px] font-bold text-muted-foreground transition hover:border-slate-400 hover:text-foreground">{m}</button>
              ))}
            </div>
          )}
        </div>
      )}{" "}
      {mots.length ? (
        <div className="mt-4">
          <p className="px-1 text-[12px] font-black uppercase tracking-widest text-muted-foreground">
            {trouvees.length ? `${trouvees.length} proposition${trouvees.length > 1 ? "s" : ""} sur « ${recherche.trim()} »` : `Aucune proposition ne parle de « ${recherche.trim()} »`}
          </p>
          <ol className="mt-2.5 space-y-2.5">
            {trouvees.slice(0, 60).map((p, i) => (
              <PropositionCarte key={i} p={p} dot={themeStyle(p.theme || "").dot} etiquette={p.theme || undefined} surligne={recherche.trim().split(/\s+/).filter(m => m.length >= 2)} />
            ))}
          </ol>
          {trouvees.length > 60 && <p className="mt-2 px-1 text-[12px] text-muted-foreground">Les 60 premières sont affichées : précisez la recherche.</p>}
        </div>
      ) : parPlan ? (
        <div className="mt-4 space-y-3">
          {plans.map((pl, iPlan) => {
            const ouvert = openTheme.has(`plan:${pl.url}`);
            const nThemes = pl.chapitres.reduce((s, ch) => s + ch.themes.length, 0);
            // Intertitres de groupe : le livre-programme, puis les plans qui le détaillent.
            const entete = pl.livre && iPlan === 0
              ? <p key={`t:${pl.url}`} className="px-1 pt-1 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{villepin ? `Réussir à nouveau · programme (${nLivre.toLocaleString("fr-FR")} propositions)` : `L'Avenir en commun · livre-programme (${nLivre.toLocaleString("fr-FR")} mesures)`}</p>
              : !pl.livre && plans[iPlan - 1]?.livre
                ? <p key={`t:${pl.url}`} className="px-1 pt-3 text-[11px] font-black uppercase tracking-widest text-muted-foreground">Plans thématiques et d&apos;investissement</p>
                : null;
            return [entete, (
              <div key={pl.url} className="overflow-hidden rounded-2xl border border-border bg-card">
                <button onClick={() => setOpenTheme(s => bascule(s, `plan:${pl.url}`))} aria-expanded={ouvert}
                  className="flex min-h-[56px] w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-muted">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">{estVideo(pl.url) ? <PlayCircle size={17} /> : <FileText size={17} />}</span>{" "}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-black leading-snug text-foreground">{pl.nom}</span>{" "}
                    <span className="block text-[12px] font-bold text-muted-foreground">{pl.n} {pl.livre && !villepin ? "mesure" : "proposition"}{pl.n > 1 ? "s" : ""} · {pl.livre ? `${pl.chapitres.length} chapitre${pl.chapitres.length > 1 ? "s" : ""}, ` : ""}{nThemes} thème{nThemes > 1 ? "s" : ""}</span>
                  </span>{" "}
                  <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${ouvert ? "rotate-180" : ""}`} />
                </button>{" "}
                {ouvert && (
                  <div className="space-y-2.5 border-t border-border p-3">
                    {pl.chapitres.map(ch => [
                      ch.titre && (
                        <a key={`ch:${ch.url}`} href={ch.url} target="_blank" rel="noreferrer"
                          className="flex items-center gap-1.5 px-1 pt-2 text-[13px] font-black leading-snug text-foreground hover:underline first:pt-0">
                          {ch.titre} <ExternalLink size={11} className="shrink-0 text-muted-foreground" />
                        </a>
                      ),
                      ...ch.themes.filter(t => groups[t]).map(t => unTheme(t, groups[t])),
                    ])}
                  </div>
                )}
              </div>
            )];
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {Object.entries(groups).map(([t, g]) => unTheme(t, g))}
        </div>
      )}{" "}
      <div className="mt-3 flex flex-col gap-1.5">
        {urlsAffichees.map(u => (
          <a key={u} href={u} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-blue-700 hover:underline dark:text-blue-300">
            {estVideo(u) ? <PlayCircle size={12} /> : <ExternalLink size={12} />} {libelleSource(u)}{" "}
          </a>
        ))}
      </div>{" "}
      <MentionIA texte={villepin
        ? "Propositions de « Réussir à nouveau » et présentations des thèmes reprises mot pour mot du programme officiel ; les explications « ? » sont rédigées par IA. Seule la source officielle fait foi."
        : nLivre
        ? "Mesures de « L'Avenir en commun » reprises mot pour mot du texte officiel ; propositions des plans restructurées par IA à partir des sources citées (chiffres vérifiés contre le texte) ; les explications « ? » sont rédigées par IA. Seule la source officielle fait foi."
        : philippe
        ? "Présentations des thèmes et propositions phares (« Mesure clé ») reprises mot pour mot du site officiel ; les autres mesures sont tirées des questions-réponses du site, une par ligne, reformulées par IA (chiffres et termes vérifiés contre la page) ; les explications « ? » sont rédigées par IA. Seule la source officielle fait foi."
        : "Propositions restructurées par IA à partir des sources officielles citées (chiffres vérifiés contre le texte ou le discours) ; les explications « ? » sont rédigées par IA. Seule la source officielle fait foi."} />
    </section>
  );
}
