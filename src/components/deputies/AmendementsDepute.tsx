"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ExternalLink, FilePenLine, Loader2, Lock } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Les amendements d'un député, sur sa fiche (30/10/2026, demande de l'user).
 *
 * Alimenté tout seul : chaque amendement relevé dans l'heure (backend sync-amendements-an,
 * colonne depute_slug) apparaît ici. Le contenu est réservé au Pro (RLS de amendements_an) ;
 * le nombre est public (fonction nb_amendements_depute) et sert d'aperçu aux autres visiteurs.
 */
type Amdt = {
  uid: string; numero: string; texte_uid: string; texte_titre: string | null; organe: string | null; division: string | null;
  sort: string | null; expose: string | null; dispositif: string | null; url: string | null; vu_le: string;
};
const PAR_PAGE = 8;
const FILTRES: [string, string][] = [["", "Tous"], ["attente", "En attente"], ["Adopté", "Adoptés"], ["Rejeté", "Rejetés"]];
const propre = (t: string | null) => (t || "").replace(/&amp;/g, "&").replace(/&nbsp;|&#160;/g, " ").replace(/&#0?39;|&rsquo;/g, "’").replace(/&quot;/g, "\"").replace(/\s+/g, " ").trim();
const tonSort = (s: string | null) =>
  s === "Adopté" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
  : s === "Rejeté" ? "bg-rose-500/15 text-rose-700 dark:text-rose-300"
  : s ? "bg-slate-500/15 text-slate-600 dark:text-slate-300"
  : "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300";

function Ligne({ a }: { a: Amdt }) {
  const [ouvert, setOuvert] = useState(false);
  return (
    <li className="rounded-2xl border border-border bg-card dark:border-slate-800 dark:bg-slate-900">
      <button type="button" onClick={() => setOuvert(o => !o)} aria-expanded={ouvert} className="w-full p-4 text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-staatliches text-lg leading-none text-foreground dark:text-white">N° {a.numero}</span>{" "}
          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${tonSort(a.sort)}`}>{a.sort || "Pas encore examiné"}</span>{" "}
          <span className="ml-auto text-[11px] text-muted-foreground">{new Date(a.vu_le).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}</span>
        </div>{" "}
        {a.texte_titre && <p className="mt-1.5 text-[14px] font-semibold leading-snug text-foreground dark:text-white">{a.texte_titre}</p>}{" "}
        <p className="mt-0.5 text-[12.5px] text-muted-foreground">{[propre(a.division), a.organe].filter(Boolean).join(" · ")}</p>{" "}
        {!ouvert && a.expose && <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{propre(a.expose)}</p>}{" "}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-fuchsia-700 dark:text-fuchsia-300">
          {ouvert ? "Replier" : "Lire l'amendement"} <ChevronDown size={14} className={`transition ${ouvert ? "rotate-180" : ""}`} />
        </span>
      </button>{" "}
      {ouvert && (
        <div className="space-y-3 border-t border-border px-4 pb-4 pt-3 text-[14px] leading-relaxed text-slate-700 dark:border-slate-800 dark:text-slate-200">
          {a.dispositif && <div><h4 className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Dispositif</h4><p className="whitespace-pre-line">{propre(a.dispositif)}</p></div>}{" "}
          {a.expose && <div><h4 className="mb-1 text-[11px] font-black uppercase tracking-[0.18em] text-muted-foreground">Exposé sommaire</h4><p className="whitespace-pre-line">{propre(a.expose)}</p></div>}{" "}
          {a.url && <a href={a.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-bold underline decoration-fuchsia-400 underline-offset-4">L&apos;amendement sur le site de l&apos;Assemblée <ExternalLink size={12} /></a>}
        </div>
      )}
    </li>
  );
}

export default function AmendementsDepute({ slug, nom }: { slug: string; nom: string }) {
  const { isPro, loading } = usePremium();
  const [nb, setNb] = useState<number | null>(null);
  const [filtre, setFiltre] = useState("");
  const [liste, setListe] = useState<Amdt[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [charge, setCharge] = useState(false);

  useEffect(() => {
    supabase.rpc("nb_amendements_depute", { p_slug: slug }).then(({ data }) => setNb(typeof data === "number" ? data : 0));
  }, [slug]);
  useEffect(() => { setPage(0); }, [filtre]);
  useEffect(() => {
    if (!isPro) return;
    let actif = true;
    setCharge(true);
    let q = supabase.from("amendements_an").select("uid, numero, texte_uid, texte_titre, organe, division, sort, expose, dispositif, url, vu_le", { count: page === 0 ? "exact" : undefined })
      .eq("depute_slug", slug).order("vu_le", { ascending: false }).order("ordre", { ascending: true }).range(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE - 1);
    if (filtre === "attente") q = q.is("sort", null); else if (filtre) q = q.eq("sort", filtre);
    q.then(({ data, count }) => {
      if (!actif) return;
      setListe(l => (page === 0 ? (data as Amdt[]) || [] : [...l, ...((data as Amdt[]) || [])]));
      if (page === 0) setTotal(count ?? null);
      setCharge(false);
    });
    return () => { actif = false; };
  }, [isPro, slug, filtre, page]);

  if (loading || nb === null) return null;

  return (
    <section id="amendements" className="mb-10 scroll-mt-24 pt-4">
      <h2 className="mb-2 text-4xl font-staatliches uppercase tracking-tight text-foreground dark:text-white">
        Ses <span className="text-fuchsia-700 dark:text-fuchsia-400">amendements</span>
      </h2>{" "}
      <p className="mb-6 max-w-xl font-medium text-muted-foreground">
        {nb ? <><strong className="text-foreground dark:text-white">{nb.toLocaleString("fr-FR")}</strong> amendement{nb > 1 ? "s" : ""} déposé{nb > 1 ? "s" : ""} sur les textes en discussion, mis à jour toutes les heures.</>
          : "Aucun amendement relevé pour l'instant sur les textes en discussion. La liste se met à jour toutes les heures."}
      </p>{" "}

      {!nb ? null : !isPro ? (
        <div className="flex flex-col items-start gap-4 rounded-[2rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 to-purple-600/10 p-6 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white"><FilePenLine size={22} /></span>{" "}
          <p className="flex-1 text-[14px] leading-relaxed text-foreground dark:text-slate-200">
            Lisez chacun des amendements de {nom} — ce qu&apos;il change, pourquoi, et son sort — et soyez alerté des nouveaux, avec l&apos;offre Pro.
          </p>{" "}
          <Link href="/premium" className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-5 text-[13px] font-black text-white shadow-lg shadow-fuchsia-500/25">
            <Lock size={14} /> Découvrir l&apos;offre Pro
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {FILTRES.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setFiltre(v)} aria-pressed={filtre === v}
                className={`min-h-[36px] rounded-full px-3.5 text-[13px] font-bold transition ${filtre === v ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white" : "border border-border bg-card text-muted-foreground hover:text-foreground dark:border-slate-800 dark:bg-slate-900"}`}>{l}</button>
            ))}
          </div>{" "}
          {!charge && !liste.length ? (
            <p className="rounded-2xl bg-muted p-5 text-center text-sm text-muted-foreground dark:bg-slate-800/50">Aucun amendement pour ce filtre.</p>
          ) : (
            <ul className="space-y-2.5">{liste.map(a => <Ligne key={a.uid} a={a} />)}</ul>
          )}{" "}
          {charge ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-fuchsia-500" /></div>
            : total != null && liste.length < total && (
              <button type="button" onClick={() => setPage(p => p + 1)}
                className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold text-foreground transition hover:bg-muted dark:border-slate-800 dark:bg-slate-900">
                Voir plus <span className="font-normal text-muted-foreground">({(total - liste.length).toLocaleString("fr-FR")} autres)</span> <ChevronDown size={16} />
              </button>
            )}{" "}
          <Link href={`/premium/?amdt-depute=${encodeURIComponent(slug)}#amendements`} className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-black text-fuchsia-700 underline-offset-2 hover:underline dark:text-fuchsia-300">
            Les ouvrir dans l&apos;outil Amendements de votre espace Pro →
          </Link>
        </>
      )}
    </section>
  );
}
