"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  MapPin,
  Landmark,
  Vote,
  CheckCircle2,
  XCircle,
  Calendar,
  ExternalLink,
  Mail,
  ShieldCheck,
  ChevronDown,
  Quote,
  Users,
  ArrowRight,
  Search
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { usePremium } from "@/lib/hooks/usePremium";
import { getFullPartyName } from "@/lib/party-utils";
import { api } from "@/lib/api";
import LegalStatusModal from "@/components/deputies/LegalStatusModal";
import ActivityRank from "@/components/shared/ActivityRank";
import FollowButton from "@/components/shared/FollowButton";
import ShareButtons from "@/components/shared/ShareButtons";
import RemunerationInfo from "@/components/shared/RemunerationInfo";
import MandateEndedBanner from "@/components/shared/MandateEndedBanner";
import ParallelRoles from "@/components/shared/ParallelRoles";
import StructuredBio from "@/components/shared/StructuredBio";
import InstitutionalRoleBanner from "@/components/shared/InstitutionalRoleBanner";
import InitiativeRank from "@/components/shared/InitiativeRank";

// Extrait d'evidence lisible sur le site : ellipse si le texte a été tronqué (extraits courts).
const cleanExcerpt = (t: string) => {
  const s = (t || "").trim();
  if (!s) return s;
  return /[.!?…»)]$/.test(s) ? s : s + "…";
};

export default function SenatorClient({ senator, embedded }: { senator: any; embedded?: boolean }) {
  const { isPremium } = usePremium();
  const [isBioExpanded, setIsBioExpanded] = useState(true);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [candidateLink, setCandidateLink] = useState<{ slug: string } | null>(null);
  const [partyLink, setPartyLink] = useState<{ slug: string; name: string; logo_url?: string | null } | null>(null);

  useEffect(() => {
    api.findCandidateByName(`${senator.first_name} ${senator.last_name}`).then(c => setCandidateLink(c)).catch(() => {});
    api.findPartyByAlias(senator.party).then(p => setPartyLink(p)).catch(() => {});
  }, [senator.first_name, senator.last_name, senator.party]);

  const isLegalClean = useMemo(() => {
    const issues = senator?.legal_issues || "";
    if (!issues) return true;
    return issues.toLowerCase().includes("aucune") || issues.toLowerCase().includes("casier vierge");
  }, [senator]);

  const name = `${senator.first_name} ${senator.last_name}`;
  // Repères courts (profession + naissance) affichés juste sous le nom, en petit.
  const MOIS_FR = ["janvier","février","mars","avril","mai","juin","juillet","août","septembre","octobre","novembre","décembre"];
  const frBirth = (() => { const m = String(senator.birth_date||"").match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} ${MOIS_FR[+m[2]-1]} ${m[1]}` : null; })();
  const professionShort = senator.profession && !/sans profession/i.test(senator.profession) ? senator.profession : null;
  const headerMeta = [professionShort, frBirth ? `né(e) le ${frBirth}` : null].filter(Boolean).join(" · ");
  // Vrais votes du Sénat (rapprochés par nom + chambre), plus de données factices.
  const [votes, setVotes] = useState<any[]>([]);
  // Brique #3 — filtre thématique des votes du Sénat ("ce qu'il fait" par enjeu).
  const [issues, setIssues] = useState<any[]>([]);
  const [scrutinIssues, setScrutinIssues] = useState<Record<string, string[]>>({});
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [issueQuery, setIssueQuery] = useState("");
  const [positions, setPositions] = useState<Record<string, any>>({}); // "ce qu'il dit" par enjeu
  useEffect(() => {
    api.getSenatorVotes(senator.senate_matricule || null, senator.first_name, senator.last_name, 1000)
      .then((v: any[]) => {
        setVotes(v);
        api.getScrutinIssues(v.map(x => x?.scrutin_id).filter(Boolean)).then(setScrutinIssues).catch(() => {});
      })
      .catch(() => setVotes([]));
    api.getIssues().then(setIssues).catch(() => {});
    if (senator.slug) api.getEntityPositions("senator", senator.slug).then(setPositions).catch(() => {});
  }, [senator.senate_matricule, senator.first_name, senator.last_name, senator.slug]);

  const normTxt = (s: string) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const issueMatches = (i: any, q: string) => {
    const n = normTxt(q).trim();
    if (!n) return true;
    return normTxt(i.title).includes(n) || (i.keywords || []).some((k: string) => normTxt(k).includes(n));
  };
  const issueChip = (active: boolean) =>
    `px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${active ? "bg-amber-600 text-white border-amber-600 shadow-lg" : "bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-amber-500"}`;
  const presentIssues = useMemo(() => {
    const count: Record<string, number> = {};
    for (const v of votes) for (const s of scrutinIssues[String(v.scrutin_id)] || []) count[s] = (count[s] || 0) + 1;
    return issues.filter(i => count[i.slug]).map(i => ({ ...i, count: count[i.slug] })).sort((a, b) => b.count - a.count);
  }, [votes, scrutinIssues, issues]);
  const filteredVotes = useMemo(
    () => votes.filter(v => !selectedIssue || (scrutinIssues[String(v.scrutin_id)] || []).includes(selectedIssue)),
    [votes, scrutinIssues, selectedIssue]
  );
  // Pré-sélection d'un sujet par défaut → parole vs actes visible sans action.
  const [autoPicked, setAutoPicked] = useState(false);
  useEffect(() => {
    if (autoPicked || presentIssues.length === 0) return;
    const withParole = presentIssues.find(i => positions[i.slug]);
    setSelectedIssue((withParole || presentIssues[0]).slug);
    setAutoPicked(true);
  }, [presentIssues, positions, autoPicked]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
      {/* Header Navigation */}
      {!embedded && (
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-amber-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link
            href="/senateurs"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-amber-600 transition-colors group"
          >
            <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Retour au Sénat
          </Link>
          <div className="flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Profil Officiel Sénat</span>
          </div>
        </div>
      </div>
      )}

      <div className="container mx-auto px-4 pt-6 md:pt-12 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-8 lg:gap-12">

          {/* LEFT COLUMN: Profile Card */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1 space-y-4 md:space-y-6"
          >
            <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[2.5rem] border border-amber-200 dark:border-slate-800 overflow-hidden shadow-xl md:shadow-2xl relative">
              <div className="absolute top-4 right-4 z-10 hidden md:block">
                 <div className="bg-amber-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg">Premium Exclusive</div>
              </div>

              {/* MOBILE : en-tête compact — petite photo RONDE cadrée sur le visage + nom. */}
              <div className="flex items-center gap-4 p-5 md:hidden">
                <img
                  src={senator.photo_url}
                  alt={name}
                  className="h-20 w-20 shrink-0 rounded-full object-cover object-top ring-2 ring-amber-300 dark:ring-slate-700"
                />
                <div className="min-w-0">
                  <h1 className="text-2xl font-staatliches uppercase leading-none tracking-tight text-slate-900 dark:text-white">{name}</h1>
                  <p className="mt-1.5 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    <Landmark className="w-3 h-3" /> Membre du Sénat
                  </p>
                  {headerMeta && <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400 first-letter:uppercase">{headerMeta}</p>}
                </div>
              </div>

              {/* DESKTOP : grande photo immersive (inchangée). */}
              <div className="relative hidden aspect-[4/5] bg-slate-200 dark:bg-slate-800 md:flex items-center justify-center overflow-hidden">
                <img
                  src={senator.photo_url}
                  alt={name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-8 left-8 right-8">
                  <h1 className="text-4xl font-staatliches text-white tracking-tight uppercase leading-none mb-2">
                    {name}
                  </h1>
                  <p className="text-amber-400 font-bold tracking-widest text-xs uppercase flex items-center gap-2">
                    <Landmark className="w-3 h-3" />
                    Membre du Sénat
                  </p>
                  {headerMeta && <p className="mt-1.5 text-xs text-white/75 first-letter:uppercase">{headerMeta}</p>}
                </div>
              </div>

              <div className="p-5 md:p-8 space-y-4 md:space-y-6">
                 {(() => {
                   const inner = (
                     <>
                       {partyLink?.logo_url ? (
                         // eslint-disable-next-line @next/next/no-img-element
                         <img src={partyLink.logo_url} alt={partyLink.name} className="w-12 h-12 rounded-2xl object-contain bg-white p-1 shrink-0 shadow-lg ring-1 ring-slate-200 dark:ring-slate-700" />
                       ) : (
                         <div className="w-12 h-12 rounded-2xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-amber-500/20">
                           <Users className="w-6 h-6" />
                         </div>
                       )}
                       <div className="min-w-0">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Groupe Politique</p>
                         <p className="font-bold text-slate-900 dark:text-white truncate">
                           {getFullPartyName(senator.party)}
                         </p>
                         {partyLink && (
                           <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 inline-flex items-center gap-1 mt-1.5 bg-amber-50 px-2 py-1 rounded-lg group-hover/party:bg-amber-100 transition-colors">Voir la fiche du parti <ArrowRight className="w-3 h-3" /></span>
                         )}
                       </div>
                     </>
                   );
                   return partyLink ? (
                     <Link href={`/partis/${partyLink.slug}`} className="flex items-center gap-4 p-4 rounded-3xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 transition hover:border-amber-400 group/party">
                       {inner}
                     </Link>
                   ) : (
                     <div className="flex items-center gap-4 p-4 rounded-3xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700">
                       {inner}
                     </div>
                   );
                 })()}

                <RemunerationInfo mode="parlementaire" />

                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 rounded-2xl md:rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700">
                   <div className="w-9 h-9 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-blue-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/20">
                     <MapPin className="w-[18px] h-[18px] md:w-6 md:h-6" />
                   </div>
                   <div className="min-w-0">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Représentation</p>
                     <p className="font-bold text-slate-900 dark:text-white truncate">
                       {senator.department}
                     </p>
                   </div>
                </div>
              </div>
            </div>

            {/* Fil conducteur : candidat·e à la présidentielle 2027 */}
            {candidateLink && (
              <Link
                href={`/presidentielles-2027/?candidat=${candidateLink.slug}`}
                className="block rounded-[2rem] p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-600/20 relative overflow-hidden group transition-all hover:-translate-y-1"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-10 -mt-10 blur-2xl" />
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/70 mb-1">Présidentielle 2027</p>
                <h4 className="text-lg font-bold leading-tight mb-3">Candidat·e à l&apos;élection présidentielle</h4>
                <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-widest bg-white/15 px-4 py-2 rounded-xl group-hover:bg-white/25 transition-colors">
                  Voir la fiche candidat·e <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </Link>
            )}

            {/* Integrity Badge Section */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] p-4 md:p-6 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group transition-all duration-500"
            >
               <div className={`absolute top-0 left-0 w-1.5 md:w-2 h-full transition-colors duration-500 ${isLegalClean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
               <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Intégrité & Transparence</p>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">Historique Juridique</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isLegalClean ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isLegalClean ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {isLegalClean ? 'Dossier Vierge' : 'Données à consulter'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowLegalModal(true)}
                    className={`flex shrink-0 items-center gap-2 px-3.5 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all transform active:scale-95 shadow-lg border ${
                      isLegalClean 
                        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500 hover:text-white shadow-emerald-500/10' 
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500 hover:text-white shadow-amber-500/10'
                    }`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Consulter
                  </button>
               </div>
            </motion.div>

            {(senator?.email || senator?.senate_matricule) && (() => {
              const contactHref = senator?.email ? `mailto:${senator.email}` : `https://www.senat.fr/senateur/${senator.senate_matricule}.html`;
              const ext = !senator?.email;
              return (
              <>
                {/* MOBILE : bouton compact « Contact » (icône + mot), pas de gros pavé. */}
                <a href={contactHref} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-amber-600 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-lg shadow-amber-600/20 transition hover:bg-amber-700 md:hidden">
                  <Mail className="w-4 h-4" /> Contact
                </a>
                {/* DESKTOP : bloc complet (inchangé). */}
                <div className="hidden bg-amber-600 rounded-3xl p-8 text-white shadow-xl shadow-amber-600/20 md:block">
                  <h4 className="text-xl font-staatliches uppercase mb-4 tracking-tight">Contact Sénat</h4>
                  <p className="text-sm opacity-90 leading-relaxed mb-6">
                    Vous pouvez contacter ce sénateur pour toute question relative à l&apos;activité législative.
                  </p>
                  <a href={contactHref} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="w-full py-4 rounded-2xl bg-white text-amber-600 font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                    {ext ? <ExternalLink className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                    {ext ? "Sa fiche au Sénat" : "Envoyer un message"}
                  </a>
                </div>
              </>
              );
            })()}
          </motion.div>

          {/* RIGHT COLUMN: Biography & Votes */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-5 md:space-y-10"
          >
            {senator.sitting === false && <MandateEndedBanner role="sénateur·rice" name={`${senator.first_name ?? ""} ${senator.last_name ?? ""}`.trim()} />}
            <div className="flex flex-wrap items-center gap-3">
              <FollowButton kind="senator" id={String(senator.id)} label="ce sénateur" />
              <ShareButtons title={`${senator.first_name ?? ""} ${senator.last_name ?? ""}`.trim() || "Fiche du sénateur"} />
            </div>

            {/* Fonction institutionnelle (Président·e / Vice-président·e / président·e de commission). */}
            <InstitutionalRoleBanner fullName={name} bio={senator.bio} />

            <InitiativeRank kind="senator" selfId={String(senator.id)} primary={senator.initiative_primary_count} cosigned={senator.initiative_count} peerLabel="sénateurs" />

            {/* Présence aux votes — comparaison entre sénateurs (scrutins publics du Sénat). */}
            <ActivityRank
              kind="senator" rate={senator.participation_rate} selfId={String(senator.id)}
              peerLabel="sénateurs"
              participated={senator.votes_participated} total={senator.votes_total}
              note="Participation aux scrutins publics du Sénat (position exprimée). Comparaison entre sénateurs pour situer l'assiduité de chacun·e. Source : Sénat (open data)."
            />

            {/* Biography Section */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl md:rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden group pb-2">
              <button
                onClick={() => setIsBioExpanded(!isBioExpanded)}
                className="w-full text-left p-5 md:px-12 md:py-10 relative z-10 flex items-center justify-between"
              >
                <div className="flex flex-row items-center gap-3 md:gap-6">
                  <div className="w-12 h-12 rounded-xl bg-amber-600 flex items-center justify-center text-white shrink-0 shadow-lg">
                    <Quote className="w-6 h-6 opacity-50" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white leading-none">
                      Portrait & <span className="text-amber-600">Engagement</span>
                    </h3>
                  </div>
                </div>
                <ChevronDown className={`w-6 h-6 transition-transform ${isBioExpanded ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isBioExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden px-5 pb-6 md:px-12 md:pb-10"
                  >
                    <StructuredBio bio={senator.bio} fallbackText={senator.biography} />

                    {/* Repères officiels — données du Sénat (ODSEN). Profession & naissance sont
                        remontées sous l'en-tête ; ici on garde le groupe et la commission. */}
                    {(senator.senate_group || senator.committee) && (() => {
                      const items: Array<{ k: string; v: string | null }> = [
                        { k: "Groupe au Sénat", v: senator.senate_group || null },
                        { k: "Commission", v: senator.committee || null },
                      ].filter(i => i.v);
                      return (
                        <div className="mt-6">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">Repères officiels</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {items.map((i, k) => (
                              <div key={k} className="rounded-2xl border border-slate-100 bg-white dark:bg-slate-900 dark:border-slate-800 p-4">
                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{i.k}</p>
                                <p className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white capitalize">{i.v}</p>
                              </div>
                            ))}
                          </div>
                          <p className="mt-3 text-[10px] italic text-slate-400">Source : Sénat (open data ODSEN).</p>
                        </div>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Toutes les fonctions de la personne — juste sous « Portrait & Engagement ». */}
            <ParallelRoles fullName={name} selfHref={`/senateurs/${senator.slug}`} />

            {/* Votes Section */}
            <div>
              <h2 className="text-4xl font-staatliches uppercase tracking-tight text-slate-900 dark:text-white mb-6">
                <span className="text-amber-600">Votes</span>
              </h2>

              {/* FILTRE THÉMATIQUE — "ce qu'il fait" par sujet (via scrutin_issues) */}
              {presentIssues.length > 0 && (
                <div className="space-y-4 mb-8">
                  <div className="relative max-w-md">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      value={issueQuery}
                      onChange={(e) => setIssueQuery(e.target.value)}
                      placeholder="Filtrer les votes par sujet (retraites, ukraine, climat…)"
                      className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-amber-500 outline-none text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => setSelectedIssue(null)} className={issueChip(!selectedIssue)}>Tous les sujets</button>
                    {presentIssues.filter(i => issueMatches(i, issueQuery)).map(i => (
                      <button key={i.slug} onClick={() => setSelectedIssue(selectedIssue === i.slug ? null : i.slug)} className={issueChip(selectedIssue === i.slug)}>
                        {i.title} <span className="opacity-60">· {i.count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* PAROLE vs ACTES — "ce qu'il DIT" (questions écrites Sénat) sur le sujet choisi */}
              {selectedIssue && (() => {
                const pos = positions[selectedIssue];
                const label = (issues.find(i => i.slug === selectedIssue)?.title) || "ce sujet";
                const STANCE: Record<string, { txt: string; cls: string }> = {
                  pour: { txt: "Plutôt favorable", cls: "bg-emerald-100 text-emerald-700" },
                  contre: { txt: "Plutôt opposé", cls: "bg-red-100 text-red-700" },
                  nuance: { txt: "Position nuancée", cls: "bg-amber-100 text-amber-700" },
                  inconnu: { txt: "Position non tranchée", cls: "bg-slate-100 text-slate-600" },
                };
                const st = STANCE[pos?.stance] || STANCE.inconnu;
                return (
                  <div className="mb-8 rounded-[2rem] border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <span className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-600"><Quote className="h-4 w-4" /> Ce qu'il·elle dit — {label}</span>
                      {pos && <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${st.cls}`}>{st.txt}</span>}
                    </div>
                    {pos ? (
                      <>
                        {pos.summary && <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">{pos.summary}</p>}
                        {Array.isArray(pos.evidence) && pos.evidence.length > 0 && (
                          <ul className={`${pos.summary ? "mt-3" : ""} space-y-1.5`}>
                            {pos.evidence.slice(0, 6).map((e: any, i: number) => (
                              <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-400">
                                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                                {/* Extrait lisible directement sur le site (pas de lien sortant). */}
                                <span>{cleanExcerpt(e.excerpt)}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Source : questions écrites (open data Sénat)</p>
                      </>
                    ) : (
                      <p className="text-sm italic text-slate-500">Aucune prise de parole recensée sur ce sujet (questions écrites, 12 derniers mois). Son <span className="font-bold">action</span> reste visible ci-dessous via ses votes.</p>
                    )}
                  </div>
                );
              })()}

              <div className="space-y-4">
                {votes.length === 0 && (
                  <div className="rounded-[2rem] border border-dashed border-slate-200 bg-white p-8 text-center text-sm italic text-slate-400">
                    Aucun scrutin public récent au Sénat pour cet élu, ou vote non encore synchronisé.
                  </div>
                )}
                {votes.length > 0 && filteredVotes.length === 0 && (
                  <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Aucun vote sur ce sujet.</div>
                )}
                {filteredVotes.map((vote: any) => (
                  <div
                    key={vote.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2rem] p-6 group hover:border-amber-500 transition-all"
                  >
                    <div className="flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 flex items-center gap-6">
                         <div className="w-14 h-14 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                            <Vote className="w-6 h-6" />
                         </div>
                         <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{vote.date}</p>
                            <h4 className="text-xl font-bold">{vote.title}</h4>
                         </div>
                      </div>
                      <div className={`px-6 py-3 rounded-xl ${vote.bg} ${vote.color} font-black text-sm shrink-0`}>
                         VOTE : {vote.vote}
                      </div>
                    </div>
                    {/* Résumé DeepSeek : de quoi parle le texte, pour comprendre le vote. */}
                    {vote.explanation && (
                      <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 p-4 md:ml-20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-1">En clair</p>
                        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">{vote.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>
      </div>

      <LegalStatusModal 
        isOpen={showLegalModal} 
        onClose={() => setShowLegalModal(false)} 
        deputy={senator} 
      />
    </div>
  );
}
