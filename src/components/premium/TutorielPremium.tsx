"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, BarChart3, BellRing, Building2, Check, Landmark, Layers, Loader2, Mail, MapPin, Mic,
  Scale, Search, ShieldCheck, Sparkles, UserRound, Users, Vote, X,
} from "lucide-react";
import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { INTEREST_DOMAINS } from "@/lib/data/interestDomains";
import { DEPARTMENTS } from "@/lib/data/territories";
import { useCommuneAuto, PropositionsCommune } from "@/lib/hooks/useCommuneAuto";
import { getFollowedCandidates, toggleFollowCandidate, type FollowedCandidate } from "@/lib/candidateFollows";
import { acteIndividuel, importanceDe, sujetsDuProfil, sujetsTouches } from "@/lib/alertesPremium";

/**
 * Le guide d'accueil de l'offre Premium (01/11/2026, sur le modèle de TutorielPro).
 *
 * Un abonné Premium sans profil ne reçoit que les votes des élus qu'il suit, et rien ne le lui
 * dit. Ce parcours pose donc les questions dont ses alertes dépendent — situation, territoire,
 * sujets, élus et candidats, e-mails — puis montre sur les lois et décrets des deux dernières
 * semaines ce que ce profil aurait fait remonter, et où trouver ce que son offre débloque.
 *
 * Ne sont demandés que les champs lus par le moteur Premium (generate-interest-notifications) :
 * le secteur, le logement et les enfants ne servent qu'aux alertes « Un texte vous concerne »,
 * réservées au Pro. Le guide ne promet rien d'autre que ce que le comparatif de /premium annonce.
 *
 * Chaque étape s'enregistre en passant à la suivante ; tout reste modifiable dans « Alertes & réglages ».
 */

const CLE_FAIT = "lpcs_tutoriel_premium_fait";

const AGES: [string, string][] = [["-18", "Moins de 18 ans"], ["18-24", "18 – 24 ans"], ["25-34", "25 – 34 ans"], ["35-49", "35 – 49 ans"], ["50-64", "50 – 64 ans"], ["65+", "65 ans et plus"]];
const SITUATIONS: [string, string][] = [["etudiant", "Étudiant·e"], ["salarie_prive", "Salarié·e du privé"], ["fonctionnaire", "Agent public"], ["independant", "Indépendant·e, chef·fe d'entreprise"], ["demandeur", "En recherche d'emploi"], ["retraite", "Retraité·e"], ["autre", "Autre"]];
const REGIONS = ["Auvergne-Rhône-Alpes", "Bourgogne-Franche-Comté", "Bretagne", "Centre-Val de Loire", "Corse", "Grand Est", "Hauts-de-France", "Île-de-France", "Normandie", "Nouvelle-Aquitaine", "Occitanie", "Pays de la Loire", "Provence-Alpes-Côte d'Azur", "Guadeloupe", "Guyane", "Martinique", "La Réunion", "Mayotte"];
const PERIMETRES: [string, string][] = [["commune", "Ma commune"], ["departement", "Mon département"], ["region", "Ma région"], ["national", "Rien de local"]];
const IMPORTANCES: [string, string][] = [["5", "L'essentiel seulement"], ["4", "Important et plus"], ["3", "Notable et plus"], ["2", "Presque tout"], ["1", "Tout"]];

const DEPTS = DEPARTMENTS as { id: string; name: string }[];

const ETAPES = [
  { id: "accueil", titre: "Bienvenue", icone: Sparkles },
  { id: "situation", titre: "Votre situation", icone: UserRound },
  { id: "territoire", titre: "Votre territoire", icone: MapPin },
  { id: "sujets", titre: "Vos sujets", icone: Layers },
  { id: "suivis", titre: "Vos élus", icone: Users },
  { id: "emails", titre: "Vos e-mails", icone: Mail },
] as const;

type Elu = { id: string; slug: string; first_name: string; last_name: string; party: string | null; kind: "depute" | "senateur" };
type Actu = { title: string; news_type: string | null; published_at: string; sujets: string[] };

const champ = "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm font-medium text-white placeholder-white/35 focus:border-amber-400/60 focus:outline-none [&>option]:bg-slate-900";

function Choix({ options, valeur, onChange }: { options: [string, string][]; valeur: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(valeur === v ? "" : v)} aria-pressed={valeur === v}
          className={`rounded-full px-3.5 py-2 text-[13px] font-bold transition ${valeur === v
            ? "bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 shadow-lg shadow-amber-500/25"
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

export default function TutorielPremium({ userId, ouvert, onFermer }: { userId: string; ouvert: boolean; onFermer: () => void }) {
  const [etape, setEtape] = useState(0);
  const [charge, setCharge] = useState(true);
  const [enCours, setEnCours] = useState(false);
  const [email, setEmail] = useState("");

  const [age, setAge] = useState(""); const [situation, setSituation] = useState("");
  const [ville, setVille] = useState(""); const [departement, setDepartement] = useState(""); const [region, setRegion] = useState("");
  const [codePostal, setCodePostal] = useState(""); const [perimetre, setPerimetre] = useState("departement");
  const [sujets, setSujets] = useState<string[]>([]);
  const [notifier, setNotifier] = useState(true); const [seuil, setSeuil] = useState("3");

  const [suivis, setSuivis] = useState<Set<string>>(new Set());
  const [elusLocaux, setElusLocaux] = useState<Elu[]>([]);
  const [recherche, setRecherche] = useState("");
  const [trouves, setTrouves] = useState<Elu[]>([]);
  const [candidats, setCandidats] = useState<FollowedCandidate[]>([]);
  const [candidatsSuivis, setCandidatsSuivis] = useState<FollowedCandidate[]>([]);
  const [actus, setActus] = useState<Omit<Actu, "sujets">[] | null>(null);

  useEffect(() => {
    if (!ouvert) return;
    let vivant = true;
    const voulue = Number(new URLSearchParams(window.location.search).get("bienvenue"));
    setEtape(voulue >= 1 && voulue <= ETAPES.length ? voulue - 1 : 0);
    setCandidatsSuivis(getFollowedCandidates());
    supabase.auth.getUser().then(({ data }) => { if (vivant) setEmail(data.user?.email ?? ""); }).catch(() => {});
    Promise.all([
      api.getUserPreferences(userId).catch(() => null),
      supabase.from("user_follows").select("deputy_id, senator_id").eq("user_id", userId),
      supabase.from("presidential_candidates").select("id, slug, full_name, photo_url, party").eq("status", "declared").order("full_name"),
    ]).then(([p, f, c]: [any, any, any]) => {
      if (!vivant) return;
      if (p) {
        setAge(p.age_range || ""); setSituation(p.profession || "");
        setVille(p.city || ""); setRegion(p.region || ""); setCodePostal(p.postal_code || ""); setPerimetre(p.perimetre || "departement");
        // Le réglage historique accepte un numéro ou un nom de département ; la liste attend le numéro.
        const d = String(p.department || "").trim();
        setDepartement(DEPTS.find(x => x.id === d || x.name.toLowerCase() === d.toLowerCase())?.id || "");
        setSujets(p.interests || []); setNotifier(p.notify_email ?? true); setSeuil(String(p.email_min_importance ?? 3));
      }
      setSuivis(new Set((f.data || []).flatMap((x: any) => [x.deputy_id && `depute:${x.deputy_id}`, x.senator_id && `senateur:${x.senator_id}`]).filter(Boolean)));
      setCandidats((c.data || []).map((x: any) => ({ id: String(x.id), slug: x.slug, name: x.full_name, photo_url: x.photo_url, party: x.party })));
      setCharge(false);
    }).catch(() => setCharge(false));
    // Les textes nationaux des 14 derniers jours : décrets et lois promulguées, matière des alertes par sujet.
    const depuis = new Date(Date.now() - 14 * 864e5).toISOString();
    Promise.all([
      supabase.from("entity_feed").select("title, news_type, published_at").eq("entity_type", "ministry").gte("published_at", depuis).order("published_at", { ascending: false }).limit(300),
      supabase.from("promulgated_laws").select("title, promulgated_at").gte("promulgated_at", depuis.slice(0, 10)),
    ]).then(([d, l]) => {
      if (vivant) setActus([...((d.data as any[]) || []), ...((l.data as any[]) || []).map(x => ({ title: x.title, news_type: "loi", published_at: x.promulgated_at }))]);
    });
    return () => { vivant = false; };
  }, [ouvert, userId]);

  // La fenêtre occupe l'écran : la page derrière ne doit pas défiler sous le doigt.
  useEffect(() => {
    if (!ouvert) return;
    const avant = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = avant; };
  }, [ouvert]);

  const nomDept = DEPTS.find(d => d.id === departement)?.name || "";
  // Ville ou code postal saisis : département et région se remplissent seuls.
  const commune = useCommuneAuto(ville, codePostal, c => {
    if (!ville.trim()) setVille(c.nom);
    if (!/^\d{5}$/.test(codePostal.trim()) && c.codesPostaux.length === 1) setCodePostal(c.codesPostaux[0]);
    const d = DEPTS.find(x => x.id.toUpperCase() === c.codeDep.toUpperCase())?.id; if (d) setDepartement(d);
    if (REGIONS.includes(c.region)) setRegion(c.region);
  });

  // Les élus du département choisi : le premier suivi utile, sans avoir à connaître leur nom.
  useEffect(() => {
    if (!ouvert || !departement) { setElusLocaux([]); return; }
    let vivant = true;
    const colonnes = "id, slug, first_name, last_name, party";
    Promise.all([
      supabase.from("deputies").select(colonnes).eq("sitting", true).eq("department", nomDept).order("last_name"),
      supabase.from("senators").select(colonnes).eq("sitting", true).eq("department_code", departement).order("last_name"),
    ]).then(([d, s]) => {
      if (!vivant) return;
      setElusLocaux([...(d.data || []).map((x: any) => ({ ...x, kind: "depute" as const })), ...(s.data || []).map((x: any) => ({ ...x, kind: "senateur" as const }))]);
    });
    return () => { vivant = false; };
  }, [ouvert, departement, nomDept]);

  useEffect(() => {
    const q = recherche.replace(/[,()*%\\]/g, " ").trim();
    if (q.length < 2) { setTrouves([]); return; }
    let vivant = true;
    const t = setTimeout(() => {
      const colonnes = "id, slug, first_name, last_name, party";
      Promise.all([
        supabase.from("deputies").select(colonnes).eq("sitting", true).ilike("last_name", `%${q}%`).limit(6),
        supabase.from("senators").select(colonnes).eq("sitting", true).ilike("last_name", `%${q}%`).limit(6),
      ]).then(([d, s]) => {
        if (vivant) setTrouves([...(d.data || []).map((x: any) => ({ ...x, kind: "depute" as const })), ...(s.data || []).map((x: any) => ({ ...x, kind: "senateur" as const }))]);
      });
    }, 300);
    return () => { vivant = false; clearTimeout(t); };
  }, [recherche]);

  const basculerElu = async (e: Elu) => {
    const cle = `${e.kind}:${e.id}`;
    const suivi = suivis.has(cle);
    setSuivis(s => { const n = new Set(s); if (suivi) n.delete(cle); else n.add(cle); return n; });
    try {
      if (e.kind === "depute") await (suivi ? api.unfollowDeputy(userId, e.id) : api.followDeputy(userId, e.id));
      else await (suivi ? api.unfollowSenator(userId, e.id) : api.followSenator(userId, e.id));
    } catch {
      // Refusé par le serveur : on rétablit l'état réel plutôt que d'afficher un suivi inexistant.
      setSuivis(s => { const n = new Set(s); if (suivi) n.add(cle); else n.delete(cle); return n; });
    }
  };
  const basculerCandidat = (c: FollowedCandidate) => { toggleFollowCandidate(c); setCandidatsSuivis(getFollowedCandidates()); };

  const profilSujets = useMemo(() => sujetsDuProfil(sujets, situation, age), [sujets, situation, age]);
  const concernes = useMemo(() => (actus ?? [])
    .filter(a => importanceDe(a.news_type) >= 4 && !acteIndividuel(a.title))
    .map(a => ({ ...a, sujets: sujetsTouches(a.title, profilSujets) }))
    .filter(a => a.sujets.length)
    .sort((a, b) => importanceDe(b.news_type) - importanceDe(a.news_type) || String(b.published_at).localeCompare(String(a.published_at))) as Actu[], [actus, profilSujets]);

  const enregistrer = async () => {
    setEnCours(true);
    try {
      await api.saveUserPreferences(userId, {
        age_range: age || null, profession: situation || null,
        city: ville.trim() || null, department: departement || null, region: region || null, postal_code: codePostal.trim() || null,
        perimetre, interests: sujets, notify_email: notifier, email_min_importance: Number(seuil),
      });
    } catch { /* tout reste modifiable dans « Alertes & réglages » */ }
    setEnCours(false);
  };
  const suivant = async () => { await enregistrer(); setEtape(e => Math.min(e + 1, ETAPES.length - 1)); };
  const terminer = async () => {
    await enregistrer();
    try { localStorage.setItem(CLE_FAIT, new Date().toISOString()); } catch {}
    onFermer();
  };
  const plusTard = () => { try { localStorage.setItem(CLE_FAIT, "plus-tard"); } catch {} onFermer(); };

  const e = ETAPES[etape];
  const derniere = etape === ETAPES.length - 1;

  const ligneElu = (x: Elu) => {
    const on = suivis.has(`${x.kind}:${x.id}`);
    return (
      <button key={`${x.kind}:${x.id}`} type="button" onClick={() => basculerElu(x)} aria-pressed={on}
        className={`flex items-center justify-between gap-2 rounded-2xl px-3 py-2.5 text-left text-[13px] font-semibold transition ${on ? "bg-amber-400/15 text-white ring-1 ring-amber-400/40" : "bg-white/[0.04] text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"}`}>
        <span className="min-w-0">
          <span className="block truncate">{x.first_name} {x.last_name}</span>{" "}
          <span className="block truncate text-[11px] font-medium text-white/50">{x.kind === "depute" ? "Député·e" : "Sénateur·rice"}{x.party ? ` · ${x.party}` : ""}</span>
        </span>{" "}
        {on && <Check size={15} className="shrink-0 text-amber-300" />}
      </button>
    );
  };

  return (
    <AnimatePresence>
      {ouvert && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/85 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog" aria-modal="true" aria-label="Guide de l'espace Premium"
        >
          <motion.div
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="dark flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-[#0b1020] text-white shadow-2xl sm:h-auto sm:max-h-[88vh] sm:rounded-[2rem] sm:border sm:border-amber-400/20"
          >
            {/* En-tête : où l'on en est */}
            <div className="shrink-0 border-b border-white/10 px-5 pb-4 pt-5 sm:px-7">
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  <e.icone size={13} /> Étape {etape + 1} sur {ETAPES.length}
                </p>{" "}
                <button type="button" onClick={plusTard} aria-label="Fermer le guide"
                  className="rounded-full p-1.5 text-white/50 transition hover:bg-white/10 hover:text-white"><X size={18} /></button>
              </div>{" "}
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {ETAPES.map((x, i) => (
                  <span key={x.id} className={`h-1 flex-1 rounded-full transition-colors ${i <= etape ? "bg-gradient-to-r from-amber-400 to-orange-500" : "bg-white/10"}`} />
                ))}
              </div>
            </div>{" "}

            {/* Corps */}
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
              {charge ? (
                <div className="flex justify-center py-16"><Loader2 className="animate-spin text-amber-300" /></div>
              ) : (
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={e.id} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -14 }} transition={{ duration: 0.16 }}>

                    {e.id === "accueil" && (
                      <div>
                        <h2 className="font-staatliches text-4xl uppercase leading-none tracking-tight">Bienvenue dans <span className="text-amber-300">votre espace Premium</span></h2>{" "}
                        <p className="mt-3 text-[15px] leading-relaxed text-white/75">
                          Deux minutes pour dire au site ce qui vous intéresse. Ensuite, il travaille seul : vos alertes suivent vos élus, vos sujets et votre territoire.
                        </p>{" "}
                        <ul className="mt-6 space-y-3">
                          {[
                            [Vote, "Vos élus, vote par vote", "Suivez vos députés et sénateurs : une alerte à chacun de leurs votes, expliqué simplement."],
                            [BellRing, "Des alertes qui vous ressemblent", "Selon vos centres d'intérêt, votre commune et votre département, sur le site et par e-mail."],
                            [Scale, "Tout comprendre, sans limite", "L'analyse détaillée de chaque loi, le budget de l'État et celui de votre commune, le comparateur de communes."],
                          ].map(([Icone, titre, texte]: any) => (
                            <li key={titre} className="flex items-start gap-3.5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400/15 text-amber-200"><Icone size={18} /></span>{" "}
                              <span>
                                <span className="block font-bold text-white">{titre}</span>{" "}
                                <span className="mt-0.5 block text-[13px] leading-snug text-white/65">{texte}</span>
                              </span>{" "}
                            </li>
                          ))}
                        </ul>{" "}
                        <p className="mt-5 flex items-start gap-2 text-[12px] leading-snug text-white/50">
                          <ShieldCheck size={14} className="mt-0.5 shrink-0 text-amber-300" />{" "}
                          Toutes les réponses sont facultatives, modifiables à tout moment, et ne servent qu&apos;à trier ce que vous recevez.
                        </p>
                      </div>
                    )}{" "}

                    {e.id === "situation" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Votre situation</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Un étudiant et un retraité n&apos;attendent pas les mêmes alertes. Ces réponses complètent les sujets que vous choisirez ensuite.</p>
                        </div>{" "}
                        <Question titre="Vous êtes"><Choix options={SITUATIONS} valeur={situation} onChange={setSituation} /></Question>
                        <Question titre="Votre âge"><Choix options={AGES} valeur={age} onChange={setAge} /></Question>
                      </div>
                    )}{" "}

                    {e.id === "territoire" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Votre territoire</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Pour l&apos;actualité de votre commune, de votre département et de votre région, et pour vous proposer vos élus à l&apos;étape suivante.</p>
                        </div>{" "}
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Ville</span>{" "}
                            <input value={ville} onChange={x => setVille(x.target.value)} placeholder="Nantes" className={champ} autoComplete="address-level2" /></label>{" "}
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Code postal</span>{" "}
                            <input value={codePostal} onChange={x => setCodePostal(x.target.value.replace(/[^0-9]/g, "").slice(0, 5))} placeholder="44000" inputMode="numeric" className={champ} autoComplete="postal-code" /></label>{" "}
                          <PropositionsCommune {...commune} />{" "}
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Département</span>{" "}
                            <select value={departement} onChange={x => setDepartement(x.target.value)} className={champ}>
                              <option value="">Non précisé</option>
                              {DEPTS.map(d => <option key={d.id} value={d.id}>{d.id} · {d.name}</option>)}
                            </select></label>{" "}
                          <label className="block"><span className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-white/55">Région</span>{" "}
                            <select value={region} onChange={x => setRegion(x.target.value)} className={champ}>
                              <option value="">Non précisée</option>
                              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
                            </select></label>
                        </div>{" "}
                        <Question titre="L'actualité locale dans vos alertes" aide="Une commune ne reçoit que ses propres nouvelles : jamais celles de la ville voisine.">
                          <Choix options={PERIMETRES} valeur={perimetre} onChange={v => setPerimetre(v || "national")} />
                        </Question>
                      </div>
                    )}{" "}

                    {e.id === "sujets" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Vos sujets</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Les lois et décrets importants qui touchent ces domaines remontent dans vos alertes, trois par jour au plus. Jamais les nominations ni les actes individuels.</p>
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
                        <p className="text-[12px] text-white/45">{sujets.length ? `${sujets.length} sujet(s) choisi(s).` : "Aucun sujet choisi : vos alertes se limiteront à vos élus, à votre territoire et aux sujets que votre situation implique."}</p>
                      </div>
                    )}{" "}

                    {e.id === "suivis" && (
                      <div className="space-y-6">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Vos élus et candidats</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">Chaque vote d&apos;un élu suivi vous arrive expliqué, même les votes les plus discrets.</p>
                        </div>{" "}
                        {elusLocaux.length > 0 ? (
                          <Question titre={`Vos élus · ${nomDept}`}>
                            <div className="grid max-h-56 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">{elusLocaux.map(ligneElu)}</div>
                          </Question>
                        ) : !departement && (
                          <p className="rounded-2xl bg-white/[0.04] p-3.5 text-[13px] leading-snug text-white/65 ring-1 ring-white/10">
                            Indiquez votre département à l&apos;étape « Votre territoire » pour voir ici vos députés et sénateurs.
                          </p>
                        )}{" "}
                        <Question titre="Chercher un élu par son nom">
                          <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" />
                            <input value={recherche} onChange={x => setRecherche(x.target.value)} placeholder="Député ou sénateur…"
                              className="w-full rounded-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-sm text-white placeholder-white/45 focus:border-amber-400/50 focus:outline-none" />
                          </div>{" "}
                          {trouves.length > 0 && <div className="mt-2 grid gap-1.5 sm:grid-cols-2">{trouves.map(ligneElu)}</div>}
                          {recherche.trim().length >= 2 && !trouves.length && <p className="mt-2 text-[12px] text-white/45">Aucun élu en fonction à ce nom.</p>}
                        </Question>{" "}
                        {candidats.length > 0 && (
                          <Question titre="Candidats à la présidentielle" aide="Leur actualité dans votre espace. Ce choix est gardé sur cet appareil.">
                            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto pr-1">
                              {candidats.map(c => {
                                const on = candidatsSuivis.some(s => s.id === c.id);
                                return (
                                  <button key={c.id} type="button" onClick={() => basculerCandidat(c)} aria-pressed={on}
                                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold transition ${on ? "bg-amber-400/20 text-white ring-1 ring-amber-400/40" : "bg-white/[0.06] text-white/75 ring-1 ring-white/10 hover:bg-white/10"}`}>
                                    {c.name}{on && <Check size={13} className="text-amber-300" />}
                                  </button>
                                );
                              })}
                            </div>
                          </Question>
                        )}
                      </div>
                    )}{" "}

                    {e.id === "emails" && (
                      <div className="space-y-5">
                        <div>
                          <h2 className="font-staatliches text-3xl uppercase leading-none tracking-tight">Vos e-mails</h2>{" "}
                          <p className="mt-2 text-sm text-white/65">
                            Un résumé par jour au plus, seulement s&apos;il y a du nouveau, à {email ? <strong className="text-white">{email}</strong> : "l'adresse de votre compte"}. Tout reste visible dans votre fil, même sans e-mail.
                          </p>
                        </div>{" "}
                        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex items-start justify-between gap-4">
                            <span><span className="block font-bold">Recevoir mes alertes par e-mail</span>{" "}<span className="mt-0.5 block text-[13px] text-white/60">Les votes de vos élus partent toujours, quel que soit le niveau choisi.</span></span>{" "}
                            <button type="button" role="switch" aria-checked={notifier} aria-label="Alertes par e-mail" onClick={() => setNotifier(!notifier)}
                              className={`relative h-6 w-11 shrink-0 rounded-full transition ${notifier ? "bg-amber-500" : "bg-white/15"}`}>
                              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${notifier ? "left-[22px]" : "left-0.5"}`} />
                            </button>
                          </div>{" "}
                          {notifier && <div className="mt-3.5"><Choix options={IMPORTANCES} valeur={seuil} onChange={v => setSeuil(v || seuil)} /></div>}
                        </div>{" "}

                        {/* La preuve par l'exemple : ce que ces réponses auraient fait remonter. */}
                        <div className="rounded-3xl border border-amber-400/25 bg-amber-400/[0.06] p-4 sm:p-5">
                          <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-200">
                            <BellRing size={13} /> Avec ce profil, ces 14 derniers jours
                          </p>{" "}
                          {actus === null ? (
                            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-amber-300" /></div>
                          ) : concernes.length ? (
                            <>
                              <p className="mt-2 text-sm text-white/80">
                                <strong className="text-white">{concernes.length} loi{concernes.length > 1 ? "s" : ""} ou décret{concernes.length > 1 ? "s" : ""}</strong> touchai{concernes.length > 1 ? "ent" : "t"} vos sujets, en plus des votes de vos élus et de votre territoire. Par exemple :
                              </p>{" "}
                              <ul className="mt-3 space-y-2.5">
                                {concernes.slice(0, 3).map(a => (
                                  <li key={`${a.title}|${a.published_at}`} className="rounded-2xl bg-black/25 p-3.5">
                                    <p className="text-sm font-bold leading-snug text-white">{a.title}</p>{" "}
                                    <p className="mt-1 text-[12px] font-bold text-amber-200">Pour vous : {a.sujets.join(", ")}</p>
                                  </li>
                                ))}
                              </ul>
                            </>
                          ) : (
                            <p className="mt-2 text-sm leading-relaxed text-white/75">
                              {profilSujets.length
                                ? "Aucune loi ni aucun décret important n'a touché vos sujets ces deux dernières semaines. C'est normal : vous ne recevez rien quand rien ne vous concerne."
                                : "Vous n'avez encore choisi aucun sujet : revenez à l'étape « Vos sujets » pour recevoir l'actualité qui vous intéresse."}
                            </p>
                          )}
                        </div>{" "}

                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Et maintenant, ce que Premium débloque</p>{" "}
                          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                            {[
                              [Scale, "L'analyse de chaque loi", "/lois"],
                              [BarChart3, "Le budget de l'État", "/executif/plf"],
                              [Building2, "Budget de votre commune", "/local"],
                              [MapPin, "Comparateur de communes", "/local/comparateur"],
                              [Landmark, "Tous les sénateurs", "/senateurs"],
                              [Mic, "Auditions des ministres", "/executif"],
                            ].map(([Icone, label, href]: any) => (
                              <Link key={href} href={href} onClick={terminer}
                                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-sm font-bold text-white transition hover:border-amber-400/40 hover:bg-white/[0.08]">
                                <Icone size={17} className="shrink-0 text-amber-300" />{" "}
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
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-950 shadow-lg shadow-amber-500/30 transition hover:brightness-110 disabled:opacity-60">
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

/** Le guide a-t-il déjà été vu sur cet appareil ? */
export function tutorielPremiumDejaVu(): boolean {
  try { return !!localStorage.getItem(CLE_FAIT); } catch { return true; }
}
