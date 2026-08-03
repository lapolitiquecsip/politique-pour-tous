"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardList, ExternalLink, Sparkles, ChevronDown, Search, FileCheck2, CheckCircle2, ThumbsUp, ThumbsDown, Landmark, Globe, FileText } from "lucide-react";
import { api } from "@/lib/api";

type Ev = { type: string; title: string; date: string | null; url: string | null; detail?: string | null };
type Item = {
  id: string; pacte: string | null; theme: string | null; engagement: string;
  source_url: string; status: string | null; justification: string | null;
  ai_generated: boolean; evidence?: Ev[] | null; evidence_count?: number | null;
  certitudes?: string | null; arguments_pour?: string | null; arguments_contre?: string | null;
  confidence?: string | null; verified?: boolean | null;
};

const STATUS: Record<string, { label: string; chip: string; dot: string; bar: string }> = {
  tenu:          { label: "Tenu",          chip: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", bar: "bg-emerald-500" },
  en_cours:      { label: "En cours",      chip: "bg-blue-50 text-blue-700 border-blue-200",          dot: "bg-blue-500",    bar: "bg-blue-500" },
  partiel:       { label: "Partiel",       chip: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   bar: "bg-amber-500" },
  abandonne:     { label: "Abandonné",     chip: "bg-rose-50 text-rose-700 border-rose-200",          dot: "bg-rose-500",    bar: "bg-rose-500" },
  non_evaluable: { label: "Faites-vous votre propre avis", chip: "bg-slate-100 text-slate-500 border-slate-200",      dot: "bg-slate-400",   bar: "bg-slate-300" },
  non_verifie:   { label: "Faites-vous votre propre avis", chip: "bg-slate-100 text-slate-500 border-slate-200",      dot: "bg-slate-300",   bar: "bg-slate-200" },
};
const ORDER = ["tenu", "en_cours", "partiel", "abandonne", "non_evaluable", "non_verifie"];

// Niveau de confiance de la synthèse IA → pastille colorée (au lieu d'un gris terne).
const CONF: Record<string, { label: string; cls: string }> = {
  faible:  { label: "Confiance faible",  cls: "bg-rose-50 text-rose-600 border-rose-200" },
  moyenne: { label: "Confiance moyenne", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  forte:   { label: "Confiance élevée",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  elevee:  { label: "Confiance élevée",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
};
const confStyle = (c?: string | null) => CONF[(c || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()] || { label: `Confiance ${c}`, cls: "bg-slate-50 text-slate-500 border-slate-200" };

// Type de preuve → pastille colorée + icône, pour repérer la nature de la source d'un coup d'œil.
const EVT: Record<string, { label: string; cls: string; Icon: any }> = {
  scrutin: { label: "Vote AN",  cls: "bg-indigo-50 text-indigo-600", Icon: Landmark },
  web:     { label: "Web",      cls: "bg-sky-50 text-sky-600",       Icon: Globe },
  dossier: { label: "Dossier",  cls: "bg-slate-100 text-slate-500",  Icon: FileText },
};
const evStyle = (t: string) => EVT[t] || EVT.dossier;

// Un verdict sans preuve vérifiable n'est pas affiché comme un verdict : le modèle a
// déjà produit des erreurs factuelles dans ce cas (ex. « pass Culture = tenu », justifié
// par un décret de 2021 antérieur à la promesse, alors que le dispositif a été réduit
// en 2025). Tant qu'aucun fait de notre base ne l'étaye, on affiche « Non vérifié ».
const effectiveStatus = (i: { status: string | null; evidence_count?: number | null; verified?: boolean | null }) =>
  ((i.evidence_count ?? 0) > 0 || i.verified) ? (i.status || "non_evaluable") : "non_verifie";

const fmtDate = (d: string | null) =>
  !d ? "" : new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default function ProgramSection() {
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getPresidentialProgram(2022)
      .then(d => { if (active) setItems(d as Item[]); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const i of items) { const st = effectiveStatus(i); c[st] = (c[st] || 0) + 1; }
    return c;
  }, [items]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(i => {
      if (filter && effectiveStatus(i) !== filter) return false;
      if (!q) return true;
      return i.engagement.toLowerCase().includes(q) || (i.theme || "").toLowerCase().includes(q);
    });
  }, [items, filter, query]);

  if (items.length === 0) return null;
  const sourceUrl = items[0]?.source_url;
  const total = items.length;

  return (
    <section className="bg-white p-8 md:p-10 rounded-[3rem] border border-slate-200 space-y-5">
      <div>
        <p className="text-amber-600 font-black text-xs uppercase tracking-widest mb-2">Élection 2022</p>
        <h2 className="text-3xl md:text-4xl font-staatliches uppercase tracking-tight text-slate-900">
          Le <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500">programme</span> et son avancement
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {total} engagements du programme officiel « Avec Vous ».
        </p>
      </div>

      {/* Synthèse visuelle : l'essentiel se lit d'un coup d'œil, sans dérouler la liste. */}
      <div className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100">
          {ORDER.filter(s => counts[s]).map(s => (
            <div key={s} className={STATUS[s].bar} style={{ width: `${(counts[s] / total) * 100}%` }} title={`${STATUS[s].label} : ${counts[s]}`} />
          ))}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {ORDER.filter(s => counts[s]).map(s => (
            <span key={s} className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <span className={`h-2 w-2 rounded-full ${STATUS[s].dot}`} />
              {STATUS[s].label} <span className="text-slate-900 font-black">{counts[s]}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Avertissement : le lecteur doit distinguer le fait de l'appréciation. */}
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-3.5">
        <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-600" />
        <p className="text-[11px] leading-relaxed text-amber-900">
          <strong>Les engagements sont des faits</strong>, repris du programme officiel de campagne.
          <strong> L'avancement est instruit à charge et à décharge</strong> à partir des textes
          législatifs, scrutins et sources publiques : chaque engagement indique ce qui est établi,
          ce qui plaide pour, ce qui plaide contre. Quand les faits ne permettent pas de trancher,
          nous l'assumons plutôt que d'affirmer à tort.
        </p>
      </div>

      {/* Filtres + recherche : on va droit à ce qu'on cherche au lieu de tout parcourir. */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex flex-wrap gap-2 flex-1">
          <button
            onClick={() => setFilter(null)}
            className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${filter === null ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
          >
            Tous ({total})
          </button>
          {ORDER.filter(s => counts[s]).map(s => (
            <button
              key={s}
              onClick={() => { setFilter(filter === s ? null : s); setOpen(null); }}
              className={`rounded-xl border px-3 py-2 text-[10px] font-black uppercase tracking-widest transition ${filter === s ? STATUS[s].chip + " ring-2 ring-offset-1 ring-slate-300" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"}`}
            >
              {STATUS[s].label} ({counts[s]})
            </button>
          ))}
        </div>
        <div className="relative sm:w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Rechercher…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-xs text-slate-900 outline-none transition focus:border-amber-300"
          />
        </div>
      </div>

      {/* Liste à défilement interne : la section garde une hauteur fixe, donc les blocs
          suivants (ministres, Premiers ministres) restent accessibles sans scroll infini. */}
      <div className="relative">
        <div className="max-h-[26rem] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
          {shown.length === 0 && (
            <p className="py-8 text-center text-xs italic text-slate-400">Aucun engagement ne correspond.</p>
          )}
          {shown.map(i => {
            const st = STATUS[effectiveStatus(i)];
            const isOpen = open === i.id;
            const evs = i.evidence ?? [];
            return (
              <div key={i.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : i.id)}
                  className="w-full flex items-start gap-3 p-3.5 text-left transition hover:bg-slate-50"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${st.dot}`} />
                  <span className="min-w-0 flex-1">
                    {i.theme && <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">{i.theme}</span>}
                    <span className="mt-0.5 block text-sm font-bold leading-snug text-slate-900">{i.engagement}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {(i.evidence_count ?? 0) > 0 && (
                      <span className="hidden sm:flex items-center gap-1 text-[9px] font-black text-slate-400" title={`${i.evidence_count} preuve(s)`}>
                        <FileCheck2 size={11} /> {i.evidence_count}
                      </span>
                    )}
                    <span className={`rounded-lg border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${st.chip}`}>
                      {st.label}
                    </span>
                    <ChevronDown size={15} className={`text-slate-300 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                  </span>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 bg-white">
                    {/* Bandeau de statut coloré + niveau de confiance, repère immédiat. */}
                    <div className={`flex items-center gap-2 border-b px-4 py-2.5 text-[10px] font-black uppercase tracking-widest ${st.chip}`}>
                      <span className={`h-2.5 w-2.5 rounded-full ${st.dot}`} />
                      {st.label}
                      {i.confidence && (
                        <span className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] ${confStyle(i.confidence).cls}`}>
                          {confStyle(i.confidence).label}
                        </span>
                      )}
                    </div>

                    <div className="space-y-3 px-4 py-4">
                      {/* Ce qui est établi */}
                      {i.certitudes && (
                        <div className="flex gap-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-slate-500" />
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Ce qui est établi</p>
                            <p className="mt-0.5 text-xs leading-relaxed text-slate-700">{i.certitudes}</p>
                          </div>
                        </div>
                      )}

                      {/* Pour / contre — cartes à liseré coloré, le lecteur juge. */}
                      {(i.arguments_pour || i.arguments_contre) && (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {i.arguments_pour && (
                            <div className="rounded-xl border-l-4 border-emerald-400 bg-emerald-50/60 p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-700"><ThumbsUp size={12} /> Plaide pour</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{i.arguments_pour}</p>
                            </div>
                          )}
                          {i.arguments_contre && (
                            <div className="rounded-xl border-l-4 border-rose-400 bg-rose-50/60 p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-rose-700"><ThumbsDown size={12} /> Plaide contre</p>
                              <p className="mt-1 text-[11px] leading-relaxed text-slate-700">{i.arguments_contre}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Synthèse IA — encart ambré distinct. */}
                      {i.justification && (
                        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-3">
                          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-600"><Sparkles size={12} /> Synthèse IA</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{i.justification}</p>
                        </div>
                      )}

                      {/* Sources — pastille de type colorée, compact. */}
                      {evs.length > 0 && (
                        <div>
                          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400"><FileCheck2 size={12} /> Sources ({evs.length})</p>
                          <ul className="mt-2 space-y-1.5">
                            {evs.map((e, k) => {
                              const t = evStyle(e.type);
                              return (
                                <li key={k} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50/70 px-2.5 py-2">
                                  <span className={`mt-0.5 flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest ${t.cls}`}>
                                    <t.Icon size={9} /> {t.label}
                                  </span>
                                  <span className="min-w-0 flex-1 text-[11px] leading-snug text-slate-700">
                                    {e.url ? (
                                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-600 hover:underline">{e.title}</a>
                                    ) : e.title}
                                    {e.date && <span className="ml-1 text-[9px] text-slate-400">· {fmtDate(e.date)}</span>}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      <a
                        href={i.source_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors hover:text-amber-600"
                      >
                        Programme officiel 2022 <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Dégradé : signale qu'il reste du contenu dans le cadre. */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-2 h-8 bg-gradient-to-t from-white to-transparent rounded-b-2xl" />
      </div>

      <p className="text-[10px] text-slate-400/80 italic border-t border-slate-100 pt-4 flex items-start gap-1.5">
        <ClipboardList size={12} className="mt-0.5 shrink-0" />
        <span>
          Engagements : programme officiel « Emmanuel Macron — Avec Vous » (2022)
          {sourceUrl && <> — <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">source</a></>}.
          Avancement : évaluation générée par IA à partir des scrutins et dossiers législatifs
          postérieurs à mai 2022, non validée par un humain.
        </span>
      </p>
    </section>
  );
}
