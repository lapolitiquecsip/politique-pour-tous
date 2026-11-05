"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Plus, ShieldCheck, Vote } from "lucide-react";
import { api } from "@/lib/api";
import { AN_GROUPS_ORDERED } from "@/lib/data/partyGroups";

/**
 * « Chaque texte voté » (Premium et Pro) : un e-mail dès qu'un texte est voté à l'Assemblée ou
 * au Sénat — résultat, vote de chaque groupe, de ses élus suivis et de ses partis suivis.
 * Rien d'office. Réglage : user_preferences.rythmes.textes_votes ("immediat" | "aucun") et
 * textes_votes_depuis (seuls les votes publiés après la case cochée partent), lus par
 * alertes-textes.ts côté données.
 *
 * Variante Premium : le choix des partis est ici (le Pro le fait dans « Ce que je suis »).
 * Suivre un parti peut révéler une opinion politique : accord explicite avant le premier.
 */
export default function ChaqueTexteVote({ userId, variante = "premium" }: { userId: string; variante?: "premium" | "pro" }) {
  const [rythmes, setRythmes] = useState<Record<string, string> | null>(null);
  const [suivis, setSuivis] = useState<string[]>([]);
  const [partis, setPartis] = useState<{ ref: string; label: string; sigle: string }[]>([]);
  const [consentement, setConsentement] = useState<string | null>(null);
  const [demande, setDemande] = useState<{ ref: string; label: string } | null>(null);
  const [etat, setEtat] = useState<"" | "enregistrement" | "ok">("");
  const pro = variante === "pro";

  useEffect(() => {
    let actif = true;
    api.getUserPreferences(userId).then(p => {
      if (!actif) return;
      setRythmes((p?.rythmes as Record<string, string>) || {}); setConsentement(p?.consentement_suivis ?? null);
    }).catch(() => { if (actif) setRythmes({}); });
    api.getSuivis().then(l => { if (actif) setSuivis(l.filter(s => s.kind === "parti").map(s => s.ref)); }).catch(() => {});
    if (!pro) api.getPartisSuivables(AN_GROUPS_ORDERED.map(g => g.slug)).then(l => {
      if (actif) setPartis(AN_GROUPS_ORDERED.map(g => l.find(p => p.ref === g.slug)).filter(Boolean) as typeof l);
    }).catch(() => {});
    return () => { actif = false; };
  }, [userId, pro]);

  if (!rythmes) return null;
  const actif = rythmes.textes_votes === "immediat";
  const confirmer = () => { setEtat("ok"); setTimeout(() => setEtat(""), 1800); };
  const basculer = async () => {
    const suivant = { ...rythmes, textes_votes: actif ? "aucun" : "immediat", ...(actif ? {} : { textes_votes_depuis: new Date().toISOString() }) };
    setRythmes(suivant); setEtat("enregistrement");
    try { await api.saveUserPreferences(userId, { rythmes: suivant }); confirmer(); }
    catch { setRythmes(rythmes); setEtat(""); }
  };
  const suivreParti = async (p: { ref: string; label: string }, accordDonne = false) => {
    const suivi = suivis.includes(p.ref);
    if (!suivi && !consentement && !accordDonne) { setDemande(p); return; }
    setSuivis(l => (suivi ? l.filter(x => x !== p.ref) : [...l, p.ref])); setEtat("enregistrement");
    try { if (suivi) await api.retirerSuivi("parti", p.ref); else await api.ajouterSuivi("parti", p.ref, p.label); confirmer(); }
    catch { setSuivis(l => (suivi ? [...l, p.ref] : l.filter(x => x !== p.ref))); setEtat(""); }
  };
  const accepter = async () => {
    const p = demande; if (!p) return;
    await api.donnerConsentementSuivis().catch(() => {});
    setConsentement(new Date().toISOString()); setDemande(null);
    await suivreParti(p, true);
  };

  return (
    <div className={`rounded-3xl border p-5 ${pro ? "border-white/10 bg-black/20" : "border-amber-400/25 bg-amber-400/[0.05]"}`}>
      <div className="flex items-start justify-between gap-4">
        <span className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${pro ? "bg-white/10 text-fuchsia-200" : "bg-amber-400/15 text-amber-300"}`}><Vote size={18} /></span>{" "}
          <span>
            <span className="block font-bold text-white">Chaque texte voté, par e-mail</span>{" "}
            <span className="mt-0.5 block text-[13px] leading-snug text-white/65">
              Dès qu&apos;un texte est voté à l&apos;Assemblée ou au Sénat : le résultat, le vote de chaque groupe, de vos élus suivis et de vos partis suivis.
              Il part dès que le scrutin officiel est publié : en général la nuit qui suit pour l&apos;Assemblée, quelques jours après pour le Sénat.
            </span>
          </span>
        </span>{" "}
        <button type="button" role="switch" aria-checked={actif} aria-label="Chaque texte voté, par e-mail" onClick={basculer}
          className={`relative h-6 w-11 shrink-0 rounded-full transition ${actif ? (pro ? "bg-fuchsia-500" : "bg-amber-500") : "bg-white/15"}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${actif ? "left-[22px]" : "left-0.5"}`} />
        </button>
      </div>{" "}

      {pro ? (
        <p className="mt-3 text-[12px] leading-snug text-white/55">Vos partis se choisissent plus bas, dans « Ce que je suis » ; vos élus, depuis leur fiche (bouton « Suivre »).</p>
      ) : (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/55">Les partis dont je veux le vote</p>{" "}
          {demande ? (
            <div className="mt-2 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-3 text-[12.5px] leading-relaxed text-white/85">
              <p className="flex items-start gap-2"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-amber-300" />{" "}
                Suivre un parti peut laisser deviner une opinion politique, que la loi protège particulièrement. Nous ne l&apos;utilisons que pour vous envoyer le vote de son groupe ; elle n&apos;est ni partagée ni utilisée à d&apos;autres fins, et vous pouvez retirer votre accord à tout moment.</p>{" "}
              <span className="mt-2 flex gap-2">
                <button type="button" onClick={accepter} className="rounded-lg bg-amber-500 px-3 py-1.5 text-[11px] font-black uppercase tracking-widest text-slate-950">J&apos;accepte et je suis {demande.label.replace(/ \(.*\)$/, "")}</button>{" "}
                <button type="button" onClick={() => setDemande(null)} className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-white/70">Annuler</button>
              </span>
            </div>
          ) : (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {partis.map(p => {
                const on = suivis.includes(p.ref);
                return (
                  <button key={p.ref} type="button" onClick={() => suivreParti(p)} aria-pressed={on} title={p.label}
                    className={`inline-flex min-h-[34px] items-center gap-1 rounded-full px-3 text-[12px] font-bold transition ${on ? "bg-amber-400 text-slate-950" : "bg-white/[0.06] text-white/75 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"}`}>
                    {on ? <Check size={13} /> : <Plus size={13} />} {p.sigle}{" "}
                  </button>
                );
              })}
            </div>
          )}{" "}
          <p className="mt-2 text-[12px] leading-snug text-white/50">Vos élus se suivent depuis leur fiche (bouton « Suivre »).</p>
        </div>
      )}{" "}
      {etat && (
        <p className="mt-2 inline-flex items-center gap-1 text-[12px] font-bold text-emerald-300">
          {etat === "ok" ? <><Check size={12} /> Enregistré</> : <><Loader2 size={12} className="animate-spin" /> Enregistrement</>}
        </p>
      )}
    </div>
  );
}
