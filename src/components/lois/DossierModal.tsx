"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ExternalLink, FileText, Loader2, Scale, X, Lock, ChevronDown, ChevronLeft, ChevronRight,
  AlertTriangle, Target, Vote, GitBranch, Pencil, HelpCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { cleanHtmlText, formatAmendmentOutcome } from "@/lib/html";
import { usePremium } from "@/lib/hooks/usePremium";
import { groupLabel } from "@/lib/legislative-groups";
import { parseInitiators, loadPeopleIndex, personHref, normalizeName, type InitiatorPerson } from "@/lib/initiators";
import { AwardBadge } from "@/components/ui/award-badge";
import { categoryLabel, type LegislativeDossierDetail } from "@/lib/legislative";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

// Panneau de détail d'une loi (fiche complète : résumé, analyse premium, navette, amendements,
// scrutins, sources). Partagé entre la page « Lois » et la home (livre du Journal Officiel).

// Chambre où le texte est ACTUELLEMENT examiné → libellé + couleur du badge.
const chamberStyle = (c?: string | null) =>
  c === "AN" ? { label: "Assemblée nationale", cls: "bg-blue-50 text-blue-700 border-blue-200" }
  : c === "SENAT" ? { label: "Sénat", cls: "bg-rose-50 text-rose-700 border-rose-200" }
  : c === "CC" ? { label: "Conseil constitutionnel", cls: "bg-purple-50 text-purple-700 border-purple-200" }
  : { label: "Journal officiel", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
// Type de texte : qui en est à l'origine.
const typeLabel = (t?: string | null) => t === "bill" ? "Projet de loi" : t === "proposal" ? "Proposition de loi" : null;

function formatDate(value?: string | null) {
  if (!value) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

// Amendements — chargés À LA DEMANDE au dépliage (la fiche s'ouvre instantanément). Rétro-compatible :
// si le RPC détail fournit encore le tableau (`initial`), on l'utilise sans requête.
function AmendmentsSection({ dossierId, total = 0, initial }: { dossierId: string; total?: number; initial?: any[] }) {
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 6;
  const [items, setItems] = useState<any[] | null>(initial ?? null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !show; setShow(next);
    if (next && items === null && !loading) {
      setLoading(true);
      try { setItems(await api.getDossierAmendments(dossierId)); } finally { setLoading(false); }
    }
  };

  if (total === 0 && !(items && items.length)) {
    return (
      <section className="mt-10">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Amendements</h3>
        <p className="mt-4 text-slate-500">Aucun amendement rattaché.</p>
      </section>
    );
  }

  const shown = items ?? [];
  const truncated = total > shown.length && items !== null;
  const pageCount = Math.max(1, Math.ceil(shown.length / perPage));
  const start = page * perPage;
  const current = shown.slice(start, start + perPage);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Amendements <span className="text-slate-400">({total || shown.length})</span></h3>
        <button onClick={toggle} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
          {show ? "Masquer les amendements" : "Voir les amendements"}
          <ChevronDown size={16} className={`transition-transform ${show ? "rotate-180" : ""}`} />
        </button>
      </div>
      {truncated && show && <p className="mt-3 text-xs italic text-slate-400">Les {shown.length} amendements les plus récents sont affichés (sur {total}).</p>}
      {show && (
        <>
          {loading && <div className="mt-4 flex items-center gap-2 text-slate-500"><Loader2 size={16} className="animate-spin" /> Chargement…</div>}
          <div className="mt-4 grid gap-3">
            {current.map(amendment => (
              <div key={amendment.official_id} className="rounded-2xl border border-slate-200 p-5 text-slate-900">
                <div className="flex justify-between gap-4"><strong>Amendement {amendment.number}</strong><span>{formatAmendmentOutcome(amendment.outcome_label)}</span></div>
                <p className="mt-2 text-sm text-slate-600">{cleanHtmlText(amendment.subject) || cleanHtmlText(amendment.body) || "Contenu disponible à la source."}</p>
              </div>
            ))}
          </div>
          {pageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={16} />Précédent
              </button>
              <span className="text-sm font-bold text-slate-500">Page {page + 1} / {pageCount}</span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                Suivant<ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function humanizeKey(key: string) {
  const spaced = key.replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Surligne les chiffres (%, €, quantités, dates courtes, comptes de votes) dans un texte.
const NUM_RE = /(\d[\d  .]*\s?(?:%|€|Md€|M€|milliards?|millions?)|\d{1,4}\s?(?:pour|contre|abstentions?|voix|sièges|députés|sénateurs)|\d+(?:[.,]\d+)?)/gi;
function HL({ text }: { text: string }) {
  const parts = String(text || "").split(NUM_RE);
  return <>{parts.map((p, i) => i % 2 === 1
    ? <span key={i} className="rounded-md bg-amber-400/25 px-1 font-black text-amber-900 whitespace-nowrap">{p}</span>
    : <span key={i}>{p}</span>)}</>;
}

// Icône + couleur d'accent d'une section, d'après son intitulé.
function sectionStyle(header: string) {
  const h = header.toLowerCase();
  if (/vote|scrutin/.test(h)) return { Icon: Vote, c: "text-emerald-600", bg: "bg-emerald-50", ring: "ring-emerald-100" };
  if (/limite|réserve|reserve/.test(h)) return { Icon: AlertTriangle, c: "text-slate-500", bg: "bg-slate-50", ring: "ring-slate-100" };
  if (/contexte|objectif|objet|mesure|dispositif/.test(h)) return { Icon: Target, c: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" };
  if (/procédure|procedure|navette|étape|etape|calendrier|adoption/.test(h)) return { Icon: GitBranch, c: "text-blue-600", bg: "bg-blue-50", ring: "ring-blue-100" };
  if (/amendement/.test(h)) return { Icon: Pencil, c: "text-fuchsia-600", bg: "bg-fuchsia-50", ring: "ring-fuchsia-100" };
  if (/problème|probleme|enjeu|pourquoi/.test(h)) return { Icon: HelpCircle, c: "text-rose-600", bg: "bg-rose-50", ring: "ring-rose-100" };
  return { Icon: FileText, c: "text-amber-600", bg: "bg-amber-50", ring: "ring-amber-100" };
}

// Découpe le texte d'analyse en sections « **En-tête** : contenu » (aucun besoin d'IA).
function parseSections(raw: string): { header: string; body: string }[] {
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

// Rendu « design premium » de l'analyse détaillée, DIRECTEMENT depuis le texte existant :
// chaque section en carte, chiffres surlignés. Aucun appel IA.
function PremiumAnalysis({ raw }: { raw: string }) {
  // Ancien format JSON éventuel → texte concaténé pour le parseur de sections.
  let text = raw;
  try { const j = JSON.parse(raw); if (j && typeof j === "object") text = Object.entries(j).map(([k, v]) => `**${humanizeKey(k)}** : ${typeof v === "string" ? v : JSON.stringify(v)}`).join(" "); } catch { /* texte */ }

  const sections = parseSections(text);
  if (sections.length === 0) {
    return <p className="mt-4 whitespace-pre-line leading-7 text-slate-700"><HL text={text} /></p>;
  }
  return (
    <div className="mt-2 grid gap-3 sm:grid-cols-2">
      {sections.map((s, i) => {
        const { Icon, c, bg, ring } = sectionStyle(s.header);
        const wide = /vote|scrutin|contexte|objectif|objet/i.test(s.header) ? "sm:col-span-2" : "";
        return (
          <div key={i} className={`rounded-2xl border border-slate-100 bg-white p-5 shadow-sm ${wide}`}>
            <div className="mb-2 flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${bg} ${c} ring-1 ${ring}`}><Icon size={16} /></span>
              <h4 className={`text-[11px] font-black uppercase tracking-widest ${c}`}>{s.header}</h4>
            </div>
            <p className="text-[14px] leading-6 text-slate-700"><HL text={s.body} /></p>
          </div>
        );
      })}
    </div>
  );
}

// Position d'un vote nominatif, en clair.
const POS_FR: Record<string, string> = { for: "Pour", against: "Contre", abstain: "Abstention", non_voting: "N'a pas voté" };

// Carte d'un scrutin : résultats + par groupe. Les votes nominatifs (jusqu'à ~577) sont chargés
// À LA DEMANDE quand on déplie, pour ne pas alourdir la fiche (surtout les gros dossiers).
function ScrutinCard({ scrutin }: { scrutin: any }) {
  const inlineVotes: any[] | null = Array.isArray(scrutin.votes) ? scrutin.votes : null; // ancien RPC
  const voteCount: number | null = scrutin.votes_count ?? inlineVotes?.length ?? null;
  const [votes, setVotes] = useState<any[] | null>(inlineVotes);
  const [loading, setLoading] = useState(false);

  const loadVotes = async () => {
    if (votes !== null || loading) return;
    setLoading(true);
    try { setVotes(await api.getScrutinVotes(scrutin.id)); } finally { setLoading(false); }
  };

  return (
    <div className="rounded-2xl bg-slate-950 p-5 text-white">
      <strong>{scrutin.title}</strong>
      <p className="mt-2 text-sm text-slate-300">Pour {scrutin.for_count} · Contre {scrutin.against_count} · Abstentions {scrutin.abstain_count}</p>
      {scrutin.group_results?.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {scrutin.group_results.map((group: any) => (
            <div key={group.group_code} className="rounded-xl bg-white/10 p-3 text-xs">
              <strong>{groupLabel(group.group_code, group.group_name)}</strong>
              <p className="mt-1 text-slate-300">Pour {group.for_count} · Contre {group.against_count} · Abst. {group.abstain_count}</p>
            </div>
          ))}
        </div>
      )}
      {(voteCount === null || voteCount > 0) && (
        <details className="mt-4 text-sm" onToggle={e => { if ((e.currentTarget as HTMLDetailsElement).open) void loadVotes(); }}>
          <summary className="cursor-pointer font-bold text-red-300">Votes nominatifs{voteCount != null ? ` (${voteCount})` : ""}</summary>
          <div className="mt-3 max-h-52 overflow-y-auto rounded-xl bg-white/5 p-3">
            {loading && <p className="flex items-center gap-2 text-slate-300"><Loader2 size={14} className="animate-spin" /> Chargement…</p>}
            {votes?.map((vote: any) => <p key={vote.voter_official_id} className="border-b border-white/10 py-1"><span className="font-bold">{vote.voter_name}</span> — {POS_FR[vote.position] || vote.position}</p>)}
            {votes && votes.length === 0 && !loading && <p className="text-slate-400">Détail des votes indisponible.</p>}
          </div>
        </details>
      )}
    </div>
  );
}

// Scrutins — chargés À LA DEMANDE au dépliage (fiche instantanée). Rétro-compatible avec l'ancien
// RPC qui fournissait déjà le tableau (`initial`).
function ScrutinsSection({ dossierId, total = 0, initial }: { dossierId: string; total?: number; initial?: any[] }) {
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 4;
  const [items, setItems] = useState<any[] | null>(initial ?? null);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    const next = !show; setShow(next);
    if (next && items === null && !loading) {
      setLoading(true);
      try { setItems(await api.getDossierScrutins(dossierId)); } finally { setLoading(false); }
    }
  };

  if (total === 0 && !(items && items.length)) {
    return (
      <section className="mt-10">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Scrutins</h3>
        <p className="mt-4 text-slate-500">Aucun scrutin rattaché.</p>
      </section>
    );
  }

  const shown = items ?? [];
  const truncated = total > shown.length && items !== null;
  const pageCount = Math.max(1, Math.ceil(shown.length / perPage));
  const current = shown.slice(page * perPage, page * perPage + perPage);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Scrutins <span className="text-slate-400">({total || shown.length})</span></h3>
        <button onClick={toggle} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
          {show ? "Masquer les scrutins" : "Voir les scrutins"}
          <ChevronDown size={16} className={`transition-transform ${show ? "rotate-180" : ""}`} />
        </button>
      </div>
      {truncated && show && <p className="mt-3 text-xs italic text-slate-400">Les {shown.length} scrutins les plus récents sont affichés (sur {total}).</p>}
      {show && (
        <>
          {loading && <div className="mt-4 flex items-center gap-2 text-slate-500"><Loader2 size={16} className="animate-spin" /> Chargement…</div>}
          <div className="mt-4 grid gap-3">
            {current.map(scrutin => <ScrutinCard key={scrutin.official_id} scrutin={scrutin} />)}
          </div>
          {pageCount > 1 && (
            <div className="mt-5 flex items-center justify-center gap-4">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                <ChevronLeft size={16} />Précédent
              </button>
              <span className="text-sm font-bold text-slate-500">Page {page + 1} / {pageCount}</span>
              <button onClick={() => setPage(p => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-40">
                Suivant<ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function InitiatorAvatar({ person }: { person: InitiatorPerson }) {
  const [index, setIndex] = useState(0);
  const exhausted = index >= person.photoSources.length;
  if (exhausted) {
    return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500 text-[10px] font-black text-white">{person.initials}</span>;
  }
  return (
    <img
      src={person.photoSources[index]}
      alt=""
      onError={() => setIndex(i => i + 1)}
      className="h-8 w-8 rounded-full border border-slate-200 object-cover object-top"
    />
  );
}

function InitiatorField({ authorName }: { authorName: string | null }) {
  const names = parseInitiators(authorName);
  const eligible = names.length >= 1 && names.length <= 3;
  const [people, setPeople] = useState<Map<string, InitiatorPerson> | null>(null);

  useEffect(() => {
    if (!eligible) return;
    let active = true;
    loadPeopleIndex().then(index => { if (active) setPeople(index); }).catch(() => {});
    return () => { active = false; };
  }, [eligible, authorName]);

  // Libellé « Initiateur : » discret et INLINE, suivi du/des nom(s) sur la même ligne
  // (le libellé n'est plus une grosse pastille qui repoussait le nom à la ligne sur mobile).
  const label = <span className="shrink-0 text-slate-400">{names.length > 1 ? "Initiateurs :" : "Initiateur :"}</span>;

  if (!eligible) {
    return (
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-slate-700">
        {label}<span>{authorName || "Non renseigné par la source"}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-slate-700">
      {label}
      {names.map((name, index) => {
        const person = people?.get(normalizeName(name));
        if (person) {
          return (
            <Link key={index} href={personHref(person)} className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-3.5 transition hover:bg-slate-200">
              <InitiatorAvatar person={person} />
              <span>{person.display}</span>
            </Link>
          );
        }
        return <span key={index} className="rounded-full bg-slate-100 px-3.5 py-1.5">{name}</span>;
      })}
    </div>
  );
}

// Parcours législatif (navette) — dépliant, replié par défaut : l'utilisateur ne le voit que
// s'il le souhaite (le détail des étapes est dense).
function NavetteSection({ steps }: { steps: any[] }) {
  const [show, setShow] = useState(false);
  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Navette parlementaire {steps.length > 0 && <span className="text-slate-400">({steps.length})</span>}</h3>
        <button onClick={() => setShow(s => !s)} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
          {show ? "Masquer le parcours" : "Voir le parcours"}
          <ChevronDown size={16} className={`transition-transform ${show ? "rotate-180" : ""}`} />
        </button>
      </div>
      {show && (
        <ol className="mt-4 border-l-2 border-red-200 pl-6">
          {steps.map(step => <li key={step.official_id} className="relative mb-6"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-red-600" /><p className="font-black text-slate-900">{step.step_label}</p><p className="text-sm text-slate-500">{step.chamber} · {formatDate(step.occurred_at)}</p></li>)}
          {!steps.length && <li className="text-slate-500">Aucune étape publiée.</li>}
        </ol>
      )}
    </section>
  );
}

// Repli quand le détail complet est indisponible (RPC muet) : on affiche au moins l'essentiel
// vérifiable + le lien vers le texte officiel, plutôt qu'un clic mort.
export type DossierFallback = {
  title?: string | null; display_title?: string | null; category?: string | null;
  promulgated_at?: string | null; nor?: string | null; jorf_id?: string | null;
};

export default function DossierModal({ detail, loading, onClose, fallback }: { detail: LegislativeDossierDetail | null; loading: boolean; onClose: () => void; fallback?: DossierFallback | null }) {
  const { isPremium } = usePremium();
  // Repli affiché uniquement si le détail complet a bien été tenté mais est revenu vide.
  const showFallback = !loading && !detail && !!fallback;

  // Fermeture au clavier (Échap) + verrou du scroll de fond tant que le panneau est ouvert.
  useEffect(() => {
    if (!detail && !loading && !showFallback) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => { document.removeEventListener("keydown", onKey); unlockScroll(); };
  }, [detail, loading, showFallback, onClose]);

  if (!detail && !loading && !showFallback) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/70 p-4 md:p-10" role="dialog" aria-modal="true" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="relative mx-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white text-slate-900 shadow-2xl md:max-h-[calc(100dvh-5rem)]">
        {/* Bouton fermer flottant (coin) — plus de bande blanche sticky qui recouvre le contenu au scroll */}
        <button onClick={onClose} className="absolute right-4 top-4 z-20 rounded-full bg-slate-100 p-3 shadow-sm transition hover:bg-slate-200" aria-label="Fermer"><X /></button>
        <div className="overflow-y-auto overflow-x-hidden overscroll-contain">
        {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div> : showFallback ? (
          <article className="px-6 pb-12 pt-16 md:px-12">
            {(() => {
              const f = fallback!;
              const promulgated = !!f.promulgated_at;              // ne rien affirmer sans date JO
              const jo = f.jorf_id ? `https://www.legifrance.gouv.fr/jorf/id/${f.jorf_id}` : null;
              return (
                <>
                  {f.category && <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-red-600">{categoryLabel(f.category as any)}</div>}
                  <h2 className="text-4xl font-staatliches uppercase leading-none text-slate-950 md:text-6xl">{f.display_title || f.title}</h2>
                  {promulgated && (
                    <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
                      <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Statut</p>
                      <span className="mt-1 inline-block rounded-full border border-emerald-200 bg-white px-4 py-1.5 text-sm font-black text-emerald-700">Promulguée au Journal officiel</span>
                      <p className="mt-3 text-sm font-bold text-slate-600">Publiée au Journal officiel le {formatDate(f.promulgated_at)}{f.nor ? ` · NOR ${f.nor}` : ""}</p>
                    </div>
                  )}
                  <p className="mt-6 leading-7 text-slate-600">Le détail complet de ce texte (résumé, navette parlementaire, amendements) est en cours de consolidation.{jo ? " En attendant, vous pouvez lire le texte officiel tel que publié au Journal officiel :" : ""}</p>
                  {jo && <a href={jo} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-700">Lire le texte au Journal officiel <ExternalLink size={15} /></a>}
                </>
              );
            })()}
          </article>
        ) : detail && (
          <article className="px-6 pb-12 pt-16 md:px-12">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-red-600">{categoryLabel(detail.dossier.category)}</div>
            <h2 className="text-4xl font-staatliches uppercase leading-none text-slate-950 md:text-6xl">{detail.dossier.title}</h2>
            <div className="mt-5 space-y-2.5 text-sm font-bold">
              <InitiatorField authorName={detail.dossier.author_name} />
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-slate-700">
                <span className="shrink-0 text-slate-400">Mise à jour :</span>
                <span>{formatDate(detail.dossier.source_updated_at)}</span>
              </div>
            </div>

            {/* État d'avancement (façon Datan) : chambre saisie, type, étape en cours. */}
            {(() => {
              const ch = chamberStyle(detail.dossier.current_chamber);
              const tl = typeLabel(detail.dossier.text_type);
              const promulgated = !!detail.promulgation;
              return (
                <div className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{promulgated ? "Statut" : "Actuellement examiné par"}</p>
                    <span className={`mt-1 inline-block rounded-full border px-4 py-1.5 text-sm font-black ${promulgated ? "bg-emerald-50 text-emerald-700 border-emerald-200" : ch.cls}`}>
                      {promulgated ? "Promulguée au Journal officiel" : ch.label}
                    </span>
                  </div>
                  {tl && <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Type</p><span className="mt-1 inline-block rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm font-black text-slate-700">{tl}</span></div>}
                  {/* On masque l'« étape » de navette quand la loi est promulguée : le statut ci-dessus
                      suffit, et le libellé de navette peut être périmé (resynchronisé côté backend). */}
                  {!promulgated && <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape</p><span className="mt-1 inline-block rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm font-black text-slate-700">{detail.dossier.status_label}</span></div>}
                </div>
              );
            })()}

            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase text-slate-950">Résumé</h3><p className="mt-3 leading-7 text-slate-700">{detail.summary?.summary || "Analyse indisponible."}</p></section>
            {detail.premium_analysis ? (
              <section className="mt-10 rounded-[2rem] border border-amber-200 bg-gradient-to-b from-amber-50/70 to-white p-6 md:p-8">
                <div className="flex items-center gap-2 mb-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 text-white shadow"><Scale size={18} /></span>
                  <h3 className="text-2xl font-staatliches uppercase text-amber-900">Analyse détaillée</h3>
                </div>
                <PremiumAnalysis raw={detail.premium_analysis.summary} />
              </section>
            ) : !isPremium ? (
              <section className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-2 text-amber-900"><Lock size={18} /><h3 className="text-2xl font-staatliches uppercase">Analyse détaillée</h3></div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">Analyse approfondie de cette loi (enjeux, portée, points clés), réservée aux membres premium.</p>
                <div className="mt-4"><AwardBadge titleText="Analyse détaillée" link="/premium" /></div>
              </section>
            ) : null}
            <NavetteSection steps={detail.steps} />
            <AmendmentsSection key={detail.dossier.id} dossierId={detail.dossier.id} total={(detail as any).amendments_total} initial={detail.amendments} />
            <ScrutinsSection key={`s-${detail.dossier.id}`} dossierId={detail.dossier.id} total={(detail as any).scrutins_total} initial={detail.scrutins} />
            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase text-slate-950">Sources officielles</h3><div className="mt-3 flex flex-col gap-2">{[...new Set([...(detail.dossier.source_urls || []), ...(detail.summary?.source_urls || []), ...(detail.promulgation?.source_url ? [detail.promulgation.source_url] : [])])].map((url: string) => <a key={url} href={url} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-blue-700 hover:underline"><ExternalLink size={15} className="mt-0.5 shrink-0" /><span className="min-w-0 break-all">{url}</span></a>)}</div></section>
          </article>
        )}
        </div>
      </div>
    </div>
  );
}
