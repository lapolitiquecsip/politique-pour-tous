"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ExternalLink, FileText, Loader2, Search, Scale, X } from "lucide-react";
import { api } from "@/lib/api";
import { cleanHtmlText, formatAmendmentOutcome } from "@/lib/html";
import { usePremium } from "@/lib/hooks/usePremium";
import { groupLabel } from "@/lib/legislative-groups";
import { parseInitiators, loadPeopleIndex, personHref, normalizeName, type InitiatorPerson } from "@/lib/initiators";
import { AwardBadge } from "@/components/ui/award-badge";
import { Lock, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import {
  LEGISLATIVE_CATEGORIES,
  categoryLabel,
  type LegislativeCategory,
  type LegislativeDossierDetail,
  type LegislativeListItem,
} from "@/lib/legislative";
import { LawCardBody, CARD_CLASS, type LawCardStatus } from "@/components/lois/LawCard";
import SaveLawButton from "@/components/lois/SaveLawButton";

type Tab = "promulgated" | "ongoing";

// --- Reclassement ergonomique de la navette parlementaire (inspiré de Datan) ---------------
// Chambre où le texte est ACTUELLEMENT examiné.
const CHAMBERS: Array<{ value: string | null; label: string; short: string }> = [
  { value: null, label: "Toutes les chambres", short: "Toutes" },
  { value: "AN", label: "Assemblée nationale", short: "Assemblée nationale" },
  { value: "SENAT", label: "Sénat", short: "Sénat" },
];
const chamberStyle = (c?: string | null) =>
  c === "AN" ? { label: "Assemblée nationale", cls: "bg-blue-50 text-blue-700 border-blue-200" }
  : c === "SENAT" ? { label: "Sénat", cls: "bg-rose-50 text-rose-700 border-rose-200" }
  : c === "CC" ? { label: "Conseil constitutionnel", cls: "bg-purple-50 text-purple-700 border-purple-200" }
  : { label: "Journal officiel", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
// Type de texte : qui en est à l'origine.
const typeLabel = (t?: string | null) => t === "bill" ? "Projet de loi" : t === "proposal" ? "Proposition de loi" : null;
const TYPES: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Tous les textes" },
  { value: "proposal", label: "Propositions de loi" },
  { value: "bill", label: "Projets de loi" },
];
// Étape courante dans la navette.
const STAGES: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Toutes les étapes" },
  { value: "filed", label: "Déposé" },
  { value: "committee", label: "En commission" },
  { value: "public_debate", label: "En séance" },
  { value: "voted", label: "Voté" },
];
const stageLabel = (code?: string | null) => STAGES.find(s => s.value === code)?.label || null;
// Étape courante → badge de statut coloré (façon fil « Derniers votes »).
const stageStatus = (code?: string | null): LawCardStatus =>
  code === "voted" ? { label: "Voté", tone: "green" }
  : code === "public_debate" ? { label: "En séance", tone: "blue" }
  : code === "filed" ? { label: "Déposé", tone: "slate" }
  : { label: stageLabel(code) || "En commission", tone: "amber" };

function formatDate(value?: string | null) {
  if (!value) return "Date indisponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

function AmendmentsSection({ amendments }: { amendments: any[] }) {
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 6;

  if (!amendments.length) {
    return (
      <section className="mt-10">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Amendements</h3>
        <p className="mt-4 text-slate-500">Aucun amendement rattaché.</p>
      </section>
    );
  }

  const pageCount = Math.ceil(amendments.length / perPage);
  const start = page * perPage;
  const current = amendments.slice(start, start + perPage);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Amendements <span className="text-slate-400">({amendments.length})</span></h3>
        <button onClick={() => setShow(s => !s)} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
          {show ? "Masquer les amendements" : "Voir les amendements"}
          <ChevronDown size={16} className={`transition-transform ${show ? "rotate-180" : ""}`} />
        </button>
      </div>
      {show && (
        <>
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

// Rend le gras Markdown (**texte**) car certaines analyses sont en texte, pas en JSON.
function renderBold(text: string) {
  return text.split(/\*\*/).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="text-amber-900">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function PremiumAnalysis({ raw }: { raw: string }) {
  let data: unknown = null;
  try { data = JSON.parse(raw); } catch { /* pas du JSON : rendu texte/markdown */ }
  if (!data || typeof data !== "object") {
    return <p className="mt-4 whitespace-pre-line leading-7 text-amber-950">{renderBold(raw)}</p>;
  }
  return (
    <div className="mt-4 space-y-5">
      {Object.entries(data as Record<string, unknown>).map(([key, value]) => (
        <div key={key}>
          <h4 className="text-sm font-black uppercase tracking-wide text-amber-900">{humanizeKey(key)}</h4>
          {typeof value === "string" ? (
            <p className="mt-1 leading-7 text-amber-950">{value}</p>
          ) : value && typeof value === "object" ? (
            <div className="mt-2 space-y-2">
              {Object.entries(value as Record<string, unknown>).map(([subKey, subValue]) => (
                <p key={subKey} className="leading-7 text-amber-950">
                  <span className="font-bold text-amber-900">{humanizeKey(subKey)} : </span>
                  {typeof subValue === "string" ? subValue : JSON.stringify(subValue)}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-amber-950">{String(value)}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function ScrutinsSection({ scrutins }: { scrutins: any[] }) {
  const [show, setShow] = useState(false);
  const [page, setPage] = useState(0);
  const perPage = 4;

  if (!scrutins.length) {
    return (
      <section className="mt-10">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Scrutins</h3>
        <p className="mt-4 text-slate-500">Aucun scrutin rattaché.</p>
      </section>
    );
  }

  const pageCount = Math.ceil(scrutins.length / perPage);
  const current = scrutins.slice(page * perPage, page * perPage + perPage);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-2xl font-staatliches uppercase text-slate-950">Scrutins <span className="text-slate-400">({scrutins.length})</span></h3>
        <button onClick={() => setShow(s => !s)} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200">
          {show ? "Masquer les scrutins" : "Voir les scrutins"}
          <ChevronDown size={16} className={`transition-transform ${show ? "rotate-180" : ""}`} />
        </button>
      </div>
      {show && (
        <>
          <div className="mt-4 grid gap-3">
            {current.map(scrutin => (
              <div key={scrutin.official_id} className="rounded-2xl bg-slate-950 p-5 text-white">
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
                <details className="mt-4 text-sm">
                  <summary className="cursor-pointer font-bold text-red-300">Votes nominatifs ({scrutin.votes?.length || 0})</summary>
                  <div className="mt-3 max-h-52 overflow-y-auto rounded-xl bg-white/5 p-3">
                    {scrutin.votes?.map((vote: any) => <p key={vote.voter_official_id} className="border-b border-white/10 py-1"><span className="font-bold">{vote.voter_name}</span> — {vote.position}</p>)}
                  </div>
                </details>
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

  if (!eligible) {
    return <span className="rounded-full bg-slate-100 px-4 py-2">Initiateur : {authorName || "Non renseigné par la source"}</span>;
  }

  return (
    <span className="inline-flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-slate-100 px-4 py-2">{names.length > 1 ? "Initiateurs" : "Initiateur"} :</span>
      {names.map((name, index) => {
        const person = people?.get(normalizeName(name));
        if (person) {
          return (
            <Link key={index} href={personHref(person)} className="inline-flex items-center gap-2 rounded-full bg-slate-100 py-1 pl-1 pr-4 transition hover:bg-slate-200">
              <InitiatorAvatar person={person} />
              <span>{person.display}</span>
            </Link>
          );
        }
        return <span key={index} className="rounded-full bg-slate-100 px-4 py-2">{name}</span>;
      })}
    </span>
  );
}

function DossierModal({ detail, loading, onClose }: { detail: LegislativeDossierDetail | null; loading: boolean; onClose: () => void }) {
  const { isPremium } = usePremium();
  if (!detail && !loading) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 p-4 md:p-10 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-white shadow-2xl text-slate-900">
        <div className="sticky top-0 z-10 flex justify-end rounded-t-[2rem] bg-white/95 p-4 backdrop-blur">
          <button onClick={onClose} className="rounded-full bg-slate-100 p-3" aria-label="Fermer"><X /></button>
        </div>
        {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div> : detail && (
          <article className="px-6 pb-12 md:px-12">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-red-600">{categoryLabel(detail.dossier.category)}</div>
            <h2 className="text-4xl font-staatliches uppercase leading-none text-slate-950 md:text-6xl">{detail.dossier.title}</h2>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-slate-600">
              <InitiatorField authorName={detail.dossier.author_name} />
              <span className="rounded-full bg-slate-100 px-4 py-2">Mise à jour : {formatDate(detail.dossier.source_updated_at)}</span>
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
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Étape</p><span className="mt-1 inline-block rounded-full bg-white border border-slate-200 px-4 py-1.5 text-sm font-black text-slate-700">{detail.dossier.status_label}</span></div>
                </div>
              );
            })()}

            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase text-slate-950">Résumé</h3><p className="mt-3 leading-7 text-slate-700">{detail.summary?.summary || "Analyse indisponible."}</p></section>
            {detail.premium_analysis ? (
              <section className="mt-10 rounded-3xl bg-amber-50 p-6"><h3 className="text-2xl font-staatliches uppercase text-amber-900">Analyse détaillée</h3><PremiumAnalysis raw={detail.premium_analysis.summary} /></section>
            ) : !isPremium ? (
              <section className="mt-10 rounded-3xl border border-amber-200 bg-amber-50 p-6">
                <div className="flex items-center gap-2 text-amber-900"><Lock size={18} /><h3 className="text-2xl font-staatliches uppercase">Analyse détaillée</h3></div>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-amber-800">Analyse approfondie de cette loi rédigée par notre IA (enjeux, portée, points clés), réservée aux membres premium.</p>
                <div className="mt-4"><AwardBadge titleText="Analyse détaillée" link="/premium" /></div>
              </section>
            ) : null}
            <section className="mt-10">
              <h3 className="text-2xl font-staatliches uppercase text-slate-950">Navette parlementaire</h3>
              <ol className="mt-4 border-l-2 border-red-200 pl-6">
                {detail.steps.map(step => <li key={step.official_id} className="relative mb-6"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-red-600" /><p className="font-black text-slate-900">{step.step_label}</p><p className="text-sm text-slate-500">{step.chamber} · {formatDate(step.occurred_at)}</p></li>)}
                {!detail.steps.length && <li className="text-slate-500">Aucune étape publiée.</li>}
              </ol>
            </section>
            <AmendmentsSection key={detail.dossier.id} amendments={detail.amendments} />
            <ScrutinsSection key={`s-${detail.dossier.id}`} scrutins={detail.scrutins} />
            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase text-slate-950">Sources officielles</h3><div className="mt-3 flex flex-col gap-2">{[...new Set([...(detail.dossier.source_urls || []), ...(detail.summary?.source_urls || []), ...(detail.promulgation?.source_url ? [detail.promulgation.source_url] : [])])].map((url: string) => <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-700 hover:underline"><ExternalLink size={15} />{url}</a>)}</div></section>
          </article>
        )}
      </div>
    </div>
  );
}

function LawsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>("promulgated");
  const [category, setCategory] = useState<LegislativeCategory | null>(null);
  const [search, setSearch] = useState("");
  // Filtres propres à la navette parlementaire (onglet « textes en cours »).
  const [chamber, setChamber] = useState<string | null>(null);   // AN | SENAT (côté serveur)
  const [stage, setStage] = useState<string | null>(null);       // status_code (côté serveur)
  const [textType, setTextType] = useState<string | null>(null); // proposal | bill (côté client)
  const [items, setItems] = useState<LegislativeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [detail, setDetail] = useState<LegislativeDossierDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const hydratedFromUrl = useRef(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const rows = tab === "promulgated"
        ? await api.getPromulgatedLaws({ category, search, limit: 40 })
        : await api.getLegislativeDossiers({ category, search, chamber: chamber || undefined, status: stage || undefined, limit: 40 });
      setItems(rows); setHasMore(rows.length === 40);
    } catch (cause) {
      console.error(cause); setError("Les données législatives sont momentanément indisponibles.");
    } finally { setLoading(false); }
  }, [tab, category, search, chamber, stage]);

  // Le type (proposition/projet) est filtré côté client (non porté par le RPC).
  const visibleItems = tab === "ongoing" && textType ? items.filter(i => (i as any).text_type === textType) : items;

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);

  const openDossier = useCallback(async (id: string) => {
    setDetailLoading(true); setDetail(null); router.replace(`/lois/?dossier=${id}`, { scroll: false });
    try { setDetail(await api.getLegislativeDossier(id)); } finally { setDetailLoading(false); }
  }, [router]);

  useEffect(() => {
    if (hydratedFromUrl.current) return;
    hydratedFromUrl.current = true;
    const id = params.get("dossier");
    if (id) void openDossier(id);
  }, [openDossier, params]);

  const closeDossier = () => { setDetail(null); setDetailLoading(false); router.replace("/lois/", { scroll: false }); };

  const loadMore = async () => {
    const last = items.at(-1); if (!last) return;
    setLoading(true);
    try {
      const rows = tab === "promulgated"
        ? await api.getPromulgatedLaws({ category, search, cursorDate: last.promulgated_at || undefined, cursorId: last.jorf_id || undefined, limit: 40 })
        : await api.getLegislativeDossiers({ category, search, chamber: chamber || undefined, status: stage || undefined, cursorDate: last.cursor_date || undefined, cursorId: last.official_id, limit: 40 });
      setItems(current => [...current, ...rows]); setHasMore(rows.length === 40);
    } finally { setLoading(false); }
  };

  return (
    <section className="mx-auto max-w-7xl px-4 pb-24 text-slate-900">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 md:p-8">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <button onClick={() => setTab("promulgated")} className={`rounded-xl px-4 py-4 font-black ${tab === "promulgated" ? "bg-red-600 text-white" : "text-slate-600"}`}><Scale className="mr-2 inline" size={18} />Lois promulguées</button>
          <button onClick={() => setTab("ongoing")} className={`rounded-xl px-4 py-4 font-black ${tab === "ongoing" ? "bg-slate-950 text-white" : "text-slate-600"}`}><FileText className="mr-2 inline" size={18} />Textes en cours</button>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-600 focus-within:border-slate-400"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent py-4 outline-none text-slate-900 placeholder:text-slate-400" placeholder="Rechercher un texte officiel" /></label>
          <select value={category || ""} onChange={event => setCategory((event.target.value || null) as LegislativeCategory | null)} className="rounded-xl border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none"><option value="">Toutes les catégories</option>{LEGISLATIVE_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>

        {/* Sous-filtres de la navette : où en est le texte, quel type, quelle étape. */}
        {tab === "ongoing" && (
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-4">
            <div>
              <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Chambre saisie actuellement</p>
              <div className="inline-flex flex-wrap gap-2">
                {CHAMBERS.map(c => (
                  <button key={c.label} onClick={() => setChamber(c.value)} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${chamber === c.value ? "bg-slate-950 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:border-slate-400"}`}>{c.short}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-8">
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Type de texte</p>
                <div className="inline-flex flex-wrap gap-2">
                  {TYPES.map(t => (
                    <button key={t.label} onClick={() => setTextType(t.value)} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${textType === t.value ? "bg-red-600 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:border-red-300"}`}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Étape</p>
                <div className="inline-flex flex-wrap gap-2">
                  {STAGES.map(s => (
                    <button key={s.label} onClick={() => setStage(s.value)} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${stage === s.value ? "bg-amber-500 text-white shadow" : "bg-white border border-slate-200 text-slate-600 hover:border-amber-300"}`}>{s.label}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-10"><h2 className="text-4xl font-staatliches uppercase md:text-6xl text-slate-900">{tab === "promulgated" ? "Publiées au Journal officiel" : "Dans la navette parlementaire"}</h2><p className="mt-2 text-slate-500">{tab === "promulgated" ? "Seule une publication JORF peut faire apparaître un texte ici." : "Suivez chaque texte : la chambre qui l'examine, son type et son étape."}</p></div>
      {loading && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}
      {error && <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-800">{error}</div>}
      {!loading && !error && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleItems.map(item => {
        const status: LawCardStatus | null = tab === "promulgated"
          ? { label: "Promulguée", tone: "green" }
          : stageStatus(item.status_code);
        return (
          <div key={item.id} className="relative">
            <button onClick={() => openDossier(item.id)} className={CARD_CLASS}>
              <LawCardBody
                title={item.display_title || item.title}
                date={item.promulgated_at || item.latest_step_at}
                status={status}
                category={item.category}
                typeLabel={tab === "ongoing" ? typeLabel((item as any).text_type) : null}
              />
            </button>
            <SaveLawButton itemId={item.id} />
          </div>
        );
      })}</div>}
      {!loading && !error && !visibleItems.length && <div className="py-20 text-center text-slate-500">Aucun texte officiel ne correspond à ces filtres.</div>}
      {!error && visibleItems.length > 0 && hasMore && <div className="mt-10 text-center"><button onClick={loadMore} disabled={loading} className="rounded-full bg-slate-950 px-8 py-4 font-black text-white disabled:opacity-50">Charger plus de textes</button></div>}
      <DossierModal detail={detail} loading={detailLoading} onClose={closeDossier} />
    </section>
  );
}

export default function LawsClient() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}><LawsContent /></Suspense>;
}
