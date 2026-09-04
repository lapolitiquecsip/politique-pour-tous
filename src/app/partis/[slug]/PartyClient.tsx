"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import PartyFinanceCompare from "@/components/partis/PartyFinanceCompare";
import AllPartiesNav from "@/components/partis/AllPartiesNav";
import PartyElectionMap, { hasPartyElectionMap } from "@/components/partis/PartyElectionMap";
import EntityNewsFeed from "@/components/shared/EntityNewsFeed";
import CandidateProgram from "@/components/presidentielles/CandidateProgram";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Calendar, Wallet, UserCircle, Compass, MapPin, Globe, Landmark,
  TrendingUp, HeartHandshake, ChevronLeft, ChevronDown, Loader2, ArrowRight, ExternalLink, Coins, Scale
} from "lucide-react";
import { api } from "@/lib/api";

type Party = {
  slug: string; name: string; abbrev: string | null; color: string | null;
  effectif: number | null; pct_women: number | null; avg_age: number | null;
  score_cohesion: number | null; score_participation: number | null; score_majorite: number | null;
  group_start: string | null; datan_updated_at: string | null;
  founded: string | null; members: string | null; budget: string | null; leader: string | null;
  orientation: string | null; headquarters: string | null; website: string | null;
  ideology: string[] | null;
  twitter: string | null; facebook: string | null; instagram: string | null; youtube: string | null; tiktok: string | null;
  summary: string | null; logo_url: string | null; source_url: string | null;
  subventions_eur: number | null; subventions_year: number | null; subventions_source: string | null;
  dettes_eur: number | null; produits_eur: number | null; comptes_year: number | null; comptes_source: string | null;
};

function pct(v: number | null) { return v == null ? "—" : `${Math.round(v)}%`; }
function score(v: number | null) { return v == null ? "—" : `${Math.round(v * 100)}%`; }
// Montant en euros → format lisible (M€ / k€).
function eur(n?: number | null) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1e6) return (n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " M€";
  if (Math.abs(n) >= 1e3) return (n / 1e3).toLocaleString("fr-FR", { maximumFractionDigits: 0 }) + " k€";
  return n.toLocaleString("fr-FR") + " €";
}

function StatBar({ label, value, display, color }: { label: string; value: number | null; display: string; color: string }) {
  return (
    <div className="rounded-2xl bg-white/5 p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-white/60">{label}</span>
        <span className="text-lg font-black text-white">{display}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full" style={{ width: `${Math.min((value ?? 0) * 100, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// N'affiche le nombre d'adhérents que s'il est RÉCENT (année ≥ 2023) : un chiffre daté de 2018
// n'a plus d'intérêt et induit en erreur. Format attendu « 123 456 (2024) ».
function recentMembers(m?: string | null): string | null {
  if (!m) return null;
  const y = m.match(/\((\d{4})\)/)?.[1];
  return (!y || Number(y) >= 2023) ? m : null;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Icon className="h-4 w-4" /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
        <p className="font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

// Ligne « Dirigeant·e » cliquable : résout le nom vers sa fiche d'élu (interconnexion).
function LeaderRow({ value }: { value: string | null }) {
  const [href, setHref] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [imgOk, setImgOk] = useState(true);
  // Le nom peut contenir un suffixe « (depuis …) » ou une virgule : on ne résout que le nom.
  const cleanName = (value || "").replace(/\s*[(,].*$/, "").trim();
  useEffect(() => {
    let active = true;
    if (cleanName) api.resolvePersonHref(cleanName).then((r: any) => { if (active) { setHref(r?.href || null); setPhoto(r?.photo || null); } }).catch(() => {});
    return () => { active = false; };
  }, [cleanName]);
  if (!value) return null;
  const inner = (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 transition ${href ? "border-indigo-200 bg-white hover:border-indigo-400 hover:shadow-md cursor-pointer group" : "border-slate-200 bg-white"}`}>
      {photo && imgOk
        ? <img src={photo} alt={cleanName} onError={() => setImgOk(false)} className="h-10 w-10 shrink-0 rounded-xl object-cover object-top ring-1 ring-slate-200" />
        : <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><UserCircle className="h-5 w-5" /></div>}
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dirigeant·e</p>
        <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors inline-flex items-center gap-1">
          {value}{href && <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />}
        </p>
        {href && <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Voir la fiche →</p>}
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function Avatar({ name, anId, photo, color }: { name: string; anId?: string | null; photo?: string | null; color: string }) {
  const [failed, setFailed] = useState(false);
  const src = anId ? `https://www.assemblee-nationale.fr/dyn/static/tribun/17/photos/carre/${anId.replace("PA", "")}.jpg` : photo || "";
  const initials = name.split(/\s+/).map(p => p[0]).slice(0, 2).join("").toUpperCase();
  if (!src || failed) return <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-black text-white" style={{ backgroundColor: color }}>{initials}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name} onError={() => setFailed(true)} className="h-10 w-10 shrink-0 rounded-full object-cover object-top" />;
}

export default function PartyClient({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [party, setParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<{ deputies: any[]; senators: any[]; candidates: any[]; meps: any[] }>({ deputies: [], senators: [], candidates: [], meps: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"deputies" | "senators" | "meps">("deputies");
  const [openProgram, setOpenProgram] = useState<Set<string>>(new Set());   // « Voir le programme » par candidat
  const toggleProgram = (k: string) => setOpenProgram(p => { const n = new Set(p); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    let active = true;
    api.getPartyBySlug(slug).then(async (p: any) => {
      if (!active) return;
      setParty(p);
      if (p) {
        setMembers(await api.getPartyMembers(p.aliases || []));
        api.getPartyHistory(slug).then(h => setHistory(h)).catch(() => {});
      }
      setLoading(false);
    }).catch(() => setLoading(false));
    return () => { active = false; };
  }, [slug]);

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-950"><Loader2 className="h-10 w-10 animate-spin text-white/50" /></div>;
  if (!party) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 text-white/70">
      <p>Fiche parti introuvable.</p>
      <Link href="/deputes" className="text-blue-400 hover:underline">← Retour</Link>
    </div>
  );

  const color = party.color || "#64748b";
  const hasDatan = party.effectif != null;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* En-tête coloré */}
      <div className="relative overflow-hidden px-4 py-16 text-white" style={{ background: `linear-gradient(135deg, ${color} 0%, #0f172a 130%)` }}>
        <div className="mx-auto max-w-5xl">
          <button onClick={() => window.history.back()} className="mb-6 inline-flex items-center gap-1 text-sm font-bold text-white/70 transition hover:text-white">
            <ChevronLeft className="h-4 w-4" /> Retour
          </button>
          <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-white p-1.5 shadow-lg">
              {party.logo_url
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={party.logo_url} alt={party.name} className="h-full w-full object-contain" />
                : <Landmark className="h-12 w-12 text-slate-700" />}
            </div>
            <div>
              {party.abbrev && <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-black uppercase tracking-widest">{party.abbrev}</span>}
              <h1 className="mt-2 text-4xl font-staatliches uppercase leading-none md:text-6xl">{party.name}</h1>
              {party.orientation && <p className="mt-2 text-white/80 font-bold">{party.orientation}</p>}
            </div>
          </div>
          {party.summary && <p className="mt-6 max-w-3xl text-lg leading-relaxed text-white/90">{party.summary}</p>}

          {/* Stats datan */}
          {hasDatan && (
            <div className="mt-8">
              <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-white/50">Groupe à l'Assemblée nationale · données datan</p>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-widest text-white/60">Députés</span><span className="text-lg font-black text-white">{party.effectif}</span></div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-widest text-white/60">Femmes</span><span className="text-lg font-black text-white">{pct(party.pct_women)}</span></div>
                </div>
                <div className="rounded-2xl bg-white/5 p-4">
                  <div className="flex items-center justify-between"><span className="text-[11px] font-black uppercase tracking-widest text-white/60">Âge moyen</span><span className="text-lg font-black text-white">{party.avg_age != null ? Math.round(party.avg_age) : "—"}</span></div>
                </div>
                <StatBar label="Cohésion des votes" value={party.score_cohesion} display={score(party.score_cohesion)} color={color} />
                <StatBar label="Participation aux votes" value={party.score_participation} display={score(party.score_participation)} color={color} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        {/* Infos parti */}
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow icon={Calendar} label="Fondation" value={party.founded} />
          <InfoRow icon={Users} label="Adhérents" value={recentMembers(party.members)} />
          <InfoRow icon={Wallet} label="Budget / financement" value={party.budget} />
          <LeaderRow value={party.leader} />
          <InfoRow icon={Compass} label="Orientation" value={party.orientation} />
          <InfoRow icon={MapPin} label="Siège" value={party.headquarters} />
        </div>

        {/* Idéologie & valeurs — courants revendiqués par le parti (puces à sa couleur). */}
        {party.ideology && party.ideology.length > 0 && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Idéologie &amp; valeurs</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {party.ideology.map((id, i) => (
                <span key={i} className="rounded-full px-3.5 py-1.5 text-sm font-bold text-white shadow-sm" style={{ background: color }}>{id}</span>
              ))}
            </div>
          </div>
        )}

        {/* Finances du parti : subventions publiques + endettement (données officielles sourcées). */}
        {(party.subventions_eur != null || party.dettes_eur != null) && (() => {
          const taux = party.dettes_eur != null && party.produits_eur ? Math.round((party.dettes_eur / party.produits_eur) * 100) : null;
          const src = party.subventions_source || party.comptes_source;
          return (
            <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">Finances du parti</h2>
              {/* Classements comparatifs (subventions + endettement) — les montants du parti y figurent, surlignés. */}
              <PartyFinanceCompare currentSlug={party.slug} />
              {src && <p className="mt-4 text-[11px] text-slate-400">Source : {src}</p>}
            </div>
          );
        })()}

        {/* Suivre le parti : site officiel + réseaux sociaux (liens directs). */}
        {(party.website || party.twitter || party.facebook || party.instagram || party.youtube || party.tiktok) && (
          <div className="mt-6">
            <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Suivre le parti</p>
            <div className="flex flex-wrap gap-2">
              {party.website && (
                <a href={party.website.startsWith("http") ? party.website : `https://${party.website}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-700">
                  <Globe className="h-4 w-4" /> Site officiel
                </a>
              )}
              {party.twitter && <a href={party.twitter} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-80">X <ExternalLink className="h-3.5 w-3.5" /></a>}
              {party.facebook && <a href={party.facebook} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#1877F2] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-80">Facebook <ExternalLink className="h-3.5 w-3.5" /></a>}
              {party.instagram && <a href={party.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#F77737] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-80">Instagram <ExternalLink className="h-3.5 w-3.5" /></a>}
              {party.youtube && <a href={party.youtube} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF0000] px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-80">YouTube <ExternalLink className="h-3.5 w-3.5" /></a>}
              {party.tiktok && <a href={party.tiktok} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2.5 text-sm font-bold text-white transition hover:opacity-80">TikTok <ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
          </div>
        )}

        {/* Fil d'actualité du parti (Google News, résumé IA court, sources officielles). */}
        <div className="mt-8">
          <EntityNewsFeed entityType="party" entityId={party.slug} defaultOpen />
        </div>

        {/* Représentation — compteurs cliquables (clic = voir les membres) */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {([
            { key: "deputies", label: "Député·e·s", n: members.deputies.length, ring: "ring-red-400" },
            { key: "senators", label: "Sénateur·rice·s", n: members.senators.length, ring: "ring-amber-400" },
            { key: "meps", label: "Député·e·s europ.", n: members.meps.length, ring: "ring-blue-400" },
          ] as const).map((x) => (
            <button
              key={x.key}
              onClick={() => setTab(x.key)}
              className={`rounded-2xl border bg-white p-4 text-center transition ${tab === x.key ? `border-transparent ring-2 ${x.ring} shadow-md` : "border-slate-200 hover:border-slate-300 hover:shadow-sm"}`}
            >
              <p className="text-3xl font-black text-slate-900">{x.n}</p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-widest text-slate-400">{x.label}</p>
            </button>
          ))}
        </div>

        {/* Membres du groupe sélectionné — hauteur bornée avec scroll interne : l'utilisateur
            n'a plus à défiler tout le groupe pour atteindre le contenu en dessous. */}
        <section className="mt-6 max-h-[26rem] overflow-y-auto rounded-2xl pr-1">
          {tab === "deputies" && (
            members.deputies.length === 0
              ? <p className="text-sm text-slate-500">Aucun·e député·e pour ce parti.</p>
              : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.deputies.map((d: any) => (
                    <Link key={d.slug} href={`/deputes/${d.slug}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-red-300 group">
                      <Avatar name={`${d.first_name} ${d.last_name}`} anId={d.an_id} photo={d.photo_url} color={color} />
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{d.first_name} {d.last_name}</p>
                        <p className="truncate text-[11px] font-bold text-slate-500">{d.department || ""}</p>
                      </div>
                      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 group-hover:text-red-500" />
                    </Link>
                  ))}
                </div>
          )}
          {tab === "senators" && (
            members.senators.length === 0
              ? <p className="text-sm text-slate-500">Aucun·e sénateur·rice pour ce parti.</p>
              : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.senators.map((s: any) => (
                    <Link key={s.slug} href={`/senateurs/${s.slug}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-amber-300 group">
                      <Avatar name={`${s.first_name} ${s.last_name}`} photo={s.photo_url} color={color} />
                      <span className="truncate font-bold text-slate-900">{s.first_name} {s.last_name}</span>
                      <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-slate-300 group-hover:text-amber-500" />
                    </Link>
                  ))}
                </div>
          )}
          {tab === "meps" && (
            members.meps.length === 0
              ? <p className="text-sm text-slate-500">Aucun·e député·e européen·ne pour ce parti.</p>
              : <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {members.meps.map((m: any) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                      <Avatar name={m.full_name} color={color} />
                      <span className="truncate font-bold text-slate-900">{m.full_name}</span>
                    </div>
                  ))}
                </div>
          )}
        </section>

        {/* Candidat·e·s à la présidentielle */}
        {members.candidates.length > 0 && (
          <section className="mt-12">
            <h2 className="mb-4 text-2xl font-staatliches uppercase text-slate-900">Candidat·e·s à la présidentielle</h2>
            <div className="space-y-3">
              {members.candidates.map((c: any) => {
                const progOpen = openProgram.has(c.slug);
                return (
                  <div key={c.slug} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                    <div className="flex items-center gap-3 p-3">
                      <Avatar name={c.full_name} photo={c.photo_url} color={color} />
                      <Link href={`/presidentielles-2027/?candidat=${c.slug}`} className="font-bold text-slate-900 transition hover:text-blue-600">{c.full_name}</Link>
                      {c.id && (
                        <button onClick={() => toggleProgram(c.slug)}
                          className={`ml-auto inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-black uppercase tracking-widest transition ${progOpen ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-700 hover:bg-blue-100"}`}>
                          {progOpen ? "Masquer" : "Voir le programme"} <ChevronDown size={14} className={`transition-transform ${progOpen ? "rotate-180" : ""}`} />
                        </button>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {progOpen && c.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                          <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                            <CandidateProgram candidateId={c.id} emptyMessage="Programme pas encore disponible pour ce candidat·e." />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Évolution : adhérents + résultats électoraux */}
        {history.length > 0 && (() => {
          const elecKinds: Array<[string, string]> = [["presidentielle", "Présidentielle"], ["legislatives", "Législatives"], ["europeennes", "Européennes"], ["senatoriales", "Sénatoriales"]];
          // Tableau national affiché UNIQUEMENT si le parti n'a PAS de carte par collectivité (sinon
          // le score national est mis en titre dans la carte ci-dessous → on évite le doublon).
          const showElec = !hasPartyElectionMap(party.slug) && elecKinds.some(([k]) => history.some(h => h.kind === k));
          if (!showElec) return null;
          return (
            <section className="mt-14">
              <h2 className="mb-6 text-2xl font-staatliches uppercase text-slate-900">Évolution</h2>

              {(
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <p className="mb-4 text-sm font-black uppercase tracking-widest text-slate-400">Résultats électoraux (% des voix)</p>
                  <div className="space-y-4">
                    {elecKinds.map(([k, label]) => {
                      const pts = history.filter(h => h.kind === k).sort((a, b) => a.year - b.year);
                      if (pts.length === 0) return null;
                      return (
                        <div key={k}>
                          <p className="mb-2 text-xs font-black uppercase tracking-widest" style={{ color }}>{label}</p>
                          <div className="flex flex-wrap gap-2">
                            {pts.map((p, i) => (
                              <span key={i} className={`rounded-xl px-3 py-1.5 text-sm ${p.source?.startsWith("officiel") ? "bg-emerald-50 ring-1 ring-emerald-200" : "bg-slate-100"}`}>
                                <span className="font-black text-slate-900">{Number(p.value).toLocaleString("fr-FR", { maximumFractionDigits: 1 })}%</span>
                                <span className="ml-1.5 text-xs font-bold text-slate-500">{p.year}{p.label ? ` · ${p.label}` : ""}</span>
                                {p.source?.startsWith("officiel") && <span className="ml-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-600">officiel</span>}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-4 text-[11px] italic text-slate-400">En vert : résultats nationaux officiels (Ministère de l'Intérieur). Autres points : Wikipédia, susceptibles d'être incomplets.</p>
                </div>
              )}
            </section>
          );
        })()}

        {/* Carte des scores électoraux par département (législatives 2024 / européennes 2024 /
            présidentielle 2022) — pour chaque parti disposant de données officielles. */}
        <PartyElectionMap slug={party.slug} color={color} name={party.name} />

        {/* Navigation vers tous les partis */}
        <AllPartiesNav currentSlug={party.slug} />

        {/* Sources */}
        <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-slate-200 pt-6 text-xs text-slate-400">
          {hasDatan && <span>Statistiques : <a href="https://datan.fr" target="_blank" rel="noreferrer" className="font-bold text-slate-600 hover:underline">datan.fr</a>{party.datan_updated_at ? ` (MAJ ${party.datan_updated_at})` : ""}</span>}
          {party.source_url && <span>Infos parti : <a href={party.source_url} target="_blank" rel="noreferrer" className="font-bold text-slate-600 hover:underline">Wikipédia</a> — résumé généré automatiquement</span>}
        </div>
      </div>
    </div>
  );
}
