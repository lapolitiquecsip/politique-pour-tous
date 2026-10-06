"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, Loader2, Mail, MapPin, Plus, Search, Star, Vote, X, Scale, Newspaper } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Réglages des alertes Pro : récap du samedi, suivis élargis (partis, ministères,
 * candidats, commissions), rythme d'envoi par catégorie et périmètre géographique.
 * Les élus (députés, sénateurs, eurodéputés) se suivent depuis leur fiche.
 */

type Kind = "parti" | "ministere" | "candidat" | "commission";
type Option = { ref: string; label: string };

const KINDS: [Kind, string][] = [["parti", "Partis"], ["ministere", "Ministères"], ["candidat", "Candidats 2027"], ["commission", "Commissions"]];
const RYTHMES: [string, string][] = [["immediat", "Dans l'heure"], ["quotidien", "Chaque soir"], ["hebdo", "Le samedi"], ["aucun", "Jamais"]];
const CATEGORIES: { cle: string; titre: string; detail: string; Icone: typeof Vote }[] = [
  { cle: "votes", titre: "Votes de mes élus", detail: "Chaque scrutin où un élu que vous suivez a voté", Icone: Vote },
  { cle: "suivis", titre: "Ce que je suis", detail: "Partis, ministères, candidats et commissions suivis", Icone: Star },
  { cle: "local", titre: "Près de chez moi", detail: "Décisions et actualités de votre territoire", Icone: MapPin },
  { cle: "lois", titre: "Nouvelles lois", detail: "Textes adoptés et promulgués", Icone: Scale },
];
const PERIMETRES: [string, string][] = [["commune", "Ma commune"], ["departement", "Mon département"], ["region", "Ma région"], ["national", "Rien de local"]];
const DEFAUT: Record<string, string> = { votes: "immediat", local: "quotidien", suivis: "quotidien", lois: "hebdo" };

function Segments({ valeur, options, onChange }: { valeur: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${valeur === v ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow" : "text-white/55 hover:text-white"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

export default function AlertesPro({ userId }: { userId: string }) {
  const [charge, setCharge] = useState(true);
  const [recap, setRecap] = useState(true);
  const [perimetre, setPerimetre] = useState("departement");
  const [rythmes, setRythmes] = useState<Record<string, string>>(DEFAUT);
  const [suivis, setSuivis] = useState<{ kind: string; ref: string; label: string }[]>([]);
  const [options, setOptions] = useState<Record<Kind, Option[]> | null>(null);
  const [onglet, setOnglet] = useState<Kind>("parti");
  const [recherche, setRecherche] = useState("");
  const [etat, setEtat] = useState<"" | "enregistrement" | "ok">("");

  useEffect(() => {
    let actif = true;
    Promise.all([api.getUserPreferences(userId), api.getSuivis(), api.getOptionsSuivi()]).then(([p, s, o]) => {
      if (!actif) return;
      if (p) { setRecap(p.recap_hebdo ?? true); setPerimetre(p.perimetre || "departement"); setRythmes({ ...DEFAUT, ...(p.rythmes || {}) }); }
      setSuivis(s); setOptions(o as Record<Kind, Option[]>); setCharge(false);
    }).catch(() => setCharge(false));
    return () => { actif = false; };
  }, [userId]);

  const enregistrer = async (patch: { recap_hebdo?: boolean; perimetre?: string; rythmes?: Record<string, string> }) => {
    setEtat("enregistrement");
    try { await api.saveUserPreferences(userId, patch); setEtat("ok"); setTimeout(() => setEtat(""), 1800); }
    catch { setEtat(""); }
  };

  const suivi = (kind: string, ref: string) => suivis.some(s => s.kind === kind && s.ref === ref);
  const basculer = async (kind: Kind, o: Option) => {
    if (suivi(kind, o.ref)) {
      setSuivis(l => l.filter(s => !(s.kind === kind && s.ref === o.ref)));
      await api.retirerSuivi(kind, o.ref).catch(() => {});
    } else {
      setSuivis(l => [...l, { kind, ref: o.ref, label: o.label }]);
      await api.ajouterSuivi(kind, o.ref, o.label).catch(() => {});
    }
  };

  const visibles = useMemo(() => {
    const q = recherche.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return (options?.[onglet] || []).filter(o => !q || o.label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q)).slice(0, 40);
  }, [options, onglet, recherche]);

  if (charge) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-fuchsia-300" /></div>;

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/[0.09] via-white/[0.03] to-transparent p-6 shadow-2xl shadow-black/40 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30"><BellRing size={22} /></span>
          <div>
            <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white">Mes alertes <span className="text-fuchsia-300">Pro</span></h2>
            <p className="mt-1 text-sm text-white/60">Ce que vous recevez, quand, et jusqu&apos;où.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest transition ${etat === "ok" ? "bg-emerald-500/15 text-emerald-300" : etat ? "bg-white/10 text-white/60" : "opacity-0"}`}>
          {etat === "ok" ? <><Check size={13} /> Enregistré</> : <><Loader2 size={13} className="animate-spin" /> Enregistrement</>}
        </span>
      </div>

      {/* Récap du samedi */}
      <label className="mt-7 flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-white/10 bg-black/20 p-5">
        <span className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-fuchsia-200"><Newspaper size={18} /></span>
          <span>
            <span className="block font-bold text-white">La semaine politique en 5 minutes</span>
            <span className="block text-[13px] text-white/55">Chaque samedi à 8 h : l&apos;essentiel de la semaine, choisi pour vous.</span>
          </span>
        </span>
        <input type="checkbox" checked={recap} onChange={e => { setRecap(e.target.checked); enregistrer({ recap_hebdo: e.target.checked }); }}
          className="h-6 w-11 shrink-0 cursor-pointer appearance-none rounded-full bg-white/15 transition before:block before:h-5 before:w-5 before:translate-x-0.5 before:rounded-full before:bg-white before:transition checked:bg-fuchsia-500 checked:before:translate-x-[22px]" />
      </label>

      {/* Suivis élargis */}
      <div className="mt-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Ce que je suis</h3>
        <p className="mt-1 text-[13px] text-white/55">En plus des élus suivis depuis leur fiche : partis, ministères, candidats et commissions.</p>
        {suivis.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suivis.map(s => (
              <button key={`${s.kind}|${s.ref}`} onClick={() => basculer(s.kind as Kind, { ref: s.ref, label: s.label })}
                className="group inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-white transition hover:border-rose-400/50 hover:bg-rose-500/15">
                {s.label} <X size={13} className="text-white/50 group-hover:text-rose-300" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {KINDS.map(([k, l]) => (
              <button key={k} onClick={() => { setOnglet(k); setRecherche(""); }}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${onglet === k ? "bg-white text-slate-900" : "text-white/55 hover:bg-white/10 hover:text-white"}`}>{l}</button>
            ))}
            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher…"
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-white/35 focus:border-fuchsia-400/50 focus:outline-none" />
            </div>
          </div>
          <div className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
            {visibles.map(o => {
              const on = suivi(onglet, o.ref);
              return (
                <button key={o.ref} onClick={() => basculer(onglet, o)}
                  className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${on ? "bg-fuchsia-500/20 text-white ring-1 ring-fuchsia-400/40" : "bg-white/[0.04] text-white/75 hover:bg-white/10 hover:text-white"}`}>
                  <span className="min-w-0 truncate">{o.label}</span>
                  {on ? <Check size={15} className="shrink-0 text-fuchsia-300" /> : <Plus size={15} className="shrink-0 text-white/40" />}
                </button>
              );
            })}
            {!visibles.length && <p className="py-4 text-center text-sm text-white/45 sm:col-span-2">Aucun résultat.</p>}
          </div>
        </div>
      </div>

      {/* Rythme par catégorie */}
      <div className="mt-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Quand me prévenir par e-mail</h3>
        <div className="mt-3 divide-y divide-white/10 rounded-3xl border border-white/10 bg-black/20">
          {CATEGORIES.map(({ cle, titre, detail, Icone }) => (
            <div key={cle} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 text-fuchsia-200"><Icone size={16} /></span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-white">{titre}</span>
                  <span className="block text-xs text-white/50">{detail}</span>
                </span>
              </span>
              <Segments valeur={rythmes[cle]} options={RYTHMES} onChange={v => { const r = { ...rythmes, [cle]: v }; setRythmes(r); enregistrer({ rythmes: r }); }} />
            </div>
          ))}
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs text-white/45"><Mail size={12} /> « Le samedi » : l&apos;information n&apos;arrive que dans le récap hebdomadaire. Tout reste visible dans votre fil.</p>
      </div>

      {/* Périmètre */}
      <div className="mt-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">Jusqu&apos;où pour l&apos;actualité locale</h3>
        <p className="mt-1 text-[13px] text-white/55">À partir de la ville et du département renseignés dans votre profil.</p>
        <div className="mt-3"><Segments valeur={perimetre} options={PERIMETRES} onChange={v => { setPerimetre(v); enregistrer({ perimetre: v }); }} /></div>
      </div>
    </section>
  );
}
