"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CalendarDays, ExternalLink, FileText, Loader2, Search, Scale, X } from "lucide-react";
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

type Tab = "promulgated" | "ongoing";

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
              <span className="rounded-full bg-slate-100 px-4 py-2">{detail.dossier.status_label}</span>
              <InitiatorField authorName={detail.dossier.author_name} />
              <span className="rounded-full bg-slate-100 px-4 py-2">Mise à jour : {formatDate(detail.dossier.source_updated_at)}</span>
            </div>

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
      const rows = tab === "promulgated" ? await api.getPromulgatedLaws({ category, search, limit: 40 }) : await api.getLegislativeDossiers({ category, search, limit: 40 });
      setItems(rows); setHasMore(rows.length === 40);
    } catch (cause) {
      console.error(cause); setError("Les données législatives sont momentanément indisponibles.");
    } finally { setLoading(false); }
  }, [tab, category, search]);

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
        : await api.getLegislativeDossiers({ category, search, cursorDate: last.cursor_date || undefined, cursorId: last.official_id, limit: 40 });
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
      </div>

      <div className="mt-10"><h2 className="text-4xl font-staatliches uppercase md:text-6xl text-slate-900">{tab === "promulgated" ? "Publiées au Journal officiel" : "Dans la navette parlementaire"}</h2><p className="mt-2 text-slate-500">{tab === "promulgated" ? "Seule une publication JORF peut faire apparaître un texte ici." : "Projets et propositions, classés par dernière étape officielle."}</p></div>
      {loading && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}
      {error && <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-800">{error}</div>}
      {!loading && !error && <div className="mt-8 grid gap-5 md:grid-cols-2">{items.map(item => <button key={item.id} onClick={() => openDossier(item.id)} className="group rounded-[2rem] border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-4"><span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">{categoryLabel(item.category)}</span><span className="text-xs font-bold text-slate-400">{item.current_chamber || "JORF"}</span></div><h3 className="mt-5 text-2xl font-staatliches uppercase leading-tight text-slate-950 md:text-3xl">{item.title}</h3><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{item.summary || "Analyse indisponible."}</p><div className="mt-6 flex items-center justify-between border-t pt-4 text-xs font-bold text-slate-500"><span><CalendarDays className="mr-2 inline" size={14} />{formatDate(item.promulgated_at || item.latest_step_at)}</span><span className="text-red-600">Voir la fiche →</span></div></button>)}</div>}
      {!loading && !error && !items.length && <div className="py-20 text-center text-slate-500">Aucun texte officiel ne correspond à ces filtres.</div>}
      {!error && items.length > 0 && hasMore && <div className="mt-10 text-center"><button onClick={loadMore} disabled={loading} className="rounded-full bg-slate-950 px-8 py-4 font-black text-white disabled:opacity-50">Charger plus de textes</button></div>}
      <DossierModal detail={detail} loading={detailLoading} onClose={closeDossier} />
    </section>
  );
}

export default function LawsClient() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}><LawsContent /></Suspense>;
}
