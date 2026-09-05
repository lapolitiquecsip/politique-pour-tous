"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Loader2, Search, Scale, Vote } from "lucide-react";
import { api } from "@/lib/api";
import {
  LEGISLATIVE_CATEGORIES,
  type LegislativeCategory,
  type LegislativeDossierDetail,
  type LegislativeListItem,
} from "@/lib/legislative";
import { LawCardBody, CARD_CLASS, lawTypeMeta, type LawCardStatus } from "@/components/lois/LawCard";
import IssuesVotesView from "@/components/lois/IssuesVotesView";
import SaveLawButton from "@/components/lois/SaveLawButton";
import DossierModal from "@/components/lois/DossierModal";

type Tab = "promulgated" | "ongoing" | "enjeux";

// --- Reclassement ergonomique de la navette parlementaire (inspiré de Datan) ---------------
// Chambre où le texte est ACTUELLEMENT examiné.
const CHAMBERS: Array<{ value: string | null; label: string; short: string }> = [
  { value: null, label: "Toutes les chambres", short: "Toutes" },
  { value: "AN", label: "Assemblée nationale", short: "Assemblée nationale" },
  { value: "SENAT", label: "Sénat", short: "Sénat" },
];
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
    if (tab === "enjeux") { setLoading(false); return; }   // l'onglet Enjeux charge ses propres données
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
        {/* Onglets : sur mobile, icône AU-DESSUS d'un libellé court centré (fini le texte qui se
            replie de travers) ; sur desktop, disposition en ligne inchangée. */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm">
          <button onClick={() => setTab("promulgated")} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-black leading-tight transition md:flex-row md:gap-2 md:py-4 md:text-base ${tab === "promulgated" ? "bg-red-600 text-white" : "text-slate-600"}`}><Scale size={18} className="shrink-0" /><span>Lois promulguées</span></button>
          <button onClick={() => setTab("ongoing")} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-black leading-tight transition md:flex-row md:gap-2 md:py-4 md:text-base ${tab === "ongoing" ? "bg-slate-950 text-white" : "text-slate-600"}`}><FileText size={18} className="shrink-0" /><span>Textes en cours</span></button>
          <button onClick={() => setTab("enjeux")} className={`flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 text-center text-xs font-black leading-tight transition md:flex-row md:gap-2 md:py-4 md:text-base ${tab === "enjeux" ? "bg-violet-600 text-white" : "text-slate-600"}`}><Vote size={18} className="shrink-0" /><span>Votes par enjeu</span></button>
        </div>
        {tab !== "enjeux" && (
        <div className="flex flex-col gap-3 md:flex-row">
          <label className="flex flex-1 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 text-slate-600 focus-within:border-slate-400"><Search size={18} /><input value={search} onChange={event => setSearch(event.target.value)} className="w-full bg-transparent py-4 outline-none text-slate-900 placeholder:text-slate-400" placeholder="Rechercher un texte officiel" /></label>
          <select value={category || ""} onChange={event => setCategory((event.target.value || null) as LegislativeCategory | null)} className="rounded-xl border border-slate-200 bg-white px-4 py-4 font-bold text-slate-900 outline-none"><option value="">Toutes les catégories</option>{LEGISLATIVE_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
        </div>
        )}

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

      {tab === "enjeux" ? <IssuesVotesView /> : (<>
      <div className="mt-10"><h2 className="text-4xl font-staatliches uppercase md:text-6xl text-slate-900">{tab === "promulgated" ? "Publiées au Journal officiel" : "Dans la navette parlementaire"}</h2><p className="mt-2 text-slate-500">{tab === "promulgated" ? "Seule une publication JORF peut faire apparaître un texte ici." : "Suivez chaque texte : la chambre qui l'examine, son type et son étape."}</p></div>
      {loading && <div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}
      {error && <div className="mt-8 rounded-2xl bg-red-50 p-5 font-bold text-red-800">{error}</div>}
      {!loading && !error && <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleItems.map(item => {
        const status: LawCardStatus | null = tab === "promulgated"
          ? { label: "Promulguée", tone: "green" }
          : stageStatus(item.status_code);
        // Accent de bordure coloré par type (proposition = violet, projet = cyan), onglet « en cours ».
        const cardType = tab === "ongoing" ? (item as any).text_type : null;
        const accent = lawTypeMeta(cardType)?.accent || "";
        return (
          <div key={item.id} className="relative">
            <button onClick={() => openDossier(item.id)} className={`${CARD_CLASS} ${accent}`}>
              <LawCardBody
                title={item.display_title || item.title}
                date={item.promulgated_at || item.latest_step_at}
                status={status}
                category={item.category}
                type={cardType}
              />
            </button>
            <SaveLawButton itemId={item.id} />
          </div>
        );
      })}</div>}
      {!loading && !error && !visibleItems.length && <div className="py-20 text-center text-slate-500">Aucun texte officiel ne correspond à ces filtres.</div>}
      {!error && visibleItems.length > 0 && hasMore && <div className="mt-10 text-center"><button onClick={loadMore} disabled={loading} className="rounded-full bg-slate-950 px-8 py-4 font-black text-white disabled:opacity-50">Charger plus de textes</button></div>}
      </>)}
      <DossierModal detail={detail} loading={detailLoading} onClose={closeDossier} />
    </section>
  );
}

export default function LawsClient() {
  return <Suspense fallback={<div className="flex justify-center py-24"><Loader2 className="animate-spin text-red-600" /></div>}><LawsContent /></Suspense>;
}
