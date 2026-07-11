"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, Loader2, X, CalendarDays, ExternalLink } from "lucide-react";
import { api } from "@/lib/api";

type Candidate = {
  id: string;
  slug: string;
  full_name: string;
  party: string | null;
  political_side: string | null;
  category: string | null;
  declared_at: string | null;
  photo_url: string | null;
  summary: string | null;
  bio: Record<string, string | string[]> | null;
  program: string | null;
  source_urls: string[] | null;
};

// Couleurs par bord politique — dans l'esprit coloré du site.
const SIDES: Record<string, { label: string; from: string; to: string; badge: string }> = {
  "extreme-gauche": { label: "Extrême gauche", from: "from-rose-600", to: "to-red-700", badge: "bg-red-700" },
  gauche: { label: "Gauche", from: "from-pink-500", to: "to-rose-600", badge: "bg-rose-600" },
  centre: { label: "Centre", from: "from-amber-400", to: "to-orange-500", badge: "bg-orange-500" },
  droite: { label: "Droite", from: "from-sky-500", to: "to-blue-700", badge: "bg-blue-700" },
  "extreme-droite": { label: "Extrême droite", from: "from-indigo-600", to: "to-slate-800", badge: "bg-indigo-700" },
  autre: { label: "Autre", from: "from-slate-500", to: "to-slate-700", badge: "bg-slate-600" },
};

function sideOf(c: Candidate) {
  return SIDES[(c.political_side || "autre").toLowerCase()] || SIDES.autre;
}

const BIO_FIELDS: Array<[string, string]> = [
  ["famille", "Famille"],
  ["parents", "Parents"],
  ["etudes", "Études"],
  ["parcours", "Parcours"],
  ["jobs", "Métiers & jobs"],
  ["passions", "Passions"],
  ["positions", "Positions & combats"],
  ["faits_marquants", "Faits marquants"],
  ["realisations", "Réalisations concrètes"],
  ["sorties_mediatiques", "Sorties médiatiques"],
  ["controverses", "Controverses"],
  ["chronologie", "Chronologie"],
];

function toPoints(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return (Array.isArray(value) ? value : [value]).filter(Boolean);
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
}

function CandidateAvatar({ c, className }: { c: Candidate; className: string }) {
  const [failed, setFailed] = useState(false);
  if (failed || !c.photo_url) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br ${sideOf(c).from} ${sideOf(c).to} font-black text-white ${className}`}>
        {initials(c.full_name)}
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={c.photo_url} alt={c.full_name} onError={() => setFailed(true)} className={`object-cover object-top ${className}`} />;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(new Date(value));
}

function CandidateModal({ candidate, onClose }: { candidate: Candidate; onClose: () => void }) {
  const side = sideOf(candidate);
  const [news, setNews] = useState<any[] | null>(null);
  useEffect(() => {
    let active = true;
    api.getCandidateNews(candidate.id).then(rows => { if (active) setNews(rows); }).catch(() => setNews([]));
    return () => { active = false; };
  }, [candidate.id]);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 p-4 md:p-10" role="dialog" aria-modal="true">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-2xl">
        {/* En-tête coloré */}
        <div className={`relative bg-gradient-to-br ${side.from} ${side.to} p-6 md:p-8`}>
          <button onClick={onClose} className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white transition hover:bg-white/30" aria-label="Fermer"><X /></button>
          <div className="flex flex-col items-center gap-5 text-center text-white md:flex-row md:items-end md:text-left">
            <CandidateAvatar c={candidate} className="h-28 w-28 shrink-0 rounded-3xl border-4 border-white/70 shadow-xl text-3xl" />
            <div>
              <span className="rounded-full bg-white/25 px-3 py-1 text-[11px] font-black uppercase tracking-widest">{side.label}{candidate.party ? ` · ${candidate.party}` : ""}</span>
              <h2 className="mt-3 text-4xl font-staatliches uppercase leading-none md:text-5xl">{candidate.full_name}</h2>
              {candidate.declared_at && <p className="mt-2 text-sm font-bold text-white/80">Candidature déclarée le {formatDate(candidate.declared_at)}</p>}
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {candidate.summary && <p className="mb-6 text-lg leading-7 text-slate-700">{candidate.summary}</p>}

          <div className="grid gap-4 sm:grid-cols-2">
            {BIO_FIELDS.map(([key, label]) => {
              const points = toPoints(candidate.bio?.[key]);
              if (points.length === 0) return null;
              const wide = key === "chronologie" || key === "parcours" ? "sm:col-span-2" : "";
              return (
                <div key={key} className={`rounded-2xl border border-slate-100 bg-slate-50 p-4 ${wide}`}>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">{label}</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-sm leading-6 text-slate-700">
                    {points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>

          {candidate.program && (
            <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h3 className="text-sm font-black uppercase tracking-widest text-amber-800">Programme</h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-6 text-amber-950">{candidate.program}</p>
            </section>
          )}

          {/* Fil d'actu quotidien */}
          <section className="mt-8">
            <h3 className="text-2xl font-staatliches uppercase text-slate-950">Fil d'actualité</h3>
            {news === null ? (
              <p className="mt-3 text-sm text-slate-400">Chargement…</p>
            ) : news.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Aucune actualité recensée pour l'instant — le fil se met à jour chaque jour.</p>
            ) : (
              <div className="mt-4 grid gap-3">
                {news.map(item => (
                  <a key={item.id} href={item.source_url || "#"} target="_blank" rel="noreferrer" className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-300 hover:shadow-sm">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-400">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 uppercase tracking-widest">{item.news_type || "actu"}</span>
                      <span><CalendarDays className="mr-1 inline" size={13} />{formatDate(item.date)}</span>
                    </div>
                    <p className="mt-2 font-bold text-slate-900">{item.title}</p>
                    {item.summary && <p className="mt-1 text-sm leading-6 text-slate-600">{item.summary}</p>}
                    {item.source_name && <p className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-blue-700">{item.source_name}<ExternalLink size={12} /></p>}
                  </a>
                ))}
              </div>
            )}
          </section>

          {candidate.source_urls && candidate.source_urls.length > 0 && (
            <section className="mt-8">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Sources</h3>
              <div className="mt-2 flex flex-col gap-1">
                {candidate.source_urls.filter(Boolean).map(url => (
                  <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:underline"><ExternalLink size={13} />{url}</a>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function CandidatesContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [side, setSide] = useState<string>("Tous");

  useEffect(() => {
    api.getCandidates().then(data => { setCandidates(data as Candidate[]); }).finally(() => setLoading(false));
  }, []);

  const sideTabs = ["Tous", ...Object.keys(SIDES)];
  const filtered = useMemo(() => candidates.filter(c => {
    const matchSide = side === "Tous" || (c.political_side || "autre").toLowerCase() === side;
    const matchSearch = c.full_name.toLowerCase().includes(search.toLowerCase());
    return matchSide && matchSearch;
  }), [candidates, side, search]);

  const openSlug = params.get("candidat");
  const selected = openSlug ? candidates.find(c => c.slug === openSlug) ?? null : null;
  const open = (c: Candidate) => router.replace(`/presidentielles-2027/?candidat=${c.slug}`, { scroll: false });
  const close = () => router.replace("/presidentielles-2027/", { scroll: false });

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hero */}
      <div className="relative overflow-hidden px-4 py-24 text-center">
        <div className="absolute left-1/4 top-0 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute right-1/4 top-10 h-96 w-96 translate-x-1/2 rounded-full bg-red-600/20 blur-[120px]" />
        <div className="relative mx-auto max-w-5xl">
          <span className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-black uppercase tracking-[0.25em] text-white/70">Mis à jour chaque jour</span>
          <h1 className="mt-6 text-6xl font-staatliches uppercase leading-none tracking-tight text-white md:text-8xl">
            Présidentielles <span className="bg-gradient-to-r from-blue-500 via-white to-red-500 bg-clip-text text-transparent">2027</span>
          </h1>
          <div className="mx-auto mt-6 h-1.5 w-40 rounded-full bg-gradient-to-r from-blue-600 to-red-600" />
          <p className="mx-auto mt-6 max-w-2xl text-lg font-medium italic tracking-tight text-slate-400 md:text-xl">
            Tous les candidats officiellement déclarés, leur parcours détaillé et l'actualité de la campagne, actualisés automatiquement.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24">
        <div className="mb-10 flex flex-col items-start justify-between gap-5 md:flex-row md:items-center">
          <div className="flex flex-wrap gap-2">
            {sideTabs.map(tab => (
              <button key={tab} onClick={() => setSide(tab)}
                className={`rounded-full px-4 py-2 text-sm font-bold transition ${side === tab ? "bg-white text-slate-950" : "bg-white/5 text-white/70 hover:bg-white/10"}`}>
                {tab === "Tous" ? "Tous" : SIDES[tab].label}
              </button>
            ))}
          </div>
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un candidat…"
              className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-24 text-white/50"><Loader2 className="mb-4 h-12 w-12 animate-spin" /><p>Chargement des candidats…</p></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-white/5 py-20 text-center text-white/60">
            <div className="mb-3 text-5xl">🗳️</div>
            <p className="text-lg font-bold">Aucun candidat pour ce filtre.</p>
            <p className="mt-1 text-sm">Les nouveaux candidats déclarés sont ajoutés automatiquement chaque jour.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map(c => {
              const s = sideOf(c);
              return (
                <button key={c.id} onClick={() => open(c)}
                  className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 text-left transition hover:-translate-y-1 hover:border-white/20 hover:shadow-2xl">
                  <div className="relative">
                    <CandidateAvatar c={c} className="h-64 w-full text-5xl" />
                    <div className={`absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t ${s.from} ${s.to} opacity-90 mix-blend-multiply`} />
                    <span className={`absolute left-4 top-4 rounded-full ${s.badge} px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow`}>{s.label}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-2xl font-staatliches uppercase leading-none text-white">{c.full_name}</h3>
                    {c.party && <p className="mt-1 text-sm font-bold text-white/50">{c.party}</p>}
                    {c.summary && <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/70">{c.summary}</p>}
                    <span className="mt-4 inline-block text-xs font-black uppercase tracking-widest text-blue-400 transition group-hover:text-blue-300">Voir la fiche →</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && <CandidateModal candidate={selected} onClose={close} />}
    </div>
  );
}

export default function Presidentielles2027Page() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <CandidatesContent />
    </Suspense>
  );
}
