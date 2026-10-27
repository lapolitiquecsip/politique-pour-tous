"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BellRing, Check, GraduationCap, Layers, Loader2, Mail, MapPin, Newspaper,
  Scale, Search, ShieldCheck, Sparkles, UserRound, Users, X, BookOpenCheck, ScrollText, Landmark,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { INTEREST_DOMAINS } from "@/lib/data/interestDomains";
import { raisons, type TexteAnalyse } from "@/lib/alertesTextes";

/**
 * Le tutoriel d'accueil de l'offre Pro.
 *
 * Un abonné Pro paie pour qu'on lui signale ce qui le concerne. Or le moteur d'alertes ne
 * peut rien lui signaler tant qu'il ne sait rien de lui : un compte Pro sans profil ne
 * recevait AUCUNE alerte, et rien ne le lui disait. Ce parcours pose donc, dans l'ordre,
 * les cinq questions dont les alertes dépendent — situation, territoire, sujets, suivis,
 * e-mails — et montre à la fin, sur les textes réellement parus ces deux dernières
 * semaines, ceux qui lui auraient été envoyés. Il voit l'effet de ses réponses avant de
 * fermer la fenêtre.
 *
 * Chaque étape s'enregistre en passant à la suivante : on peut s'arrêter en route sans
 * rien perdre, et tout reste modifiable ensuite dans « Mes alertes Pro ».
 */

const CLE_FAIT = "lpcs_tutoriel_pro_fait";

const AGES: [string, string][] = [["-18", "Moins de 18 ans"], ["18-24", "18 – 24 ans"], ["25-34", "25 – 34 ans"], ["35-49", "35 – 49 ans"], ["50-64", "50 – 64 ans"], ["65+", "65 ans et plus"]];
const SITUATIONS: [string, string][] = [["etudiant", "Étudiant·e"], ["salarie_prive", "Salarié·e du privé"], ["fonctionnaire", "Agent public"], ["independant", "Indépendant·e, chef·fe d'entreprise"], ["demandeur", "En recherche d'emploi"], ["retraite", "Retraité·e"], ["autre", "Autre"]];
const SECTEURS: [string, string][] = [
  ["sante", "Santé"], ["education", "Éducation"], ["agriculture", "Agriculture, pêche"], ["btp_logement", "BTP, immobilier"],
  ["commerce_artisanat", "Commerce, artisanat"], ["industrie", "Industrie"], ["transport", "Transport, logistique"], ["numerique", "Numérique"],
  ["culture_medias", "Culture, médias"], ["securite_defense", "Sécurité, défense"], ["justice", "Justice, droit"], ["social", "Social, associatif"],
  ["energie_environnement", "Énergie, environnement"], ["tourisme_restauration", "Tourisme, restauration"], ["finance_assurance", "Banque, assurance"], ["fonction_publique", "Administration"],
];
const LOGEMENTS: [string, string][] = [["locataire", "Locataire"], ["proprietaire", "Propriétaire"], ["heberge", "Hébergé·e"]];
const ENFANTS: [string, string][] = [["aucun", "Pas d'enfant à charge"], ["petits", "Moins de 6 ans"], ["scolarises", "Scolarisés"], ["etudiants", "Étudiants"]];
const REGIONS = ["Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur", "Guadeloupe", "Guyane", "Martinique", "La Réunion", "Mayotte"];
const PERIMETRES: [string, string][] = [["commune", "Ma commune"], ["departement", "Mon département"], ["region", "Ma région"], ["national", "Rien de local"]];

type Kind = "candidat" | "parti" | "ministere";
const KINDS: [Kind, string][] = [["candidat", "Candidats 2027"], ["parti", "Partis"], ["ministere", "Ministères"]];
const SENSIBLES: Kind[] = ["candidat", "parti"];

const ETAPES = [
  { id: "accueil", titre: "Bienvenue", icone: Sparkles },
  { id: "situation", titre: "Votre situation", icone: UserRound },
  { id: "territoire", titre: "Votre territoire", icone: MapPin },
  { id: "sujets", titre: "Vos sujets", icone: Layers },
  { id: "suivis", titre: "Vos suivis", icone: Users },
  { id: "emails", titre: "Vos e-mails", icone: Mail },
] as const;

const champ = "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white placeholder-white/35 focus:border-fuchsia-400/60 focus:outline-none [&>option]:bg-slate-900";
const sansAccent = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Choix({ options, valeur, onChange }: { options: [string, string][]; valeur: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(valeur === v ? "" : v)} aria-pressed={valeur === v}
          className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition ${valeur === v
            ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/25"
            : "bg-white/[0.06] text-white/75 ring-1 ring-white/10 hover:bg-white/10 hover:text-white"}`}>
          {l}{" "}
        </button>
      ))}
    </div>
  );
}

function Question({ titre, aide, children }: { titre: string; aide?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">{titre}</p>{" "}
      {aide && <p className="mt-1 text-[12px] leading-snug text-white/45">{aide}</p>}{" "}
      <div className="mt-2.5">{children}</div>
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

export default function TutorielPro({ userId, ouvert, onFermer }: { userId: string; ouvert: boolean; onFermer: () => void }) {
  const [etape, setEtape] = useState(0);
  const [charge, setCharge] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [email, setEmail] = useState("");

  const [age, setAge] = useState(""); const [situation, setSituation] = useState("");
  const [secteur, setSecteur] = useState(""); const [logement, setLogement] = useState(""); const [enfants, setEnfants] = useState("");
  const [ville, setVille] = useState(""); const [departement, setDepartement] = useState(""); const [region, setRegion] = useState("");
  const [codePostal, setCodePostal] = useState(""); const [perimetre, setPerimetre] = useState("departement");
  const [sujets, setSujets] = useState<string[]>([]);
  const [alertesTextes, setAlertesTextes] = useState(true); const [recap, setRecap] = useState(true);
  const [consentement, setConsentement] = useState<string | null>(null);
  const [suivis, setSuivis] = useState<{ kind: string; ref: string; label: string }[]>([]);
  const [options, setOptions] = useState<Record<string, { ref: string; label: string }[]> | null>(null);
  const [onglet, setOnglet] = useState<Kind>("candidat");
  const [recherche, setRecherche] = useState("");
  const [textes, setTextes] = useState<TexteAnalyse[] | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    let vivant = true;
    // ?bienvenue=3 ouvre directement la troisième étape (lien d'un e-mail, contrôle visuel).
    const voulue = Number(new URLSearchParams(window.location.search).get("bienvenue"));
    setEtape(voulue >= 1 && voulue <= ETAPES.length ? voulue - 1 : 0);
    supabase.auth.getUser().then(({ data }) => { if (vivant) setEmail(data.user?.email ?? ""); }).catch(() => {});
    Promise.all([api.getUserPreferences(userId), api.getSuivis().catch(() => []), api.getOptionsSuivi().catch(() => null)])
      .then(([p, s, o]: [any, any, any]) => {
        if (!vivant) return;
        if (p) {
          setAge(p.age_range || ""); setSituation(p.profession || ""); setSecteur(p.secteur || ""); setLogement(p.logement || ""); setEnfants(p.enfants || "");
          setVille(p.city || ""); setDepartement(p.department || ""); setRegion(p.region || ""); setCodePostal(p.postal_code || ""); setPerimetre(p.perimetre || "departement");
          setSujets(p.interests || []); setAlertesTextes(p.alertes_textes ?? true); setRecap(p.recap_hebdo ?? true); setConsentement(p.consentement_suivis || null);
        }
        setSuivis(s || []); setOptions(o); setCharge(false);
      }).catch(() => setCharge(false));
    api.getTextesImpacts(14).then(t => { if (vivant) setTextes(t as TexteAnalyse[]); }).catch(() => { if (vivant) setTextes([]); });
    return () => { vivant = false; };
  }, [ouvert, userId]);

  // La fenêtre occupe l'écran : la page derrière ne doit pas défiler sous le doigt.
  useEffect(() => {
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [ouvert]);

  const profil = useMemo(() => ({ profession: situation, age_range: age, logement, enfants, secteur, interests: sujets, department: departement }),
    [situation, age, logement, enfants, secteur, sujets, departement]);
  const concernes = useMemo(() => (textes ?? [])
    .map(t => ({ t, pourquoi: raisons(t, profil) })).filter(x => x.pourquoi.length)
    .sort((a, b) => b.t.importance - a.t.importance || String(b.t.date_texte).localeCompare(String(a.t.date_texte))), [textes, profil]);

  const enregistrer = async () => {
    setEnCours(true);
    try {
      await api.saveUserPreferences(userId, {
        age_range: age || null, profession: situation || null, secteur: secteur || null, logement: logement || null, enfants: enfants || null,
        city: ville.trim() || null, department: departement.trim() || null, region: region || null, postal_code: codePostal.trim() || null,
        perimetre, interests: sujets, alertes_textes: alertesTextes, recap_hebdo: recap,
      });
    } catch { /* l'étape reste modifiable dans « Mes alertes Pro » */ }
    setEnCours(false);
  };
  const suivant = async () => { await enregistrer(); setEtape(e => Math.min(e + 1, ETAPES.length - 1)); };
  const terminer = async () => {
    await enregistrer();
    try { localStorage.setItem(CLE_FAIT, new Date().toISOString()); } catch {}
    onFermer();
  };
  const plusTard = () => { try { localStorage.setItem(CLE_FAIT, "plus-tard"); } catch {} onFermer(); };

  const estSuivi = (kind: string, ref: string) => suivis.some(s => s.kind === kind && s.ref === ref);
  const basculer = async (kind: Kind, o: { ref: string; label: string }) => {
    if (estSuivi(kind, o.ref)) {
      setSuivis(l => l.filter(s => !(s.kind === kind && s.ref === o.ref)));
      await api.retirerSuivi(kind, o.ref).catch(() => {});
    } else {
      if (SENSIBLES.includes(kind) && !consentement) return;
      setSuivis(l => [...l, { kind, ref: o.ref, label: o.label }]);
      await api.ajouterSuivi(kind, o.ref, o.label).catch(() => {});
    }
  };
  const consentir = async () => {
    const maintenant = new Date().toISOString();
    setConsentement(maintenant);
    await api.saveUserPreferences(userId, { consentement_suivis: maintenant }).catch(() => {});
  };
  const visibles = useMemo(() => {
    const q = sansAccent(recherche);
    return (options?.[onglet] ?? []).filter(o => !q || sansAccent(o.label).includes(q)).slice(0, 30);
  }, [options, onglet, recherche]);

  const e = ETAPES[etape];
  const derniere = etape === ETAPES.length - 1;
  const profilVide = !situation && !age && !secteur && !logement && !enfants && !sujets.length;

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/85 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog" aria-modal="true" aria-label="Tutoriel de l'espace Pro"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="dark flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-[#0b1020] text-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:rounded-[2rem] sm:border sm:border-fuchsia-400/20"
          >
            {/* En-tête : où l'on en est */}
            <div className="shrink-0 border-b border-white/10 px-5 pb-4 pt-5 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-fuchsia-300">
                  <e.icone size={13} /> Étape {etape + 1} sur {ETAPES.length}
                </p>{" "}
                <button type="button" onClick={plusTard} aria-label="Fermer le tutoriel"
                  className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
              </div>{" "}
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {ETAPES.map((x, i) => (
                  <span key={x.id} className={`h-1 flex-1 rounded-full transition-colors ${i <= etape ? "bg-gradient-to-r from-fuchsia-500 to-purple-500" : "bg-white/10"}`} />
                ))}
              </div>
            </div>{" "}

            {/* Corps */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              {charge ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-fuchsia-300" /></div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={e.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.16 }}>

                    {e.id === "accueil" && (
                      <div>
                        <h2 className="font-staatliches text-4xl uppercase leading-none tracking-tight">Bienvenue dans <span className="text-fuchsia-300">votre espace Pro</span></h2>{" "}
                        <p className="mt-3 text-[15px] leading-relaxed text-white/75">
                          Trois minutes pour dire au site ce qui vous concerne. Ensuite, il travaille seul : vous ne recevez que ce qui compte pour vous.
                        </p>{" "}
                        <ul className="mt-6 space-y-3">
                          {[
                            [Scale, "Un texte vous concerne", "Dès qu'une loi est votée, ou qu'une loi ou un décret paraît au Journal officiel et vous touche, vous recevez un e-mail : ce qui change, pour qui, et un extrait du texte officiel."],
                            [Newspaper, "La semaine politique en 5 minutes", "Le samedi à 8 h : l'essentiel de la semaine, vérifié, avec vos élus, vos suivis et votre territoire."],
                            [BookOpenCheck, "Vos outils de travail", "« Tout sur un sujet », le Journal officiel du jour expliqué, les commissions de l'Assemblée et du Sénat réunion par réunion."],
                          ].map(([Icone, titre, texte]: any) => (
                            <li key={titre} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-fuchsia-500/15 text-fuchsia-200"><Icone size={18} /></span>{" "}
                              <span>
                                <span className="block font-bold text-white">{titre}</span>{" "}
                                <span className="mt-0.5 block text-[13px] leading-snug text-white/65">{texte}</span>
                              </span>{" "}
                            </li>
                          ))}
                        </ul>{" "}
                        <p className="mt-5 flex items-start gap-2 text-[12px] leading-snug text-white/50">
                          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-fuchsia-300" />{" "}
                          Toutes les réponses sont facultatives, modifiables à tout moment, et ne servent qu&apos;à trier ce que vous recevez.
                        </p>
                      </div>
                    )}{" "}

                    {e.id === "situation" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Votre situation</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Une loi sur les retraites ne concerne pas un étudiant comme un retraité. Ces réponses décident des textes qui vous sont signalés.</p>
                        </div>{" "}
                        <Question titre="Vous êtes"><Choix options={SITUATIONS} valeur={situation} onChange={setSituation} /></Question>
                        <Question titre="Votre âge"><Choix options={AGES} valeur={age} onChange={setAge} /></Question>
                        <Question titre="Votre secteur d'activité" aide="Pour les textes qui règlent un métier ou une filière.">
                          <Choix options={SECTEURS} valeur={secteur} onChange={setSecteur} />
                        </Question>{" "}
                        <div className="grid gap-6 sm:grid-cols-2">
                          <Question titre="Votre logement"><Choix options={LOGEMENTS} valeur={logement} onChange={setLogement} /></Question>{" "}
                          <Question titre="Vos enfants"><Choix options={ENFANTS} valeur={enfants} onChange={setEnfants} /></Question>
                        </div>
                      </div>
                    )}{" "}

                    {e.id === "territoire" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Votre territoire</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Pour les textes qui ne visent qu&apos;un département, et pour l&apos;actualité de votre commune, de votre département et de votre région dans le récap du samedi.</p>
                        </div>{" "}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Ville</span>{" "}
                            <input value={ville} onChange={x => setVille(x.target.value)} placeholder="Nantes" className={champ} autoComplete="address-level2" /></label>{" "}
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Code postal</span>{" "}
                            <input value={codePostal} onChange={x => setCodePostal(x.target.value)} placeholder="44000" inputMode="numeric" className={champ} autoComplete="postal-code" /></label>{" "}
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Département (numéro)</span>{" "}
                            <input value={departement} onChange={x => setDepartement(x.target.value)} placeholder="44" className={champ} /></label>{" "}
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Région</span>{" "}
                            <select value={region} onChange={x => setRegion(x.target.value)} className={champ}>
                              <option value="">Non précisée</option>
                              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select></label>
                        </div>{" "}
                        <Question titre="L'actualité locale dans votre récap" aide="Une commune ne reçoit que ses propres nouvelles : jamais celles de la ville voisine.">
                          <Choix options={PERIMETRES} valeur={perimetre} onChange={v => setPerimetre(v || "national")} />
                        </Question>
                      </div>
                    )}{" "}

                    {e.id === "sujets" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Vos sujets</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Les domaines que vous voulez suivre même quand un texte ne vous touche pas personnellement. Seuls les textes importants vous sont alors signalés.</p>
                        </div>{" "}
                        <div className="flex flex-wrap gap-2">
                          {INTEREST_DOMAINS.map(d => {
                            const on = sujets.includes(d.code);
                            return (
                              <button key={d.code} type="button" aria-pressed={on}
                                onClick={() => setSujets(l => (on ? l.filter(c => c !== d.code) : [...l, d.code]))}
                                className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-bold transition ${on ? "bg-white text-slate-900" : "bg-white/[0.06] text-white/75 ring-1 ring-white/10 hover:bg-white/10"}`}>
                                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />{" "}{d.label}{" "}
                                {on && <Check size={14} />}{" "}
                              </button>
                            );
                          })}
                        </div>{" "}
                        <p className="text-[12px] text-white/45">{sujets.length ? `${sujets.length} sujet(s) choisi(s).` : "Aucun sujet choisi : vous ne recevrez que les textes qui vous concernent directement."}</p>
                      </div>
                    )}{" "}

                    {e.id === "suivis" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Vos suivis</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Les candidats, partis et ministères dont vous voulez l&apos;essentiel chaque samedi : deux informations au plus par nom, et leurs passages télé.</p>
                        </div>{" "}
                        {suivis.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {suivis.filter(s => KINDS.some(k => k[0] === s.kind)).map(s => (
                              <button key={`${s.kind}|${s.ref}`} type="button" onClick={() => basculer(s.kind as Kind, s)}
                                className="group inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/30 bg-fuchsia-500/15 px-3 py-1.5 text-xs font-bold text-white">
                                {s.label} {" "}<X size={13} className="text-white/60 group-hover:text-rose-300" />{" "}
                              </button>
                            ))}
                          </div>
                        )}{" "}
                        <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            {KINDS.map(([k, l]) => (
                              <button key={k} type="button" onClick={() => { setOnglet(k); setRecherche(""); }}
                                className={`rounded-full px-3.5 py-1.5 text-[11px] font-black uppercase tracking-wider transition ${onglet === k ? "bg-white text-slate-900" : "text-white/65 hover:bg-white/10 hover:text-white"}`}>{l}{" "}</button>
                            ))}
                          </div>{" "}
                          {SENSIBLES.includes(onglet) && !consentement ? (
                            <div className="mt-4 rounded-2xl border border-fuchsia-400/30 bg-fuchsia-500/10 p-4 text-[13px] leading-relaxed text-white/85">
                              <p className="flex items-start gap-2"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-fuchsia-300" />{" "}
                                Suivre un parti ou un candidat peut laisser deviner une opinion politique, que la loi protège particulièrement. Nous ne l&apos;utilisons que pour vous envoyer les informations qui les concernent ; elle n&apos;est ni partagée ni revendue, et vous pouvez retirer votre accord à tout moment.</p>{" "}
                              <button type="button" onClick={consentir} className="mt-3 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-white">J&apos;accepte</button>
                            </div>
                          ) : (
                            <>
                              <div className="relative mt-3">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                                <input value={recherche} onChange={x => setRecherche(x.target.value)} placeholder="Rechercher…"
                                  className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-white/45 focus:border-fuchsia-400/50 focus:outline-none" />
                              </div>{" "}
                              <div className="mt-3 grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                                {visibles.map(o => {
                                  const on = estSuivi(onglet, o.ref);
                                  return (
                                    <button key={o.ref} type="button" onClick={() => basculer(onglet, o)}
                                      className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${on ? "bg-fuchsia-500/20 text-white ring-1 ring-fuchsia-400/40" : "bg-white/[0.04] text-white/80 hover:bg-white/10"}`}>
                                      <span className="min-w-0 truncate">{o.label}</span>{" "}
                                      {on && <Check size={15} className="shrink-0 text-fuchsia-300" />}{" "}
                                    </button>
                                  );
                                })}{" "}
                                {!visibles.length && <p className="py-4 text-center text-sm text-white/55 sm:col-span-2">Aucun résultat.</p>}
                              </div>
                            </>
                          )}
                        </div>{" "}
                        <p className="text-[12px] text-white/45">Vos députés et sénateurs se suivent depuis leur fiche, avec la cloche. Les commissions se choisissent dans l&apos;onglet « E-mails &amp; réglages ».</p>
                      </div>
                    )}{" "}

                    {e.id === "emails" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Vos e-mails</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">
                            Ils partent à {email ? <strong className="text-white">{email}</strong> : "l'adresse de votre compte"}. Deux envois seulement, que vous pouvez couper à tout moment.
                          </p>
                        </div>{" "}
                        <div className="space-y-2.5">
                          <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <span><span className="block font-bold">Un texte vous concerne</span>{" "}<span className="mt-0.5 block text-[13px] text-white/60">Sur le moment, quatre par jour au plus.</span></span>{" "}
                            <Interrupteur actif={alertesTextes} onChange={setAlertesTextes} label="Alertes sur les textes" />
                          </div>{" "}
                          <div className="flex items-start justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                            <span><span className="block font-bold">La semaine politique en 5 minutes</span>{" "}<span className="mt-0.5 block text-[13px] text-white/60">Le samedi à 8 h.</span></span>{" "}
                            <Interrupteur actif={recap} onChange={setRecap} label="Récap du samedi" />
                          </div>
                        </div>{" "}

                        {/* La preuve par l'exemple : ce que ce profil aurait reçu. */}
                        <div className="rounded-3xl border border-fuchsia-400/25 bg-fuchsia-500/[0.07] p-4 sm:p-5">
                          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-fuchsia-200">
                            <BellRing size={13} /> Avec ce profil, ces 14 derniers jours
                          </p>{" "}
                          {textes === null ? (
                            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-fuchsia-300" /></div>
                          ) : concernes.length ? (
                            <>
                              <p className="mt-2 text-sm text-white/80">
                                <strong className="text-white">{concernes.length} texte{concernes.length > 1 ? "s" : ""}</strong> sur {textes.length} parus vous aurai{concernes.length > 1 ? "ent" : "t"} été signalé{concernes.length > 1 ? "s" : ""}. En voici {Math.min(3, concernes.length)} :
                              </p>{" "}
                              <ul className="mt-3 space-y-2.5">
                                {concernes.slice(0, 3).map(({ t, pourquoi }) => (
                                  <li key={t.id} className="rounded-2xl bg-black/25 p-3.5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
                                      {t.source === "scrutin_final" ? "Vote final" : t.source === "loi" ? "Loi · Journal officiel" : "Décret · Journal officiel"}
                                    </p>{" "}
                                    <p className="mt-1 text-sm font-bold leading-snug text-white">{t.titre}</p>{" "}
                                    <p className="mt-1 text-[12px] font-bold text-fuchsia-200">Pour vous : {pourquoi.join(" ; ")}</p>{" "}
                                    {t.explication && <p className="mt-1 text-[13px] leading-snug text-white/70">{t.explication}</p>}{" "}
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <p className="mt-2 text-sm leading-relaxed text-white/75">
                              {profilVide
                                ? "Votre profil est vide : aucun texte ne peut vous être signalé. Revenez à l'étape « Votre situation » et répondez au moins à une question."
                                : `Aucun des ${textes.length} textes parus ne vous concernait directement. C'est le fonctionnement normal : vous ne recevez rien quand rien ne vous touche.`}
                            </p>
                          )}
                        </div>{" "}

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Et maintenant, vos outils</p>{" "}
                          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            {[
                              [BookOpenCheck, "Tout sur un sujet", "/premium/#tout-sur-un-sujet"],
                              [ScrollText, "Le Journal officiel du jour", "/premium/#journal-officiel"],
                              [Landmark, "Les commissions", "/premium/#commissions"],
                              [GraduationCap, "Dynamiques de la présidentielle", "/presidentielles-2027/#dynamiques"],
                            ].map(([Icone, label, href]: any) => (
                              <Link key={href} href={href} onClick={terminer}
                                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white transition hover:border-fuchsia-400/40 hover:bg-white/[0.08]">
                                <Icone size={17} className="shrink-0 text-fuchsia-300" />{" "}
                                <span className="min-w-0 flex-1 truncate">{label}</span>{" "}
                                <ArrowRight size={15} className="shrink-0 text-white/40 transition group-hover:translate-x-0.5 group-hover:text-white" />{" "}
                              </Link>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}{" "}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>{" "}

            {/* Pied : navigation */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/10 px-5 py-4 sm:px-7">
              {etape > 0 ? (
                <button type="button" onClick={() => setEtape(x => x - 1)}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white/60 transition hover:text-white">
                  <ArrowLeft size={14} /> Retour
                </button>
              ) : (
                <button type="button" onClick={plusTard} className="rounded-full px-3 py-2 text-[11px] font-black uppercase tracking-widest text-white/50 transition hover:text-white">Plus tard</button>
              )}{" "}
              <button type="button" onClick={derniere ? terminer : suivant} disabled={enCours || charge}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-600 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-white shadow-lg shadow-fuchsia-500/30 transition hover:brightness-110 disabled:opacity-60">
                {enCours ? <Loader2 size={14} className="animate-spin" /> : null}{" "}
                {derniere ? "Terminer" : etape === 0 ? "Commencer" : "Continuer"}{" "}
                {!derniere && !enCours && <ArrowRight size={14} />}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** Le tutoriel a-t-il déjà été vu sur cet appareil ? */
export function tutorielProDejaVu(): boolean {
  try { return !!localStorage.getItem(CLE_FAIT); } catch { return true; }
}
