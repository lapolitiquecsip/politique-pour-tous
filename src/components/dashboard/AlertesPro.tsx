"use client";

import { useEffect, useMemo, useState } from "react";
import { BellRing, Check, Loader2, MapPin, Plus, Search, X, Newspaper, Scale, ShieldCheck, UserRound } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Réglages des alertes Pro.
 *
 * Une seule alerte « sur le moment » : un texte (vote final d'une loi, loi ou décret au
 * Journal officiel) qui peut vous concerner d'après votre profil. Tout le reste — vos
 * suivis, votre territoire, les passages télé des personnalités suivies — arrive dans
 * le récap du samedi, trié pour ne garder que l'important.
 */

type Kind = "parti" | "ministere" | "candidat" | "commission";
type Option = { ref: string; label: string };

const KINDS: [Kind, string][] = [["parti", "Partis"], ["ministere", "Ministères"], ["candidat", "Candidats 2027"], ["commission", "Commissions"]];
const PERIMETRES: [string, string][] = [["commune", "Ma commune"], ["departement", "Mon département"], ["region", "Ma région"], ["national", "Rien de local"]];
const SECTEURS: [string, string][] = [
  ["", "Non précisé"], ["sante", "Santé"], ["education", "Éducation"], ["agriculture", "Agriculture, pêche"], ["btp_logement", "BTP, immobilier"],
  ["commerce_artisanat", "Commerce, artisanat"], ["industrie", "Industrie"], ["transport", "Transport, logistique"], ["numerique", "Numérique"],
  ["culture_medias", "Culture, médias"], ["securite_defense", "Sécurité, défense"], ["justice", "Justice, droit"], ["social", "Social, associatif"],
  ["energie_environnement", "Énergie, environnement"], ["tourisme_restauration", "Tourisme, restauration"], ["finance_assurance", "Banque, assurance"], ["fonction_publique", "Administration"],
];
const LOGEMENTS: [string, string][] = [["", "Non précisé"], ["locataire", "Locataire"], ["proprietaire", "Propriétaire"], ["heberge", "Hébergé·e"]];
const ENFANTS: [string, string][] = [["", "Non précisé"], ["aucun", "Pas d'enfant à charge"], ["petits", "Enfants de moins de 6 ans"], ["scolarises", "Enfants scolarisés"], ["etudiants", "Enfants étudiants"]];
// Suivre un parti ou un candidat peut révéler une opinion politique (RGPD, art. 9) :
// consentement explicite avant le premier suivi de ce type.
const SENSIBLES: Kind[] = ["parti", "candidat"];

const champ = "w-full appearance-none rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white focus:border-fuchsia-400/50 focus:outline-none [&>option]:bg-slate-900";

function Segments({ valeur, options, onChange }: { valeur: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl border border-white/10 bg-black/20 p-1">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)}
          className={`rounded-xl px-3 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${valeur === v ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow" : "text-white/60 hover:text-white"}`}>{l}</button>
      ))}
    </div>
  );
}

function Interrupteur({ actif, onChange, label }: { actif: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={actif} aria-label={label} onClick={() => onChange(!actif)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition ${actif ? "bg-fuchsia-500" : "bg-white/15"}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${actif ? "left-[22px]" : "left-0.5"}`} />
    </button>
  );
}

export default function AlertesPro({ userId }: { userId: string }) {
  const [charge, setCharge] = useState(true);
  const [recap, setRecap] = useState(true);
  const [alertesTextes, setAlertesTextes] = useState(true);
  const [perimetre, setPerimetre] = useState("departement");
  const [secteur, setSecteur] = useState("");
  const [logement, setLogement] = useState("");
  const [enfants, setEnfants] = useState("");
  const [consentement, setConsentement] = useState<string | null>(null);
  const [suivis, setSuivis] = useState<{ kind: string; ref: string; label: string }[]>([]);
  const [options, setOptions] = useState<Record<Kind, Option[]> | null>(null);
  const [onglet, setOnglet] = useState<Kind>("parti");
  const [recherche, setRecherche] = useState("");
  const [etat, setEtat] = useState<"" | "enregistrement" | "ok">("");

  useEffect(() => {
    let actif = true;
    Promise.all([api.getUserPreferences(userId), api.getSuivis(), api.getOptionsSuivi()]).then(([p, s, o]) => {
      if (!actif) return;
      if (p) {
        setRecap(p.recap_hebdo ?? true); setAlertesTextes(p.alertes_textes ?? true); setPerimetre(p.perimetre || "departement");
        setSecteur(p.secteur || ""); setLogement(p.logement || ""); setEnfants(p.enfants || ""); setConsentement(p.consentement_suivis || null);
      }
      setSuivis(s); setOptions(o as Record<Kind, Option[]>); setCharge(false);
    }).catch(() => setCharge(false));
    return () => { actif = false; };
  }, [userId]);

  const enregistrer = async (patch: Parameters<typeof api.saveUserPreferences>[1]) => {
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
      if (SENSIBLES.includes(kind) && !consentement) return;   // le bandeau de consentement s'affiche
      setSuivis(l => [...l, { kind, ref: o.ref, label: o.label }]);
      await api.ajouterSuivi(kind, o.ref, o.label).catch(() => {});
    }
  };
  const consentir = async () => {
    const maintenant = new Date().toISOString();
    setConsentement(maintenant);
    await enregistrer({ consentement_suivis: maintenant });
  };
  const retirerConsentement = async () => {
    // Retirer son consentement efface les suivis concernés (RGPD, art. 7.3).
    for (const s of suivis.filter(x => SENSIBLES.includes(x.kind as Kind))) await api.retirerSuivi(s.kind, s.ref).catch(() => {});
    setSuivis(l => l.filter(x => !SENSIBLES.includes(x.kind as Kind)));
    setConsentement(null);
    await enregistrer({ consentement_suivis: null });
  };

  const visibles = useMemo(() => {
    const q = recherche.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
    return (options?.[onglet] || []).filter(o => !q || o.label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().includes(q)).slice(0, 40);
  }, [options, onglet, recherche]);

  if (charge) return <div className="flex justify-center py-10"><Loader2 className="animate-spin text-fuchsia-300" /></div>;
  const bloqueParConsentement = SENSIBLES.includes(onglet) && !consentement;

  return (
    <section className="overflow-hidden rounded-[2.5rem] border border-fuchsia-400/25 bg-gradient-to-br from-fuchsia-500/[0.09] via-white/[0.03] to-transparent p-6 shadow-2xl shadow-black/40 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30"><BellRing size={22} /></span>
          <div>
            <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight text-white">Mes alertes <span className="text-fuchsia-300">Pro</span></h2>
            <p className="mt-1 text-sm text-white/65">Peu d&apos;e-mails, mais ceux qui comptent pour vous.</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-widest transition ${etat === "ok" ? "bg-emerald-500/15 text-emerald-300" : etat ? "bg-white/10 text-white/65" : "opacity-0"}`}>
          {etat === "ok" ? <><Check size={13} /> Enregistré</> : <><Loader2 size={13} className="animate-spin" /> Enregistrement</>}
        </span>
      </div>

      {/* Les deux envois */}
      <div className="mt-7 grid gap-3 md:grid-cols-2">
        <div className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-black/20 p-5">
          <span className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-fuchsia-200"><Scale size={18} /></span>
            <span>
              <span className="block font-bold text-white">Un texte vous concerne</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-white/65">Dès qu&apos;une loi est votée ou qu&apos;une loi ou un décret paraît et peut vous concerner : pourquoi, le résultat du vote, ce qu&apos;ont voté les groupes et vos élus.</span>
            </span>
          </span>
          <Interrupteur actif={alertesTextes} label="Alertes textes" onChange={v => { setAlertesTextes(v); enregistrer({ alertes_textes: v }); }} />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-3xl border border-white/10 bg-black/20 p-5">
          <span className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 text-fuchsia-200"><Newspaper size={18} /></span>
            <span>
              <span className="block font-bold text-white">La semaine politique en 5 minutes</span>
              <span className="mt-0.5 block text-[13px] leading-snug text-white/65">Le samedi à 8 h : l&apos;essentiel vérifié, vos suivis, vos élus, votre territoire, leurs passages télé.</span>
            </span>
          </span>
          <Interrupteur actif={recap} label="Récap du samedi" onChange={v => { setRecap(v); enregistrer({ recap_hebdo: v }); }} />
        </div>
      </div>

      {/* Profil d'impact */}
      <div className="mt-8">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/60"><UserRound size={13} /> Ce qui me concerne</h3>
        <p className="mt-1 text-[13px] text-white/60">Avec votre âge, votre situation et votre ville (préférences ci-dessus), ces réponses décident des textes qui vous sont signalés. Toutes sont facultatives.</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          {([["Secteur d'activité", secteur, setSecteur, SECTEURS, "secteur"], ["Logement", logement, setLogement, LOGEMENTS, "logement"], ["Enfants", enfants, setEnfants, ENFANTS, "enfants"]] as const).map(([titre, val, set, opts, cle]) => (
            <label key={cle} className="block">
              <span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">{titre}</span>
              <select value={val} onChange={e => { set(e.target.value); enregistrer({ [cle]: e.target.value || null }); }} className={champ}>
                {opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
          ))}
        </div>
      </div>

      {/* Suivis élargis */}
      <div className="mt-8">
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/60">Ce que je suis</h3>
        <p className="mt-1 text-[13px] text-white/60">Dans le récap du samedi, seulement l&apos;essentiel : deux informations au plus par personnalité ou organisation, et leurs passages télé et débats.</p>
        {suivis.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {suivis.map(s => (
              <button key={`${s.kind}|${s.ref}`} onClick={() => basculer(s.kind as Kind, { ref: s.ref, label: s.label })}
                className="group inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-white transition hover:border-rose-400/50 hover:bg-rose-500/15">
                {s.label} <X size={13} className="text-white/60 group-hover:text-rose-300" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/20 p-4">
          <div className="flex flex-wrap items-center gap-2">
            {KINDS.map(([k, l]) => (
              <button key={k} onClick={() => { setOnglet(k); setRecherche(""); }}
                className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${onglet === k ? "bg-white text-slate-900" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>{l}</button>
            ))}
            <div className="relative ml-auto min-w-[180px] flex-1 sm:max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)} placeholder="Rechercher…"
                className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-white/45 focus:border-fuchsia-400/50 focus:outline-none" />
            </div>
          </div>
          {bloqueParConsentement ? (
            <div className="mt-4 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-[13px] leading-relaxed text-white/85">
              <p className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-fuchsia-300" />
                Suivre un parti ou un candidat peut laisser deviner une opinion politique, que la loi protège particulièrement. Nous ne l&apos;utilisons que pour vous envoyer les informations qui les concernent ; elle n&apos;est ni partagée ni utilisée à d&apos;autres fins, et vous pouvez retirer votre accord à tout moment (vos suivis de ce type sont alors effacés).</p>
              <button onClick={consentir} className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">J&apos;accepte</button>
            </div>
          ) : (
            <div className="mt-3 grid max-h-64 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
              {visibles.map(o => {
                const on = suivi(onglet, o.ref);
                return (
                  <button key={o.ref} onClick={() => basculer(onglet, o)}
                    className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${on ? "bg-fuchsia-500/20 text-white ring-1 ring-fuchsia-400/40" : "bg-white/[0.04] text-white/80 hover:bg-white/10 hover:text-white"}`}>
                    <span className="min-w-0 truncate">{o.label}</span>
                    {on ? <Check size={15} className="shrink-0 text-fuchsia-300" /> : <Plus size={15} className="shrink-0 text-white/50" />}
                  </button>
                );
              })}
              {!visibles.length && <p className="py-4 text-center text-sm text-white/55 sm:col-span-2">Aucun résultat.</p>}
            </div>
          )}
          {consentement && (
            <button onClick={retirerConsentement} className="mt-3 text-[11px] font-bold text-white/50 underline-offset-2 hover:text-white/80 hover:underline">
              Retirer mon accord pour le suivi des partis et candidats
            </button>
          )}
        </div>
      </div>

      {/* Périmètre */}
      <div className="mt-8">
        <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] text-white/60"><MapPin size={13} /> Mon territoire dans le récap</h3>
        <p className="mt-1 text-[13px] text-white/60">À partir de la ville et du département renseignés dans vos préférences.</p>
        <div className="mt-3"><Segments valeur={perimetre} options={PERIMETRES} onChange={v => { setPerimetre(v); enregistrer({ perimetre: v }); }} /></div>
      </div>
    </section>
  );
}
