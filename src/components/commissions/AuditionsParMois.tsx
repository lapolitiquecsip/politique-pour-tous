"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ChevronDown, Loader2, Play, FileText, Users, Mic, CalendarOff, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { CommissionAnalysis as Analysis, ACCENTS } from "./CommissionAnalysis";
import CompteRendu from "./CompteRendu";
import { cleanTitle, decode, extractPeople, shortCommission, type CommissionMeeting } from "@/lib/commissions";

/**
 * Les auditions d'une chambre, mois par mois.
 *
 * Une audition est une réunion de commission : elle a donc sa place DANS le suivi des
 * commissions, et non dans une rubrique à part plus bas dans la page. On les feuillette
 * comme un calendrier — une flèche de chaque côté du mois — parce que c'est ainsi qu'on les
 * cherche : « qui a été entendu en septembre ? ».
 *
 * Chaque carte porte la date en grand, la commission, les personnes entendues, et les deux
 * portes de sortie vers la source : la vidéo de la réunion quand elle est connue, et le
 * compte rendu officiel. Le contenu s'ouvre sur place : l'analyse complète pour un abonné
 * Pro, le résumé pour un abonné Premium.
 */

type Audition = CommissionMeeting & { summary?: string | null };

const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const MOIS_COURT = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
const JOURS = ["dim.", "lun.", "mar.", "mer.", "jeu.", "ven.", "sam."];

const cleMois = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const decaler = (cle: string, n: number) => {
  const [a, m] = cle.split("-").map(Number);
  return cleMois(new Date(a, m - 1 + n, 1));
};

function Resume({ texte, point }: { texte: string; point: string }) {
  const lignes = texte.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const intro = lignes.find(l => !l.startsWith("-"));
  const puces = lignes.filter(l => l.startsWith("-")).map(l => l.replace(/^-\s*/, ""));
  return (
    <div className="space-y-2.5">
      {intro && <p className="text-sm leading-relaxed text-muted-foreground">{intro}</p>}
      {puces.length > 0 && (
        <ul className="space-y-1.5">
          {puces.map((b, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug text-foreground/85">
              <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${point}`} />{b}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Carte({ a, accent, isPro }: { a: Audition; accent: typeof ACCENTS.emerald; isPro: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  const [lecture, setLecture] = useState(false);
  const [detail, setDetail] = useState<{ analysis: any; summary: string | null } | null>(null);
  useEffect(() => {
    if (!ouvert || detail || !isPro) return;
    let vivant = true;
    api.getCommissionAnalysis(a.ref).then(d => { if (vivant) setDetail(d ?? { analysis: null, summary: null }); });
    return () => { vivant = false; };
  }, [ouvert, detail, isPro, a.ref]);

  const d = a.meeting_date ? new Date(`${a.meeting_date}T12:00:00`) : null;
  const personnes = a.speakers?.length ? a.speakers.slice(0, 3).map(s => s.name) : extractPeople(decode(a.title || ""));
  const tableRonde = /table ronde/i.test(a.title || "");

  return (
    <article className={`overflow-hidden rounded-3xl border border-border bg-card transition-shadow hover:shadow-lg dark:border-slate-800 dark:bg-slate-900 ${ouvert ? "shadow-lg" : ""}`}>
      <div className="flex gap-4 p-4 sm:p-5">
        {/* La date, comme une feuille d'éphéméride */}
        {d && (
          <div className={`flex h-[4.5rem] w-14 shrink-0 flex-col items-center justify-center rounded-2xl bg-gradient-to-br ${accent.grad} text-white shadow-md`}>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{JOURS[d.getDay()]}</span>
            <span className="font-staatliches text-3xl leading-none">{d.getDate()}</span>
            <span className="text-[9px] font-black uppercase tracking-widest opacity-80">{MOIS_COURT[d.getMonth()]}</span>
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-black uppercase tracking-widest">
            <span className={`rounded-full px-2 py-0.5 ${accent.bg} ${accent.text}`}>{shortCommission(a.commission)}</span>
            <span className="text-muted-foreground">{tableRonde ? "Table ronde" : "Audition"}</span>
          </p>
          <h4 className="mt-1.5 line-clamp-2 text-[15px] font-bold leading-snug text-foreground dark:text-white">{cleanTitle(a.title || "")}</h4>
          {personnes.length > 0 && (
            <p className="mt-1.5 flex items-start gap-1.5 text-[12px] font-semibold text-muted-foreground">
              <Users size={13} className={`mt-0.5 shrink-0 ${accent.text}`} />
              <span className="line-clamp-1">{personnes.join(", ")}</span>
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest transition ${ouvert ? "bg-foreground text-background" : `${accent.chip} hover:brightness-110`}`}>
              <Sparkles size={12} /> {isPro ? "Analyse" : "Résumé"}
              <ChevronDown size={12} className={`transition-transform ${ouvert ? "rotate-180" : ""}`} />
            </button>
            {a.video_url && (
              <a href={a.video_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-red-500">
                <Play size={11} fill="currentColor" /> Vidéo
              </a>
            )}
            {/* Le compte rendu s'ouvre SUR LE SITE (abonnés Pro) ; la source officielle reste
                accessible depuis le lecteur. */}
            {isPro ? (
              <button type="button" onClick={() => setLecture(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition hover:text-foreground">
                <FileText size={12} /> Compte rendu intégral
              </button>
            ) : a.cr_url && a.cr_url !== a.video_url && (
              <a href={a.cr_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground transition hover:text-foreground">
                <FileText size={12} /> Compte rendu
              </a>
            )}
          </div>
        </div>
      </div>

      {lecture && <CompteRendu m={a} onFermer={() => setLecture(false)} />}

      {ouvert && (
        <div className="border-t border-border px-4 py-4 dark:border-slate-800 sm:px-5">
          {isPro ? (
            detail === null
              ? <p className="flex items-center gap-2 py-3 text-sm text-muted-foreground"><Loader2 size={15} className="animate-spin" /> Chargement de l&apos;analyse…</p>
              : <Analysis m={{ ...a, analysis: detail.analysis, summary: detail.summary }} accent={accent} />
          ) : a.summary
            ? <Resume texte={a.summary} point={accent.dot} />
            : <p className="text-sm italic text-muted-foreground">Résumé en cours de rédaction.</p>}
        </div>
      )}
    </article>
  );
}

export default function AuditionsParMois({
  chamber, accent = "emerald", isPro,
}: { chamber: "AN" | "SENAT"; accent?: "emerald" | "red"; isPro: boolean }) {
  const a = ACCENTS[accent];
  const courant = cleMois(new Date());
  const [mois, setMois] = useState(courant);
  const [premier, setPremier] = useState<string | null>(null);
  const [auditions, setAuditions] = useState<Audition[] | null>(null);
  const [sens, setSens] = useState(1);

  useEffect(() => {
    let vivant = true;
    api.getPremierMoisAuditions(chamber).then(m => { if (vivant) setPremier(m); }).catch(() => {});
    return () => { vivant = false; };
  }, [chamber]);

  useEffect(() => {
    let vivant = true;
    setAuditions(null);
    api.getAuditionsDuMois(chamber, mois)
      .then(r => { if (vivant) setAuditions(r as Audition[]); })
      .catch(() => { if (vivant) setAuditions([]); });
    return () => { vivant = false; };
  }, [chamber, mois]);

  const aller = (n: number) => { setSens(n); setMois(m => decaler(m, n)); };
  const peutReculer = !premier || mois > premier;
  const peutAvancer = mois < courant;
  const [annee, numero] = mois.split("-").map(Number);
  const commissions = useMemo(() => new Set((auditions ?? []).map(x => shortCommission(x.commission))).size, [auditions]);
  const avecVideo = (auditions ?? []).filter(x => x.video_url).length;

  const Fleche = ({ dir, actif }: { dir: -1 | 1; actif: boolean }) => (
    <button type="button" onClick={() => aller(dir)} disabled={!actif}
      aria-label={dir < 0 ? "Mois précédent" : "Mois suivant"}
      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition sm:h-12 sm:w-12 ${actif
        ? "border-border bg-card text-foreground shadow-sm hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
        : "cursor-not-allowed border-transparent text-muted-foreground/30"}`}>
      {dir < 0 ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
    </button>
  );

  return (
    <div>
      {/* Le mois, entre ses deux flèches */}
      <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-border bg-gradient-to-b from-muted/60 to-transparent px-3 py-3 dark:border-slate-800 sm:px-5 sm:py-4">
        <Fleche dir={-1} actif={peutReculer} />
        <div className="min-w-0 text-center">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={mois} initial={{ opacity: 0, x: 18 * sens }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -18 * sens }} transition={{ duration: 0.16 }}>
              <p className="font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground dark:text-white sm:text-4xl">
                {MOIS[numero - 1]} <span className={a.text}>{annee}</span>
              </p>
              <p className="mt-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {auditions === null ? "Chargement…"
                  : auditions.length === 0 ? "Aucune audition"
                  : `${auditions.length} audition${auditions.length > 1 ? "s" : ""} · ${commissions} commission${commissions > 1 ? "s" : ""}${avecVideo ? ` · ${avecVideo} en vidéo` : ""}`}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
        <Fleche dir={1} actif={peutAvancer} />
      </div>

      {auditions === null ? (
        <div className="flex justify-center py-12"><Loader2 className={`animate-spin ${a.text}`} /></div>
      ) : auditions.length === 0 ? (
        <div className="mt-4 rounded-3xl border border-dashed border-border py-12 text-center dark:border-slate-800">
          <CalendarOff size={26} className="mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-bold text-muted-foreground">Aucune audition publiée pour {MOIS[numero - 1]} {annee}.</p>
          <p className="mx-auto mt-1 max-w-md text-[13px] text-muted-foreground">
            Une audition paraît ici dès que son compte rendu officiel est publié, en général deux à trois semaines après la réunion.
          </p>
        </div>
      ) : (
        // items-start : déplier une audition ne doit pas étirer sa voisine.
        <div className="mt-4 grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          {auditions.map(x => <Carte key={x.ref} a={x} accent={a} isPro={isPro} />)}
        </div>
      )}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Mic size={12} className="shrink-0" />
        Auditions et tables rondes des commissions, d&apos;après leurs comptes rendus officiels.
      </p>
    </div>
  );
}
