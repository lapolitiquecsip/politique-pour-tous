
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Landmark, ExternalLink, Info, CheckCircle2, XCircle, MinusCircle, AlertCircle, Layers, Lock, Star } from 'lucide-react';
import { usePremium } from "@/lib/hooks/usePremium";
import { groupLabel } from "@/lib/legislative-groups";
import { api } from "@/lib/api";
import Link from 'next/link';

interface VoteDetailsModalProps {
  vote: any;
  onClose: () => void;
}

const getVoteDisplay = (position: string) => {
  switch (position) {
    case 'POUR':
      return { label: 'POUR', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 };
    case 'CONTRE':
      return { label: 'CONTRE', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', icon: XCircle };
    case 'ABSTENTION':
      return { label: 'ABSTENTION', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', icon: MinusCircle };
    default:
      return { label: 'NON VOTANT', color: 'text-muted-foreground', bg: 'bg-muted dark:bg-slate-500/10', icon: AlertCircle };
  }
};

const VoteDetailsModal: React.FC<VoteDetailsModalProps> = ({ vote, onClose }) => {
  const { isPremium } = usePremium();
  /**
   * Le résumé, l'analyse et le détail par groupe sont demandés ICI, à l'ouverture.
   *
   * Ils représentaient 712 Ko des 894 Ko chargés d'avance par la fiche du député,
   * pour mille scrutins dont on n'en ouvre qu'un. Le hook est placé avant toute
   * sortie anticipée : un hook appelé conditionnellement casserait le rendu au
   * premier scrutin sans données.
   */
  const [detail, setDetail] = useState<any | null>(null);
  const scrutinId = vote?.scrutins?.id ?? null;

  useEffect(() => {
    setDetail(null);
    if (!scrutinId) return;
    let vivant = true;
    api.getScrutinDetail(String(scrutinId))
      .then(d => { if (vivant) setDetail(d); })
      .catch(() => { /* la fenêtre reste lisible sans le détail */ });
    return () => { vivant = false; };
  }, [scrutinId]);

  if (!vote) return null;

  // Le scrutin de la liste, complété dès que le détail arrive.
  const s = { ...(vote.scrutins ?? {}), ...(detail ?? {}) };
  const detailEnCours = Boolean(scrutinId) && detail === null;
  const voteInfo = getVoteDisplay(vote.position);
  const dateStr = s?.date_scrutin 
    ? new Date(s.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Date inconnue';

  const subVotes = vote.subVotes || [];
  const title = vote.cleanedTitle || s.objet;

  let mattersPart = s?.why_it_matters;
  let detailedPart = null;

  if (s?.why_it_matters && s.why_it_matters.includes("|||DETAILED|||")) {
    const parts = s.why_it_matters.split("|||DETAILED|||");
    mattersPart = parts[0];
    detailedPart = parts[1];
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="relative w-full max-w-2xl max-h-[90vh] bg-card dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-border dark:border-slate-800 overflow-y-auto scrollbar-hide"
        >
          {/* Header Image/Pattern */}
          <div className="h-32 bg-gradient-to-r from-red-600 to-red-800 relative">
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="absolute -bottom-8 left-10 w-16 h-16 rounded-2xl bg-card dark:bg-slate-900 border border-border dark:border-slate-800 flex items-center justify-center shadow-lg">
              <Landmark className="w-8 h-8 text-red-700 dark:text-red-400" />
            </div>
          </div>

          <div className="pt-12 pb-10 px-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                Scrutin n°{s.numero} • {dateStr}
              </span>
              <span className="bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-tighter">
                LOI
              </span>
            </div>

            <h2 className="text-2xl font-black text-foreground dark:text-white mb-6 leading-tight">
              {title}
            </h2>

            <div className="space-y-8">
              {/* Summary Section */}
              {s.summary && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-foreground dark:text-white">
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <Info className="w-4 h-4 text-red-500" />
                    </div>
                    <h3 className="font-bold text-lg">Résumé de la loi</h3>
                  </div>
                  <p className="text-muted-foreground dark:text-slate-400 leading-relaxed italic">
                    {s.summary}
                  </p>
                </div>
              )}

              {/* Why it matters */}
              {mattersPart && (
                <div className="space-y-3 p-6 bg-muted dark:bg-slate-800/50 rounded-2xl border border-border dark:border-slate-800">
                  <h3 className="font-bold text-foreground dark:text-white flex items-center gap-2">
                    <span className="w-2 h-6 bg-red-500 rounded-full" />
                    L'enjeu principal
                  </h3>
                  <p className="text-sm text-muted-foreground dark:text-slate-400">
                    {mattersPart}
                  </p>
                </div>
              )}

              {/* Premium Detailed Summary */}
              {detailedPart && (
                <div className="space-y-3 p-6 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                  <h3 className="font-bold text-foreground dark:text-white flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500" />
                    Ce que propose concrètement la loi
                  </h3>
                  
                  <div className={`relative ${!isPremium ? "select-none" : ""}`}>
                    <p className={`text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed ${!isPremium ? "blur-[5px] opacity-60" : ""}`}>
                      {detailedPart}
                    </p>
                    
                    {!isPremium && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none pb-2">
                        <Link 
                          href="/premium"
                          className="pointer-events-auto flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-5 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all w-max"
                        >
                          <Lock className="w-4 h-4" />
                          Débloquer l'analyse détaillée
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vote Info Card */}
              <div className={`p-6 rounded-3xl ${voteInfo.bg} flex items-center justify-between border border-transparent`}>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Position globale</span>
                  <div className={`flex items-center gap-2 ${voteInfo.color} font-black text-xl italic uppercase`}>
                    <voteInfo.icon className="w-6 h-6" />
                    {voteInfo.label}
                  </div>
                </div>
                {s.dossier_url && (
                  <a 
                    href={s.dossier_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-3 bg-card dark:bg-slate-900 rounded-xl text-xs font-bold text-foreground dark:text-white shadow-sm hover:shadow-md transition-all border border-border dark:border-slate-800"
                  >
                    Dossier Officiel <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* RÉSULTAT DU SCRUTIN, tous groupes confondus.
                  Le détail par groupe répondait à « qui a voté quoi » sans jamais
                  répondre à « combien » : il manquait le chiffre que tout le monde
                  cherche d'abord. Il ne se calcule pas en additionnant les groupes
                  — leur ligne porte l'effectif du groupe, pas le nombre de votants
                  — mais se lit directement dans le scrutin officiel. */}
              {(() => {
                const pour = Number(s?.pour ?? 0);
                const contre = Number(s?.contre ?? 0);
                const abst = Number(s?.abstention ?? 0);
                const nonVotants = Number(s?.non_votant ?? 0);
                const exprimes = pour + contre + abst;
                if (!exprimes) return null;
                const part = (n: number) => `${((n / exprimes) * 100).toFixed(0)} %`;
                return (
                  <div className="space-y-3 pt-4">
                    <div className="flex items-center gap-2 text-foreground dark:text-white">
                      <Landmark className="w-5 h-5 text-muted-foreground" />
                      <h3 className="font-bold text-lg">Résultat du scrutin</h3>
                    </div>
                    <div className="rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-800/50 p-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        {[
                          ["Pour", pour, "text-emerald-700 dark:text-emerald-400"],
                          ["Contre", contre, "text-rose-700 dark:text-rose-400"],
                          ["Abstentions", abst, "text-amber-700 dark:text-amber-400"],
                        ].map(([libelle, n, teinte]) => (
                          <div key={libelle as string}>
                            <p className={`text-2xl font-black tabular-nums ${teinte}`}>{n as number}</p>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                              {libelle as string}
                            </p>
                            <p className="text-[10px] font-bold text-muted-foreground">{part(n as number)}</p>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 flex h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                        <div className="h-full bg-emerald-500" style={{ width: `${(pour / exprimes) * 100}%` }} />
                        <div className="h-full bg-rose-500" style={{ width: `${(contre / exprimes) * 100}%` }} />
                        <div className="h-full bg-amber-400" style={{ width: `${(abst / exprimes) * 100}%` }} />
                      </div>
                      <p className="mt-2.5 text-[11px] text-muted-foreground">
                        <strong className="text-foreground dark:text-white">{exprimes}</strong> suffrages exprimés
                        {nonVotants > 0 && <> · {nonVotants} non‑votant{nonVotants > 1 ? "s" : ""}</>}
                        {s?.resultat && <> — <span className="italic">{s.resultat}</span></>}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {detailEnCours && (
                <p className="pt-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Chargement du détail par groupe…
                </p>
              )}

              {/* Détail par GROUPE politique : comment chaque groupe a voté sur ce scrutin.
                  Permet de situer le vote de l'élu par rapport aux autres groupes. */}
              {Array.isArray(s?.group_results) && s.group_results.length > 0 && (() => {
                const groups = [...s.group_results]
                  .map((g: any) => ({ ...g, name: groupLabel(g.group_id, g.group_name), total: g.total || (g.pour + g.contre + g.abstention) }))
                  .filter((g: any) => g.total > 0)
                  .sort((a: any, b: any) => b.total - a.total);
                return (
                  <div className="space-y-4 pt-4">
                    <div className="flex items-center gap-2 text-foreground dark:text-white">
                      <Landmark className="w-5 h-5 text-blue-500" />
                      <h3 className="font-bold text-lg">Comment a voté chaque groupe</h3>
                    </div>
                    <div className="space-y-2.5">
                      {groups.map((g: any) => {
                        const pour = g.pour || 0, contre = g.contre || 0, abst = g.abstention || 0;
                        const denom0 = pour + contre + abst;
                        const denom = denom0 || 1;
                        return (
                          <div key={g.group_id} className="rounded-2xl border border-border dark:border-slate-800 bg-card dark:bg-slate-800/50 p-3">
                            <div className="mb-1.5 flex items-center justify-between gap-2">
                              <span className="truncate text-xs font-black text-slate-800 dark:text-slate-200">{g.name}</span>
                              {/* `total` est l'EFFECTIF du groupe, pas son nombre de
                                  votants : l'étiquette « 122 votants » en face de
                                  « 0 pour, 2 contre, 14 abst. » était fausse, et le
                                  lecteur pouvait en conclure à une erreur de données. */}
                              <span className="shrink-0 text-[10px] font-bold text-muted-foreground">
                                {denom0} vot{denom0 > 1 ? "ants" : "ant"}{g.total ? ` sur ${g.total}` : ""}
                              </span>
                            </div>
                            <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-white/5">
                              <div className="h-full bg-emerald-500" style={{ width: `${(pour / denom) * 100}%` }} title={`${pour} pour`} />
                              <div className="h-full bg-rose-500" style={{ width: `${(contre / denom) * 100}%` }} title={`${contre} contre`} />
                              <div className="h-full bg-amber-400" style={{ width: `${(abst / denom) * 100}%` }} title={`${abst} abstention`} />
                            </div>
                            <div className="mt-1 flex gap-3 text-[10px] font-bold">
                              <span className="text-emerald-700 dark:text-emerald-400">{pour} pour</span>
                              <span className="text-rose-700 dark:text-rose-400">{contre} contre</span>
                              <span className="text-amber-700 dark:text-amber-400">{abst} abst.</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Résultats officiels par groupe (open data Assemblée nationale).</p>
                  </div>
                );
              })()}

              {/* Sub-votes breakdown */}
              {subVotes.length > 0 && (
                <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-foreground dark:text-white">
                     <Layers className="w-5 h-5 text-blue-500" />
                     <h3 className="font-bold text-lg">Détail par article</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {subVotes.map((sv: any) => {
                      const svDisplay = getVoteDisplay(sv.position);
                      return (
                        <div key={sv.id} className="flex flex-col p-4 rounded-2xl bg-card dark:bg-slate-800 border border-border dark:border-slate-700">
                           <div className="flex items-center justify-between">
                             <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Article {sv.articleLabel}</span>
                             <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${svDisplay.bg} ${svDisplay.color} text-[10px] font-black`}>
                                <svDisplay.icon className="w-3 h-3" />
                                {svDisplay.label}
                             </div>
                           </div>
                           {sv.scrutins?.summary && (
                             <p className="text-xs text-muted-foreground dark:text-slate-400 italic mt-2 leading-relaxed">
                               {sv.scrutins.summary}
                             </p>
                           )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default VoteDetailsModal;
