import { useState, useEffect, useTransition } from "react";
import { motion } from "framer-motion";
import { 
  Calendar, 
  CheckCircle2, 
  ChevronDown,
  Sparkles, 
  ArrowRight,
  Star,
  XCircle,
  MinusCircle,
  Vote,
  FileText
} from "lucide-react";
import { type LawDossier } from "@/data/free-laws-dossiers";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import { useGlossary } from "@/components/providers/GlossaryProvider";

interface DetailedLawDossierProps {
  law: LawDossier;
}

const getHashIndex = (id: string, max: number) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % max;
};

const getLawBackgroundImage = (law: LawDossier) => {
  const title = law.title.toLowerCase();
  const category = law.category.toLowerCase();
  const id = law.id;

  // 1. SPECIFIC KEYWORD MATCHES (ACROSS ALL CATEGORIES)
  
  // Restitution de biens culturels
  if (title.includes("restitution") || title.includes("spoliés") || title.includes("culturel")) {
    return "/restitution-culturelle.png";
  }
  
  // Terrorisme / Rétention / Sécurité Nationale
  if (title.includes("terroris") || title.includes("rétention") || title.includes("antiterroris")) {
    const images = [
      "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80", // Caméra de surveillance
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80", // Voiture de patrouille
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80"  // Salle de contrôle technologique
    ];
    return images[getHashIndex(id, images.length)];
  }
  
  // Prison / Pénitentiaire / Rétention / Cellule / Détention (Barreaux de prison)
  if (title.includes("prison") || title.includes("pénitentiaire") || title.includes("détenu") || title.includes("cellule") || title.includes("détention") || title.includes("rétention")) {
    const images = [
      "https://images.unsplash.com/photo-1589829785536-4149fa34a5e0?auto=format&fit=crop&w=600&q=80", // Barreaux cellule
      "https://images.unsplash.com/photo-1581333100576-b73bbe79c955?auto=format&fit=crop&w=600&q=80", // Gros plan barreaux de prison
      "https://images.unsplash.com/photo-1543087903-1ac2ec7aa8c5?auto=format&fit=crop&w=600&q=80"  // Cellule / couloir
    ];
    return images[getHashIndex(id, images.length)];
  }
  
  // Justice / Tribunal / Peines / Sanctions
  if (title.includes("peine") || title.includes("loi-cadre") || title.includes("sanc") || title.includes("amend")) {
    const images = [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80", // Balance de la justice
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80"  // Gavel tribunal
    ];
    return images[getHashIndex(id, images.length)];
  }

  // Militaire / Armée / Défense
  if (title.includes("milit") || title.includes("armé") || title.includes("défense") || title.includes("guerre")) {
    const images = [
      "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80", // Jets militaires silhouette
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80"  // Bouclier cyber/défense
    ];
    return images[getHashIndex(id, images.length)];
  }

  // Fraude / Fisc / Taxes / Impôt
  if (title.includes("fraude") || title.includes("fisc") || title.includes("tax") || title.includes("impôt") || title.includes("économ")) {
    const images = [
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", // Dossiers d'impôts / calculatrice
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80"  // Pièces de monnaie
    ];
    return images[getHashIndex(id, images.length)];
  }

  // Emploi / Travail / Chômage
  if (title.includes("emploi") || title.includes("travail") || title.includes("chôm") || title.includes("salair")) {
    const images = [
      "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=600&q=80", // Équipe de travail
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80"  // Réunion d'atelier
    ];
    return images[getHashIndex(id, images.length)];
  }

  // Immigration / Frontières / Asile
  if (title.includes("immigra") || title.includes("fronti") || title.includes("asile") || title.includes("étranger")) {
    const images = [
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80", // Globe et passeport
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=600&q=80"  // Carte mondiale interactive
    ];
    return images[getHashIndex(id, images.length)];
  }

  // Cancer / Laboratoire / Recherche médicale
  if (title.includes("cancer") || title.includes("thérapeut") || title.includes("recher") || title.includes("patholog")) {
    const images = [
      "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=600&q=80", // Microscope labo
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80"  // Hélice d'ADN
    ];
    return images[getHashIndex(id, images.length)];
  }

  // Climat / Énergie / Transition écologique
  if (title.includes("climat") || title.includes("carbone") || title.includes("énerg") || title.includes("renouvel") || title.includes("résili")) {
    const images = [
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80", // Panneaux solaires
      "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&w=600&q=80"  // Éolienne
    ];
    return images[getHashIndex(id, images.length)];
  }

  // 2. LAW-SPECIFIC HARDCODED BACKGROUNDS (IF ALREADY DEFINED)
  if (law.backgroundImage) {
    return law.backgroundImage;
  }

  // 3. CATEGORY FALLBACKS (IF NO KEYWORD MATCHED) - 10 IMAGES PER CATEGORY
  if (category.includes("éduc") || category.includes("educ")) {
    const list = [
      "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=600&q=80", // Bibliothèque
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=600&q=80", // Tableau noir
      "https://images.unsplash.com/photo-1427504494785-3a9ca7044f45?auto=format&fit=crop&w=600&q=80", // Étudiants campus
      "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80", // Professeur écrivant
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=600&q=80", // Apprentissage tablette
      "https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&w=600&q=80", // Étagères livres
      "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&w=600&q=80", // Cahier pupitre
      "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=600&q=80", // Étude examen
      "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=600&q=80", // Pile de vieux livres
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=600&q=80"  // Bureau lampe lecture
    ];
    return list[getHashIndex(id, list.length)];
  }
  if (category.includes("écol") || category.includes("envir") || category.includes("climat")) {
    const list = [
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=600&q=80", // Collines vertes
      "https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=600&q=80", // Panneaux solaires
      "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?auto=format&fit=crop&w=600&q=80", // Forêt rayon soleil
      "https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&w=600&q=80", // Feuillage vert
      "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=600&q=80", // Brume montagne
      "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80", // Gouttes rosée
      "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?auto=format&fit=crop&w=600&q=80", // Parc éolien
      "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=600&q=80", // Jeune pousse terre
      "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80", // Chemin de forêt
      "https://images.unsplash.com/photo-1500485035595-cbe6f645feb1?auto=format&fit=crop&w=600&q=80"  // Source d'eau claire
    ];
    return list[getHashIndex(id, list.length)];
  }
  if (category.includes("écon") || category.includes("finance")) {
    const list = [
      "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80", // Graphiques
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=600&q=80", // Fiscalité / calculatrice
      "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=600&q=80", // Monnaies stack
      "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=600&q=80", // Indices boursiers
      "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?auto=format&fit=crop&w=600&q=80", // Immeuble de bureaux
      "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80", // Gratte-ciel
      "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80", // Monnaie pousse plante
      "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=600&q=80", // Terminal de paiement
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80", // Analyse de dossiers
      "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=600&q=80"  // Courbes trading
    ];
    return list[getHashIndex(id, list.length)];
  }
  if (category.includes("sécu") || category.includes("défense") || category.includes("milit") || category.includes("justi")) {
    const list = [
      "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80", // Balance justice
      "https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80", // Caméra surveillance
      "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=600&q=80", // Jets militaires
      "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80", // Cadenas cyber
      "https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=600&q=80", // Gavel juge
      "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80", // Poignée de main accord
      "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80", // Phares voiture patrouille
      "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=600&q=80", // Salle de surveillance
      "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=600&q=80", // Shield protection
      "https://images.unsplash.com/photo-1501700490688-61614f85e495?auto=format&fit=crop&w=600&q=80"  // Gyrophare nuit
    ];
    return list[getHashIndex(id, list.length)];
  }
  if (category.includes("santé") || category.includes("medic")) {
    const list = [
      "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=600&q=80", // Stéthoscope
      "https://images.unsplash.com/photo-1532187863486-abf9d39d66e8?auto=format&fit=crop&w=600&q=80", // Microscope labo
      "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&w=600&q=80", // Équipe de soins
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&w=600&q=80", // Diagnostic ipad
      "https://images.unsplash.com/photo-1530026405186-ed1ea0dc7a63?auto=format&fit=crop&w=600&q=80", // Chirurgiens bloc
      "https://images.unsplash.com/photo-1579684389782-64d84b5e901a?auto=format&fit=crop&w=600&q=80", // Couloir hôpital
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80", // Gélules médicaments
      "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=600&q=80", // ADN représentation
      "https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&w=600&q=80", // Tubes à essai
      "https://images.unsplash.com/photo-1629909613654-28e377c37b09?auto=format&fit=crop&w=600&q=80"  // Collaboration médecins
    ];
    return list[getHashIndex(id, list.length)];
  }
  if (category.includes("social") || category.includes("société")) {
    const list = [
      "https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?auto=format&fit=crop&w=600&q=80", // Mains jointes
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=600&q=80", // Passeport
      "https://images.unsplash.com/photo-1464692806184-76a307a67e2c?auto=format&fit=crop&w=600&q=80", // Silhouettes humaines
      "https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=600&q=80", // Atelier collectif
      "https://images.unsplash.com/photo-1509099836639-18ba1795216d?auto=format&fit=crop&w=600&q=80", // Entraide enfants
      "https://images.unsplash.com/photo-1531206715517-5c0ba140e2b8?auto=format&fit=crop&w=600&q=80", // Groupe diversité rires
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80", // Discussion publique
      "https://images.unsplash.com/photo-1544027993-37dbfe43562a?auto=format&fit=crop&w=600&q=80", // Distribution bénévole
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80", // Amis accolades
      "https://images.unsplash.com/photo-1573164713988-8665fc963095?auto=format&fit=crop&w=600&q=80"  // Conférence réseau
    ];
    return list[getHashIndex(id, list.length)];
  }

  return "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=600&q=80";
};

export default function DetailedLawDossier({ law }: DetailedLawDossierProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVoteOpen, setIsVoteOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { isPremium, userId } = usePremium();
  const [userVote, setUserVote] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showHeavyContent, setShowHeavyContent] = useState(false);
  const [communityStats, setCommunityStats] = useState<{POUR:number, CONTRE:number, ABSTENTION:number, total:number} | null>(null);
  const { wrapWithGlossary } = useGlossary();

  // Charger les stats globales
  const fetchCommunityStats = async () => {
    const stats = await api.getLawVoteStats(law.id);
    setCommunityStats(stats);
  };

  // Charger le vote existant avec useEffect (correct)
  useEffect(() => {
    if (userId) {
      api.getUserVotes(userId).then(votes => {
        const existing = votes.find((v: any) => v.law_id === law.id);
        if (existing) {
          setUserVote(existing.vote);
          fetchCommunityStats();
        }
      }).catch(err => {
        console.error("Erreur chargement vote existant:", err);
      });
    }
  }, [userId, law.id]);

  // Différer le contenu lourd pour optimiser l'INP
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => setShowHeavyContent(true), 150);
      return () => clearTimeout(timer);
    } else {
      setShowHeavyContent(false);
    }
  }, [isOpen]);

  const handleVote = async (btnVal: string) => {
    if (!userId) {
      alert("Vous devez être connecté pour voter.");
      return;
    }
    setIsVoting(true);
    try {
      await api.saveUserVote(userId, law.id, btnVal as any);
      setUserVote(btnVal);
      fetchCommunityStats();
      alert(`Votre position "${btnVal}" a été enregistrée avec succès !`);
    } catch (err: any) {
      console.error("Erreur vote:", err);
      alert(`Erreur lors de l'enregistrement : ${err.message || "Problème de connexion"}`);
    } finally {
      setIsVoting(false);
    }
  };

  const bgMap: Record<string, string> = {
    indigo: "bg-indigo-500 hover:bg-indigo-400 text-white",
    emerald: "bg-emerald-500 hover:bg-emerald-400 text-white",
    blue: "bg-blue-500 hover:bg-blue-400 text-white",
    slate: "bg-slate-800 hover:bg-slate-700 text-white",
    rose: "bg-rose-500 hover:bg-rose-400 text-white",
    orange: "bg-orange-500 hover:bg-orange-400 text-white",
  };

  const cardTheme = bgMap[law.color] || "bg-slate-800 hover:bg-slate-700 text-white";

  return (
    <div 
      id={law.id}
      className={`relative transition-all duration-500 group ${isOpen ? 'col-span-full z-20' : 'hover:-translate-y-2'}`}
    >
      {/* 1. THE UNDERLYING SHEETS */}
      {!isOpen && (
        <>
          {/* Bottom Sheet */}
          <div 
            className="absolute inset-0 bg-[#f8fafc] rounded-[1.5rem] transition-all duration-500 origin-bottom-right rotate-2 translate-y-1 group-hover:rotate-[5deg] group-hover:translate-x-3 group-hover:translate-y-2 border border-slate-200 shadow-[2px_2px_8px_rgba(0,0,0,0.05)]"
            style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #cbd5e1 27px, #cbd5e1 28px)', backgroundPosition: '0 14px' }}
          />
          {/* Middle Sheet */}
          <div 
            className="absolute inset-0 bg-white rounded-[1.5rem] transition-all duration-500 origin-bottom-left -rotate-1 translate-y-0.5 group-hover:-rotate-[3deg] group-hover:-translate-x-2 group-hover:translate-y-1 border border-slate-200 shadow-[2px_2px_8px_rgba(0,0,0,0.05)]"
            style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #cbd5e1 27px, #cbd5e1 28px)', backgroundPosition: '0 14px' }}
          />
        </>
      )}

      {/* 2. THE MAIN SHEET */}
      <div 
        className={`relative z-10 shadow-xl transition-all duration-500 flex flex-col overflow-hidden ${cardTheme} ${isOpen ? 'rounded-[2rem]' : 'rounded-[1.5rem]'}`}
      >
        {/* Background Image with Overlay Blend */}
        {(() => {
          const bgUrl = getLawBackgroundImage(law);
          return bgUrl ? (
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none opacity-[0.22] mix-blend-overlay">
              <img 
                src={bgUrl} 
                alt="" 
                className="w-full h-full object-cover filter brightness-90 contrast-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10" />
            </div>
          ) : null;
        })()}

        {/* 3. HEADER */}
        <button 
          onClick={() => {
            startTransition(() => {
              setIsOpen(!isOpen);
            });
          }}
          className={`relative z-10 w-full text-left flex flex-col transition-all focus-visible:outline-none group/header ${isOpen ? 'p-5 md:p-6 pb-5' : 'p-5 md:p-6 h-full justify-between aspect-[3/4] sm:aspect-[1/1.3] min-h-[300px]'}`}
        >
          <div className="space-y-4 md:space-y-6 w-full">
            <div className="flex justify-between items-start w-full">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="px-3 py-1 rounded-full text-[10px] md:text-[11px] font-black uppercase tracking-widest bg-white/20 text-white backdrop-blur-md flex items-center gap-1.5">
                  <span className="opacity-70">LOI</span>
                  <span className="opacity-50">•</span>
                  <span>{law.category}</span>
                </div>
                {(() => {
                  const dateInfo = law.calendar.length > 0 ? law.calendar[law.calendar.length - 1].date : null;
                  if (!dateInfo) return null;
                  return (
                    <div className="px-3 py-1 bg-white/10 text-white/90 text-[10px] md:text-[11px] font-black rounded-full uppercase tracking-widest backdrop-blur-sm">
                      {dateInfo}
                    </div>
                  );
                })()}
                <div className="px-3 py-1 bg-white/10 text-white/90 text-[10px] md:text-[11px] font-black rounded-full uppercase tracking-widest backdrop-blur-sm flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${law.status === 'application' ? 'bg-green-400' : 'bg-amber-400'}`} />
                  {law.statusLabel}
                </div>
              </div>
              {!isOpen && (
                <div className="p-2 md:p-2.5 rounded-xl bg-white/10 text-white backdrop-blur-sm group-hover/header:bg-white/20 transition-all">
                  <ChevronDown className="w-5 h-5" />
                </div>
              )}
            </div>

            <div className="space-y-3 pt-2 w-full">
              <h3 className={`font-staatliches uppercase tracking-wider block leading-none w-full break-words drop-shadow-sm transition-all ${isOpen ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`}>
                {law.title}.
              </h3>
            </div>
          </div>

          {!isOpen && (
            <div className="w-full flex-grow flex flex-col justify-center space-y-4 py-3">
              {/* Element 2: Mini legislative progress timeline */}
              {(() => {
                const steps = [
                  { label: "Dépôt", active: false, done: true },
                  { label: "Débats", active: law.status === 'debat', done: law.status === 'vote' || law.status === 'application' },
                  { label: "Vote", active: law.status === 'vote', done: law.status === 'application' },
                  { label: "Application", active: law.status === 'application', done: law.status === 'application' },
                ];
                
                return (
                  <div className="w-full py-1">
                    <div className="relative flex items-center justify-between px-1.5">
                      <div className="absolute left-0 right-0 top-1.5 h-[2px] bg-white/20 z-0" />
                      {steps.map((step, idx) => {
                        let dotBg = "bg-white/30";
                        let ring = "";
                        if (step.active) {
                          dotBg = "bg-amber-400";
                          ring = "ring-[3px] ring-amber-400/40 scale-110";
                        } else if (step.done) {
                          dotBg = "bg-white";
                        }
                        
                        return (
                          <div key={idx} className="relative z-10 flex flex-col items-center">
                            <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${dotBg} ${ring}`} />
                            <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-wider mt-1.5 select-none ${
                              step.active 
                                ? "text-amber-300 font-extrabold" 
                                : step.done 
                                  ? "text-white" 
                                  : "text-white/40"
                            }`}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Element 3: Vote bar if voteData is available */}
              {law.voteData && (() => {
                const total = law.voteData.pour + law.voteData.contre + law.voteData.abstention;
                const pctPour = total > 0 ? Math.round((law.voteData.pour / total) * 100) : 0;
                const pctContre = total > 0 ? Math.round((law.voteData.contre / total) * 100) : 0;
                return (
                  <div className="space-y-1.5 bg-white rounded-xl p-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.08)] select-none">
                    <div className="flex justify-between items-center text-[8px] md:text-[9px] font-black uppercase tracking-wider text-slate-800">
                      <span className="opacity-75">🗳️ Vote Assemblée</span>
                      <span className="text-emerald-600 font-extrabold">{pctPour}% POUR</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div className="h-full bg-emerald-500" style={{ width: `${pctPour}%` }} />
                      <div className="h-full bg-red-500" style={{ width: `${pctContre}%` }} />
                      <div className="h-full bg-slate-300" style={{ width: `${100 - pctPour - pctContre}%` }} />
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {!isOpen && (
            <div className="mt-6 pt-4 border-t border-white/20 w-full flex items-center justify-between">
               <p className="text-white/60 font-bold italic text-xs">Cliquer pour déplier la fiche</p>
            </div>
          )}

          {isOpen && (
            <div className="absolute top-6 right-6 md:top-8 md:right-8">
              <div className="p-3 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm transition-all flex items-center justify-center">
                <ChevronDown className="w-6 h-6 rotate-180" />
              </div>
            </div>
          )}
        </button>

      {/* 2. CONTENU DÉPLIABLE (ACCORDÉON OPTIMISÉ POUR L'INP) */}
      <motion.div
        initial={false}
        animate={{ 
          height: isOpen ? "auto" : 0,
          opacity: isOpen ? 1 : 0
        }}
        transition={{ 
          duration: 0.2, 
          ease: "circOut"
        }}
        className="overflow-hidden transform-gpu will-change-[height,opacity]"
      >
        <div className="relative z-10 px-6 md:px-8 pb-8 pt-8 bg-white text-slate-800 rounded-[1.5rem] mx-2 mb-2 shadow-inner">

          <div className="text-base md:text-lg text-slate-800 font-medium leading-relaxed mb-8 max-w-4xl">
            {wrapWithGlossary(law.summary)}
          </div>

          {showHeavyContent && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {/* Voting Results (Educational & Collapsible) */}
                {law.voteData && (
                  <div className="col-span-1 lg:col-span-2 bg-amber-50 rounded-[2rem] text-slate-900 relative overflow-hidden shadow-[8px_8px_0px_0px_rgba(0,0,0,0.05)] border-2 border-slate-900">
                    <button 
                      onClick={() => setIsVoteOpen(!isVoteOpen)}
                      className="w-full p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 text-left hover:bg-amber-100/50 transition-colors group/vote-btn"
                    >
                      <div>
                        <h4 className="text-3xl font-staatliches uppercase tracking-tight text-slate-900 mb-2 flex items-center gap-3">
                          <div className={`p-2 rounded-xl rotate-3 shadow-md transition-colors ${isVoteOpen ? 'bg-blue-600' : 'bg-blue-500'}`}>
                            <Vote className="w-6 h-6 text-white" />
                          </div>
                          Le verdict de l'Assemblée
                        </h4>
                        <p className="text-slate-500 font-bold italic text-sm">Cliquez pour voir comment vos députés ont tranché</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="px-5 py-2 bg-green-400 border-2 border-slate-900 rounded-xl -rotate-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                          <span className="text-2xl font-black font-staatliches block leading-none">{law.voteData.pour} POUR</span>
                        </div>
                        <motion.div
                          animate={{ rotate: isVoteOpen ? 180 : 0 }}
                          className="p-3 bg-white border-2 border-slate-900 rounded-xl"
                        >
                          <ChevronDown className="w-6 h-6" />
                        </motion.div>
                      </div>
                    </button>

                    <motion.div
                      initial={false}
                      animate={{ height: isVoteOpen ? "auto" : 0, opacity: isVoteOpen ? 1 : 0 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 md:px-8 pb-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mb-2 border-2 border-green-500">
                              <CheckCircle2 className="w-5 h-5 text-green-600" />
                            </div>
                            <span className="text-3xl font-black text-green-600 font-staatliches">{law.voteData.pour}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pour la loi</span>
                          </div>
                          
                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mb-2 border-2 border-red-500">
                              <XCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <span className="text-3xl font-black text-red-600 font-staatliches">{law.voteData.contre}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Contre la loi</span>
                          </div>

                          <div className="bg-white p-4 rounded-2xl border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.1)] flex flex-col items-center text-center">
                            <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mb-2 border-2 border-slate-400">
                              <MinusCircle className="w-5 h-5 text-slate-500" />
                            </div>
                            <span className="text-3xl font-black text-slate-500 font-staatliches">{law.voteData.abstention}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Abstentions</span>
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute -left-4 -top-4 w-full h-full bg-blue-500/5 rounded-[2rem] -rotate-1 pointer-events-none" />
                          <h5 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-6 flex items-center gap-2">
                            <span className="w-8 h-1 bg-blue-500 rounded-full" />
                            Positions par groupe politique
                          </h5>
                          
                          {law.voteData.group_results && (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10">
                              {law.voteData.group_results.map((group: any, i: number) => {
                                const GROUP_NAMES: Record<string, string> = {
                                  'PO845401': 'LFI-NFP',
                                  'PO845407': 'GDR (Gauche)',
                                  'PO845413': 'Socialistes',
                                  'PO845419': 'Écologistes',
                                  'PO845425': 'LIOT',
                                  'PO845439': 'Ensemble (Renaissance)',
                                  'PO845454': 'MoDem',
                                  'PO845470': 'Horizons',
                                  'PO845485': 'Droite Républicaine',
                                  'PO845514': 'RN',
                                  'PO872880': 'UDR (Ciotti)',
                                  'PO840056': 'Non-inscrits'
                                };
                                
                                const groupName = GROUP_NAMES[group.group_id] || group.group_id;
                                const isPour = group.pour > group.contre && group.pour > group.abstention;
                                const isContre = group.contre > group.pour && group.contre > group.abstention;
                                
                                const groupStyle = isPour 
                                  ? 'bg-green-100 border-green-500 text-green-700' 
                                  : isContre 
                                    ? 'bg-red-100 border-red-500 text-red-700' 
                                    : 'bg-slate-100 border-slate-400 text-slate-600';
                                
                                return (
                                  <div 
                                    key={i} 
                                    className={`p-4 rounded-2xl border-2 ${groupStyle} flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]`}
                                  >
                                    <span className="text-[11px] font-black uppercase leading-tight mb-3" title={groupName}>{groupName}</span>
                                    <div className="flex justify-between items-end">
                                      <div className="flex flex-col">
                                        <span className="text-[8px] font-bold uppercase opacity-60">Pour</span>
                                        <span className="text-lg font-black font-staatliches">{group.pour}</span>
                                      </div>
                                      <div className="flex flex-col items-end">
                                        <span className="text-[8px] font-bold uppercase opacity-60">Contre</span>
                                        <span className="text-lg font-black font-staatliches">{group.contre}</span>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )}

                {/* Impacts */}
                <div className="space-y-4">
                  <h4 className="text-base font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-4">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    Décryptage : ce que ça change
                  </h4>
                  <div className="space-y-3">
                    {law.impacts.map((impact, idx) => (
                      <div key={idx} className="flex gap-3 items-start p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                        <div className="text-slate-700 text-sm font-medium leading-relaxed">{wrapWithGlossary(impact)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline & Analysis */}
                <div className="space-y-8">
                  <div>
                    <h4 className="text-base font-bold flex items-center gap-2 text-slate-900 uppercase tracking-wider mb-4">
                      <Calendar className="w-4 h-4 text-primary" />
                      Calendrier législatif
                    </h4>
                    <div className="space-y-5 pl-5 border-l-2 border-slate-200 ml-2">
                      {law.calendar.map((item, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute -left-[27px] top-1.5 w-3 h-3 rounded-full bg-card border-2 border-primary" />
                          <p className="text-[10px] font-bold uppercase text-primary tracking-widest mb-1">{item.date}</p>
                          <p className="text-sm text-slate-800 font-semibold">{item.event}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Deep Analysis */}
                  <div className="p-5 bg-blue-50/50 border border-blue-100 rounded-2xl relative overflow-hidden group shadow-sm">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <h4 className="text-slate-900 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        Analyse approfondie de la rédaction
                      </h4>
                    </div>
                    <ul className="space-y-3">
                      {law.premiumPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-700 font-medium">
                          <ArrowRight className="w-4 h-4 text-amber-500/60 shrink-0 mt-0.5" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3. MODULE DE VOTE CITOYEN */}
              {userId && (
                <div className="mt-10 pt-10 border-t border-slate-100">
                  <div className={`p-6 md:p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden border ${isPremium ? "bg-slate-950 border-slate-800" : "bg-slate-900 border-slate-700"}`}>
                    <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-amber-500/5 to-transparent pointer-events-none" />
                    
                    <div className="relative z-10">
                      <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-[8px] font-black uppercase rounded-full mb-4 ${isPremium ? "bg-amber-400 text-slate-950" : "bg-slate-800 text-slate-400"}`}>
                        <Star size={8} className={isPremium ? "fill-current" : ""} />
                        {isPremium ? "Action Citoyenne Elite" : "Action Citoyenne (Membre)"}
                      </div>
                      <h4 className="text-2xl font-staatliches uppercase mb-3 italic tracking-tight text-white leading-none">
                        Votre Position <span className={isPremium ? "text-amber-500" : "text-blue-400"}>Citoyenne</span>
                      </h4>
                      
                      {userVote ? (
                        <div className="flex items-center gap-2 bg-white/10 border border-white/10 px-3 py-2 rounded-xl mb-6 w-fit text-xs font-bold text-amber-200">
                          <CheckCircle2 size={14} />
                          Vous avez voté : <span className="uppercase text-white">{userVote}</span>
                        </div>
                      ) : (
                        <p className="text-slate-400 text-xs mb-6 leading-relaxed max-w-2xl">
                          {isPremium 
                            ? "En tant que membre Premium, enregistrez votre vote pour le comparer à celui des députés dans votre dashboard." 
                            : "Prenez position sur ce projet de loi. Connectez-vous à votre espace personnel pour suivre votre historique."}
                        </p>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                          { label: "POUR", val: "POUR", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white", activeColor: "bg-emerald-500 text-white border-transparent", icon: CheckCircle2 },
                          { label: "CONTRE", val: "CONTRE", color: "bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500 hover:text-white", activeColor: "bg-red-500 text-white border-transparent", icon: XCircle },
                          { label: "ABSTENTION", val: "ABSTENTION", color: "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white", activeColor: "bg-slate-700 text-white border-transparent", icon: MinusCircle }
                        ].map((btn) => {
                          const isActive = userVote === btn.val;
                          return (
                            <button
                              key={btn.val}
                              disabled={isVoting}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleVote(btn.val);
                              }}
                              className={`group p-4 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all duration-300 hover:scale-105 active:scale-95 ${
                                isActive ? btn.activeColor : btn.color
                              } ${isVoting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                              <btn.icon size={16} className={isActive ? "" : "group-hover:rotate-12 transition-transform"} />
                              <span className="font-black text-[9px] tracking-widest">{btn.label}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* RÉSULTATS COMMUNAUTAIRES (VISIBLE APRÈS VOTE) */}
                      {userVote && communityStats && (
                        <motion.div 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-10 p-6 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-sm"
                        >
                          <div className="flex items-center justify-between mb-6">
                            <h5 className="font-staatliches text-xl italic tracking-wide text-amber-500">
                              Résultats de la Communauté
                            </h5>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                              {communityStats.total} votes cumulés
                            </span>
                          </div>

                          <div className="space-y-5">
                            {[
                              { label: "POUR", val: communityStats.POUR, color: "bg-emerald-500", raw: "POUR" },
                              { label: "CONTRE", val: communityStats.CONTRE, color: "bg-red-500", raw: "CONTRE" },
                              { label: "ABSTENTION", val: communityStats.ABSTENTION, color: "bg-slate-500", raw: "ABSTENTION" }
                            ].map((stat) => {
                              const percentage = communityStats.total > 0 
                                ? Math.round((stat.val / communityStats.total) * 100) 
                                : 0;
                              return (
                                <div key={stat.label} className="space-y-1.5">
                                  <div className="flex justify-between text-[10px] font-black tracking-tighter">
                                    <span className={userVote === stat.raw ? "text-white" : "text-slate-400"}>
                                      {stat.label} {userVote === stat.raw && " (Votre choix)"}
                                    </span>
                                    <span>{percentage}% ({stat.val})</span>
                                  </div>
                                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${percentage}%` }}
                                      transition={{ duration: 1, ease: "circOut" }}
                                      className={`h-full ${stat.color} shadow-[0_0_10px_rgba(0,0,0,0.5)]`}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  </div>
);
}
