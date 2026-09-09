"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, Loader2, Newspaper, RefreshCw, X, Check } from "lucide-react";
import { api } from "@/lib/api";
import EntityNewsFeed from "@/components/shared/EntityNewsFeed";

// Fil d'actualité de LA commune de l'utilisateur, sur son profil premium. L'utilisateur
// « active » le fil en choisissant sa commune (recherche par nom → code INSEE). Le choix est
// mémorisé dans le navigateur (localStorage) — aucune donnée serveur requise. Le fil lui-même
// réutilise EntityNewsFeed (entityType « commune »), en défilement horizontal.
const LS_KEY = "lpcs_commune_feed";
type Commune = { insee: string; name: string };
type Hit = { insee_code: string; commune_name: string; population: number | null };

export default function CommuneFeedCard() {
  const [commune, setCommune] = useState<Commune | null>(null);
  const [ready, setReady] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Hit[]>([]);
  const [searching, setSearching] = useState(false);
  const [picking, setPicking] = useState(false); // mode « changer de commune »
  const boxRef = useRef<HTMLDivElement>(null);

  // Chargement du choix mémorisé.
  useEffect(() => {
    try { const raw = localStorage.getItem(LS_KEY); if (raw) setCommune(JSON.parse(raw)); } catch { /* ignore */ }
    setReady(true);
  }, []);

  // Recherche (léger debounce).
  useEffect(() => {
    if (query.trim().length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await api.searchCommunes(query);
      setResults(r); setSearching(false);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const choose = (h: Hit) => {
    const val: Commune = { insee: h.insee_code, name: h.commune_name };
    setCommune(val); setQuery(""); setResults([]); setPicking(false);
    try { localStorage.setItem(LS_KEY, JSON.stringify(val)); } catch { /* ignore */ }
  };
  const disable = () => {
    setCommune(null); setPicking(false);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  };

  if (!ready) return null; // évite un flash avant lecture du localStorage

  // Champ de recherche réutilisé (activation + changement de commune).
  const searchBox = (
    <div ref={boxRef} className="relative">
      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 focus-within:border-blue-400">
        <Search size={16} className="shrink-0 text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom de votre commune (ex. Orvault)"
          className="w-full bg-transparent py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        {searching && <Loader2 size={15} className="shrink-0 animate-spin text-slate-400" />}
      </div>
      {results.length > 0 && (
        <ul className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {results.map((h) => (
            <li key={h.insee_code}>
              <button onClick={() => choose(h)}
                className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition hover:bg-blue-50">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-800">
                  <MapPin size={14} className="text-rose-500" /> {h.commune_name}
                </span>
                {h.population != null && (
                  <span className="shrink-0 text-[11px] font-bold text-slate-400">
                    {Number(h.population).toLocaleString("fr-FR")} hab.
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  // ─── FIL ACTIVÉ ────────────────────────────────────────────────────────────────────────
  if (commune && !picking) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 rounded-[2rem] border border-slate-200 bg-white p-5">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <MapPin size={20} />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-black uppercase tracking-widest text-slate-900">
                Actus de {commune.name}
              </h3>
              <p className="text-[11px] text-slate-500">Le fil de votre commune, mis à jour automatiquement.</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button onClick={() => { setPicking(true); setQuery(""); }} title="Changer de commune"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-blue-300 hover:text-blue-600">
              <RefreshCw size={12} /> <span className="hidden sm:inline">Changer</span>
            </button>
            <button onClick={disable} title="Désactiver le fil"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-slate-500 transition hover:border-rose-300 hover:text-rose-600">
              <X size={12} /> <span className="hidden sm:inline">Désactiver</span>
            </button>
          </div>
        </div>
        {/* Le fil de la commune (même composant que la fiche maire), défilement horizontal. */}
        <EntityNewsFeed entityType="commune" entityId={commune.insee} horizontal defaultOpen />
      </div>
    );
  }

  // ─── ACTIVATION (ou changement de commune) ─────────────────────────────────────────────
  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-sky-500 text-white shadow-md">
          <Newspaper size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-black text-slate-900">
            {picking ? "Changer de commune" : "Activez le fil d'actualité de votre commune"}
          </h3>
          <p className="mt-0.5 text-sm text-slate-500">
            Recevez directement, ici sur votre profil, les actualités de votre ville.
          </p>
          <div className="mt-4 max-w-md">{searchBox}</div>
          {picking && (
            <button onClick={() => setPicking(false)}
              className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">
              <Check size={12} /> Garder {commune?.name}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
