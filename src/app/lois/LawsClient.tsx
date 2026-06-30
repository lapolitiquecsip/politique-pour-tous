"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, ExternalLink, FileText, Loader2, Search, Scale, X } from "lucide-react";
import { api } from "@/lib/api";
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

function DossierModal({ detail, loading, onClose }: { detail: LegislativeDossierDetail | null; loading: boolean; onClose: () => void }) {
  if (!detail && !loading) return null;
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 p-4 md:p-10 overflow-y-auto" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-5xl rounded-[2rem] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex justify-end rounded-t-[2rem] bg-white/95 p-4 backdrop-blur">
          <button onClick={onClose} className="rounded-full bg-slate-100 p-3" aria-label="Fermer"><X /></button>
        </div>
        {loading ? <div className="flex min-h-80 items-center justify-center"><Loader2 className="animate-spin text-red-600" /></div> : detail && (
          <article className="px-6 pb-12 md:px-12">
            <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-red-600">{categoryLabel(detail.dossier.category)}</div>
            <h2 className="text-4xl font-staatliches uppercase leading-none text-slate-950 md:text-6xl">{detail.dossier.title}</h2>
            <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-slate-600">
              <span className="rounded-full bg-slate-100 px-4 py-2">{detail.dossier.status_label}</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">Initiateur : {detail.dossier.author_name || "Non renseigné par la source"}</span>
              <span className="rounded-full bg-slate-100 px-4 py-2">Mise à jour : {formatDate(detail.dossier.source_updated_at)}</span>
            </div>

            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase">Résumé</h3><p className="mt-3 leading-7 text-slate-700">{detail.summary?.summary || "Analyse indisponible."}</p></section>
            {detail.premium_analysis && <section className="mt-10 rounded-3xl bg-amber-50 p-6"><h3 className="text-2xl font-staatliches uppercase text-amber-900">Analyse premium</h3><p className="mt-3 whitespace-pre-line leading-7 text-amber-950">{detail.premium_analysis.summary}</p></section>}
            <section className="mt-10">
              <h3 className="text-2xl font-staatliches uppercase">Navette parlementaire</h3>
              <ol className="mt-4 border-l-2 border-red-200 pl-6">
                {detail.steps.map(step => <li key={step.official_id} className="relative mb-6"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full bg-red-600" /><p className="font-black">{step.step_label}</p><p className="text-sm text-slate-500">{step.chamber} · {formatDate(step.occurred_at)}</p></li>)}
                {!detail.steps.length && <li className="text-slate-500">Aucune étape publiée.</li>}
              </ol>
            </section>
            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase">Amendements</h3><div className="mt-4 grid gap-3">{detail.amendments.map(amendment => <div key={amendment.official_id} className="rounded-2xl border p-5"><div className="flex justify-between gap-4"><strong>Amendement {amendment.number}</strong><span>{amendment.outcome_label || "En attente"}</span></div><p className="mt-2 text-sm text-slate-600">{amendment.subject || amendment.body || "Contenu disponible à la source."}</p></div>)}{!detail.amendments.length && <p className="text-slate-500">Aucun amendement rattaché.</p>}</div></section>
            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase">Scrutins</h3><div className="mt-4 grid gap-3">{detail.scrutins.map(scrutin => <div key={scrutin.official_id} className="rounded-2xl bg-slate-950 p-5 text-white"><strong>{scrutin.title}</strong><p className="mt-2 text-sm text-slate-300">Pour {scrutin.for_count} · Contre {scrutin.against_count} · Abstentions {scrutin.abstain_count}</p>{scrutin.group_results?.length > 0 && <div className="mt-4 grid gap-2 sm:grid-cols-2">{scrutin.group_results.map(group => <div key={group.group_code} className="rounded-xl bg-white/10 p-3 text-xs"><strong>{group.group_name || group.group_code}</strong><p className="mt-1 text-slate-300">Pour {group.for_count} · Contre {group.against_count} · Abst. {group.abstain_count}</p></div>)}</div>}<details className="mt-4 text-sm"><summary className="cursor-pointer font-bold text-red-300">Votes nominatifs ({scrutin.votes?.length || 0})</summary><div className="mt-3 max-h-52 overflow-y-auto rounded-xl bg-white/5 p-3">{scrutin.votes?.map(vote => <p key={vote.voter_official_id} className="border-b border-white/10 py-1"><span className="font-bold">{vote.voter_name}</span> — {vote.position}</p>)}</div></details></div>)}{!detail.scrutins.length && <p className="text-slate-500">Aucun scrutin rattaché.</p>}</div></section>
            <section className="mt-10"><h3 className="text-2xl font-staatliches uppercase">Sources officielles</h3><div className="mt-3 flex flex-col gap-2">{[...(detail.dossier.source_urls || []), ...(detail.promulgation?.source_url ? [detail.promulgation.source_url] : [])].map((url: string) => <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-blue-700 hover:underline"><ExternalLink size={15} />{url}</a>)}</div></section>
          </article>
        )}
      </div>
    </div>
  );
}

export default function LawsClient() {
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
    <section className="mx-auto max-w-7xl px-4 pb-24">
      <div className="flex flex-col gap-5 rounded-[2rem] border border-slate-200 bg-slate-50 p-5 md:p-8">
        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <button onClick={() => setTab("promulgated")} className={`rounded-xl px-4 py-4 font-black ${tab === "promulgated" ? "bg-red-600 text-white" : "text-slate-600"}`}><Scale className="mr-2 inline" size={18} />Lois promulguées</button>
          <button onClick={() => setTab("ongoing")} className={`rounded-xl px-4 py-4 font-black ${tab === "ongoing" ? "bg-slate-950 text-white" : "text-slate-600"}`}><FileText className="mr-2 inline" size={18} />Textes en cours</button>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl border bg-white px-4"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent py-4 outline-none" placeholder="Rechercher un texte officiel" /></label>
          <select value={category || ""} onChange={event => setCategory((event.target.value || null) as LegislativeCategory | null)} className="rounded-xl border bg-white px-4 py-4 font-bold"><option value="">Toutes les catégories</option>{LEGISLATIVE_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>
      </div>

      <div className="mt-10"><h2 className="text-4xl font-staatliches uppercase md:text-6xl">{tab === "promulgated" ? "Publiées au Journal officiel" : "Dans la navette parlementaire"}</h2><p className="mt-2 text-slate-500">{tab === "promulgated" ? "Seule une publication JORF peut faire apparaître un texte ici." : "Projets et propositions, classés par dernière étape officielle."}</p></div>
      {loading && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}
      {error && <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-800">{error}</div>}
      {!loading && !error && <div className="mt-8 grid gap-5 md:grid-cols-2">{items.map(item => <button key={item.id} onClick={() => openDossier(item.id)} className="group rounded-[2rem] border border-slate-200 bg-white p-7 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-xl"><div className="flex items-start justify-between gap-4"><span className="rounded-full bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-red-700">{categoryLabel(item.category)}</span><span className="text-xs font-bold text-slate-400">{item.current_chamber || "JORF"}</span></div><h3 className="mt-5 text-2xl font-staatliches uppercase leading-tight text-slate-950 md:text-3xl">{item.title}</h3><p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{item.summary || "Analyse indisponible."}</p><div className="mt-6 flex items-center justify-between border-t pt-4 text-xs font-bold text-slate-500"><span><CalendarDays className="mr-2 inline" size={14} />{formatDate(item.promulgated_at || item.latest_step_at)}</span><span className="text-red-600">Voir la fiche →</span></div></button>)}</div>}
      {!loading && !error && !items.length && <div className="py-20 text-center text-slate-500">Aucun texte officiel ne correspond à ces filtres.</div>}
      {!error && items.length > 0 && hasMore && <div className="mt-10 text-center"><button onClick={loadMore} disabled={loading} className="rounded-full bg-slate-950 px-8 py-4 font-black text-white disabled:opacity-50">Charger plus de textes</button></div>}
      <DossierModal detail={detail} loading={detailLoading} onClose={closeDossier} />
    </section>
  );
}
