"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Search, Loader2, ExternalLink, FileText, ChevronUp, ChevronDown, Video } from "lucide-react";
import { api } from "@/lib/api";
import { cleanTitle, fmtMeetingDate, shortCommission, type CommissionMeeting } from "@/lib/commissions";

/**
 * Le compte rendu intégral d'une réunion, lu SUR LE SITE.
 *
 * Le bouton « Compte rendu » renvoyait l'abonné sur le site de l'Assemblée ou du Sénat : il
 * payait pour un outil qui le mettait à la porte au moment de vérifier une citation. Le texte
 * est maintenant gardé chez nous et s'ouvre ici, avec ce que la source n'offre pas : la
 * recherche dans le texte, les prises de parole détachées, le saut d'un orateur à l'autre.
 * La source officielle reste à un clic, en pied de fenêtre — c'est elle qui fait foi.
 */

type Transcrit = { texte: string; mots: number; source: string } | null;

/** Début d'une prise de parole : « M. Jean Dupont, rapporteur. » ou « Mme la présidente Anne Durand. » */
const ORATEUR = /^((?:M\.|Mme|MM\.|Mmes)\s(?:l[ea]\s)?[^.:]{2,90}?)\s?[.:]\s+(?=\S)/;

type Bloc = { orateur: string | null; texte: string };

function decouper(texte: string): Bloc[] {
  // Une transcription automatique arrive d'un seul tenant : on la rend en paragraphes de
  // cinq phrases, faute de quoi elle formerait un mur de texte illisible.
  if (!/\n/.test(texte.trim()) && texte.length > 1500) {
    const phrases = texte.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [texte];
    const paragraphes: Bloc[] = [];
    for (let i = 0; i < phrases.length; i += 5) paragraphes.push({ orateur: null, texte: phrases.slice(i, i + 5).join("").trim() });
    return paragraphes;
  }
  return texte.split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
    const m = l.match(ORATEUR);
    // Une « prise de parole » de moins de quatre mots après le nom est une ligne de liste, pas un orateur.
    return m && l.length - m[0].length > 20 ? { orateur: m[1].trim(), texte: l.slice(m[0].length) } : { orateur: null, texte: l };
  });
}

const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Surligne({ texte, terme }: { texte: string; terme: string }) {
  if (terme.length < 2) return <>{texte}</>;
  const t = sansAccent(texte), q = sansAccent(terme);
  const morceaux: React.ReactNode[] = [];
  let i = 0, k = 0;
  for (let p = t.indexOf(q); p >= 0; p = t.indexOf(q, p + q.length)) {
    if (p > i) morceaux.push(texte.slice(i, p));
    morceaux.push(<mark key={k++} className="rounded bg-amber-300/80 px-0.5 text-slate-950">{texte.slice(p, p + q.length)}</mark>);
    i = p + q.length;
  }
  morceaux.push(texte.slice(i));
  return <>{morceaux}</>;
}

export default function CompteRendu({ m, onFermer }: { m: CommissionMeeting; onFermer: () => void }) {
  const [t, setT] = useState<Transcrit | undefined>(undefined);
  const [terme, setTerme] = useState("");
  const [courant, setCourant] = useState(0);
  const corps = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let vivant = true;
    api.getCommissionTranscript(m.ref).then(r => { if (vivant) setT(r as Transcrit); }).catch(() => { if (vivant) setT(null); });
    return () => { vivant = false; };
  }, [m.ref]);

  useEffect(() => {
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const touche = (e: KeyboardEvent) => { if (e.key === "Escape") onFermer(); };
    window.addEventListener("keydown", touche);
    return () => { document.body.style.overflow = avant; window.removeEventListener("keydown", touche); };
  }, [onFermer]);

  const blocs = useMemo(() => (t ? decouper(t.texte) : []), [t]);
  const trouves = useMemo(() => {
    const q = sansAccent(terme.trim());
    if (q.length < 2) return [] as number[];
    return blocs.map((b, i) => (sansAccent(`${b.orateur ?? ""} ${b.texte}`).includes(q) ? i : -1)).filter(i => i >= 0);
  }, [blocs, terme]);
  const orateurs = useMemo(() => {
    const n = new Map<string, number>();
    for (const b of blocs) if (b.orateur) n.set(b.orateur, (n.get(b.orateur) ?? 0) + 1);
    return [...n.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [blocs]);

  const aller = (rang: number) => {
    if (!trouves.length) return;
    const r = (rang + trouves.length) % trouves.length;
    setCourant(r);
    corps.current?.querySelector(`[data-bloc="${trouves[r]}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  };
  useEffect(() => { setCourant(0); if (trouves.length) corps.current?.querySelector(`[data-bloc="${trouves[0]}"]`)?.scrollIntoView({ block: "center" }); }, [trouves]);

  const transcription = t?.source === "transcription";
  const minutes = t ? Math.max(1, Math.round(t.mots / 230)) : 0;

  return createPortal(
    <div className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/80 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Compte rendu de la réunion" onClick={onFermer}>
      <div onClick={e => e.stopPropagation()}
        className="flex h-[100dvh] w-full max-w-3xl flex-col overflow-hidden bg-card shadow-2xl dark:bg-slate-950 sm:h-[90vh] sm:rounded-[2rem] sm:border sm:border-border dark:sm:border-slate-800">

        {/* En-tête */}
        <div className="shrink-0 border-b border-border px-5 pb-4 pt-5 dark:border-slate-800 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-300">
                {transcription ? <Video size={12} /> : <FileText size={12} />}
                {transcription ? "Transcription de la vidéo" : "Compte rendu intégral"}
                <span className="text-muted-foreground">· {fmtMeetingDate(m.meeting_date)} · {shortCommission(m.commission)}</span>
              </p>
              <h3 className="mt-1.5 line-clamp-2 text-base font-bold leading-snug text-foreground dark:text-white sm:text-lg">{cleanTitle(m.title || "")}</h3>
              {t && <p className="mt-1 text-[11px] font-semibold text-muted-foreground">{t.mots.toLocaleString("fr-FR")} mots · environ {minutes} min de lecture</p>}
            </div>
            <button type="button" onClick={onFermer} aria-label="Fermer le compte rendu"
              className="shrink-0 rounded-full bg-muted p-2 text-muted-foreground transition hover:text-foreground"><X size={18} /></button>
          </div>

          {t && (
            <div className="mt-3 flex items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input value={terme} onChange={e => setTerme(e.target.value)} onKeyDown={e => { if (e.key === "Enter") aller(courant + (e.shiftKey ? -1 : 1)); }}
                  placeholder="Chercher un mot, un nom, un chiffre…"
                  className="w-full rounded-full border border-border bg-background py-2.5 pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-violet-400 dark:border-slate-800 dark:bg-slate-900" />
              </div>
              {terme.trim().length >= 2 && (
                <div className="flex shrink-0 items-center gap-1 text-[11px] font-black tabular-nums text-muted-foreground">
                  <span className="px-1">{trouves.length ? `${courant + 1}/${trouves.length}` : "0"}</span>
                  <button type="button" onClick={() => aller(courant - 1)} disabled={!trouves.length} aria-label="Résultat précédent" className="rounded-full bg-muted p-1.5 disabled:opacity-40"><ChevronUp size={14} /></button>
                  <button type="button" onClick={() => aller(courant + 1)} disabled={!trouves.length} aria-label="Résultat suivant" className="rounded-full bg-muted p-1.5 disabled:opacity-40"><ChevronDown size={14} /></button>
                </div>
              )}
            </div>
          )}
          {orateurs.length > 1 && (
            <div className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {orateurs.map(([nom, n]) => (
                <button key={nom} type="button" onClick={() => setTerme(nom)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-bold transition ${terme === nom ? "bg-violet-600 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
                  {nom.replace(/^(M\.|Mme)\s(l[ea]\s)?/, "")} <span className="opacity-60">{n}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Le texte */}
        <div ref={corps} className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {t === undefined ? (
            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" /></div>
          ) : t === null ? (
            <div className="py-16 text-center">
              <p className="text-sm font-bold text-foreground dark:text-white">Le texte de ce compte rendu n&apos;est pas encore repris sur le site.</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted-foreground">Il le sera au prochain passage de la collecte. En attendant, il reste lisible à sa source officielle.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {transcription && (
                <p className="rounded-2xl bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                  L&apos;Assemblée n&apos;a pas rédigé de compte rendu de cette réunion : ce texte est la transcription automatique de son enregistrement vidéo. Les noms propres et les chiffres peuvent y être mal orthographiés.
                </p>
              )}
              {blocs.map((b, i) => {
                const vise = trouves.length > 0 && trouves[courant] === i;
                return (
                  <div key={i} data-bloc={i} className={`rounded-xl transition-colors ${vise ? "bg-violet-50 px-3 py-2 dark:bg-violet-500/10" : ""}`}>
                    {b.orateur && <p className="text-[12px] font-black text-violet-700 dark:text-violet-300"><Surligne texte={b.orateur} terme={terme.trim()} /></p>}
                    <p className={`text-[15px] leading-relaxed text-foreground/90 dark:text-slate-200 ${b.orateur ? "mt-0.5" : ""}`}><Surligne texte={b.texte} terme={terme.trim()} /></p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pied : la source fait foi */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-border px-5 py-3 text-[11px] text-muted-foreground dark:border-slate-800 sm:px-7">
          <span>{transcription ? "Seul l'enregistrement officiel fait foi." : "Texte repris du compte rendu officiel, qui seul fait foi."}</span>
          {m.cr_url && (
            <a href={m.cr_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-black uppercase tracking-widest hover:text-foreground">
              <ExternalLink size={12} /> {transcription ? "Vidéo officielle" : "Source officielle"}
            </a>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
