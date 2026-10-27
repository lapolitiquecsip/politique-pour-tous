"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ExternalLink, FilePenLine, Loader2, Search, Users, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Amendements de l'Assemblée nationale en temps réel — réservé aux membres Pro.
 *
 * Relevés toutes les heures dans Eliasse, l'application de séance de l'AN (job
 * backend sync-amendements-an) : tous les amendements des textes en discussion, en
 * séance comme en commission, avec leur sort dès qu'il est connu. La table
 * amendements_an n'est lisible que par un membre Pro (RLS, fonction est_pro).
 *
 * Filtres : texte, groupe, sort, recherche (auteur, numéro, contenu). « Nouveau » :
 * repéré depuis la dernière visite (mémorisée dans le navigateur).
 */

type Amendement = {
  uid: string; numero: string; texte_uid: string; texte_titre: string | null; organe: string | null; division: string | null;
  sort: string | null; auteur: string | null; auteur_type: string | null; groupe: string | null; depute_slug: string | null;
  cosignataires: string | null; nb_cosignataires: number | null; sous_amendement: boolean; dispositif: string | null; expose: string | null;
  url: string | null; vu_le: string; sort_le: string | null;
};
type Texte = { texte_uid: string; texte_titre: string | null; nb: number; dernier: string };

const PAR_PAGE = 25;
const SORTS: [string, string][] = [["", "Tous"], ["attente", "Pas encore examinés"], ["Adopté", "Adoptés"], ["Rejeté", "Rejetés"], ["Tombé", "Tombés"], ["Retiré", "Retirés"], ["Non soutenu", "Non soutenus"]];
const CLE_VISITE = "lpcs_amendements_visite";
const COLONNES = "uid, numero, texte_uid, texte_titre, organe, division, sort, auteur, auteur_type, groupe, depute_slug, cosignataires, nb_cosignataires, sous_amendement, dispositif, expose, url, vu_le, sort_le";

const tonSort = (s: string | null) =>
  s === "Adopté" ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/30"
  : s === "Rejeté" ? "bg-rose-500/15 text-rose-300 ring-rose-400/30"
  : s ? "bg-white/10 text-white/70 ring-white/15"
  : "bg-amber-500/15 text-amber-200 ring-amber-400/30";

const quand = (iso: string) => {
  const d = new Date(iso); const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  if (min < 24 * 60) return `il y a ${Math.round(min / 60)} h`;
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
};

// PostgREST : virgules et parenthèses cassent un filtre « or ».
const nettoyer = (q: string) => q.replace(/[,()*%\\]/g, " ").trim();

function Carte({ a, nouveau }: { a: Amendement; nouveau: boolean }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <li className="rounded-2xl bg-white/[0.04] ring-1 ring-white/10">
      <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} className="w-full p-4 text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span className="font-staatliches text-xl leading-none tracking-wide text-white">N° {a.numero}</span>{" "}
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${tonSort(a.sort)}`}>{a.sort || "Pas encore examiné"}</span>{" "}
          {a.sous_amendement && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-bold text-white/70">Sous-amendement</span>}{" "}
          {nouveau && <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-sky-200">Nouveau</span>}{" "}
          <span className="ml-auto text-xs text-white/50">repéré {quand(a.vu_le)}</span>
        </div>{" "}
        <p className="mt-2 text-[15px] font-semibold leading-snug text-white">
          {a.auteur || "Auteur inconnu"}
          {a.groupe && <span className="font-normal text-white/60"> · {a.groupe}</span>}
          {!!a.nb_cosignataires && <span className="font-normal text-white/60"> · {a.nb_cosignataires} cosignataire{a.nb_cosignataires > 1 ? "s" : ""}</span>}
        </p>{" "}
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-white/60">{[a.division, a.organe].filter(Boolean).join(" · ")}</p>{" "}
        {a.texte_titre && <p className="mt-0.5 truncate text-[13px] text-white/45" title={a.texte_titre}>{a.texte_titre}</p>}{" "}
        {!ouvert && a.expose && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-white/70">{a.expose}</p>}{" "}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-fuchsia-300">
          {ouvert ? "Replier" : "Lire l'amendement"} <ChevronDown size={14} className={`transition ${ouvert ? "rotate-180" : ""}`} />
        </span>
      </button>{" "}
      {ouvert && (
        <div className="space-y-4 border-t border-white/10 px-4 pb-4 pt-3 text-[14px] leading-relaxed text-white/85">
          {a.dispositif ? (
            <div>
              <h4 className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/50">Dispositif</h4>{" "}
              <p className="whitespace-pre-line">{a.dispositif}</p>
            </div>
          ) : <p className="text-white/55">Le texte de l&apos;amendement sera disponible au prochain relevé.</p>}{" "}
          {a.expose && (
            <div>
              <h4 className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/50">Exposé sommaire</h4>{" "}
              <p className="whitespace-pre-line text-white/75">{a.expose}</p>
            </div>
          )}{" "}
          {a.cosignataires && a.nb_cosignataires ? <p className="text-xs text-white/55"><Users size={12} className="mr-1 inline" />{a.cosignataires}</p> : null}{" "}
          {a.url && (
            <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold text-white underline decoration-fuchsia-400 underline-offset-4">
              L&apos;amendement sur le site de l&apos;Assemblée <ExternalLink size={12} />
            </a>
          )}
        </div>
      )}
    </li>
  );
}

export default function AmendementsAN() {
  const [textes, setTextes] = useState<Texte[]>([]);
  const [groupes, setGroupes] = useState<string[]>([]);
  const [texte, setTexte] = useState("");
  const [groupe, setGroupe] = useState("");
  const [sort, setSort] = useState("");
  const [saisie, setSaisie] = useState("");
  const [recherche, setRecherche] = useState("");
  const [liste, setListe] = useState<Amendement[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [viser, setViser] = useState(false);
  // Dernière visite : lue une fois, avant d'être remplacée par celle-ci.
  const [visite] = useState<string | null>(() => { try { return localStorage.getItem(CLE_VISITE); } catch { return null; } });
  useEffect(() => { try { localStorage.setItem(CLE_VISITE, new Date().toISOString()); } catch { /* navigation privée */ } }, []);

  // Lien depuis l'e-mail Pro (« Voir les amendements ») : /premium/?amdt-texte=…&amdt-q=…#amendements.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (!p.get("amdt-texte") && !p.get("amdt-q")) return;
    setTexte(p.get("amdt-texte") || "");
    setSort(p.get("amdt-sort") || "");
    setSaisie(p.get("amdt-q") || "");
    setViser(true);
  }, []);
  // L'espace Pro se remplit au-dessus pendant quelques secondes : on recale la section jusqu'à ce qu'il soit stable.
  useEffect(() => {
    if (!viser || !liste.length) return;
    const caler = () => document.getElementById("amendements")?.scrollIntoView({ block: "start" });
    const ids = [300, 1500, 3500].map(ms => setTimeout(caler, ms));
    const fin = setTimeout(() => setViser(false), 3600);
    return () => { ids.forEach(clearTimeout); clearTimeout(fin); };
  }, [viser, liste.length]);

  useEffect(() => {
    supabase.from("amendements_an_textes").select("texte_uid, texte_titre, nb, dernier").order("dernier", { ascending: false })
      .then(({ data }) => setTextes((data as Texte[]) || []));
    supabase.from("deputies").select("party").eq("sitting", true)
      .then(({ data }) => setGroupes([...new Set((data || []).map((d: any) => d.party).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fr"))));
  }, []);

  // Recherche : on attend que la frappe s'arrête.
  useEffect(() => { const t = setTimeout(() => setRecherche(nettoyer(saisie)), 350); return () => clearTimeout(t); }, [saisie]);
  useEffect(() => { setPage(0); }, [texte, groupe, sort, recherche]);

  useEffect(() => {
    let actif = true;
    setCharge(true); setErreur(false);
    let q = supabase.from("amendements_an").select(COLONNES, { count: page === 0 ? "exact" : undefined })
      .order("vu_le", { ascending: false }).order("ordre", { ascending: true }).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
    if (texte) q = q.eq("texte_uid", texte);
    if (groupe) q = q.eq("groupe", groupe);
    if (sort === "attente") q = q.is("sort", null); else if (sort) q = q.eq("sort", sort);
    if (recherche) q = q.or(`auteur.ilike.%${recherche}%,numero.ilike.%${recherche}%,expose.ilike.%${recherche}%,dispositif.ilike.%${recherche}%`);
    q.then(({ data, count, error }) => {
      if (!actif) return;
      if (error) { setErreur(true); setCharge(false); return; }
      setListe(l => (page === 0 ? (data as Amendement[]) || [] : [...l, ...((data as Amendement[]) || [])]));
      if (page === 0) setTotal(count ?? null);
      setCharge(false);
    });
    return () => { actif = false; };
  }, [texte, groupe, sort, recherche, page]);

  const derniere = useMemo(() => textes.reduce((m, t) => (t.dernier > m ? t.dernier : m), ""), [textes]);
  const filtres = !!(texte || groupe || sort || recherche);
  const select = "w-full min-h-[44px] appearance-none rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm font-medium text-white focus:border-fuchsia-400/50 focus:outline-none [&>option]:bg-slate-900";

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] p-5 shadow-2xl shadow-black/40 md:rounded-[2.5rem] md:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-sky-500/30"><FilePenLine size={22} /></span>{" "}
        <div className="min-w-0 flex-1">
          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white">Amendements <span className="text-sky-300">en temps réel</span></h2>{" "}
          <p className="mt-1 text-sm leading-relaxed text-white/65">
            Tous les amendements déposés à l&apos;Assemblée sur les textes en discussion, en séance et en commission, avec leur sort. Relevés toutes les heures.
            {derniere && <span className="text-white/50"> Dernier relevé : {quand(derniere)}.</span>}
          </p>
        </div>
      </div>{" "}

      <div className="mt-6 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block sm:col-span-2">
          <span className="sr-only">Texte</span>
          <select value={texte} onChange={e => setTexte(e.target.value)} className={select}>
            <option value="">Tous les textes ({textes.length})</option>
            {textes.map(t => <option key={t.texte_uid} value={t.texte_uid}>{(t.texte_titre || t.texte_uid).slice(0, 90)} — {t.nb}</option>)}
          </select>
        </label>{" "}
        <label className="block">
          <span className="sr-only">Groupe</span>
          <select value={groupe} onChange={e => setGroupe(e.target.value)} className={select}>
            <option value="">Tous les groupes</option>
            {groupes.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>{" "}
        <label className="block">
          <span className="sr-only">Sort</span>
          <select value={sort} onChange={e => setSort(e.target.value)} className={select}>
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>{" "}
        <div className="relative sm:col-span-2 lg:col-span-4">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/50" />
          <input value={saisie} onChange={e => setSaisie(e.target.value)} placeholder="Député, numéro, mot du texte…" enterKeyHint="search"
            className="w-full min-h-[44px] rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 text-[15px] text-white placeholder-white/45 focus:border-fuchsia-400/50 focus:outline-none" />
          {saisie && <button type="button" onClick={() => setSaisie("")} aria-label="Effacer la recherche" className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center text-white/60 hover:text-white"><X size={16} /></button>}
        </div>
      </div>{" "}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[13px] text-white/60">
        <span>{total != null ? <><strong className="font-bold text-white">{total.toLocaleString("fr-FR")}</strong> amendement{total > 1 ? "s" : ""}{filtres ? " correspondant à vos filtres" : ""}</> : " "}</span>{" "}
        {filtres && <button type="button" onClick={() => { setTexte(""); setGroupe(""); setSort(""); setSaisie(""); }} className="font-bold text-fuchsia-300 hover:text-fuchsia-200">Effacer les filtres</button>}
      </div>{" "}

      {erreur ? (
        <p className="mt-4 rounded-2xl bg-rose-500/10 p-4 text-sm text-rose-200">Les amendements n&apos;ont pas pu être chargés. Réessayez dans un instant.</p>
      ) : !charge && !liste.length ? (
        <p className="mt-4 rounded-2xl bg-white/[0.04] p-6 text-center text-sm text-white/60">{filtres ? "Aucun amendement ne correspond à ces filtres." : "Le premier relevé est en cours : les amendements apparaîtront ici dans l'heure."}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {liste.map(a => <Carte key={a.uid} a={a} nouveau={!!visite && a.vu_le > visite} />)}
        </ul>
      )}{" "}

      {charge ? (
        <div className="flex justify-center py-6"><Loader2 className="animate-spin text-sky-300" /></div>
      ) : total != null && liste.length < total && (
        <button type="button" onClick={() => setPage(p => p + 1)}
          className="mt-4 flex w-full min-h-[48px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] text-sm font-bold text-white transition hover:bg-white/10">
          Voir plus <span className="font-normal text-white/55">({(total - liste.length).toLocaleString("fr-FR")} autres)</span> <ChevronDown size={16} />
        </button>
      )}
    </section>
  );
}
