"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { type LegislativeListItem } from "@/lib/legislative";
import { LawCardBody, CARD_CLASS, lawTypeMeta, type LawCardStatus } from "./LawCard";
import SaveLawButton from "./SaveLawButton";

// Textes législatifs actuellement examinés par UNE chambre (AN ou Sénat). Reprend la donnée
// de la navette filtrée par chambre ; chaque carte ouvre la fiche du dossier sur /lois.
const TYPES: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Tous les textes" },
  { value: "proposal", label: "Propositions de loi" },
  { value: "bill", label: "Projets de loi" },
];
const STAGES: Array<{ value: string | null; label: string }> = [
  { value: null, label: "Toutes les étapes" },
  { value: "filed", label: "Déposé" },
  { value: "committee", label: "En commission" },
  { value: "public_debate", label: "En séance" },
  { value: "voted", label: "Voté" },
];
const stageStatus = (code?: string | null): LawCardStatus =>
  code === "voted" ? { label: "Voté", tone: "green" }
  : code === "public_debate" ? { label: "En séance", tone: "blue" }
  : code === "filed" ? { label: "Déposé", tone: "slate" }
  : { label: STAGES.find(s => s.value === code)?.label || "En commission", tone: "amber" };

export default function ChamberLegislation({ chamber, chamberLabel }: { chamber: "AN" | "SENAT"; chamberLabel: string }) {
  const [stage, setStage] = useState<string | null>(null);
  const [textType, setTextType] = useState<string | null>(null);
  const [items, setItems] = useState<LegislativeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getLegislativeDossiers({ chamber, status: stage || undefined, limit: 40 });
      setItems(rows); setHasMore(rows.length === 40);
    } catch { setItems([]); } finally { setLoading(false); }
  }, [chamber, stage]);
  useEffect(() => { void load(); }, [load]);

  const loadMore = async () => {
    const last = items.at(-1); if (!last) return;
    setLoading(true);
    const rows = await api.getLegislativeDossiers({ chamber, status: stage || undefined, cursorDate: last.cursor_date || undefined, cursorId: last.official_id, limit: 40 });
    setItems(cur => [...cur, ...rows]); setHasMore(rows.length === 40); setLoading(false);
  };

  const visible = textType ? items.filter(i => (i as any).text_type === textType) : items;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16">
      <div className="mb-6">
        <h2 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white md:text-4xl">
          Textes législatifs — <span className="text-red-600">{chamberLabel}</span>
        </h2>
        <p className="mt-1 text-slate-500">Textes actuellement examinés par {chamberLabel === "Assemblée nationale" ? "l'Assemblée" : "le Sénat"}, avec leur type et leur étape.</p>
      </div>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:gap-8">
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Type</p>
          <div className="inline-flex flex-wrap gap-2">
            {TYPES.map(t => (
              <button key={t.label} onClick={() => setTextType(t.value)} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${textType === t.value ? "bg-red-600 text-white shadow" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-red-300"}`}>{t.label}</button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Étape</p>
          <div className="inline-flex flex-wrap gap-2">
            {STAGES.map(s => (
              <button key={s.label} onClick={() => setStage(s.value)} className={`rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-wide transition ${stage === s.value ? "bg-amber-500 text-white shadow" : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 hover:border-amber-300"}`}>{s.label}</button>
            ))}
          </div>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-red-600" /></div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-slate-500">Aucun texte ne correspond à ces filtres pour cette chambre.</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map(item => (
            <div key={item.id} className="relative">
              <Link href={`/lois/?dossier=${item.id}`} className={`${CARD_CLASS} ${lawTypeMeta((item as any).text_type)?.accent || ""}`}>
                <LawCardBody
                  title={item.display_title || item.title}
                  date={item.latest_step_at}
                  status={stageStatus(item.status_code)}
                  category={item.category}
                  type={(item as any).text_type}
                />
              </Link>
              <SaveLawButton itemId={item.id} />
            </div>
          ))}
        </div>
      )}
      {visible.length > 0 && hasMore && <div className="mt-8 text-center"><button onClick={loadMore} disabled={loading} className="rounded-full bg-slate-950 px-8 py-4 font-black text-white disabled:opacity-50">Charger plus de textes</button></div>}
    </section>
  );
}
