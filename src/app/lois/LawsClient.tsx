"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Leaf, 
  Shield, 
  TrendingUp, 
  HeartPulse, 
  Users, 
  GraduationCap,
  Lock,
  Sparkles,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Calendar as CalendarIcon,
  Vote,
  X,
  ChevronRight,
  Search,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { usePremium } from "@/lib/hooks/usePremium";
import { getPremiumUrl } from "@/lib/utils";
import DetailedLawDossier from "@/components/laws/DetailedLawDossier";
import { FREE_LAWS } from "@/data/free-laws-dossiers";
import { api } from "@/lib/api";
import VoteHemicycle from "@/components/laws/VoteHemicycle";
import UniversalLawModal from "@/components/laws/UniversalLawModal";
import LawsGrid from "@/components/laws/LawsGrid";

const CATEGORIES = [
  { id: "edu", label: "Éducation", bgColor: "bg-indigo-500", hoverColor: "hover:bg-indigo-400", color: "indigo", isFree: true },
  { id: "env", label: "Écologie", matchCategory: "Environnement", bgColor: "bg-emerald-500", hoverColor: "hover:bg-emerald-400", color: "emerald" },
  { id: "eco", label: "Économie", bgColor: "bg-blue-500", hoverColor: "hover:bg-blue-400", color: "blue" },
  { id: "sec", label: "Sécurité", bgColor: "bg-slate-800", hoverColor: "hover:bg-slate-700", color: "slate" },
  { id: "health", label: "Santé", bgColor: "bg-rose-500", hoverColor: "hover:bg-rose-400", color: "rose" },
  { id: "social", label: "Social", bgColor: "bg-orange-500", hoverColor: "hover:bg-orange-400", color: "orange" },
];

export default function LawsClient() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LawsClientContent />
    </Suspense>
  );
}

function LawsClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'promulgated' | 'votes' | 'proposals'>('promulgated');
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const { isPremium, loading: pLoading, userId } = usePremium();
  const [dbLaws, setDbLaws] = useState<any[]>([]);
  const [loadingLaws, setLoadingLaws] = useState(true);
  const [selectedLaw, setSelectedLaw] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [premiumDossiers, setPremiumDossiers] = useState<any[]>([]);
  const [loadingDossiers, setLoadingDossiers] = useState(false);

  useEffect(() => {
    const loadLaws = async () => {
      const data = await api.getVotedLaws(1000);
      setDbLaws(data);
      setLoadingLaws(false);
    };
    loadLaws();
    
    const interval = setInterval(async () => {
      const data = await api.getVotedLaws(1000);
      setDbLaws(data);
    }, 300000); // 5 minutes polling
    
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, selectedCat, searchQuery]);

  useEffect(() => {
    const loadDossiers = async () => {
      setLoadingDossiers(true);
      const catLabel = selectedCat ? (CATEGORIES.find(c => c.id === selectedCat)?.matchCategory || CATEGORIES.find(c => c.id === selectedCat)?.label) : null;
      const data = await api.getPremiumDossiers(catLabel);
      setPremiumDossiers(data);
      setLoadingDossiers(false);
    };
    if (activeTab === 'promulgated' || activeTab === 'votes') {
      loadDossiers();
    }
  }, [activeTab, selectedCat]);

  // Handle direct link to a law
  useEffect(() => {
    const lawId = searchParams.get('id');
    if (lawId) {
      const loadSpecificLaw = async () => {
        // Try to fetch as a proposal (law) first
        let law = await api.getLaw(lawId);
        
        // If not found, try to fetch as a voted law (scrutin)
        if (!law) {
          law = await api.getScrutin(lawId);
        }

        if (law) {
          setSelectedLaw(law);
          // If the law is a proposal, switch to that tab for context
          if (law.id.toString().startsWith('PA') || (typeof law.id === 'string' && law.id.length > 10) || law.title) {
             // Proposals usually have 'title' instead of 'objet'
             // And their IDs often start with PA (National Assembly)
             if (law.objet) {
               setActiveTab('promulgated');
             } else {
               setActiveTab('proposals');
             }
          } else {
             setActiveTab('promulgated');
          }
        }
      };
      loadSpecificLaw();
    }
  }, [searchParams]);

  const scrollToPremium = () => {
    const element = document.getElementById("premium-section");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="container mx-auto max-w-6xl px-4 pb-24">
      <UniversalLawModal 
        law={selectedLaw} 
        isOpen={!!selectedLaw} 
        onClose={() => setSelectedLaw(null)} 
        onNext={() => {
          const idx = dbLaws.findIndex(l => l.id === selectedLaw?.id);
          if (idx !== -1 && idx < dbLaws.length - 1) setSelectedLaw(dbLaws[idx + 1]);
        }}
        onPrevious={() => {
          const idx = dbLaws.findIndex(l => l.id === selectedLaw?.id);
          if (idx !== -1 && idx > 0) setSelectedLaw(dbLaws[idx - 1]);
        }}
      />

      {/* TABS NAVIGATION (STUCK AT TOP ON SCROLL) */}
      <div className="sticky top-0 z-[50] bg-white/90 backdrop-blur-md py-6 mb-12 border-b border-slate-100 -mx-4 px-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={() => setActiveTab('promulgated')}
            className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'promulgated' 
                ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20 scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300'
            }`}
          >
            <BookOpen size={18} />
            Lois promulguées
          </button>

          <button
            onClick={() => setActiveTab('votes')}
            className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'votes' 
                ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20 scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300'
            }`}
          >
            <Vote size={18} />
            Derniers votes de loi
          </button>

          <button
            onClick={() => setActiveTab('proposals')}
            className={`px-8 py-3 rounded-full font-black uppercase tracking-widest text-xs transition-all duration-300 flex items-center gap-3 ${
              activeTab === 'proposals' 
                ? 'bg-slate-950 text-white shadow-2xl shadow-slate-950/20 scale-105' 
                : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100 hover:border-slate-300'
            }`}
          >
            <FileText size={18} />
            Propositions & Projets
          </button>
        </div>
      </div>
      {activeTab === 'proposals' && (
        <div className="mt-12 mb-32">
          <div className="relative mb-16 text-center md:text-left">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
                <span className="text-slate-900 opacity-10 absolute -top-8 left-0 select-none hidden md:block">EN COURS</span>
                Propositions & <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">Projets de loi</span>
              </h2>
              {selectedCat && (
                <button 
                  onClick={() => setSelectedCat(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <X size={14} /> {CATEGORIES.find(c => c.id === selectedCat)?.label || selectedCat}
                </button>
              )}
            </div>
            <div className="h-1.5 w-24 bg-blue-600 mt-4 rounded-full mx-auto md:mx-0" />
            <p className="text-lg font-bold italic text-slate-500 mt-6 max-w-2xl font-staatliches">
              Consultez les textes déposés et en cours d&apos;examen au Parlement.
            </p>
          </div>
          <LawsGrid onSelectLaw={setSelectedLaw} categoryFilter={CATEGORIES.find(c => c.id === selectedCat)?.label} />
        </div>
      )}
      {activeTab === 'promulgated' && (
        <>
          {/* 1. FILTRES THÉMATIQUES (ULTRA COMPACT BENTO STYLE) */}
      <div className="mb-24">
        <div className="relative mb-10 text-center md:text-left">
          <h3 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
            <span className="text-slate-900 opacity-5 absolute -top-8 left-0 select-none hidden md:block">COLLECTIONS</span>
            Explorez par <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">thématique</span>
          </h3>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-red-600 mt-4 rounded-full mx-auto md:mx-0" />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {CATEGORIES.map((cat) => {
            const isActive = selectedCat === cat.id;
            
            const handleCategoryClick = () => {
              if (cat.isFree || isPremium) {
                if (isActive) {
                  setSelectedCat(null);
                } else {
                  setSelectedCat(cat.id);
                }
              } else {
                scrollToPremium();
              }
            };

            return (
              <button
                key={cat.id}
                onClick={handleCategoryClick}
                className={`group relative flex items-center justify-center p-6 md:p-8 rounded-[1.5rem] transition-all duration-300 shadow-xl overflow-hidden ${
                  isActive 
                    ? `ring-4 ring-offset-4 ring-slate-900 ${cat.bgColor} text-white scale-[1.02]` 
                    : `hover:shadow-2xl hover:-translate-y-2 ${cat.bgColor} ${cat.hoverColor} text-white/90 hover:text-white`
                }`}
              >
                {/* Premium/Libre Badge (kept small and discreet) */}
                <div className="absolute top-3 right-3 md:top-4 md:right-4">
                  {cat.isFree ? (
                    <span className="text-[9px] md:text-[11px] px-2 py-0.5 md:px-3 md:py-1 rounded-full uppercase tracking-widest font-black bg-white/20 text-white backdrop-blur-md">
                      Libre
                    </span>
                  ) : !isPremium ? (
                    <div className="p-1.5 rounded-full bg-white/10 backdrop-blur-md">
                      <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 text-white/70" />
                    </div>
                  ) : null}
                </div>

                <div className="text-center w-full flex justify-center mt-2">
                  <span className="text-4xl sm:text-5xl md:text-5xl lg:text-5xl xl:text-6xl font-staatliches uppercase tracking-wider block leading-none w-full break-words drop-shadow-sm">
                    {cat.label}.
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>


      {/* 3. DOSSIERS GRATUITS ET PREMIUM */}
      <div className="space-y-4 mb-32">
        <div className="relative mb-16 text-center md:text-left">
          <div className="flex items-center gap-4 justify-center md:justify-start">
            <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
              <span className="text-slate-900 opacity-10 absolute -top-8 left-0 select-none hidden md:block">OFFICIEL</span>
              {selectedCat ? `Lois promulguées : ${CATEGORIES.find(c => c.id === selectedCat)?.label}` : "Lois promulguées au Journal Officiel"}
            </h2>
            {selectedCat && (
              <button 
                onClick={() => setSelectedCat(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2"
              >
                <X size={14} /> Réinitialiser
              </button>
            )}
          </div>
          <div className="h-1.5 w-24 bg-gradient-to-r from-blue-600 to-red-600 mt-4 rounded-full mx-auto md:mx-0" />
          <p className="text-lg font-bold italic text-slate-500 mt-6 max-w-2xl font-staatliches">
            {selectedCat ? "Consultez les lois de cette catégorie officiellement actives en France." : "Toutes les lois définitivement adoptées et promulguées, officiellement actives en France."}
          </p>
        </div>

        <div className="relative max-w-xl mb-12">
          <div className="absolute inset-0 bg-slate-900 rounded-2xl translate-x-2 translate-y-2 z-0" />
          <div className="relative z-10 flex items-center bg-white border-4 border-slate-900 rounded-2xl overflow-hidden px-6 py-4 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
            <Search className="w-6 h-6 text-slate-400 mr-4" />
            <input 
              type="text"
              placeholder="Rechercher une loi, un mot-clé (ex: Retraite, Santé...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold placeholder:text-slate-300 placeholder:italic"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery("")}
                className="p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={18} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10">
          {loadingDossiers ? (
             <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-300 col-span-full">
                <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Chargement des dossiers...</p>
             </div>
          ) : (premiumDossiers.length > 0 || FREE_LAWS.length > 0) ? (
            (() => {
              const allPremiumDossiers = premiumDossiers.length > 0 ? premiumDossiers : FREE_LAWS;
              const premiumScrutinIds = allPremiumDossiers.map(p => p.context?.split(':')[1] || p.id).filter(Boolean);
              const filteredDbLaws = dbLaws.filter(law => !premiumScrutinIds.includes(law.id));

              const combinedList = [
                ...allPremiumDossiers.map(law => ({ ...law, sortDate: new Date(law.date_adopted || law.created_at || 0).getTime(), itemType: 'premium' })),
                ...filteredDbLaws.map(law => ({ ...law, sortDate: new Date(law.date_scrutin || 0).getTime(), itemType: 'history' }))
              ].sort((a, b) => b.sortDate - a.sortDate);

              const promulgatedLaws = combinedList.filter(law => {
                let isPromulgated = false;
                if (law.itemType === 'premium') {
                  const scrutinId = law.context?.split(':')[1];
                  const originalScrutin = dbLaws.find(s => s.id === scrutinId);
                  isPromulgated = originalScrutin?.status_detail === 'En application' || law.context?.endsWith(':application') || law.status === 'application';
                } else {
                  isPromulgated = law.status_detail === 'En application';
                }
                return isPromulgated;
              });

              const filteredLaws = promulgatedLaws.filter(law => {
                const searchLower = searchQuery.toLowerCase();
                const title = law.title || law.objet || '';
                const category = law.category || '';
                const summary = law.summary || '';
                return (
                  title.toLowerCase().includes(searchLower) || 
                  summary.toLowerCase().includes(searchLower) ||
                  category.toLowerCase().includes(searchLower)
                );
              });

              if (filteredLaws.length === 0) {
                return (
                  <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-300 col-span-full">
                    <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aucun dossier trouvé pour "{searchQuery}"</p>
                  </div>
                );
              }

              const PAGE_SIZE = 60;
              const totalPages = Math.ceil(filteredLaws.length / PAGE_SIZE);
              const paginatedLaws = filteredLaws.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

              return (
                <>
                  {paginatedLaws.map((law: any, idx: number) => {
                if (law.itemType === 'premium') {
                  let impacts = [];
                  let calendar = [];
                  let premiumPoints = [];
                  
                  if (law.impact || law.timeline || law.content) {
                    try { impacts = typeof law.impact === 'string' ? JSON.parse(law.impact) : (law.impact || []); } catch(e){}
                    try { calendar = typeof law.timeline === 'string' ? JSON.parse(law.timeline) : (law.timeline || []); } catch(e){}
                    try { premiumPoints = typeof law.content === 'string' ? JSON.parse(law.content) : (law.content || []); } catch(e){}

                    const catObj = CATEGORIES.find(c => c.label === law.category || c.matchCategory === law.category);
                    const color = catObj ? catObj.color : ((law.category || '').toLowerCase().includes('institution') ? 'violet' : 'slate');
                    
                    let voteData = null;
                    if (law.scrutin_data) {
                      voteData = {
                        pour: law.scrutin_data.pour,
                        contre: law.scrutin_data.contre,
                        abstention: law.scrutin_data.abstention,
                        group_results: law.scrutin_data.group_results
                      };
                    } else if (law.context?.startsWith('dossier_premium:')) {
                      const scrutinId = law.context.split(':')[1];
                      const originalScrutin = dbLaws.find(s => s.id === scrutinId);
                      if (originalScrutin && (originalScrutin.pour + originalScrutin.contre + originalScrutin.abstention > 0)) {
                        voteData = {
                          pour: originalScrutin.pour,
                          contre: originalScrutin.contre,
                          abstention: originalScrutin.abstention,
                          group_results: originalScrutin.group_results
                        };
                      }
                    }

                    let computedStatus = 'vote';
                    let statusLabel = 'Loi Adoptée';
                    
                    if (law.context?.startsWith('dossier_premium:')) {
                      const scrutinId = law.context.split(':')[1];
                      const originalScrutin = dbLaws.find(s => s.id === scrutinId);
                      if (originalScrutin?.status_detail === 'En application') {
                        computedStatus = 'application';
                        statusLabel = 'En application';
                      }
                    }

                    if (law.context?.endsWith(':application')) {
                      computedStatus = 'application';
                      statusLabel = 'En application';
                    }

                    const formattedLaw = {
                      id: law.id,
                      title: law.title,
                      category: law.category,
                      summary: law.summary,
                      impacts,
                      calendar,
                      premiumPoints,
                      voteData,
                      status: computedStatus,
                      statusLabel: statusLabel,
                      color: color,
                      backgroundImage: law.background_image,
                      date_adopted: law.date_adopted
                    };
                    return <DetailedLawDossier key={`premium-${formattedLaw.id}`} law={formattedLaw as any} />
                  }
                  return <DetailedLawDossier key={`premium-static-${law.id}`} law={law} />
                } else {
                  // History card formatted as DetailedLawDossier
                  const catObj = CATEGORIES.find(c => c.label === law.category || c.matchCategory === law.category);
                  const color = catObj ? catObj.color : ((law.category || '').toLowerCase().includes('institution') ? 'violet' : 'slate');

                  const impacts = [];
                  if (law.impact_detail) impacts.push(law.impact_detail);
                  else if (law.why_it_matters) impacts.push(law.why_it_matters);
                  else impacts.push(law.summary || "Détails approfondis non disponibles pour ce texte.");
                  
                  const calendar = [
                    {
                      date: new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
                      event: law.resultat || "Loi Adoptée"
                    }
                  ];

                  const premiumPoints = [
                    "Ce texte a été soumis au vote de l'Assemblée nationale.",
                    "L'historique complet des débats est disponible sur les sources officielles."
                  ];

                  const voteData = (law.pour + law.contre + law.abstention) > 0 ? {
                    pour: law.pour || 0,
                    contre: law.contre || 0,
                    abstention: law.abstention || 0,
                    group_results: law.group_results || []
                  } : null;

                  const computedStatus = law.status_detail === 'En application' ? 'application' : 'vote';
                  const statusLabel = law.status_detail === 'En application' ? 'En application' : 'Loi Adoptée';

                  const formattedLaw = {
                    id: law.id,
                    title: law.title || law.objet || "Projet ou proposition de loi",
                    category: law.category || "Institution",
                    summary: law.summary || law.objet,
                    impacts,
                    calendar,
                    premiumPoints,
                    voteData,
                    status: computedStatus,
                    statusLabel,
                    color,
                    date_adopted: law.date_adopted || law.date_scrutin
                  };

                  return <DetailedLawDossier key={`history-${law.id}`} law={formattedLaw as any} />;
                }
              })}
                  
              {totalPages > 1 && (
                <div className="col-span-full flex flex-col items-center justify-center mt-12 space-y-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        setCurrentPage(p => Math.max(1, p - 1));
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      disabled={currentPage === 1}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      Précédent
                    </button>
                    
                    <div className="flex items-center gap-1 hidden md:flex">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                        if (
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1)
                        ) {
                          return (
                            <button
                              key={page}
                              onClick={() => {
                                setCurrentPage(page);
                                window.scrollTo({ top: 400, behavior: 'smooth' });
                              }}
                              className={`w-10 h-10 rounded-xl font-bold transition-colors ${
                                currentPage === page 
                                  ? 'bg-blue-600 text-white border-blue-600' 
                                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        } else if (
                          page === currentPage - 2 || 
                          page === currentPage + 2
                        ) {
                          return <span key={page} className="text-slate-400 px-1">...</span>;
                        }
                        return null;
                      })}
                    </div>

                    <button 
                      onClick={() => {
                        setCurrentPage(p => Math.min(totalPages, p + 1));
                        window.scrollTo({ top: 400, behavior: 'smooth' });
                      }}
                      disabled={currentPage === totalPages}
                      className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                    >
                      Suivant
                    </button>
                  </div>
                  <p className="text-slate-400 text-sm font-medium">Page {currentPage} sur {totalPages}</p>
                </div>
              )}
            </>
          );
            })()
          ) : selectedCat ? (
            <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-300 col-span-full">
               <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
               <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Les dossiers pour cette catégorie sont en cours de création par l&apos;IA</p>
            </div>
          ) : null}
        </div>
      </div>

      {/* 4. LE RIDEAU DORÉ (SECTION PREMIUM VERROUILLÉE) */}
      {!isPremium && !pLoading && (
        <div id="premium-section" className="relative mt-32">
          {/* Fake Blurry Content */}
          <div className="opacity-40 grayscale pointer-events-none select-none blur-md space-y-12 mb-12">
             <div className="h-[400px] w-full bg-muted rounded-[3rem] border border-border" />
          </div>

          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl bg-card/90 backdrop-blur-3xl border border-amber-200/50 rounded-[3rem] p-10 md:p-16 text-center shadow-2xl relative">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white mb-8">
                <Lock className="w-10 h-10" />
              </div>
              <h3 className="text-3xl md:text-5xl font-black text-foreground mb-6 leading-tight">
                Accédez à <span className="text-amber-600 italic">tous</span> les dossiers
              </h3>
              <p className="text-lg text-muted-foreground mb-10 max-w-md mx-auto leading-relaxed">
                Plus de <span className="text-foreground font-bold">150 dossiers législatifs</span> décryptés, mis à jour en temps réel.
              </p>
              <Link
                href={getPremiumUrl(userId)}
                className="group px-12 py-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-3xl hover:shadow-2xl transition-all text-xl flex items-center gap-4 mx-auto w-fit"
              >
                Devenir membre Premium
                <ArrowRight className="w-6 h-6" />
              </Link>
            </div>
          </div>
        </div>
      )}
      </>
      )}
      {activeTab === 'votes' && (
        <div className="mt-12 mb-32">
          <div className="relative mb-16 text-center md:text-left">
            <div className="flex items-center gap-4 justify-center md:justify-start">
              <h2 className="text-5xl md:text-7xl font-staatliches uppercase tracking-tighter leading-none text-slate-900">
                <span className="text-slate-900 opacity-10 absolute -top-8 left-0 select-none hidden md:block">VOTES</span>
                Derniers <span className="bg-gradient-to-r from-blue-600 via-red-600 to-blue-600 bg-clip-text text-transparent">Votes de loi</span>
              </h2>
              {selectedCat && (
                <button 
                  onClick={() => setSelectedCat(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-slate-200 transition-colors flex items-center gap-2"
                >
                  <X size={14} /> {CATEGORIES.find(c => c.id === selectedCat)?.label || selectedCat}
                </button>
              )}
            </div>
            <div className="h-1.5 w-24 bg-blue-600 mt-4 rounded-full mx-auto md:mx-0" />
            <p className="text-lg font-bold italic text-slate-500 mt-6 max-w-2xl font-staatliches">
              Suivez en temps réel tous les votes de lois à l'Assemblée nationale et au Sénat.
            </p>
          </div>

          <div className="relative max-w-xl mb-12 mx-auto md:mx-0">
            <div className="absolute inset-0 bg-slate-900 rounded-2xl translate-x-2 translate-y-2 z-0" />
            <div className="relative z-10 flex items-center bg-white border-4 border-slate-900 rounded-2xl overflow-hidden px-6 py-4 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
              <Search className="w-6 h-6 text-slate-400 mr-4" />
              <input 
                type="text"
                placeholder="Rechercher un vote (ex: Retraite, Santé...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none focus:ring-0 text-slate-900 font-bold placeholder:text-slate-300 placeholder:italic"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery("")}
                  className="p-1 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={18} className="text-slate-400" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-10">
            {loadingLaws ? (
               <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-300 col-span-full">
                  <div className="w-12 h-12 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Chargement des votes...</p>
               </div>
            ) : (
              (() => {
                const votesList = dbLaws.filter(law => {
                  if (selectedCat) {
                    const catLabel = CATEGORIES.find(c => c.id === selectedCat)?.label;
                    if (law.category !== catLabel && law.category !== CATEGORIES.find(c => c.id === selectedCat)?.matchCategory) return false;
                  }
                  return true;
                });

                const filteredVotes = votesList.filter(law => {
                  const searchLower = searchQuery.toLowerCase();
                  const title = law.objet || law.title || '';
                  const category = law.category || '';
                  const summary = law.summary || '';
                  return (
                    title.toLowerCase().includes(searchLower) || 
                    summary.toLowerCase().includes(searchLower) ||
                    category.toLowerCase().includes(searchLower)
                  );
                });

                if (filteredVotes.length === 0) {
                  return (
                    <div className="text-center py-20 bg-slate-50 rounded-[3rem] border border-dashed border-slate-300 col-span-full">
                      <Search className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                      <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Aucun vote trouvé pour "{searchQuery}"</p>
                    </div>
                  );
                }

                const PAGE_SIZE = 60;
                const totalPages = Math.ceil(filteredVotes.length / PAGE_SIZE);
                const paginatedVotes = filteredVotes.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

                return (
                  <>
                    {paginatedVotes.map((law: any) => {
                      const catObj = CATEGORIES.find(c => c.label === law.category || c.matchCategory === law.category);
                      const color = catObj ? catObj.color : ((law.category || '').toLowerCase().includes('institution') ? 'violet' : 'slate');

                      const impacts = [];
                      if (law.impact_detail) impacts.push(law.impact_detail);
                      else if (law.why_it_matters) impacts.push(law.why_it_matters);
                      else impacts.push(law.summary || "Détails approfondis non disponibles pour ce vote.");
                      
                      const calendar = [
                        {
                          date: new Date(law.date_scrutin).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }),
                          event: law.resultat || "Vote"
                        }
                      ];

                      const premiumPoints = [
                        "Ce texte a été soumis au vote du Parlement.",
                        "L'historique complet des débats est disponible sur les sources officielles."
                      ];

                      const voteData = (law.pour + law.contre + law.abstention) > 0 ? {
                        pour: law.pour || 0,
                        contre: law.contre || 0,
                        abstention: law.abstention || 0,
                        group_results: law.group_results || []
                      } : null;

                      const computedStatus = law.status_detail === 'En application' ? 'application' : 'vote';
                      const statusLabel = law.status_detail === 'En application' ? 'En application' : 'Loi Adoptée';

                      const formattedLaw = {
                        id: law.id,
                        title: law.objet || law.title || "Projet ou proposition de loi",
                        category: law.category || "Institution",
                        summary: law.summary || law.objet,
                        impacts,
                        calendar,
                        premiumPoints,
                        voteData,
                        status: computedStatus,
                        statusLabel,
                        color,
                        date_adopted: law.date_scrutin
                      };

                      return <DetailedLawDossier key={`vote-${law.id}`} law={formattedLaw as any} />;
                    })}
                    
                    {totalPages > 1 && (
                      <div className="col-span-full flex flex-col items-center justify-center mt-12 space-y-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => {
                              setCurrentPage(p => Math.max(1, p - 1));
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                          >
                            Précédent
                          </button>
                          
                          <div className="flex items-center gap-1 hidden md:flex">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                              if (
                                page === 1 || 
                                page === totalPages || 
                                (page >= currentPage - 1 && page <= currentPage + 1)
                              ) {
                                return (
                                  <button
                                    key={page}
                                    onClick={() => {
                                      setCurrentPage(page);
                                      window.scrollTo({ top: 400, behavior: 'smooth' });
                                    }}
                                    className={`w-10 h-10 rounded-xl font-bold transition-colors ${
                                      currentPage === page 
                                        ? 'bg-blue-600 text-white border-blue-600' 
                                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {page}
                                  </button>
                                );
                              } else if (
                                page === currentPage - 2 || 
                                page === currentPage + 2
                              ) {
                                return <span key={page} className="text-slate-400 px-1">...</span>;
                              }
                              return null;
                            })}
                          </div>

                          <button 
                            onClick={() => {
                              setCurrentPage(p => Math.min(totalPages, p + 1));
                              window.scrollTo({ top: 400, behavior: 'smooth' });
                            }}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
                          >
                            Suivant
                          </button>
                        </div>
                        <p className="text-slate-400 text-sm font-medium">Page {currentPage} sur {totalPages}</p>
                      </div>
                    )}
                  </>
                );
              })()
            )}
          </div>
        </div>
      )}


      {isPremium && (
        <div className="mt-20 p-8 rounded-[3rem] bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 flex flex-col md:flex-row items-center gap-8 shadow-xl">
          <div className="w-20 h-20 rounded-full bg-amber-400 flex items-center justify-center text-slate-900 shadow-lg shadow-amber-200/50 flex-shrink-0">
            <Sparkles className="w-10 h-10" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-2xl md:text-3xl font-black text-slate-900 mb-2">Accès Premium Actif</h3>
            <p className="text-slate-600">
              Bienvenue ! En tant que membre Premium, vous avez accès à l&apos;intégralité des dossiers législatifs et aux analyses thématiques.
            </p>
          </div>
          <div className="flex items-center gap-2 px-6 py-3 bg-white rounded-2xl border border-amber-200 text-amber-600 font-bold text-sm">
            <CheckCircle2 className="w-5 h-5" />
            Membre Élite
          </div>
        </div>
      )}
    </div>
  );
}
