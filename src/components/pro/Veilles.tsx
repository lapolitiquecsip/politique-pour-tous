"use client";

import { useEffect, useState } from "react";
import { Check, ExternalLink, Loader2, Pause, Play, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

/**
 * Veilles par sujet (Pro) : le sujet décrit en une phrase devient des mots-clés (IA gratuite,
 * modifiables), l'aperçu montre ce qu'on aurait reçu ces 30 derniers jours, puis la veille
 * surveille chaque heure les amendements (Assemblée, Sénat), les comptes rendus de commission,
 * le Journal officiel, l'agenda des deux chambres et les nouveaux textes. Les alertes partent au
 * rythme choisi, avec l'extrait exact et le lien officiel (relevé : veilles-sujet.ts).
 */

type Rythme = "immediat" | "quotidien" | "hebdo";
type Veille = { id: number; intitule: string; mots_cles: string[]; exclusions: string[]; sources: string[]; rythme: Rythme; actif: boolean; cree_le: string };
type Apercu = { jours: number; sources: Record<string, { n: number; approche?: boolean; plus?: boolean; exemples: { titre: string; extrait: string; url: string | null }[] }> };

const SOURCES: [string, string][] = [
  ["amendements", "Amendements (Assemblée, Sénat)"], ["comptes_rendus", "Commissions (comptes rendus intégraux)"], ["debats", "Débats en séance (Assemblée)"],
  ["journal_officiel", "Journal officiel"], ["agenda", "Agenda des deux chambres"], ["textes", "Nouveaux textes déposés"],
];
const RYTHMES: [Rythme, string][] = [["immediat", "Dès que ça sort"], ["quotidien", "Chaque soir"], ["hebdo", "Chaque dimanche"]];
const champ = "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-cyan-500 focus:outline-none";

function Pastilles({ valeurs, onChange, ton, placeholder }: { valeurs: string[]; onChange: (v: string[]) => void; ton: "cle" | "exclu"; placeholder: string }) {
  const [saisie, setSaisie] = useState("");
  const ajouter = () => { const v = saisie.trim(); if (v.length >= 2 && !valeurs.includes(v)) onChange([...valeurs, v]); setSaisie(""); };
  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-background p-2">
      {valeurs.map(v => (
        <span key={v} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-bold ${ton === "cle" ? "bg-cyan-500/15 text-cyan-800 dark:text-cyan-200" : "bg-rose-500/15 text-rose-800 dark:text-rose-200"}`}>
          {v}{" "}
          <button type="button" onClick={() => onChange(valeurs.filter(x => x !== v))} aria-label={`Retirer ${v}`} className="opacity-60 hover:opacity-100"><X size={12} /></button>
        </span>
      ))}{" "}
      <input value={saisie} onChange={e => setSaisie(e.target.value)} onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); ajouter(); } }} onBlur={ajouter}
        placeholder={placeholder} className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none" />
    </div>
  );
}

export default function Veilles() {
  const [veilles, setVeilles] = useState<Veille[] | null>(null);
  const [phrase, setPhrase] = useState("");
  const [brouillon, setBrouillon] = useState<Omit<Veille, "id" | "actif" | "cree_le"> | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [etat, setEtat] = useState<"" | "suggestion" | "apercu" | "enregistrement">("");
  const [erreur, setErreur] = useState("");

  const charger = () => supabase.from("veilles").select("id, intitule, mots_cles, exclusions, sources, rythme, actif, cree_le").order("cree_le", { ascending: false })
    .then(({ data }) => setVeilles((data as Veille[]) || []));
  useEffect(() => { charger(); }, []);

  const appeler = async <T,>(body: object): Promise<T | null> => {
    setErreur("");
    const { data, error } = await supabase.functions.invoke<T & { error?: string }>("veille-mots-cles", { body });
    if (error || !data || (data as { error?: string }).error) { setErreur((data as { error?: string })?.error || "Le service ne répond pas, réessayez dans un instant."); return null; }
    return data;
  };
  const suggerer = async () => {
    if (phrase.trim().length < 3) return;
    setEtat("suggestion"); setApercu(null);
    const r = await appeler<{ intitule: string; mots_cles: string[]; exclusions: string[]; secours?: boolean }>({ action: "suggerer", phrase });
    if (r) setBrouillon({ intitule: r.intitule, mots_cles: r.mots_cles, exclusions: r.exclusions, sources: SOURCES.map(s => s[0]), rythme: "quotidien" });
    // Modèle gratuit saturé : les mots viennent de la phrase, le membre les complète.
    if (r?.secours) setErreur("Suggestions automatiques indisponibles pour le moment : voici les mots de votre phrase. Ajoutez synonymes et sigles, puis vérifiez avec l'aperçu.");
    setEtat("");
  };
  const voir = async () => {
    if (!brouillon?.mots_cles.length) return;
    setEtat("apercu");
    setApercu(await appeler<Apercu>({ action: "apercu", mots_cles: brouillon.mots_cles, exclusions: brouillon.exclusions, sources: brouillon.sources }));
    setEtat("");
  };
  const enregistrer = async () => {
    if (!brouillon?.mots_cles.length) return;
    setEtat("enregistrement");
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("veilles").insert({ ...brouillon, user_id: u.user?.id });
    setEtat("");
    if (error) { setErreur(/30 veilles/.test(error.message) ? "Vous avez atteint 30 veilles : supprimez-en une pour en créer une autre." : "Enregistrement impossible, réessayez."); return; }
    setBrouillon(null); setApercu(null); setPhrase(""); charger();
  };
  const modifier = async (v: Veille, patch: Partial<Veille>) => {
    setVeilles(l => l?.map(x => (x.id === v.id ? { ...x, ...patch } : x)) ?? null);
    await supabase.from("veilles").update(patch).eq("id", v.id);
  };
  const supprimer = async (v: Veille) => {
    if (!window.confirm(`Supprimer la veille « ${v.intitule} » ?`)) return;
    setVeilles(l => l?.filter(x => x.id !== v.id) ?? null);
    await supabase.from("veilles").delete().eq("id", v.id);
  };

  return (
    <section className="space-y-6">
      <div className="rounded-[2rem] border border-border bg-card p-5 md:p-7">
        <h2 className="flex items-center gap-2 font-staatliches text-3xl uppercase leading-none tracking-tight text-foreground"><Search size={22} className="text-cyan-600" /> Mes veilles</h2>{" "}
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Décrivez un sujet en une phrase : chaque heure, nous le cherchons dans les amendements de l&apos;Assemblée et du Sénat, les comptes rendus intégraux des commissions, les débats en séance,
          le Journal officiel, l&apos;agenda des deux chambres et les nouveaux textes. Chaque alerte cite l&apos;extrait exact et renvoie au document officiel.
        </p>{" "}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input value={phrase} onChange={e => setPhrase(e.target.value)} onKeyDown={e => { if (e.key === "Enter") suggerer(); }} maxLength={300}
            placeholder="Ex. : le développement de l'éolien en mer et son impact sur la pêche" className={champ} />{" "}
          <button type="button" onClick={suggerer} disabled={etat === "suggestion" || phrase.trim().length < 3}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-cyan-700 px-5 text-sm font-black text-white transition hover:bg-cyan-800 disabled:opacity-50">
            {etat === "suggestion" ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Proposer les mots-clés
          </button>
        </div>{" "}
        {erreur && <p className="mt-3 text-sm font-bold text-rose-700 dark:text-rose-300">{erreur}</p>}

        {brouillon && (
          <div className="mt-6 space-y-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/[0.04] p-4 md:p-5">
            <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom de la veille</span>{" "}
              <input value={brouillon.intitule} onChange={e => setBrouillon({ ...brouillon, intitule: e.target.value.slice(0, 80) })} className={champ} /></label>{" "}
            <div><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mots-clés : un seul suffit pour qu&apos;un document remonte</span>{" "}
              <Pastilles valeurs={brouillon.mots_cles} onChange={v => { setBrouillon({ ...brouillon, mots_cles: v }); setApercu(null); }} ton="cle" placeholder="Ajouter un mot-clé, puis Entrée" /></div>{" "}
            <div><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Exclusions : un document qui en contient une est écarté</span>{" "}
              <Pastilles valeurs={brouillon.exclusions} onChange={v => { setBrouillon({ ...brouillon, exclusions: v }); setApercu(null); }} ton="exclu" placeholder="Ajouter une exclusion" /></div>{" "}
            <div className="grid gap-4 md:grid-cols-2">
              <div><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Où chercher</span>{" "}
                <div className="space-y-1.5">
                  {SOURCES.map(([id, label]) => (
                    <label key={id} className="flex items-center gap-2 text-[13px] text-foreground">
                      <input type="checkbox" checked={brouillon.sources.includes(id)} className="h-4 w-4 accent-cyan-600"
                        onChange={e => { setBrouillon({ ...brouillon, sources: e.target.checked ? [...brouillon.sources, id] : brouillon.sources.filter(x => x !== id) }); setApercu(null); }} />{" "}
                      {label}
                    </label>
                  ))}
                </div>
              </div>{" "}
              <div><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Recevoir les alertes par e-mail</span>{" "}
                <div className="flex flex-wrap gap-1.5">
                  {RYTHMES.map(([r, l]) => (
                    <button key={r} type="button" onClick={() => setBrouillon({ ...brouillon, rythme: r })} aria-pressed={brouillon.rythme === r}
                      className={`min-h-[38px] rounded-xl px-3 text-[12px] font-bold transition ${brouillon.rythme === r ? "bg-cyan-700 text-white" : "bg-muted text-muted-foreground hover:text-foreground"}`}>{l}{" "}</button>
                  ))}
                </div>
              </div>
            </div>{" "}

            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={voir} disabled={etat === "apercu" || !brouillon.mots_cles.length || !brouillon.sources.length}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold text-foreground transition hover:border-cyan-500 disabled:opacity-50">
                {etat === "apercu" ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Ce qu&apos;elle aurait trouvé ces 30 derniers jours
              </button>{" "}
              <button type="button" onClick={enregistrer} disabled={etat === "enregistrement" || !brouillon.mots_cles.length || !brouillon.sources.length || brouillon.intitule.trim().length < 3}
                className="inline-flex min-h-[42px] items-center gap-2 rounded-xl bg-cyan-700 px-5 text-sm font-black text-white transition hover:bg-cyan-800 disabled:opacity-50">
                {etat === "enregistrement" ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Créer la veille
              </button>{" "}
              <button type="button" onClick={() => { setBrouillon(null); setApercu(null); }} className="min-h-[42px] px-3 text-sm font-bold text-muted-foreground hover:text-foreground">Annuler</button>
            </div>

            {apercu && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-[12px] font-bold text-foreground">
                  Sur les {apercu.jours} derniers jours : {Object.values(apercu.sources).reduce((t, s) => t + s.n, 0)} document{Object.values(apercu.sources).reduce((t, s) => t + s.n, 0) > 1 ? "s" : ""}.
                  {" "}<span className="font-normal text-muted-foreground">Trop ? Ajoutez une exclusion ou retirez un mot trop général. Trop peu ? Ajoutez un synonyme.</span>
                </p>{" "}
                {SOURCES.filter(([id]) => apercu.sources[id]).map(([id, label]) => (
                  <div key={id}>
                    <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">{label} · {apercu.sources[id].plus ? "plus de " : apercu.sources[id].approche ? "environ " : ""}{apercu.sources[id].n}</p>{" "}
                    {apercu.sources[id].exemples.map((x, i) => (
                      <div key={i} className="mt-1.5 rounded-xl bg-background p-3 text-[12.5px] leading-snug">
                        <p className="font-bold text-foreground">{x.url ? <a href={x.url} target="_blank" rel="noopener noreferrer" className="hover:underline">{x.titre} <ExternalLink size={11} className="inline" /></a> : x.titre}</p>{" "}
                        <p className="mt-1 text-muted-foreground">{x.extrait}</p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>{" "}

      {/* Veilles enregistrées */}
      {veilles === null ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-cyan-600" /></div>
        : veilles.length > 0 && (
        <div className="space-y-2.5">
          {veilles.map(v => (
            <div key={v.id} className={`rounded-2xl border border-border bg-card p-4 ${v.actif ? "" : "opacity-60"}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-black text-foreground">{v.intitule}{!v.actif && <span className="ml-2 text-[11px] font-bold text-muted-foreground">(en pause)</span>}</p>{" "}
                  <p className="mt-1 text-[12px] text-muted-foreground">{v.mots_cles.join(" · ")}{v.exclusions.length ? ` — sauf ${v.exclusions.join(", ")}` : ""}</p>
                </div>{" "}
                <div className="flex shrink-0 items-center gap-1.5">
                  <select value={v.rythme} onChange={e => modifier(v, { rythme: e.target.value as Rythme })} aria-label="Rythme des e-mails"
                    className="rounded-lg border border-border bg-background px-2 py-1.5 text-[12px] font-bold text-foreground">
                    {RYTHMES.map(([r, l]) => <option key={r} value={r}>{l}</option>)}
                  </select>{" "}
                  <button type="button" onClick={() => modifier(v, { actif: !v.actif })} aria-label={v.actif ? "Mettre en pause" : "Reprendre"} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground">{v.actif ? <Pause size={15} /> : <Play size={15} />}</button>{" "}
                  <button type="button" onClick={() => supprimer(v)} aria-label="Supprimer" className="rounded-lg p-2 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
          <p className="flex items-center gap-1.5 text-[12px] text-muted-foreground"><Plus size={12} /> Jusqu&apos;à 30 veilles. Les alertes arrivent aussi dans votre fil, onglet « Aujourd&apos;hui ».</p>
        </div>
      )}
    </section>
  );
}
