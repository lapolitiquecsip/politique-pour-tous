"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { vignetteWikimedia } from "@/lib/wikimedia";
import { Search, Loader2, X, CalendarDays, ExternalLink, Briefcase, GraduationCap, Users, ShieldCheck, Landmark, ArrowRight, Vote, ChevronDown, Globe2, HeartPulse, Wheat, Leaf, Flag, TrendingUp, HelpCircle, FileText, Play, Bell, Trophy } from "lucide-react";
import { api } from "@/lib/api";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import ThemesView from "@/components/presidentielles/ThemesView";
import DynamiquesView from "@/components/presidentielles/dynamiques/DynamiquesView";
import PrimaryDebates from "@/components/presidentielles/PrimaryDebates";
import { resultatsPrimaires } from "@/lib/primaires";
import DragScroller from "@/components/ui/DragScroller";
import { usePremium } from "@/lib/hooks/usePremium";
import { isFollowingCandidate, toggleFollowCandidate } from "@/lib/candidateFollows";
import MentionIA from "@/components/shared/MentionIA";
import ProgrammeCandidat, { type SourceProgramme } from "@/components/presidentielles/ProgrammeCandidat";

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
  centre: { label: "Centre", from: "from-amber-400", to: "to-orange-500", badge: "bg-orange-700", borderb: "border-orange-600" },
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
  famille: { head: "text-rose-700 dark:text-rose-400", bar: "bg-rose-500" },
  parents: { head: "text-amber-700 dark:text-amber-400", bar: "bg-amber-500" },
  etudes: { head: "text-blue-700 dark:text-blue-400", bar: "bg-blue-500" },
  parcours: { head: "text-violet-700 dark:text-violet-400", bar: "bg-violet-500" },
  jobs: { head: "text-cyan-700 dark:text-cyan-400", bar: "bg-cyan-500" },
  passions: { head: "text-fuchsia-700 dark:text-fuchsia-400", bar: "bg-fuchsia-500" },
  positions: { head: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" },
  faits_marquants: { head: "text-yellow-700 dark:text-yellow-400", bar: "bg-yellow-500" },
  realisations: { head: "text-teal-700 dark:text-teal-400", bar: "bg-teal-500" },
  publications: { head: "text-red-700 dark:text-red-400", bar: "bg-red-500" },
  controverses: { head: "text-slate-700 dark:text-slate-200", bar: "bg-slate-600" },
  chronologie: { head: "text-indigo-700 dark:text-indigo-400", bar: "bg-indigo-500" },
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
          ? <span key={i} className="font-bold text-foreground underline decoration-red-500 decoration-solid decoration-[3px] underline-offset-[3px]">{part}</span>
          : <span key={i}>{part}</span>
      )}
    </>
  );
}

// Frise chronologique HORIZONTALE (scroll latéral) pour ne pas allonger la page.
function Timeline({ points }: { points: string[] }) {
  return (
    <div className="mt-4">
    <DragScroller ariaLabel="Frise chronologique" className="gap-3 pb-3 pt-0 md:gap-3">
      {points.map((p, i) => {
        const idx = p.indexOf(" : ");
        const date = idx > 0 ? p.slice(0, idx) : "";
        const desc = idx > 0 ? p.slice(idx + 3) : p;
        return (
          <div key={i} className="relative w-[220px] shrink-0 rounded-2xl border border-border bg-muted p-4">
            <div className="mb-2 h-1 w-8 rounded-full bg-red-500" />{" "}
            {date && <p className="font-staatliches text-2xl uppercase leading-none text-red-700 dark:text-red-400">{date}</p>}{" "}
            <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200"><NumHighlight text={desc} /></p>{" "}
          </div>
        );
      })}
    </DragScroller>
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
  return <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 dark:bg-slate-500/10 px-3.5 py-1.5 text-sm font-bold text-slate-700 dark:text-slate-200">{children}</span>;
}

function FactChips({ candidate }: { candidate: Candidate }) {
  const bio = candidate.bio;
  const n = bio?.naissance;
  const age = computeAge(n?.date);
  const side = sideOf(candidate);
  const chips: React.ReactNode[] = [];

  if (age !== null) chips.push(<Chip key="age"><span className="font-black text-foreground underline decoration-red-500 decoration-solid decoration-[3px] underline-offset-[3px]">{age}</span> ans</Chip>);
  if (n?.ville) chips.push(<Chip key="lieu">{n.pays_code && (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={`https://flagcdn.com/${String(n.pays_code).toLowerCase()}.svg`} alt={n.pays || ""} className="h-4 w-6 rounded-sm object-cover shadow-sm" />
  )}Né·e à {n.ville}{n.pays ? `, ${n.pays}` : ""}</Chip>);
  if (candidate.party) chips.push(<Chip key="parti"><span className={`h-2.5 w-2.5 rounded-full ${side.badge}`} />{candidate.party}</Chip>);
  if (bio?.profession) chips.push(<Chip key="prof"><Briefcase size={15} className="text-muted-foreground" />{bio.profession}</Chip>);
  if (bio?.formation) chips.push(<Chip key="form"><GraduationCap size={16} className="text-muted-foreground" />{bio.formation}</Chip>);
  if (bio?.enfants) chips.push(<Chip key="enf"><Users size={15} className="text-muted-foreground" />{bio.enfants}</Chip>);

  if (chips.length === 0) return null;
  return <div className="mb-6 flex flex-wrap gap-2">{chips}</div>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

// taille : largeur affichée (px CSS) — l'image servie est la miniature Wikimedia adaptée.
function CandidateAvatar({ c, className, taille = 48, prioritaire = false }: { c: Candidate; className: string; taille?: number; prioritaire?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed || !c.photo_url) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br ${sideOf(c).from} ${sideOf(c).to} font-black text-white ${className}`}>
        {initials(c.full_name)}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={vignetteWikimedia(c.photo_url, taille)!} alt={c.full_name} onError={() => setFailed(true)} loading={prioritaire ? "eager" : "lazy"} decoding="async" className={`object-cover object-center ${className}`} />;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

// Fiche d'un candidat (29/10/2026, d'après une vidéo d'utilisateur sur téléphone) : la page
// derrière défilait avec la fiche (on la refermait ailleurs que là où on l'avait ouverte), la
// croix était hors d'atteinte au bout de la lecture, et le programme venait après neuf panneaux
// de biographie. Désormais : page figée dessous, barre collante (rubriques + fermer), programme
// d'abord, et passage au candidat précédent / suivant en bas de fiche.
type Voisins = { precedent: Candidate; suivant: Candidate } | null;
const RUBRIQUES_FICHE = [["fiche-programme", "Programme"], ["fiche-actu", "Actualité"], ["fiche-parcours", "Parcours"]] as const;

function CandidateModal({ candidate, onClose, voisins = null, onOuvrir }: { candidate: Candidate; onClose: () => void; voisins?: Voisins; onOuvrir?: (c: Candidate) => void }) {
  const side = sideOf(candidate);
  const { isPremium, isPro } = usePremium() || { isPremium: false, isPro: false };
  const [following, setFollowing] = useState(false);
  useEffect(() => { setFollowing(isFollowingCandidate(candidate.id)); }, [candidate.id]);
  const onToggleFollow = () => {
    if (!isPremium) { window.location.href = "/premium"; return; }
    const suit = toggleFollowCandidate({ id: candidate.id, slug: (candidate as any).slug, name: candidate.full_name, photo_url: (candidate as any).photo_url, party: candidate.party });
    setFollowing(suit);
    // Membre Pro : le suivi alimente aussi ses alertes e-mail et son récap du samedi.
    // (Uniquement après l'accord explicite donné dans l'espace : un suivi de candidat peut
    // révéler une opinion politique, RGPD art. 9.)
    if (isPro) {
      if (!suit) api.retirerSuivi("candidat", String(candidate.id)).catch(() => {});
      else api.consentementSuivis().then(ok => { if (ok) api.ajouterSuivi("candidat", String(candidate.id), candidate.full_name).catch(() => {}); }).catch(() => {});
    }
  };
  const [news, setNews] = useState<any[] | null>(null);
  const [videos, setVideos] = useState<any[]>([]);              // vidéos YouTube officielles
  const [debatsFil, setDebatsFil] = useState<any[]>([]);         // débats et émissions télé (vidéo jouable)
  const [selectedVideo, setSelectedVideo] = useState<any | null>(null); // lecteur vidéo ouvert
  const [proposals, setProposals] = useState<any[] | null>(null);   // null : pas encore chargé
  const [sourcesProgramme, setSourcesProgramme] = useState<SourceProgramme[]>([]);
  const [openPanels, setOpenPanels] = useState<Set<string>>(new Set());   // panneaux bio dépliés
  const togglePanel = (k: string) => setOpenPanels(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [showLegal, setShowLegal] = useState(false);
  const [selectedNews, setSelectedNews] = useState<any | null>(null); // récap actu ouvert EN SITE
  const [mandate, setMandate] = useState<{ type: string; slug: string } | null>(null);
  const [partyLink, setPartyLink] = useState<{ slug: string; name: string } | null>(null);
  useEffect(() => {
    let active = true;
    api.getCandidateNews(candidate.id).then(rows => { if (active) setNews(rows); }).catch(() => setNews([]));
    api.getCandidateVideos(candidate.id, 20).then(rows => { if (active) setVideos(rows as any[]); }).catch(() => {});
    api.getCandidateDebates(candidate.id).then(rows => { if (active) setDebatsFil((rows as any[]).filter(d => d.video_id && !d.a_venir)); }).catch(() => {});
    api.getCandidateProposals(candidate.id).then(rows => { if (active) setProposals(rows as any[]); }).catch(() => { if (active) setProposals([]); });
    api.getSourcesProgramme(candidate.id).then(rows => { if (active) setSourcesProgramme(rows); }).catch(() => {});
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

  // Page figée sous la fiche : sans cela, au bout du défilement de la fiche, c'est la page
  // derrière qui défilait, et l'on se retrouvait ailleurs en refermant.
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const avant = [html.style.overflow, body.style.overflow];
    html.style.overflow = "hidden"; body.style.overflow = "hidden";
    return () => { html.style.overflow = avant[0]; body.style.overflow = avant[1]; };
  }, []);
  const fiche = useRef<HTMLDivElement>(null);
  const allerA = (id: string) => {
    const el = document.getElementById(id), boite = fiche.current;
    if (el && boite) boite.scrollTo({ top: el.getBoundingClientRect().top - boite.getBoundingClientRect().top + boite.scrollTop - 64, behavior: "smooth" });
  };

  const issues = (candidate.legal_issues || "").trim();
  // 3 états : inconnu (pas encore renseigné) / vierge / affaires à consulter.
  const legalState: "unknown" | "clean" | "flagged" =
    !issues ? "unknown"
      : (issues.toLowerCase().includes("aucune") || issues.toLowerCase().includes("casier vierge")) ? "clean"
      : "flagged";
  const legalStyle = {
    unknown: { dot: "bg-slate-400", text: "text-muted-foreground", label: "Vérification en cours", bar: "bg-slate-300", btn: "border-slate-300/40 bg-slate-500/10 text-muted-foreground hover:bg-slate-600 hover:text-white" },
    clean: { dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400", label: "Dossier vierge", bar: "bg-emerald-500", btn: "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white" },
    flagged: { dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400", label: "Affaires à consulter", bar: "bg-amber-500", btn: "border-amber-500/20 bg-amber-500/10 text-amber-800 dark:text-amber-400 hover:bg-amber-500 hover:text-white" },
  }[legalState];
  // Adaptateur pour réutiliser la modale des députés (attend first_name/last_name).
  const legalPerson = { first_name: candidate.full_name, last_name: "", legal_issues: candidate.legal_issues, an_id: null, hatvp_url: null };

  return (
    <>
    <div ref={fiche} className="fixed inset-0 z-50 overflow-y-auto overscroll-contain bg-slate-950/70 md:p-10" role="dialog" aria-modal="true" aria-label={`Fiche de ${candidate.full_name}`} onClick={onClose}>
      <div className="mx-auto min-h-full max-w-4xl overflow-clip bg-card shadow-2xl md:min-h-0 md:rounded-[2rem]" onClick={e => e.stopPropagation()}>
        {/* En-tête coloré */}
        <div className={`relative bg-gradient-to-br ${side.from} ${side.to} p-5 pt-6 md:p-8`}>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30" aria-label="Fermer"><X /></button>{" "}
          <div className="flex flex-col items-center gap-5 text-center text-white md:flex-row md:items-end md:text-left">
            <CandidateAvatar c={candidate} taille={128} className="h-24 w-24 shrink-0 rounded-full border-4 border-white/80 shadow-xl text-3xl md:h-32 md:w-32" />{" "}
            <div>
              <div className="flex flex-wrap items-center justify-center gap-2 md:justify-start">
                <span className="rounded-full bg-white/25 px-3 py-1 text-[11px] font-black uppercase tracking-widest">{side.label}{candidate.party ? ` · ${candidate.party}` : ""}</span>{" "}
                {/^(Primaire|Vainqueur)/.test(candidate.category ?? "") && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/40 ring-1 ring-white/50">
                    {candidate.category?.startsWith("Vainqueur") ? <Trophy size={13} strokeWidth={2.5} /> : <Vote size={13} strokeWidth={2.5} />} {candidate.category}
                  </span>
                )}
              </div>{" "}
              <h2 className="mt-3 text-4xl font-staatliches uppercase leading-none md:text-5xl">{candidate.full_name}</h2>{" "}
              {candidate.declared_at
                ? <p className="mt-2 text-sm font-bold text-white/80">Candidature déclarée le {formatDate(candidate.declared_at)}</p>
                : candidate.category?.startsWith("Primaire") && <p className="mt-2 text-sm font-bold text-white/80">Candidat·e à la {candidate.category.replace(/^Primaire/, "primaire")}</p>}{" "}
              {/* Cloche dorée : suivre ce candidat (membres premium) → son fil arrive sur le profil. */}
              <button onClick={onToggleFollow}
                title={following ? "Ne plus suivre" : "Suivre ce candidat"}
                className={`mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs font-black uppercase tracking-widest transition ${following ? "bg-amber-400 text-foreground shadow-lg shadow-amber-500/30" : "bg-white/15 text-slate-950 ring-1 ring-white/40 hover:bg-white/25"}`}>
                <Bell size={15} className={following ? "fill-slate-900" : ""} />{" "}
                {following ? "Suivi ✓" : isPremium ? "Suivre ce candidat" : "Suivre (Premium)"}
              </button>
            </div>
          </div>
        </div>{" "}

        {/* Barre collante : les trois rubriques de la fiche, et la croix toujours à portée. */}
        <div className="sticky top-0 z-20 flex items-center gap-1 border-b border-border bg-card/95 px-2 py-1.5 backdrop-blur md:px-4">
          <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {RUBRIQUES_FICHE.map(([id, nom]) => (
              <button key={id} type="button" onClick={() => allerA(id)}
                className="min-h-[40px] shrink-0 rounded-full px-3.5 text-[13px] font-bold text-muted-foreground transition hover:bg-muted hover:text-foreground">
                {nom}
              </button>
            ))}
          </div>{" "}
          <button type="button" onClick={onClose} aria-label="Fermer la fiche"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground transition hover:bg-slate-200 dark:hover:bg-slate-700"><X size={20} /></button>
        </div>{" "}

        <div className="p-5 md:p-8">
          {candidate.summary && <p className="mb-4 text-[16px] leading-7 text-slate-700 dark:text-slate-200 md:text-lg">{candidate.summary}</p>}{" "}

          {/* Fil conducteur : fiche du parti */}
          {partyLink && (
            <Link href={`/partis/${partyLink.slug}`}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-border bg-muted px-5 py-3 text-foreground transition hover:border-slate-300 hover:bg-slate-100">
              <span className="flex items-center gap-2 text-sm font-bold"><Landmark size={17} /> Voir la fiche du parti — {partyLink.name}</span>{" "}
              <ArrowRight size={17} />
            </Link>
          )}{" "}

          {/* Fil conducteur : lien vers la fiche parlementaire de la même personne */}
          {mandate && (
            <Link
              href={`/${mandate.type === "senateur" ? "senateurs" : "deputes"}/${mandate.slug}/`}
              className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-blue-200 dark:border-blue-500/25 bg-blue-50 dark:bg-blue-500/10 px-5 py-3 text-blue-800 dark:text-blue-300 transition hover:border-blue-300 hover:bg-blue-100"
            >
              <span className="flex items-center gap-2 text-sm font-bold">
                <Landmark size={17} />{" "}
                Voir aussi sa fiche {mandate.type === "senateur" ? "de sénateur·rice" : "de député·e"}
              </span>{" "}
              <ArrowRight size={17} />
            </Link>
          )}{" "}

          <FactChips candidate={candidate} />{" "}

          {/* PROGRAMME — ce que les lecteurs viennent chercher, donc en premier. */}
          <div id="fiche-programme">
          {candidate.program && (
            <section className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-800 dark:text-amber-300">Programme</h3>{" "}
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-950">{candidate.program}</p>
            </section>
          )}{" "}

          <ProgrammeCandidat proposals={proposals ?? []} sources={sourcesProgramme} />{" "}

          {proposals !== null && proposals.length === 0 && !candidate.program && (
            <section className="mt-8 rounded-2xl border border-dashed border-border bg-muted/50 p-5">
              <h3 className="text-2xl font-staatliches uppercase text-foreground">Son programme</h3>{" "}
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {candidate.full_name} n&apos;a pas encore publié de programme. Le site de son mouvement est relu chaque jour :
                il s&apos;affichera ici, par thème, dès sa parution.
              </p>{" "}
              {!following && (
                <button type="button" onClick={onToggleFollow}
                  className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-full bg-slate-900 px-5 text-[13px] font-black text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                  <Bell size={15} /> {isPremium ? "Être prévenu de sa parution" : "Être prévenu (Premium)"}
                </button>
              )}
            </section>
          )}
          </div>{" "}

          {/* ACTUALITÉ — débats de primaire éventuels, puis le fil presse et vidéos. */}
          <div id="fiche-actu" className="mt-8">
          {/* Ses débats de primaire — rubrique à part, avant le fil général : un débat
              se cherche, il ne se croise pas au fil du défilement. La rubrique s'efface
              d'elle-même pour un candidat qui n'est engagé dans aucune primaire. */}
          <div className="-mx-4">
            <PrimaryDebates candidateSlug={candidate.slug} />
          </div>{" "}

          {/* Fil d'actu quotidien */}
          {/* FIL UNIFIÉ : actualités de presse + vidéos YouTube officielles, en un seul défilement. */}
          {(() => {
            // Débats et vidéos d'abord visibles : jamais plus de deux articles d'affilée tant
            // qu'une vidéo attend (sinon la presse, plus abondante, repoussait toutes les vidéos).
            const parDate = (a: any, b: any) => new Date(b.when || 0).getTime() - new Date(a.when || 0).getTime();
            const articles = (news || []).map((n: any) => ({ kind: "news" as const, when: n.date, data: n })).sort(parDate);
            const medias = [
              ...debatsFil.map((d: any) => ({ kind: "video" as const, when: d.date, data: { ...d, published_at: d.date, debat: true } })),
              ...videos.map((v: any) => ({ kind: "video" as const, when: v.published_at, data: v })),
            ].sort(parDate);
            const feed: { kind: "news" | "video"; when: any; data: any }[] = [];
            let suite = 0;
            while (articles.length || medias.length) {
              const prendreMedia = medias.length && (!articles.length || suite >= 2 || parDate(medias[0], articles[0]) <= 0);
              if (prendreMedia) { feed.push(medias.shift()!); suite = 0; } else { feed.push(articles.shift()!); suite++; }
            }
            return (
              <section className="mt-4">
                <h3 className="text-2xl font-staatliches uppercase text-foreground">Actualités &amp; <span className="text-amber-700 dark:text-amber-400">vidéos</span></h3>{" "}
                <p className="mt-1 text-xs text-muted-foreground">Le fil du candidat — articles de presse, débats télévisés et vidéos de sa chaîne YouTube officielle, lisibles ici, actualisés plusieurs fois par jour. Faites défiler →</p>{" "}
                {news === null ? (
                  <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
                ) : feed.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">Aucune actualité ni vidéo recensée pour l'instant — le fil se met à jour chaque jour.</p>
                ) : (
                  // Rail commun du site : sans barre grise ni ancrage, glisser au doigt ou à la souris.
                  <div className="mt-4">
                  <DragScroller ariaLabel="Actualité et vidéos du candidat" className="items-start gap-3 pb-3 pt-0 md:gap-3">
                    {feed.map(it => it.kind === "video" ? (
                      <button key={`v${it.data.video_id}${it.data.debat ? "d" : ""}`} onClick={() => setSelectedVideo(it.data)} className="group flex w-[280px] shrink-0 select-none flex-col overflow-hidden rounded-2xl border border-border text-left transition hover:border-slate-300 hover:shadow-sm">
                        <div className="relative aspect-video overflow-hidden bg-slate-900">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {it.data.thumbnail_url && <img src={it.data.thumbnail_url} alt={it.data.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />}{" "}
                          <span className="absolute inset-0 flex items-center justify-center"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-foreground shadow-lg"><Play size={20} className="ml-0.5 fill-current" /></span></span>{" "}
                          <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white ${it.data.debat ? "bg-indigo-700" : "bg-red-600"}`}><Play size={10} className="fill-current" /> {it.data.debat ? `Débat${it.data.broadcaster ? ` · ${it.data.broadcaster}` : ""}` : "Vidéo"}</span>
                        </div>{" "}
                        <div className="flex flex-1 flex-col p-4">
                          <span className="text-xs font-bold text-muted-foreground"><CalendarDays className="mr-1 inline" size={13} />{formatDate(it.data.published_at)}</span>{" "}
                          <p className="mt-1.5 font-bold text-foreground">{it.data.title}</p>{" "}
                          {it.data.resume_ia && <p className="mt-1 line-clamp-5 text-[13px] leading-5 text-muted-foreground">{it.data.resume_ia}</p>}{" "}
                          <span className="mt-auto pt-2 text-xs font-bold text-muted-foreground">{it.data.resume_ia ? "YouTube · résumé IA de ce qui est dit" : "YouTube"}</span>
                        </div>{" "}
                      </button>
                    ) : (
                      <button key={`n${it.data.id}`} onClick={() => setSelectedNews(it.data)} className="flex w-[280px] shrink-0 select-none flex-col rounded-2xl border border-border p-4 text-left transition hover:border-slate-300 hover:shadow-sm">
                        <div className="flex items-center justify-between gap-3 text-xs font-bold text-muted-foreground">
                          <span className="rounded-full bg-slate-100 dark:bg-slate-500/10 px-2 py-0.5 uppercase tracking-widest">{it.data.news_type || "actu"}</span>{" "}
                          <span><CalendarDays className="mr-1 inline" size={13} />{formatDate(it.data.date)}</span>
                        </div>{" "}
                        <p className="mt-2 font-bold text-foreground">{it.data.title}</p>{" "}
                        {it.data.summary && <p className="mt-1 line-clamp-5 text-sm leading-6 text-muted-foreground">{it.data.summary}</p>}{" "}
                        {it.data.source_name && <p className="mt-auto pt-2 text-xs font-bold text-muted-foreground">{it.data.source_name}</p>}{" "}
                      </button>
                    ))}
                  </DragScroller>
                  </div>
                )}{" "}
              </section>
            );
          })()}

          </div>{" "}

          {/* PARCOURS — situation judiciaire et biographie, panneaux repliés. */}
          <div id="fiche-parcours" className="mt-10">
            <h3 className="mb-3 text-2xl font-staatliches uppercase text-foreground">Son parcours</h3>{" "}
          {/* Situation juridique — suivi en temps réel des affaires judiciaires */}
          <div className="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm relative overflow-hidden">
            <div className={`absolute top-0 left-0 h-full w-2 ${legalStyle.bar}`} />{" "}
            <div className="flex items-center justify-between gap-4 pl-2">
              <div className="min-w-0">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground">Intégrité &amp; Transparence</p>{" "}
                <h3 className="text-lg font-bold text-foreground">Situation judiciaire</h3>{" "}
                <div className="mt-1 flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${legalStyle.dot}`} />{" "}
                  <span className={`text-[10px] font-black uppercase tracking-widest ${legalStyle.text}`}>
                    {legalStyle.label}
                  </span>
                </div>
              </div>{" "}
              <button
                onClick={() => setShowLegal(true)}
                className={`flex shrink-0 items-center gap-2 rounded-2xl border px-5 py-3 text-[10px] font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${legalStyle.btn}`}
              >
                <ShieldCheck className="h-3.5 w-3.5" />{" "}
                Consulter
              </button>
            </div>
          </div>{" "}

          <div className="grid items-start gap-4 sm:grid-cols-2">
            {BIO_FIELDS.map(([key, label]) => {
              const points = toPoints(candidate.bio?.[key]);
              if (points.length === 0) return null;
              const isTimeline = key === "parcours" || key === "chronologie";
              const wide = isTimeline ? "sm:col-span-2" : "";
              const color = FIELD_COLORS[key];
              const isOpen = openPanels.has(key);
              return (
                <div key={key} className={`min-w-0 self-start overflow-hidden rounded-3xl border border-border bg-card shadow-sm ${wide}`}>
                  {/* En-tête cliquable : déplie/replie le panneau (gain de place). */}
                  <button onClick={() => togglePanel(key)} aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-3 p-5 text-left">
                    <div>
                      <h3 className={`font-staatliches text-2xl uppercase leading-none ${color.head}`}>{label}</h3>{" "}
                      <div className={`mt-1.5 h-1 w-12 rounded-full ${color.bar}`} />
                    </div>{" "}
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{points.length}</span>{" "}
                      <ChevronDown size={20} className={`text-slate-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`} />
                    </span>
                  </button>{" "}
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.28, ease: "easeInOut" }} className="overflow-hidden">
                        <div className="px-5 pb-5">
                          {isTimeline ? (
                            <Timeline points={points} />
                          ) : (
                            <ul className="list-disc space-y-1.5 pl-4 text-sm leading-6 text-slate-700 dark:text-slate-200 marker:text-slate-300">
                              {points.map((p, i) => <li key={i} className="break-words [overflow-wrap:anywhere]"><NumHighlight text={p} />{" "}</li>)}
                            </ul>
                          )}{" "}
                          {key === "controverses" && (
                            <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
                              D&apos;après des sources publiques. Toute personne mise en cause est présumée innocente tant qu&apos;une décision
                              de justice définitive n&apos;a pas établi sa culpabilité.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>{" "}
                </div>
              );
            })}
          </div>{" "}
          <MentionIA texte="Fiche synthétisée par IA à partir de Wikipédia, des sites officiels et de la presse — signalez toute erreur via la page Contact." className="mt-3" />{" "}

          </div>{" "}

          {/* Récap de l'actu EN SITE (comme les fiches de parti) : l'utilisateur lit l'essentiel
              sans quitter le site ; « Lire l'article » reste dispo en discret. */}
          <AnimatePresence>
            {selectedNews && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/70 p-0 sm:items-center sm:p-4"
                onClick={() => setSelectedNews(null)}
              >
                <motion.div
                  initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
                  transition={{ type: "spring", damping: 28, stiffness: 320 }}
                  onClick={e => e.stopPropagation()}
                  className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-[2rem] bg-card p-6 shadow-2xl sm:rounded-[2rem]"
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">{selectedNews.news_type || "actu"}</span>{" "}
                    <button onClick={() => setSelectedNews(null)} className="rounded-full bg-slate-100 dark:bg-slate-500/10 p-2 text-muted-foreground transition hover:bg-slate-200"><X size={18} /></button>
                  </div>{" "}
                  <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{formatDate(selectedNews.date)}</p>{" "}
                  <h3 className="mt-1 text-xl font-black leading-snug text-foreground">{selectedNews.title}</h3>{" "}
                  {selectedNews.summary && <p className="mt-3 leading-7 text-muted-foreground">{selectedNews.summary}</p>}{" "}
                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-4">
                    <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Source : {selectedNews.source_name || "—"}</span>{" "}
                    {selectedNews.source_url && (
                      <a href={selectedNews.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white transition hover:bg-slate-700">
                        Lire l&apos;article <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Lecteur vidéo (embed YouTube officiel) — ouvert au clic sur une carte vidéo du fil. */}
          <AnimatePresence>
            {selectedVideo && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4"
                onClick={() => setSelectedVideo(null)}>
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  onClick={e => e.stopPropagation()} className="w-full max-w-3xl">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="line-clamp-1 text-sm font-bold text-white">{selectedVideo.title}</p>{" "}
                    <button onClick={() => setSelectedVideo(null)} className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"><X size={18} /></button>
                  </div>{" "}
                  <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-2xl">
                    <iframe src={`https://www.youtube-nocookie.com/embed/${selectedVideo.video_id}?autoplay=1&rel=0`} title={selectedVideo.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>{" "}

          {candidate.source_urls && candidate.source_urls.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground">Sources</h3>{" "}
              <div className="mt-2 flex flex-col gap-1">
                {candidate.source_urls.filter(Boolean).map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-700 dark:text-blue-300 hover:underline"><ExternalLink size={13} />{" "}{url}{" "}</a>
                ))}
              </div>
            </section>
          )}
          {/* Bas de fiche : candidat précédent / suivant (dans la liste affichée), ou fermer. */}
          <nav aria-label="Autres candidats" className="mt-10 grid grid-cols-[1fr_auto_1fr] items-stretch gap-2 border-t border-border pt-5">
            {voisins && onOuvrir ? (
              <button type="button" onClick={() => onOuvrir(voisins.precedent)}
                className="flex min-h-[48px] min-w-0 items-center gap-2 rounded-2xl border border-border px-3 text-left transition hover:bg-muted">
                <ArrowRight size={16} className="shrink-0 rotate-180 text-muted-foreground" />{" "}
                <span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Précédent</span>{" "}<span className="block truncate text-[13px] font-bold text-foreground">{voisins.precedent.full_name}</span></span>
              </button>
            ) : <span />}{" "}
            <button type="button" onClick={onClose}
              className="min-h-[48px] rounded-2xl bg-slate-900 px-4 text-[13px] font-black text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">Fermer</button>{" "}
            {voisins && onOuvrir ? (
              <button type="button" onClick={() => onOuvrir(voisins.suivant)}
                className="flex min-h-[48px] min-w-0 items-center justify-end gap-2 rounded-2xl border border-border px-3 text-right transition hover:bg-muted">
                <span className="min-w-0"><span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Suivant</span>{" "}<span className="block truncate text-[13px] font-bold text-foreground">{voisins.suivant.full_name}</span></span>{" "}
                <ArrowRight size={16} className="shrink-0 text-muted-foreground" />
              </button>
            ) : <span />}
          </nav>
        </div>
      </div>
    </div>{" "}
    <LegalStatusModal isOpen={showLegal} onClose={() => setShowLegal(false)} deputy={legalPerson} cible={{ type: "candidate", slug: candidate.slug }} />
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
  if (issues.length === 0) return <div className="mx-auto max-w-3xl px-4 pb-24 text-center text-muted-foreground">Les positions seront disponibles très bientôt.</div>;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24">
      <p className="mb-8 text-center text-sm text-muted-foreground">Position de chaque candidat sur les grands enjeux — cliquez sur un candidat pour le détail et la source.</p>{" "}
      {categories.map(({ cat, items }) => (
        <div key={cat} className="mb-12">
          <h2 className="mb-5 text-xl font-staatliches uppercase tracking-wide text-foreground">{cat}</h2>{" "}
          <div className="space-y-4">
            {items.map(issue => {
              const groups: Record<string, Candidate[]> = { pour: [], nuance: [], contre: [] };
              for (const c of candidates) {
                const p = posMap.get(`${c.slug}|${issue.slug}`);
                if (p && groups[p.stance]) groups[p.stance].push(c);
              }
              return (
                <div key={issue.slug} className="rounded-3xl border border-border bg-card p-5 shadow-sm">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{issue.title}</p>{" "}
                  <h3 className="mb-4 text-lg font-bold text-foreground">{issue.proposition} ?</h3>{" "}
                  <div className="grid gap-4 md:grid-cols-3">
                    {(["pour", "nuance", "contre"] as const).map(stance => (
                      <div key={stance}>
                        <div className="mb-2 flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full ${STANCE_META[stance].dot}`} />{" "}
                          <span className={`text-[11px] font-black uppercase tracking-widest ${STANCE_META[stance].text}`}>{STANCE_META[stance].label} ({groups[stance].length})</span>
                        </div>{" "}
                        <div className="flex flex-wrap gap-2">
                          {groups[stance].length === 0 ? <span className="text-xs text-slate-300">—</span> : groups[stance].map(c => (
                            <button key={c.slug} onClick={() => setDetail({ c, issue, pos: posMap.get(`${c.slug}|${issue.slug}`) })}
                              className={`inline-flex items-center gap-2 rounded-full bg-muted py-1 pl-1 pr-3 ring-1 ${STANCE_META[stance].ring} transition hover:bg-slate-100`}>
                              <CandidateAvatar c={c} taille={24} className="h-6 w-6 rounded-full text-[9px]" />{" "}
                              <span className="text-xs font-bold text-foreground">{c.full_name}</span>{" "}
                            </button>
                          ))}
                        </div>{" "}
                      </div>
                    ))}
                  </div>{" "}
                </div>
              );
            })}
          </div>{" "}
        </div>
      ))}{" "}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4" onClick={() => setDetail(null)}>
          <div className="w-full max-w-lg rounded-3xl bg-card p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <CandidateAvatar c={detail.c} taille={48} className="h-12 w-12 rounded-full text-sm" />{" "}
              <div>
                <p className="font-black text-foreground">{detail.c.full_name}</p>{" "}
                <p className="text-xs font-bold text-muted-foreground">{detail.issue.title}</p>
              </div>{" "}
              <button onClick={() => setDetail(null)} className="ml-auto rounded-full bg-slate-100 dark:bg-slate-500/10 p-2"><X size={18} /></button>
            </div>{" "}
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black uppercase tracking-widest ${detail.pos?.stance === "pour" ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : detail.pos?.stance === "contre" ? "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-300" : "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
              {STANCE_META[detail.pos?.stance]?.label ?? "—"} · {detail.issue.proposition}
            </span>{" "}
            <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">{detail.pos?.summary || "Position non détaillée."}</p>{" "}
            {detail.pos?.source_url && (
              <a href={detail.pos.source_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-blue-700 dark:text-blue-300 hover:underline">
                <ExternalLink size={14} /> Source ({detail.pos.source_type === "wikipedia" ? "Wikipédia" : detail.pos.source_type === "vote" ? "Vote au Parlement" : detail.pos.source_type === "programme" ? "Programme officiel" : detail.pos.source_type})
              </a>
            )}{" "}
            <p className="mt-3 text-[11px] italic text-muted-foreground">Position résumée automatiquement à partir de la source. Vérifiez la source pour le détail exact.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CandidatesContent() {
  const params = useSearchParams();
  const [bruts, setBruts] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<string>("Tous");
  const [view, setView] = useState<"candidats" | "positions" | "enjeux" | "dynamiques">("candidats");

  // Les primaires déjà tranchées. Un battu n'est plus candidat : sa fiche disparaît de toute la
  // page (liste, positions, enjeux, dynamiques), y compris le soir du vote, quand seule la
  // presse a parlé et que la base n'a pas encore été mise à jour.
  const [votes, setVotes] = useState<any[] | null>(null);
  const issues = useMemo(() => resultatsPrimaires(votes), [votes]);
  const battus = useMemo(() => new Set(issues.flatMap(r => r.perdants)), [issues]);
  const investis = useMemo(() => new Set(issues.map(r => r.vainqueur)), [issues]);
  const primairesTranchees = useMemo(() => issues.map(r => r.primaire), [issues]);

  const candidates = useMemo(() => bruts.map(c => (
    // Sa primaire est gagnée : il n'y est plus « candidat », il en est le vainqueur.
    c.category?.startsWith("Primaire") && investis.has(c.slug)
      ? { ...c, category: c.category.replace(/^Primaire/, "Vainqueur de la primaire") } : c
  )).filter(c => !battus.has(c.slug)), [bruts, battus, investis]);

  useEffect(() => {
    api.getCandidates().then(data => { setBruts(data as Candidate[]); }).finally(() => setLoading(false));
  }, []);
  useEffect(() => { api.getPrimaryEvents(40).then(setVotes).catch(() => setVotes([])); }, []);

  // Ouverture directe d'un onglet depuis un lien extérieur (#veille, #enjeux, #positions).
  // Sans cela, un lien vers /presidentielles-2027#veille atterrissait sur l'onglet
  // « Candidats » et l'ancre ne menait nulle part, la section n'étant pas montée.
  useEffect(() => {
    const byHash: Record<string, "positions" | "enjeux" | "dynamiques"> = {
      "#veille": "dynamiques", "#dynamiques": "dynamiques", "#sondages": "dynamiques",
      "#presse": "dynamiques", "#temps-de-parole": "dynamiques",
      "#enjeux": "enjeux", "#positions": "positions",
    };
    const hash = window.location.hash;
    const wanted = byHash[hash];
    if (!wanted) return;
    setView(wanted);
    // L'onglet doit être monté avant que le navigateur puisse rejoindre l'ancre.
    const t = setTimeout(() => {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: "smooth" });
    }, 900);   // le temps que la section charge ses données
    return () => clearTimeout(t);
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
  // Fiche suivante / précédente dans la liste affichée (filtre et recherche compris) : on
  // passe d'un candidat à l'autre sans refermer, rouvrir et retrouver sa place dans la grille.
  const rang = selectedSlug ? filtered.findIndex(c => c.slug === selectedSlug) : -1;
  const voisins = rang >= 0 && filtered.length > 1
    ? { precedent: filtered[(rang - 1 + filtered.length) % filtered.length], suivant: filtered[(rang + 1) % filtered.length] }
    : null;

  // « Trouver un candidat » : le champ de recherche, juste sous l'en-tête, clavier ouvert. Le
  // focus est donné tout de suite (dans le geste) : iOS n'ouvre pas le clavier après un délai.
  const trouverCandidat = () => {
    const champ = document.getElementById("recherche-elu") as HTMLInputElement | null;
    if (!champ) return;
    champ.focus({ preventScroll: true });
    window.scrollTo({ top: champ.getBoundingClientRect().top + window.scrollY - 140, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      {/* Sur téléphone (29/10/2026) : le titre géant et ses marges remplissaient tout le premier
          écran, et les onglets débordaient (« Enjeux » coupé, « Dynamiques » invisible). Hero
          resserré, onglets sur toute la largeur, et une action : trouver un candidat. */}
      <div className="relative overflow-hidden px-4 pb-6 pt-8 text-center md:py-24">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-500/10 blur-[120px]" />{" "}
        <div className="absolute right-1/4 top-10 h-96 w-96 translate-x-1/2 rounded-full bg-red-500/10 blur-[120px]" />{" "}
        <div className="relative mx-auto max-w-5xl">
          <span className="hidden rounded-full border border-border bg-card px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground shadow-sm md:inline">Mis à jour chaque jour</span>{" "}
          <h1 className="text-5xl font-staatliches uppercase leading-none tracking-tight text-foreground md:mt-6 md:text-8xl">
            Présidentielles <span className="bg-gradient-to-r from-blue-600 to-red-600 bg-clip-text text-transparent">2027</span>
          </h1>{" "}
          <div className="mx-auto mt-6 hidden h-1.5 w-40 rounded-full bg-gradient-to-r from-blue-600 to-red-600 md:block" />{" "}
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-snug text-muted-foreground md:hidden">
            Les candidats, leur programme et leur actualité, mis à jour chaque jour.
          </p>{" "}
          <p className="mx-auto mt-6 hidden max-w-2xl text-lg font-medium italic tracking-tight text-muted-foreground md:block md:text-xl">
            Tous les candidats officiellement déclarés, leur parcours détaillé et l'actualité de la campagne, actualisés automatiquement.
          </p>{" "}
          {/* Onglets Candidats / Positions / Enjeux / Dynamiques */}
          <div className="mx-auto mt-5 grid max-w-md grid-cols-4 gap-1 rounded-2xl border border-border bg-card p-1 shadow-sm md:mt-8 md:inline-flex md:max-w-none md:rounded-full">
            {([["candidats", "Candidats"], ["positions", "Positions"], ["enjeux", "Enjeux"], ["dynamiques", "Dynamiques"]] as const).map(([key, label]) => (
              // « Dynamiques » est un outil de l'abonnement Pro : il porte donc les
              // couleurs du Pro, actif comme inactif, pour se distinguer des autres onglets.
              <button key={key} onClick={() => setView(key)} aria-pressed={view === key}
                className={`min-h-[40px] rounded-xl px-1 text-[10.5px] font-black uppercase tracking-wide transition md:rounded-full md:px-6 md:py-2 md:text-sm md:tracking-widest ${
                  key === "dynamiques"
                    ? view === key
                      ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-[0_0_18px_-2px_rgba(217,70,239,0.7)]"
                      : "text-fuchsia-700 dark:text-fuchsia-400 hover:bg-fuchsia-50"
                    : view === key
                      ? "bg-slate-900 text-white"
                      : "text-muted-foreground hover:text-foreground"
                }`}>
                {label}{" "}
              </button>
            ))}
          </div>{" "}
          {view === "candidats" && (
            <button type="button" onClick={trouverCandidat}
              className="mx-auto mt-4 flex min-h-[48px] w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-slate-900 text-[15px] font-black text-white shadow-lg transition active:scale-[0.98] dark:bg-white dark:text-slate-900 md:hidden">
              <Search size={18} /> Trouver un candidat
            </button>
          )}
        </div>
      </div>{" "}

      {view === "dynamiques" ? (
        // Sondages (ouverts à tous) puis veille presse, télé-radio et réseaux (Pro).
        <DynamiquesView candidates={candidates} />
      ) : view === "enjeux" ? (
        <ThemesView />
      ) : view === "positions" ? (
        <PositionsView candidates={candidates} />
      ) : (
      <>
      {/* Le bandeau de la primaire « Choisir 2027 » (résultat du 11/10/2026, détail du vote,
          débats) a été retiré à la demande de l'éditeur le 29/10/2026 : il passait avant la liste
          des candidats. La carte du vainqueur garde sa pastille, sa fiche garde les débats.
          Les débats d'une primaire encore à venir s'affichent toujours ici. */}
      <PrimaryDebates sauf={primairesTranchees} />{" "}
      <div className="mx-auto max-w-6xl px-4 pb-24">
        {/* Recherche et bords : une seule ligne collante, toujours à portée de pouce (ils étaient
            sous le bandeau de la primaire, sur trois lignes de pastilles). */}
        <div className="sticky top-16 z-20 -mx-4 mb-5 border-b border-border bg-background/95 px-4 py-2.5 backdrop-blur md:static md:mx-0 md:mb-10 md:flex md:flex-row-reverse md:items-center md:justify-between md:gap-5 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input id="recherche-elu" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un candidat…" enterKeyHint="search"
              className="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-[16px] text-foreground shadow-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 md:py-3" />
          </div>{" "}
          <div className="-mx-4 mt-2 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:mt-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
            {sideTabs.map(tab => (
              <button key={tab} onClick={() => setSide(tab)} aria-pressed={side === tab}
                className={`min-h-[36px] shrink-0 rounded-full px-3.5 text-[13px] font-bold transition md:px-4 md:py-2 md:text-sm ${side === tab ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900" : "border border-border bg-card text-muted-foreground hover:bg-muted"}`}>
                {tab === "Tous" ? "Tous" : SIDES[tab].label}{" "}
              </button>
            ))}
          </div>
        </div>{" "}
        {!loading && (
          <p className="mb-3 text-[13px] font-bold text-muted-foreground">
            {filtered.length} candidat{filtered.length > 1 ? "s" : ""}{side !== "Tous" ? ` · ${SIDES[side]?.label}` : ""}{search ? ` · « ${search} »` : ""}
            {(side !== "Tous" || search) && (
              <button type="button" onClick={() => { setSide("Tous"); setSearch(""); }} className="ml-2 font-black text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">Tout afficher</button>
            )}
          </p>
        )}

        {loading ? (
          <div className="flex flex-col items-center py-24 text-muted-foreground"><Loader2 className="mb-4 h-12 w-12 animate-spin" />{" "}<p>Chargement des candidats…</p></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card py-20 text-center text-muted-foreground">
            <div className="mb-3 text-5xl">🗳️</div>{" "}
            <p className="text-lg font-bold">Aucun candidat pour ce filtre.</p>{" "}
            <p className="mt-1 text-sm">Les nouveaux candidats déclarés sont ajoutés automatiquement chaque jour.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {filtered.map(c => {
              const s = sideOf(c);
              return (
                // Cartes immobiles : le flottement perpétuel (une animation JavaScript
                // infinie par carte, des dizaines à la fois) alourdissait toute la page.
                // Reste un léger soulèvement au survol, en CSS, qui ne coûte rien au repos.
                <button
                  key={c.id}
                  onClick={() => open(c)}
                  className={`group overflow-hidden rounded-2xl border-b-4 bg-card text-left shadow-lg shadow-slate-900/10 ring-1 ring-slate-200 transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 dark:ring-slate-800 ${s.borderb}`}
                >
                  <div className="relative">
                    {/* Photo claire, sans voile sombre, cadrage portrait centré sur le visage. */}
                    <CandidateAvatar c={c} taille={250} className="aspect-[4/5] w-full text-3xl" />{" "}
                    <span className={`absolute left-2.5 top-2.5 rounded-full ${s.badge} px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white shadow-lg ring-1 ring-white/30`}>{s.label}</span>{" "}
                    {c.category?.startsWith("Primaire") && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/40 ring-1 ring-white/50 backdrop-blur-sm">
                        <Vote size={10} strokeWidth={2.5} /> Primaire
                      </span>
                    )}
                    {c.category?.startsWith("Vainqueur") && (
                      <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-gradient-to-br from-amber-300 via-amber-400 to-orange-500 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-lg shadow-orange-500/40 ring-1 ring-white/50 backdrop-blur-sm">
                        <Trophy size={10} strokeWidth={2.5} /> Vainqueur de primaire
                      </span>
                    )}
                  </div>{" "}
                  {/* Bandeau plein coloré façon bulle FAQ : nom + parti en blanc. */}
                  <div className={`bg-gradient-to-br ${s.from} ${s.to} px-3.5 py-2.5 text-white`}>
                    <h3 className="text-lg font-staatliches uppercase leading-none drop-shadow-sm">{c.full_name}</h3>{" "}
                    {c.party && <p className="mt-0.5 text-xs font-bold text-white/85">{c.party}</p>}
                  </div>{" "}
                  {/* Sur téléphone, le résumé (deux lignes coupées au milieu) alourdissait chaque carte :
                      la carte entière ouvre la fiche, le bouton suffit à le dire. */}
                  <div className="p-2.5 md:p-3.5">
                    {c.summary && <p className="line-clamp-2 text-xs leading-5 text-muted-foreground max-md:hidden">{c.summary}</p>}{" "}
                    <span className={`inline-flex items-center gap-1 rounded-full bg-gradient-to-r ${s.from} ${s.to} px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-md transition-transform group-hover:translate-x-0.5 md:mt-3`}>Voir la fiche →</span>
                  </div>{" "}
                </button>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}

      {selected && <CandidateModal key={selected.slug} candidate={selected} onClose={close} voisins={voisins} onOuvrir={open} />}
    </div>
  );
}

export default function Presidentielles2027Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-muted" />}>
      <CandidatesContent />
    </Suspense>
  );
}
