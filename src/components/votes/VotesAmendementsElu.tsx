"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Loader2, Lock } from "lucide-react";
import { api } from "@/lib/api";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Les votes d'un élu sur les AMENDEMENTS, séparés de ceux sur les lois (30/10/2026) —
 * réservés aux abonnés Premium et Pro (choix de l'éditeur).
 *
 * Député : chargés par pages de 20 (api.getVotesAmendementsDepute, des milliers de scrutins
 * publics par législature). Sénateur : déjà chargés avec ses autres votes, passés en `liste`.
 */
type Ligne = { id: string; titre: string; date: string | null; position: string; resultat: string | null; pour?: number; contre?: number; abstention?: number };
const POS: Record<string, { mot: string; ton: string }> = {
  POUR: { mot: "Pour", ton: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  CONTRE: { mot: "Contre", ton: "bg-rose-500/15 text-rose-700 dark:text-rose-300" },
  ABSTENTION: { mot: "Abstention", ton: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  NON_VOTANT: { mot: "Non-votant", ton: "bg-slate-500/15 text-slate-600 dark:text-slate-300" },
};
const posDe = (p: string) => { const u = String(p || "").toUpperCase(); return u === "FOR" ? "POUR" : u === "AGAINST" ? "CONTRE" : u === "ABSTAIN" ? "ABSTENTION" : u; };
const capitale = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);

export default function VotesAmendementsElu({ anId, liste, nom }: { anId?: string; liste?: Ligne[]; nom: string }) {
  const { isPremium, loading } = usePremium();
  const [lignes, setLignes] = useState<Ligne[]>(liste || []);
  const [total, setTotal] = useState<number | null>(liste ? liste.length : null);
  const [page, setPage] = useState(0);
  const [charge, setCharge] = useState(false);
  const [vus, setVus] = useState(20);

  useEffect(() => { if (liste) { setLignes(liste); setTotal(liste.length); } }, [liste]);
  useEffect(() => {
    if (!anId || !isPremium) return;
    let actif = true;
    setCharge(true);
    api.getVotesAmendementsDepute(anId, page).then(({ votes, total: t }) => {
      if (!actif) return;
      const neuves = votes.map((v: any) => ({ id: v.id, titre: capitale(v.scrutins?.objet || "Amendement"), date: v.scrutins?.date_scrutin || v.date_scrutin, position: v.position, resultat: v.scrutins?.resultat, pour: v.scrutins?.pour, contre: v.scrutins?.contre, abstention: v.scrutins?.abstention }));
      setLignes(l => (page === 0 ? neuves : [...l, ...neuves]));
      if (page === 0) setTotal(t);
      setCharge(false);
    }).catch(() => { if (actif) setCharge(false); });
    return () => { actif = false; };
  }, [anId, isPremium, page]);

  if (loading) return null;
  if (!isPremium) return (
    <div className="flex flex-col items-start gap-4 rounded-[2rem] border border-amber-400/40 bg-gradient-to-br from-amber-400/10 to-fuchsia-500/10 p-6 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950"><Lock size={20} /></span>{" "}
      <p className="flex-1 text-[14px] leading-relaxed text-foreground">
        Comment {nom} a voté sur chaque amendement soumis à un scrutin public : réservé aux abonnés Premium et Pro.
      </p>{" "}
      <Link href="/premium" className="inline-flex min-h-[44px] shrink-0 items-center rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 px-5 text-[13px] font-black text-slate-950">Voir les formules</Link>
    </div>
  );

  const visibles = anId ? lignes : lignes.slice(0, vus);
  return (
    <div>
      <p className="mb-4 text-[14px] text-muted-foreground">
        {total != null && <><strong className="text-foreground">{total.toLocaleString("fr-FR")}</strong> vote{total > 1 ? "s" : ""} sur des amendements en scrutin public. </>}
        Les amendements votés à main levée n&apos;ont pas de décompte par élu.
      </p>
      {!charge && !lignes.length ? (
        <p className="rounded-[2rem] border border-border bg-card p-10 text-center text-muted-foreground dark:border-slate-800 dark:bg-slate-900">Aucun vote sur un amendement en scrutin public pour l&apos;instant.</p>
      ) : (
        <ul className="space-y-2.5">
          {visibles.map(l => {
            const p = POS[posDe(l.position)] || POS.NON_VOTANT;
            const adopte = /adopt/i.test(l.resultat || "") && !/pas adopt|n'a pas adopt|rejet/i.test(l.resultat || "");
            return (
              <li key={l.id} className="rounded-2xl border border-border bg-card p-4 dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-black ${p.ton}`}>Vote : {p.mot}</span>{" "}
                  {l.resultat && <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${adopte ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}>{adopte ? "Adopté" : "Rejeté"}</span>}{" "}
                  {l.date && <span className="ml-auto text-[11px] text-muted-foreground">{new Date(l.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>}
                </div>{" "}
                <p className="mt-2 line-clamp-3 text-[14px] leading-snug text-foreground">{l.titre}</p>{" "}
                {l.pour != null && <p className="mt-1 text-[12px] text-muted-foreground">{l.pour} pour · {l.contre} contre · {l.abstention} abst.</p>}
              </li>
            );
          })}
        </ul>
      )}{" "}
      {charge ? <div className="flex justify-center py-5"><Loader2 className="animate-spin text-slate-400" /></div>
        : total != null && visibles.length < total && (
          <button type="button" onClick={() => (anId ? setPage(x => x + 1) : setVus(v => v + 20))}
            className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card text-sm font-bold text-foreground transition hover:bg-muted dark:border-slate-800 dark:bg-slate-900">
            Voir plus <span className="font-normal text-muted-foreground">({(total - visibles.length).toLocaleString("fr-FR")} autres)</span> <ChevronDown size={16} />
          </button>
        )}
    </div>
  );
}
