"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePremium } from "@/lib/hooks/usePremium";
import { lienPaiementStripe } from "@/lib/utils";
import AccordAchat from "@/components/premium/AccordAchat";
import { CheckCircle2, Check, Minus, Gift, Star, FileText, ArrowRight, Scale, BellRing, X, Sparkles, Vote, MapPin, AlertTriangle, Target, GitBranch, Pencil, HelpCircle, LineChart, ChevronDown, ShieldCheck, Lock } from "lucide-react";
import { PLANS, SALES_OPEN } from "@/lib/constants";
import Link from "next/link";
import EspacePersonnel from "@/components/dashboard/EspacePersonnel";

/* ── Prix à la française : 3,99 € ── */
const fmtPrice = (n: number) => `${n.toFixed(2).replace(".", ",").replace(",00", "")} €`;

/*
 * Le comparatif des formules (30/10/2026, d'après une vidéo d'utilisateur sur téléphone) :
 * une colonne par formule, de plus en plus de cases cochées. Chaque ligne correspond à un
 * verrou RÉEL du site (usePremium / isPro dans le composant cité en commentaire) : n'ajouter
 * une ligne que si la fonctionnalité existe et est bien réservée à cette formule.
 *
 * Valeur d'une case : true (inclus), false (non inclus) ou un court texte (inclus en partie).
 */
type Case = boolean | string;
type Ligne = { t: string; d?: string; g: Case; p: Case; x: Case; demo?: "law" | "notif"; href?: string; lien?: string };
type Groupe = { titre: string; icone: any; pro?: boolean; lignes: Ligne[] };

const COMPARATIF: Groupe[] = [
  {
    titre: "Comprendre les lois", icone: Scale, lignes: [
      { t: "Toutes les lois et tous les votes, résumés simplement", g: true, p: true, x: true },
      // UniversalLawModal, AnalyseApprofondie
      { t: "L'analyse détaillée de chaque loi", d: "Ce qu'elle change, avant / après, qui a voté quoi, lue dans le texte officiel", g: false, p: true, x: true, demo: "law", lien: "Voir un exemple" },
      // VoteDetailsModal
      { t: "Chaque vote d'élu expliqué", g: false, p: true, x: true },
      // PlfExplorer, executif/budget
      { t: "Le budget de l'État, mission par mission", d: "Budget 2027 décrypté et comparé aux années précédentes", g: false, p: true, x: true, href: "/executif/plf", lien: "Voir le budget" },
      // SaveLawButton
      { t: "Vos lois favorites, suivies jusqu'au Journal officiel", g: false, p: true, x: true },
    ],
  },
  {
    titre: "Vos élus et votre territoire", icone: MapPin, lignes: [
      { t: "Fiches des élus, candidats, Europe et collectivités", g: true, p: true, x: true },
      // FollowButton, DeputyClient
      { t: "Suivre vos députés, sénateurs et eurodéputés", d: "Une alerte à chacun de leurs votes, expliqué", g: false, p: true, x: true, demo: "notif", lien: "Voir le fil d'alertes" },
      // EspacePersonnel (verrou « alertes »)
      { t: "Alertes personnalisées, aussi par e-mail", d: "Selon vos centres d'intérêt, votre commune et votre département", g: false, p: true, x: true },
      // local/budget, CommuneDetailPanel
      { t: "Les budgets de votre commune, département et région", d: "Recettes, dépenses, dette et fiscalité expliquées (DGFiP)", g: false, p: true, x: true, href: "/local", lien: "Explorer" },
      // local/comparateur, local/radar
      { t: "Comparateur de communes et radar des grands travaux", g: false, p: true, x: true },
      // SenatorClient
      { t: "La liste complète et la carte des sénateurs", g: false, p: true, x: true },
      // presidentielles-2027 (cloche)
      { t: "Suivre les candidats à la présidentielle", g: false, p: true, x: true },
      // CommissionAuditions, AuditionsParMois
      { t: "Les auditions des ministres et des commissions", g: false, p: "Résumé", x: "Analyse complète" },
    ],
  },
  {
    titre: "Veille professionnelle", icone: LineChart, pro: true, lignes: [
      { t: "« Tout sur un sujet »", d: "Tapez « apprentissage » : montants en vigueur, textes précis avec leur lien Légifrance, aides, débats en cours", g: false, p: false, x: true },
      // CommissionsRegistre, CommissionTracker
      { t: "Les commissions de l'Assemblée et du Sénat, réunion par réunion", d: "Compte rendu intégral et analyse : positions, chiffres avancés, suites annoncées", g: false, p: false, x: true },
      // AmendementsAN
      { t: "Les amendements de l'Assemblée en temps réel", d: "Auteur, groupe, article visé, sort — relevés toutes les heures", g: false, p: false, x: true },
      // JournalOfficielDuJour, JorfSearch
      { t: "Le Journal officiel du jour, expliqué et cherchable", g: false, p: false, x: true },
      { t: "Des e-mails à la carte, chaque jour ou chaque semaine", d: "Enrichis et vérifiés : l'essentiel, les chiffres clés, le rapport de force, la suite", g: false, p: false, x: true },
      // SuivreBouton
      { t: "Suivre partis, ministères, candidats et commissions", d: "Le vote de chaque parti suivi, à chaque scrutin", g: false, p: false, x: true },
      // DynamiquesView, CandidateSocialTracker, PrimaryDebates
      { t: "Veille presse, temps de parole et réseaux sociaux des candidats", d: "Avec le compte rendu écrit des débats télévisés", g: false, p: false, x: true },
      { t: "Recherche plein texte dans les comptes rendus", g: false, p: false, x: true },
      { t: "Export des données (CSV)", g: false, p: false, x: true },
    ],
  },
];

/*
 * Le comparatif par défaut, en neuf lignes (31/10/2026) : les 22 lignes d'affilée faisaient
 * un tableau interminable sur téléphone. Chaque ligne résume des lignes de COMPARATIF, qui
 * reste affiché en entier d'un clic (« Voir le détail »).
 */
const ESSENTIEL: Groupe[] = [
  {
    titre: "Comprendre", icone: Scale, lignes: [
      { t: "Lois et votes résumés simplement", g: true, p: true, x: true },
      { t: "Analyse détaillée de chaque loi et de chaque vote", g: false, p: true, x: true, demo: "law", lien: "Voir un exemple" },
      { t: "Budgets de l'État et de votre commune décryptés", g: false, p: true, x: true },
    ],
  },
  {
    titre: "Suivre", icone: MapPin, lignes: [
      { t: "Vos élus suivis, une alerte à chacun de leurs votes", g: false, p: true, x: true, demo: "notif", lien: "Voir le fil" },
      { t: "Alertes sur votre territoire, aussi par e-mail", g: false, p: true, x: true },
      { t: "Auditions des ministres et des commissions", g: false, p: "Résumé", x: "Analyse" },
    ],
  },
  {
    titre: "Veille professionnelle", icone: LineChart, pro: true, lignes: [
      { t: "Commissions et amendements en temps réel", g: false, p: false, x: true },
      { t: "Journal officiel du jour et « Tout sur un sujet »", g: false, p: false, x: true },
      { t: "E-mails à la carte et veille presse des candidats", g: false, p: false, x: true },
    ],
  },
];
const NB_DETAIL = COMPARATIF.reduce((n, g) => n + g.lignes.length, 0);

/*
 * Parrainage (règles générales de parrainage_reglages : 20 % de chaque paiement du filleul,
 * pendant 12 mois, validé après 30 jours, versé dès 20 €). Ouvert à tous les comptes, même
 * gratuits. Si ces réglages changent en base, changer ces deux nombres.
 */
const PARRAINAGE = { taux: 0.2, dureeMois: 12, validationJours: 30, seuil: 20 };

/* ══════════ Démo 1 : une VRAIE analyse détaillée, rendue avec le VRAI design du site ══════════ */
// Analyse réelle (report des élections en Nouvelle-Calédonie) — telle qu'affichée aux membres
// premium : sections en cartes, chiffres surlignés. Aucun contenu inventé.
const DEMO_ANALYSIS = {
  title: "Report du renouvellement des institutions de la Nouvelle-Calédonie",
  category: "Institutions",
  status: "Promulguée",
  text: `**Contexte et objectif** : le texte reporte le renouvellement des institutions calédoniennes – initialement prévu en mai 2024, puis reporté à décembre 2024 – afin de laisser une fenêtre de dialogue pour un accord consensuel sur le statut futur de l'archipel. **Procédure accélérée** : le gouvernement a déclaré l'urgence le 2 octobre 2024, ce qui a permis une navette parlementaire rapide (Sénat le 23 octobre, Assemblée nationale le 5 novembre). **Amendements clés** : l'amendement proposant un report au 30 mai 2025 a été rejeté, tandis que l'amendement des rapporteurs fixant l'échéance au 30 novembre 2025 a été adopté. Un amendement technique a prévu une entrée en vigueur dès le lendemain de la publication pour respecter les délais de convocation des électeurs. **Votes** : le texte a été adopté sans opposition en première lecture à l'Assemblée nationale (297 pour, 0 contre) et au Sénat (324 pour, 0 contre, 19 abstentions). La commission mixte paritaire a été saisie, et le texte définitif a été adopté par l'Assemblée (279 pour, 247 contre, 9 abstentions) et le Sénat (298 pour, 39 contre, 5 abstentions). Le Conseil constitutionnel, saisi le 6 novembre, a validé le texte le 13 novembre. **Limites de l'analyse** : les sources ne précisent pas les positions des groupes minoritaires calédoniens autres que ceux représentés par les amendements rejetés. Le report à novembre 2025 résulte d'un compromis entre continuité institutionnelle et temps laissé aux négociations politiques.`,
};

// Mêmes helpers que le rendu réel (LawsClient) : découpage des sections + surlignage des chiffres.
const NUM_RE = /(\d[\d  .]*\s?(?:%|€|Md€|M€|milliards?|millions?)|\d{1,4}\s?(?:pour|contre|abstentions?|voix|sièges)|\d+(?:[.,]\d+)?)/gi;
function HL({ text }: { text: string }) {
  const parts = String(text || "").split(NUM_RE);
  return <>{parts.map((p, i) => i % 2 === 1
    ? <span key={i} className="rounded-md bg-amber-400/25 px-1 font-black text-amber-900 dark:text-amber-300 whitespace-nowrap">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}
function sectionStyle(header: string) {
  const h = header.toLowerCase();
  if (/vote|scrutin/.test(h)) return { Icon: Vote, c: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" };
  if (/limite|réserve/.test(h)) return { Icon: AlertTriangle, c: "text-slate-500", bg: "bg-slate-50 dark:bg-slate-800" };
  if (/contexte|objectif|objet|mesure/.test(h)) return { Icon: Target, c: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" };
  if (/procédure|navette|étape|calendrier/.test(h)) return { Icon: GitBranch, c: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" };
  if (/amendement/.test(h)) return { Icon: Pencil, c: "text-fuchsia-700 dark:text-fuchsia-400", bg: "bg-fuchsia-50 dark:bg-fuchsia-500/10" };
  if (/problème|enjeu|pourquoi/.test(h)) return { Icon: HelpCircle, c: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10" };
  return { Icon: FileText, c: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" };
}
function parseSections(raw: string) {
  const re = /\*\*(.+?)\*\*\s*:?\s*/g;
  const out: { header: string; body: string }[] = [];
  let m: RegExpExecArray | null, lastIdx = 0, lastHeader: string | null = null;
  while ((m = re.exec(raw))) {
    if (lastHeader !== null) out.push({ header: lastHeader, body: raw.slice(lastIdx, m.index).trim() });
    lastHeader = m[1].trim(); lastIdx = re.lastIndex;
  }
  if (lastHeader !== null) out.push({ header: lastHeader, body: raw.slice(lastIdx).trim() });
  return out.filter(s => s.body.length > 1);
}

function LawExampleModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const d = DEMO_ANALYSIS;
  const sections = parseSections(d.text);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md" />{" "}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }}
            className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-6 pr-14 text-white shrink-0">
              <div className="absolute inset-0 opacity-[0.15] bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.6),transparent_60%)]" />{" "}
              <button onClick={onClose} className="absolute right-4 top-4 z-10 rounded-full bg-white/15 p-2 hover:bg-white/25 transition" aria-label="Fermer"><X size={18} /></button>{" "}
              <p className="relative flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.25em] text-amber-400"><Scale size={12} /> Exemple réel · Analyse détaillée</p>{" "}
              <h3 className="relative mt-2 text-lg sm:text-xl font-bold leading-tight">{d.title}</h3>{" "}
              <div className="relative mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white/80">{d.category}</span>{" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-300"><CheckCircle2 size={11} /> {d.status}</span>
              </div>
            </div>{" "}

            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {sections.map((s, i) => {
                  const { Icon, c, bg } = sectionStyle(s.header);
                  const wide = /vote|scrutin|contexte|objectif|objet/i.test(s.header) ? "sm:col-span-2" : "";
                  return (
                    <div key={i} className={`rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm ${wide}`}>
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${c}`}><Icon size={16} /></span>{" "}
                        <h4 className={`text-[11px] font-black uppercase tracking-widest ${c}`}>{s.header}</h4>
                      </div>{" "}
                      <p className="text-[13.5px] leading-6 text-slate-700 dark:text-slate-300"><HL text={s.body} /></p>{" "}
                    </div>
                  );
                })}
              </div>{" "}
              <p className="mt-4 text-[10px] italic text-muted-foreground">Exemple réel d&apos;un décryptage Premium — le design exact affiché sur chaque loi.</p>
            </div>{" "}

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <Link href="/lois" className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 font-black uppercase tracking-widest text-xs hover:brightness-110 transition">
                <Sparkles size={14} /> Voir tous les décryptages
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ══════════ Démo 2 : le fil de notifications d'un élu suivi ══════════ */
const DEMO_NOTIFS = [
  { kind: "vote", who: "Votre député·e a voté", pos: "POUR", title: "Projet de loi de finances 2027", when: "il y a 2 h", color: "#059669" },
  { kind: "vote", who: "Sénateur·rice suivi·e a voté", pos: "CONTRE", title: "Proposition de loi sur le logement", when: "hier", color: "#e11d48" },
  { kind: "info", dom: "Écologie & énergie", title: "Nouvelle loi sur la résilience des territoires forestiers", when: "hier", color: "#16a34a" },
  { kind: "local", dom: "Ma commune", title: "Conseil municipal : le budget 2027 voté", when: "il y a 3 j", color: "#ea580c" },
];
function NotifDemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" />{" "}
          <motion.div initial={{ opacity: 0, y: 40, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 40, scale: 0.98 }}
            className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
            <div className="relative bg-gradient-to-br from-purple-600 to-fuchsia-700 p-6 pr-14 text-white shrink-0">
              <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 hover:bg-white/30 transition" aria-label="Fermer"><X size={18} /></button>{" "}
              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-white/80"><BellRing size={12} /> Votre fil d'alertes</p>{" "}
              <p className="mt-1 text-[11px] text-white/70">Un aperçu de ce qui vous attend, en temps réel.</p>
            </div>{" "}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {/* mini en-tête façon fil réel */}
              <div className="flex items-center justify-between px-1 pb-1">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600"><BellRing size={15} /></span>{" "}
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Mes alertes</span>
                </div>{" "}
                <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[10px] font-black text-white">4 nouvelles</span>
              </div>{" "}
              {DEMO_NOTIFS.map((n, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i }}
                  className="flex items-start gap-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 p-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: n.color + "22", color: n.color }}>
                    {n.kind === "vote" ? <Vote size={17} /> : n.kind === "local" ? <MapPin size={17} /> : <FileText size={17} />}
                  </span>{" "}
                  <div className="min-w-0 flex-1">
                    {n.kind === "vote" ? (
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{n.who} <span style={{ color: n.color }}>{n.pos}</span></p>
                    ) : (
                      <p className="text-sm font-bold leading-snug text-slate-900 dark:text-white">{n.title}</p>
                    )}{" "}
                    {n.kind === "vote" ? <p className="text-xs text-slate-500 line-clamp-1">« {n.title} »</p> : null}{" "}
                    <div className="mt-1 flex items-center gap-2">
                      {n.dom && <span className="rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-white" style={{ backgroundColor: n.color }}>{n.dom}</span>}{" "}
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{n.when}</span>
                    </div>
                  </div>{" "}
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />{" "}
                </motion.div>
              ))}
            </div>{" "}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/30">
              <Link href="/dashboard" className="block text-center py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold text-sm hover:opacity-90 transition">Configurer mes alertes</Link>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

/**
 * La page /premium sert deux publics opposés.
 *
 * Pour un visiteur ou un abonné Premium, c'est la page d'offre : elle vend.
 * Pour un abonné Pro, elle n'a plus rien à vendre — il a tout souscrit — et elle
 * devient son espace de travail, sous le titre « Mon espace Pro ». Le lien du menu
 * ne change donc jamais de place : il mène toujours là où le lecteur a affaire.
 */
export default function PremiumPage() {
  const { tierAffiche, loading: aboEnCours, niveauMemorise } = usePremium();
  // Le niveau retenu de la visite précédente décide tout de suite : sans lui, chaque
  // passage du tableau de bord à l'espace Pro repassait par un écran d'attente. Il ne
  // sert qu'à choisir quelle page dessiner, jamais à ouvrir un accès : l'espace lui-même
  // ne montre de contenu réservé qu'une fois le niveau vérifié.
  if (aboEnCours && !niveauMemorise) return <div className="min-h-screen bg-slate-950" />;
  if (tierAffiche === "pro") return <EspacePersonnel mode="espace" />;
  return <PageOffre />;
}

/* ── Une case du comparatif ── */
function CaseFormule({ v, ton }: { v: Case; ton: "g" | "p" | "x" }) {
  if (v === false) return <Minus size={16} className="mx-auto text-slate-300 dark:text-slate-600" aria-label="Non inclus" />;
  const couleur = ton === "p" ? "bg-amber-400 text-slate-950" : ton === "x" ? "bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white" : "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200";
  if (v === true) return <span className={`mx-auto flex h-6 w-6 items-center justify-center rounded-full ${couleur}`} aria-label="Inclus"><Check size={14} strokeWidth={3} /></span>;
  return (
    <span className="mx-auto flex flex-col items-center gap-1">
      <span className={`flex h-6 w-6 items-center justify-center rounded-full ${couleur}`} aria-hidden><Check size={14} strokeWidth={3} /></span>
      <span className={`text-center text-[10px] font-bold leading-tight ${ton === "x" ? "text-fuchsia-700 dark:text-fuchsia-300" : "text-amber-800 dark:text-amber-300"}`}>{v}</span>
    </span>
  );
}

const FAQ: { q: string; r: string }[] = [
  { q: "Quelle différence entre Premium et Pro ?", r: "Premium vous fait comprendre en détail : chaque loi analysée, vos élus et votre territoire suivis, des alertes sur ce qui vous concerne. Pro ajoute les outils de veille des professionnels : commissions réunion par réunion, amendements en temps réel, Journal officiel, « Tout sur un sujet » et des e-mails à la carte." },
  { q: "Puis-je résilier à tout moment ?", r: "Oui, les deux formules sont sans engagement. La résiliation prend effet à la fin de la période payée, sans frais, et un e-mail la confirme." },
  { q: "Le paiement est-il sécurisé ?", r: "Le paiement passe par Stripe : nous ne voyons jamais votre numéro de carte." },
  { q: "Comment fonctionne le parrainage ?", r: `Chaque compte, même gratuit, a son lien de parrainage. Quand une personne s'abonne après l'avoir suivi, vous recevez ${Math.round(PARRAINAGE.taux * 100)} % de chacun de ses paiements pendant ${PARRAINAGE.dureeMois} mois, versés sur votre compte bancaire après ${PARRAINAGE.validationJours} jours (délai de rétractation), dès ${PARRAINAGE.seuil} € cumulés.` },
  { q: "D'où viennent les informations ?", r: "Des sources officielles : Assemblée nationale, Sénat, Journal officiel, Parlement européen, DGFiP, INSEE. Les textes rédigés par intelligence artificielle sont vérifiés contre ces sources, et chaque information renvoie à son origine." },
];

function PageOffre() {
  const { userId, tierAffiche } = usePremium();
  const [annuel, setAnnuel] = useState(false);
  const [lawOpen, setLawOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [question, setQuestion] = useState<number | null>(0);
  const [detail, setDetail] = useState(false);
  const [filleuls, setFilleuls] = useState(5);
  const [formuleFilleuls, setFormuleFilleuls] = useState<"elite" | "pro">("elite");
  const gainMois = filleuls * PLANS[formuleFilleuls].monthly * PARRAINAGE.taux;

  // Chaque bouton lance son propre paiement : le clic porte l'offre choisie. Le Premium est
  // mensuel uniquement ; seule l'offre Pro suit la bascule de périodicité. Le clic ouvre d'abord
  // le récapitulatif et l'accord (CGV, accès immédiat) ; Stripe ensuite.
  const [commande, setCommande] = useState<{ key: "elite" | "pro"; cycle: "monthly" | "annually" } | null>(null);
  const choisir = (key: "elite" | "pro") => setCommande({ key, cycle: key === "pro" && annuel ? "annually" : "monthly" });
  const aller = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const prixPro = annuel ? PLANS.pro.annually : PLANS.pro.monthly;
  const estPremium = tierAffiche === "elite";

  // Le bouton d'une formule : acheter si la vente est ouverte, sinon l'annonce d'ouverture.
  const BoutonFormule = ({ cle, plein = false }: { cle: "elite" | "pro"; plein?: boolean }) => {
    const pro = cle === "pro";
    if (!pro && estPremium) return <span className={`flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-amber-400 px-4 text-[13px] font-black text-amber-800 dark:text-amber-300 ${plein ? "w-full" : ""}`}>Votre formule actuelle</span>;
    if (!SALES_OPEN) return (
      <span className={`flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-dashed px-4 text-[12px] font-black uppercase tracking-widest ${pro ? "border-fuchsia-400/60 text-fuchsia-700 dark:text-fuchsia-300" : "border-amber-400 text-amber-800 dark:text-amber-300"} ${plein ? "w-full" : ""}`}>
        Bientôt disponible
      </span>
    );
    return (
      <button type="button" onClick={() => choisir(cle)}
        className={`flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-black shadow-lg transition hover:brightness-110 active:scale-[0.99] ${plein ? "w-full" : ""} ${pro ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-fuchsia-500/30" : "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-950 shadow-amber-500/25"}`}>
        {pro ? <LineChart size={16} /> : <Star size={16} className="fill-current" />}
        {pro ? (estPremium ? "Passer au Pro" : "Choisir Pro") : "Devenir Premium"}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {commande && (
        <AccordAchat
          offre={PLANS[commande.key].name}
          prix={fmtPrice(commande.cycle === "annually" ? (PLANS[commande.key].annually ?? PLANS[commande.key].monthly) : PLANS[commande.key].monthly)}
          periode={commande.cycle === "annually" ? "an" : "mois"}
          userId={userId}
          onFermer={() => setCommande(null)}
          onContinuer={() => { window.location.href = lienPaiementStripe(userId, commande.key, commande.cycle); }}
        />
      )}{" "}

      {/* ══════ HERO : la promesse, les deux prix, une action ══════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-4 pb-12 pt-10 text-white md:py-24">
        <div aria-hidden className="absolute inset-0 opacity-20">
          <div className="absolute left-[10%] top-10 h-72 w-72 rounded-full bg-amber-500 blur-[120px]" />{" "}
          <div className="absolute bottom-0 right-[10%] h-60 w-60 rounded-full bg-fuchsia-600 blur-[110px]" />
        </div>{" "}
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <motion.h1 initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="font-staatliches text-[3.4rem] uppercase leading-[0.9] tracking-tight md:text-8xl">
            <span className="text-white">La politique,</span>{" "}
            <span className="bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">en premium.</span>
          </motion.h1>{" "}
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed text-white/75 md:text-xl">
            Chaque loi analysée, vos élus et votre territoire suivis, et des alertes sur ce qui vous concerne. Sans le bruit.
          </motion.p>{" "}
          {/* Les deux formules d'un coup d'œil, chacune mène à sa colonne du comparatif. */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-7 grid max-w-md grid-cols-2 gap-3">
            <button type="button" onClick={() => aller("tableau")}
              className="rounded-2xl border border-amber-400/60 bg-amber-400/10 px-3 py-3 text-left transition hover:bg-amber-400/20">
              <span className="block text-[10px] font-black uppercase tracking-widest text-amber-300">Citoyens</span>{" "}
              <span className="mt-0.5 block font-staatliches text-2xl uppercase leading-none">Premium</span>{" "}
              <span className="mt-1 block text-[13px] font-bold text-white/85">{fmtPrice(PLANS.elite.monthly)} <span className="font-medium text-white/50">/ mois</span></span>
            </button>{" "}
            <button type="button" onClick={() => aller("tableau")}
              className="rounded-2xl border border-fuchsia-400/60 bg-fuchsia-500/10 px-3 py-3 text-left transition hover:bg-fuchsia-500/20">
              <span className="block text-[10px] font-black uppercase tracking-widest text-fuchsia-300">Professionnels</span>{" "}
              <span className="mt-0.5 block font-staatliches text-2xl uppercase leading-none">Pro</span>{" "}
              <span className="mt-1 block text-[13px] font-bold text-white/85">{fmtPrice(PLANS.pro.monthly)} <span className="font-medium text-white/50">/ mois</span></span>
            </button>
          </motion.div>{" "}
          <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3 }}
            type="button" onClick={() => aller("tableau")}
            className="mx-auto mt-4 flex min-h-[52px] w-full max-w-md items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-6 text-[15px] font-black text-slate-950 shadow-[0_10px_40px_rgba(251,191,36,0.35)] transition hover:brightness-110">
            Comparer les formules <ArrowRight size={18} />
          </motion.button>{" "}
          <p className="mt-3 flex items-center justify-center gap-1.5 text-[12px] font-bold text-white/55">
            <ShieldCheck size={14} /> Sans engagement · résiliable à tout moment
          </p>{" "}
          <button type="button" onClick={() => aller("parrainage")}
            className="mx-auto mt-4 flex min-h-[40px] items-center gap-2 rounded-full border border-teal-300/40 bg-teal-400/10 px-4 text-[13px] font-bold text-teal-200 transition hover:bg-teal-400/20">
            <Gift size={15} /> Parrainez : votre abonnement peut devenir gratuit
          </button>
        </div>
      </section>{" "}

      {/* ══════ COMPARATIF ══════ */}
      <section id="comparatif" className="scroll-mt-16 px-3 pt-10 md:px-4 md:pt-20">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-center md:mb-10">
            <h2 className="font-staatliches text-4xl uppercase tracking-tight text-foreground md:text-6xl">
              Comparez <span className="text-amber-700 dark:text-amber-400">les formules</span>
            </h2>{" "}
            <p className="mx-auto mt-2 max-w-lg text-[15px] text-muted-foreground">
              Le site reste gratuit. <strong className="text-amber-800 dark:text-amber-300">Premium</strong> pour tout comprendre,{" "}
              <strong className="text-fuchsia-700 dark:text-fuchsia-300">Pro</strong> pour la veille des professionnels.
            </p>
          </div>{" "}

          {/* Périodicité du Pro (seule formule annuelle) : au-dessus du tableau, pas dans une carte. */}
          <div id="tableau" className="mb-7 flex scroll-mt-20 justify-center">
            <div role="group" aria-label="Périodicité de l'offre Pro" className="inline-flex items-center gap-1 rounded-full bg-muted p-1">
              {([[false, "Pro au mois"], [true, "Pro à l'année"]] as const).map(([v, nom]) => (
                <button key={nom} type="button" onClick={() => setAnnuel(v)} aria-pressed={annuel === v}
                  className={`flex min-h-[36px] items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition ${annuel === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>
                  {nom}{v && <span className="rounded-full bg-emerald-600 px-1.5 py-0.5 text-[10px] font-black text-white">−20 %</span>}
                </button>
              ))}
            </div>
          </div>{" "}

          {/* Le tableau. En-tête collant : on garde le nom et le prix des formules sous les yeux. */}
          <div className="rounded-3xl border border-border bg-card shadow-sm">
            <div className="sticky top-16 z-20 grid grid-cols-[minmax(0,1fr)_54px_68px_68px] items-end rounded-t-3xl border-b border-border bg-card/95 backdrop-blur md:grid-cols-[minmax(0,1fr)_130px_170px_170px]">
              <div className="px-3 pb-3 pt-4 text-[11px] font-black uppercase tracking-widest text-muted-foreground md:px-6">Ce qui est inclus</div>{" "}
              <div className="px-1 pb-3 pt-4 text-center">
                <p className="text-[10px] font-black uppercase text-muted-foreground md:text-xs md:tracking-wide">Gratuit</p>{" "}
                <p className="mt-0.5 text-[13px] font-black text-foreground md:text-base">0 €</p>
              </div>{" "}
              <div className="relative -mt-3 rounded-t-2xl bg-gradient-to-b from-amber-300 to-amber-400 px-1 pb-3 pt-4 text-center text-slate-950">
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-950 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-300 md:text-[9px]">Recommandé</span>{" "}
                <p className="font-staatliches text-[19px] uppercase leading-none md:text-2xl">Premium</p>{" "}
                <p className="mt-1 text-[12px] font-black leading-none md:text-base">{fmtPrice(PLANS.elite.monthly)}<span className="block text-[9px] font-bold opacity-70 md:inline md:text-[11px]"> / mois</span></p>
              </div>{" "}
              <div className="relative -mt-3 rounded-t-2xl bg-gradient-to-b from-fuchsia-500 to-purple-600 px-1 pb-3 pt-4 text-center text-white">
                <p className="font-staatliches text-[19px] uppercase leading-none md:text-2xl">Pro</p>{" "}
                <p className="mt-1 text-[12px] font-black leading-none md:text-base">{fmtPrice(prixPro)}<span className="block text-[9px] font-bold opacity-80 md:inline md:text-[11px]"> / {annuel ? "an" : "mois"}</span></p>
              </div>
            </div>{" "}

            {(detail ? COMPARATIF : ESSENTIEL).map(gr => (
              <div key={gr.titre}>
                <div className={`flex items-center gap-2 border-b border-border px-3 md:px-6 ${detail ? "py-3" : "py-2"} ${gr.pro ? "bg-fuchsia-500/[0.07]" : "bg-muted/60"}`}>
                  <gr.icone size={16} className={gr.pro ? "text-fuchsia-600 dark:text-fuchsia-300" : "text-amber-700 dark:text-amber-400"} />{" "}
                  <h3 className="text-[12px] font-black uppercase tracking-widest text-foreground">{gr.titre}</h3>{" "}
                  {gr.pro && <span className="rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-white">Pro</span>}
                </div>{" "}
                {gr.lignes.map(l => (
                  <div key={l.t} className="grid grid-cols-[minmax(0,1fr)_54px_68px_68px] items-stretch border-b border-border last:border-b-0 md:grid-cols-[minmax(0,1fr)_130px_170px_170px]">
                    <div className={`px-3 md:px-6 ${detail ? "py-3.5" : "py-3"}`}>
                      <p className="text-[14px] font-semibold leading-snug text-foreground">{l.t}</p>{" "}
                      {l.d && <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">{l.d}</p>}{" "}
                      {l.lien && (l.demo
                        ? <button type="button" onClick={() => (l.demo === "law" ? setLawOpen(true) : setNotifOpen(true))} className="mt-1 inline-flex min-h-[26px] items-center gap-1 text-[12.5px] font-black text-amber-800 underline-offset-2 hover:underline dark:text-amber-300">{l.lien} <ArrowRight size={13} /></button>
                        : <Link href={l.href!} className="mt-1.5 inline-flex min-h-[28px] items-center gap-1 text-[12.5px] font-black text-amber-800 underline-offset-2 hover:underline dark:text-amber-300">{l.lien} <ArrowRight size={13} /></Link>)}
                    </div>{" "}
                    <div className="flex items-center justify-center px-1"><CaseFormule v={l.g} ton="g" /></div>{" "}
                    <div className="flex items-center justify-center bg-amber-400/[0.09] px-1"><CaseFormule v={l.p} ton="p" /></div>{" "}
                    <div className="flex items-center justify-center bg-fuchsia-500/[0.08] px-1"><CaseFormule v={l.x} ton="x" /></div>
                  </div>
                ))}
              </div>
            ))}{" "}

            {/* L'essentiel d'abord ; le détail complet à la demande. */}
            <button type="button" aria-expanded={detail}
              onClick={() => { const fermer = detail; setDetail(!detail); if (fermer) setTimeout(() => aller("tableau"), 50); }}
              className="flex min-h-[52px] w-full items-center justify-center gap-2 border-t border-border text-[14px] font-black text-foreground transition hover:bg-muted">
              {detail ? <>Revenir à l&apos;essentiel <ChevronDown size={17} className="rotate-180" /></> : <>Voir le détail des {NB_DETAIL} fonctionnalités <ChevronDown size={17} /></>}
            </button>{" "}

            {/* Pied du tableau, sur ordinateur : un bouton sous chaque colonne. */}
            <div className="hidden grid-cols-[minmax(0,1fr)_130px_170px_170px] items-center rounded-b-3xl border-t border-border md:grid">
              <div className="px-6 py-5 text-[13px] font-bold text-muted-foreground">Sans engagement, résiliable à tout moment.</div>{" "}
              <div className="px-2 py-5 text-center">
                {userId ? <span className="text-[12px] font-bold text-muted-foreground">{tierAffiche === "free" ? "Votre formule" : "Inclus"}</span>
                  : <Link href="/login?inscription=1" className="text-[13px] font-black text-blue-700 underline-offset-2 hover:underline dark:text-blue-300">Créer un compte</Link>}
              </div>{" "}
              <div className="bg-amber-400/[0.09] px-3 py-5"><BoutonFormule cle="elite" plein /></div>{" "}
              <div className="rounded-br-3xl bg-fuchsia-500/[0.08] px-3 py-5"><BoutonFormule cle="pro" plein /></div>
            </div>
          </div>{" "}

          {/* Sur téléphone : les deux actions, en grand, sous le tableau. */}
          <div className="mt-5 space-y-2.5 md:hidden">
            <BoutonFormule cle="elite" plein />{" "}
            <BoutonFormule cle="pro" plein />
          </div>{" "}

          {annuel && <p className="mt-3 text-center text-[13px] font-bold text-emerald-700 dark:text-emerald-400">Pro à l&apos;année : {fmtPrice(PLANS.pro.annually)}, soit {fmtPrice(PLANS.pro.annually / 12)} par mois — deux mois offerts.</p>}{" "}

          {!SALES_OPEN && (
            <div className="mt-6 rounded-2xl border border-border bg-muted/50 p-5 text-center">
              <p className="text-[15px] font-black text-foreground">Les abonnements ouvrent très prochainement.</p>{" "}
              <p className="mx-auto mt-1 max-w-md text-[14px] leading-snug text-muted-foreground">
                {userId ? "Votre compte est prêt : vous pourrez passer à Premium ou à Pro en un clic dès l'ouverture." : "Créez votre compte gratuit dès maintenant : vous pourrez passer à Premium ou à Pro en un clic dès l'ouverture."}
              </p>{" "}
              {!userId && (
                <Link href="/login?inscription=1" className="mx-auto mt-4 flex min-h-[48px] max-w-xs items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 text-[14px] font-black text-white transition hover:bg-slate-700 dark:bg-white dark:text-slate-900">
                  Créer mon compte gratuit <ArrowRight size={16} />
                </Link>
              )}
            </div>
          )}{" "}
          {SALES_OPEN && <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-[12px] font-bold text-muted-foreground"><Lock size={13} /> Paiement sécurisé par Stripe · résiliable à tout moment</p>}
        </div>
      </section>{" "}

      {/* ══════ PARRAINAGE : l'abonnement qui se rembourse ══════ */}
      {/* Le calcul se fait sous les yeux du lecteur : cinq filleuls Premium couvrent exactement un
          Premium (5 × 3,99 € × 20 %). Un curseur, pas un formulaire : aucun effort à fournir. */}
      <section id="parrainage" className="scroll-mt-20 px-3 pt-12 md:px-4 md:pt-20">
        <div className="relative mx-auto max-w-3xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 via-emerald-700 to-slate-900 p-5 text-white shadow-xl md:p-10">
          <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl" />{" "}
          <div className="relative">
            <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-teal-200"><Gift size={14} /> Parrainage · ouvert à tous</p>{" "}
            <h2 className="mt-2 font-staatliches text-[2.5rem] uppercase leading-[0.95] tracking-tight md:text-6xl">Votre abonnement<br />peut devenir gratuit</h2>{" "}
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/80">
              Partagez votre lien. Chaque proche qui s&apos;abonne vous reverse <strong className="text-white">{Math.round(PARRAINAGE.taux * 100)} % de son abonnement, chaque mois pendant {PARRAINAGE.dureeMois} mois</strong>.
            </p>{" "}

            {/* Le simulateur */}
            <div className="mt-6 rounded-3xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur md:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label htmlFor="filleuls" className="text-[14px] font-bold text-white/90">
                  <span className="font-black text-white">{filleuls}</span> proche{filleuls > 1 ? "s" : ""} abonné{filleuls > 1 ? "s" : ""} en
                </label>{" "}
                <div role="group" aria-label="Formule de vos filleuls" className="inline-flex rounded-full bg-black/25 p-0.5">
                  {(["elite", "pro"] as const).map(k => (
                    <button key={k} type="button" onClick={() => setFormuleFilleuls(k)} aria-pressed={formuleFilleuls === k}
                      className={`min-h-[34px] rounded-full px-3.5 text-[13px] font-black transition ${formuleFilleuls === k ? "bg-white text-slate-900" : "text-white/70"}`}>{PLANS[k].name}</button>
                  ))}
                </div>
              </div>{" "}
              <input id="filleuls" type="range" min={1} max={10} step={1} value={filleuls} onChange={e => setFilleuls(Number(e.target.value))}
                className="mt-4 h-2 w-full cursor-pointer accent-teal-300" />{" "}
              <div className="mt-4">
                <p className="text-[12px] font-bold uppercase tracking-widest text-teal-100/80">Vous recevez</p>{" "}
                <p className="mt-1 flex items-baseline gap-2 whitespace-nowrap">
                  <span className="font-staatliches text-5xl leading-none md:text-6xl">{fmtPrice(gainMois)}</span>{" "}
                  <span className="text-[15px] font-bold normal-case text-white/70">par mois</span>
                </p>{" "}
                <p className="mt-1 text-[13px] text-white/70">soit {fmtPrice(gainMois * PARRAINAGE.dureeMois)} sur {PARRAINAGE.dureeMois} mois</p>{" "}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(["elite", "pro"] as const).map(k => {
                    const couvert = gainMois >= PLANS[k].monthly - 0.005;
                    return (
                      <span key={k} className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-black ${couvert ? "bg-white text-emerald-800" : "bg-black/20 text-white/60"}`}>
                        {couvert ? <Check size={12} strokeWidth={3} /> : null}
                        {PLANS[k].name} {couvert ? "remboursé" : `${Math.min(99, Math.round(gainMois / PLANS[k].monthly * 100))} %`}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>{" "}

            <Link href="/parrainage" className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 text-[15px] font-black text-emerald-900 shadow-lg transition hover:bg-teal-50 md:w-auto md:inline-flex">
              <Gift size={18} /> Obtenir mon lien de parrainage
            </Link>{" "}
            <p className="mt-3 text-[12px] leading-snug text-white/60">
              Même avec un compte gratuit. Versé sur votre compte bancaire après {PARRAINAGE.validationJours} jours (délai de rétractation), dès {PARRAINAGE.seuil} € cumulés.
            </p>
          </div>
        </div>
      </section>{" "}

      {/* ══════ QUESTIONS ══════ */}
      <section className="px-4 pt-14 md:pt-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-center font-staatliches text-3xl uppercase tracking-tight text-foreground md:text-5xl">Vos questions</h2>{" "}
          <div className="mt-5 divide-y divide-border rounded-3xl border border-border bg-card">
            {FAQ.map((f, i) => {
              const ouvert = question === i;
              return (
                <div key={f.q}>
                  <button type="button" onClick={() => setQuestion(ouvert ? null : i)} aria-expanded={ouvert}
                    className="flex min-h-[56px] w-full items-center justify-between gap-3 px-5 py-3 text-left">
                    <span className="text-[15px] font-bold text-foreground">{f.q}</span>{" "}
                    <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform ${ouvert ? "rotate-180" : ""}`} />
                  </button>{" "}
                  <AnimatePresence initial={false}>
                    {ouvert && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                        <p className="px-5 pb-4 text-[14px] leading-relaxed text-muted-foreground">{f.r}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>{" "}
          <button type="button" onClick={() => aller("tableau")}
            className="mx-auto mt-6 flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-5 text-[14px] font-black text-amber-800 underline-offset-2 hover:underline dark:text-amber-300">
            Revoir le comparatif <ArrowRight size={16} className="-rotate-90" />
          </button>
        </div>
      </section>{" "}

      {/* Section « témoignages » retirée : les trois avis (Camille D., Marc T., Sophie L.)
          étaient inventés. De faux avis présentés comme réels sont une pratique commerciale
          trompeuse ; à remplacer par de vrais retours d'abonnés, avec leur accord. */}

      <LawExampleModal open={lawOpen} onClose={() => setLawOpen(false)} />
      <NotifDemoModal open={notifOpen} onClose={() => setNotifOpen(false)} />
    </div>
  );
}
