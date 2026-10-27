"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Loader2, Newspaper, Search, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { api } from "@/lib/api";
import { regrouperParEvenement } from "@/lib/feed-events";
import FeedItemCard from "@/components/home/FeedItemCard";

/**
 * Fil d'actualité politique de l'espace Pro.
 *
 * L'ancien fil de l'accueil, que personne ne parcourait : même collecte (table content,
 * crons update-content et content-sync), mais filtré pour le travail — l'actualité qui
 * nomme ses élus suivis, ou une recherche libre. Une carte par événement (feed-events).
 */
type Vue = "tout" | "elus";
const PAR_PAGE = 12;
const nettoyer = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

export default function FilActualitePro({ userId }: { userId: string }) {
  const [vue, setVue] = useState<Vue>("tout");
  const [noms, setNoms] = useState<string[] | null>(null);
  const [saisie, setSaisie] = useState("");
  const [recherche, setRecherche] = useState("");
  const [fil, setFil] = useState<any[]>([]);
  const [limite, setLimite] = useState(PAR_PAGE * 3);
  const [visibles, setVisibles] = useState(PAR_PAGE);
  const [charge, setCharge] = useState(true);

  // Élus suivis : prénom + nom en toutes lettres (un nom court seul ramènerait n'importe quoi).
  useEffect(() => {
    api.getUserFollows(userId).then((f: any[]) => setNoms((f || []).map(x => x.deputies || x.senators || x.meps).filter(Boolean)
      .map((p: any) => `${p.first_name || ""} ${p.last_name || ""}`.trim()).filter(n => n.length > 6))).catch(() => setNoms([]));
  }, [userId]);

  useEffect(() => { const t = setTimeout(() => setRecherche(nettoyer(saisie)), 350); return () => clearTimeout(t); }, [saisie]);
  useEffect(() => { setVisibles(PAR_PAGE); setLimite(PAR_PAGE * 3); }, [vue, recherche]);

  useEffect(() => {
    if (vue === "elus" && noms === null) return;
    let actif = true;
    setCharge(true);
    let q = supabase.from("content").select("id, titre_simplifie, titre_original, resume_flash, source_url, source_name, institution, date_publication, created_at")
      .order("date_publication", { ascending: false }).order("created_at", { ascending: false }).limit(limite);
    if (vue === "elus" && !(noms || []).length) { setFil([]); setCharge(false); return; }
    if (vue === "elus") q = q.or((noms || []).slice(0, 25).flatMap(n => [`titre_simplifie.ilike.%${nettoyer(n)}%`, `resume_flash.ilike.%${nettoyer(n)}%`]).join(","));
    if (recherche) q = q.or(`titre_simplifie.ilike.%${recherche}%,resume_flash.ilike.%${recherche}%,titre_original.ilike.%${recherche}%`);
    q.then(({ data }) => { if (actif) { setFil(regrouperParEvenement((data as any[]) || [])); setCharge(false); } });
    return () => { actif = false; };
  }, [vue, noms, recherche, limite]);

  const montres = fil.slice(0, visibles);
  const plus = () => { setVisibles(v => v + PAR_PAGE); if (visibles + PAR_PAGE >= fil.length) setLimite(l => l + PAR_PAGE * 3); };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 md:rounded-[2.5rem] md:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 text-white shadow-lg shadow-amber-500/30"><Newspaper size={22} /></span>{" "}
        <div className="min-w-0 flex-1">
          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white">Fil <span className="text-amber-300">d&apos;actualité</span></h2>{" "}
          <p className="mt-1 text-sm leading-relaxed text-white/65">L&apos;actualité politique sourcée, mise à jour plusieurs fois par jour. Filtrez sur vos élus suivis ou cherchez un sujet.</p>
        </div>
      </div>{" "}

      <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div role="tablist" aria-label="Filtre du fil" className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/30 p-1 sm:w-[300px]">
          {([["tout", "Toute l'actualité"], ["elus", "Mes élus suivis"]] as [Vue, string][]).map(([v, l]) => (
            <button key={v} type="button" role="tab" aria-selected={vue === v} onClick={() => setVue(v)}
              className={`min-h-[40px] rounded-xl px-2 text-xs font-bold transition ${vue === v ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow" : "text-white/65 hover:text-white"}`}>{l}{" "}</button>
          ))}
        </div>{" "}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input value={saisie} onChange={e => setSaisie(e.target.value)} placeholder="Rechercher un sujet, une personnalité…" enterKeyHint="search"
            className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 text-[15px] text-white placeholder-white/45 focus:border-amber-400/50 focus:outline-none" />
          {saisie && <button type="button" onClick={() => setSaisie("")} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white/60 hover:text-white"><X size={16} /></button>}
        </div>
      </div>{" "}

      {charge && !fil.length ? (
        <div className="flex justify-center py-10"><Loader2 className="animate-spin text-amber-300" /></div>
      ) : !fil.length ? (
        <p className="mt-4 rounded-2xl bg-white/[0.04] p-6 text-center text-sm text-white/60">
          {vue === "elus" && !(noms || []).length ? "Vous ne suivez encore aucun élu : ouvrez la fiche d'un député, d'un sénateur ou d'un eurodéputé et touchez « Suivre »."
            : "Aucune actualité ne correspond."}
        </p>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 md:grid-cols-2">
            {montres.map((item, i) => (
              <li key={item.id ?? i} className="overflow-hidden rounded-[1.5rem]"><FeedItemCard item={item} colorIndex={i} /></li>
            ))}
          </ul>{" "}
          {(visibles < fil.length || fil.length >= limite) && (
            <button type="button" onClick={plus} disabled={charge}
              className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60">
              {charge ? <Loader2 size={16} className="animate-spin" /> : <>Voir plus d&apos;actualités <ChevronDown size={16} /></>}
            </button>
          )}
        </>
      )}
    </section>
  );
}
