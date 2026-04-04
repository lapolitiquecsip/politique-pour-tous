"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, CheckCircle2, Clock, XCircle, HelpCircle } from "lucide-react";
import ProgressBar from "@/components/promises/ProgressBar";
import PromiseItem from "@/components/promises/PromiseItem";
import Link from "next/link";

interface Politician {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  party: string;
  party_color: string;
}

import { api } from "@/lib/api";

const MOCK_PROMISES: Record<string, any[]> = {
  "emmanuel-macron": [
    { 
      id: "p1", 
      citation: "Suppression de la redevance audiovisuelle pour tous les Français.", 
      status: "kept", 
      date_made: "2022-03-15", 
      category: "Économie", 
      source_url: "https://www.service-public.fr",
      actions: [
        "Loi de finances rectificative d'août 2022 adoptée.",
        "Suppression effective dès l'automne 2022.",
        "Financement garanti par une fraction de la TVA."
      ],
      justification: "La taxe de 138€ a été totalement supprimée pour 23 millions de foyers, respectant l'engagement de campagne dès le début du second quinquennat."
    },
    { 
      id: "p2", 
      citation: "Planter 1 milliard d'arbres sur le territoire national d'ici 2032.", 
      status: "in-progress", 
      date_made: "2022-10-21", 
      category: "Écologie", 
      source_url: "https://www.ecologie.gouv.fr",
      actions: [
        "Lancement du plan de reboisement en 2023.",
        "Financement via le fonds Vert (2 milliards €).",
        "80 millions d'arbres déjà plantés fin 2025."
      ],
      justification: "Le rythme de plantation est conforme aux prévisions, mais l'objectif à 10 ans nécessite un maintien de l'effort budgétaire."
    },
    { 
      id: "p3", 
      citation: "Zéro SDF : personne ne doit plus dormir dans la rue d'ici la fin de l'année.", 
      status: "broken", 
      date_made: "2017-07-27", 
      category: "Social", 
      source_url: "https://www.lemonde.fr",
      actions: [
        "Création de 200 000 places d'hébergement d'urgence.",
        "Lancement du Logement d'abord.",
        "Maintien de campements précaires dans les métropoles."
      ],
      justification: "Malgré l'augmentation massive des places d'hébergement, le nombre de personnes sans domicile n'a pas atteint zéro, l'objectif est considéré comme non tenu."
    },
    { 
      id: "p4", 
      citation: "Doublement des classes de CP et CE1 dans les zones d'éducation prioritaire.", 
      status: "kept", 
      date_made: "2017-05-01", 
      category: "Éducation", 
      source_url: "https://www.education.gouv.fr",
      actions: [
        "Déploiement progressif entre 2017 et 2019.",
        "Plafond à 12 élèves par classe en REP+.",
        "300 000 élèves concernés dès la rentrée 2020."
      ],
      justification: "Objectif atteint et pérennisé. L'encadrement a permis d'améliorer les scores de lecture et d'écriture en zone prioritaire."
    },
    { 
      id: "p5", 
      citation: "Mise en place d'un système de retraite universel par points.", 
      status: "pending", 
      date_made: "2019-12-11", 
      category: "Social", 
      source_url: "https://www.gouvernement.fr",
      actions: [
        "Retrait provisoire lors de la crise COVID.",
        "Remplacé par la réforme de décalage de l'âge de départ (64 ans).",
        "Projet universel par points mis en pause."
      ],
      justification: "La réforme paramétrique (âge) a pris le dessus sur la réforme systémique initialement promise, qui reste en attente de réouverture."
    },
  ],
  "gabriel-attal": [
    { 
      id: "a1", 
      citation: "Mise en œuvre du Service National Universel (SNU) pour toute une classe d'âge.", 
      status: "in-progress", 
      date_made: "2023-06-12", 
      category: "Jeunesse", 
      source_url: "https://www.snu.gouv.fr",
      actions: [
        "Généralisation progressive aux classes de seconde.",
        "Phase de test sur volontariat réussie en 2024.",
        "Projet de généralisation totale d'ici 2026."
      ],
      justification: "Le déploiement technique et logistique est en cours, mais la généralisation obligatoire reste un sujet politique majeur."
    },
    { 
      id: "a2", 
      citation: "Expérimentation de la semaine de 4 jours dans l'administration.", 
      status: "in-progress", 
      date_made: "2024-01-30", 
      category: "Travail", 
      source_url: "https://www.lefigaro.fr",
      actions: [
        "Lancement de tests à l'URSSAF Picardie.",
        "Élargissement aux ministères début 2025.",
        "Évaluation du gain de productivité et de bien-être en cours."
      ],
      justification: "L'expérimentation avance mais les syndicats et les servicesRH analysent encore l'impact sur le temps de travail hebdomadaire."
    },
  ]
};

const MOCK_POLITICIANS_MAP: Record<string, any> = {
  "emmanuel-macron": { id: "emmanuel-macron", first_name: "Emmanuel", last_name: "Macron", role: "Président de la République", party: "Renaissance", party_color: "#005EB8" },
  "gabriel-attal": { id: "gabriel-attal", first_name: "Gabriel", last_name: "Attal", role: "Premier Ministre", party: "Renaissance", party_color: "#005EB8" },
  "yael-braun-pivet": { id: "yael-braun-pivet", first_name: "Yaël", last_name: "Braun-Pivet", role: "Pr. de l'Assemblée Nationale", party: "Renaissance", party_color: "#005EB8" },
  "gerard-larcher": { id: "gerard-larcher", first_name: "Gérard", last_name: "Larcher", role: "Président du Sénat", party: "Les Républicains", party_color: "#0055ff" },
};

export default function PoliticianPromisesPage() {
  const { id } = useParams();
  const router = useRouter();
  
  const [politician, setPolitician] = useState<Politician | null>(null);
  const [promises, setPromises] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("Toutes");

  useEffect(() => {
    async function fetchData() {
      try {
        const [polData, promData] = await Promise.all([
          api.getPolitician(id as string),
          api.getPoliticianPromises(id as string)
        ]);

        if (polData) {
          setPolitician(polData);
          setPromises(promData || []);
        } else if (MOCK_POLITICIANS_MAP[id as string]) {
          setPolitician(MOCK_POLITICIANS_MAP[id as string]);
          setPromises(MOCK_PROMISES[id as string] || []);
        } else {
          throw new Error("Politician not found");
        }
      } catch (error) {
        console.error("Failed to fetch:", error);
        if (MOCK_POLITICIANS_MAP[id as string]) {
          setPolitician(MOCK_POLITICIANS_MAP[id as string]);
          setPromises(MOCK_PROMISES[id as string] || []);
        }
      } finally {
        setLoading(false);
      }
    }
    
    if (id) fetchData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-12 h-12 text-primary animate-spin opacity-50" />
      </div>
    );
  }

  if (!politician) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <h1 className="text-4xl font-heading font-bold mb-4">Profil introuvable</h1>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          &larr; Retour à la liste
        </button>
      </div>
    );
  }

  const initials = `${politician.first_name.charAt(0)}${politician.last_name.charAt(0)}`;
  
  // Aggregate stats
  const total = promises.length;
  const kept = promises.filter(p => p.status === 'kept').length;
  const inProgress = promises.filter(p => p.status === 'in-progress').length;
  const broken = promises.filter(p => p.status === 'broken').length;
  const pending = promises.filter(p => p.status === 'pending').length;

  const filters = [
    { label: "Toutes", value: "Toutes", count: total },
    { label: "Tenues", value: "kept", count: kept },
    { label: "En cours", value: "in-progress", count: inProgress },
    { label: "Non tenues", value: "broken", count: broken },
    { label: "En attente", value: "pending", count: pending }
  ];

  const filteredPromises = promises.filter(p => 
    activeFilter === "Toutes" ? true : p.status === activeFilter
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header Profile */}
      <div className="bg-card border-b border-border shadow-sm pt-8 pb-12 px-4 relative overflow-hidden">
        <div className="tricolor-band left-0 w-2"><span></span><span></span><span></span></div>
        <div className="container mx-auto max-w-4xl relative z-10">
          <Link href="/promesses" className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors mb-12 text-sm font-semibold">
            <ArrowLeft className="w-4 h-4 mr-2" /> Retour aux élus
          </Link>

          <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center text-white text-4xl font-bold shadow-lg flex-shrink-0 border-4 border-background"
              style={{ backgroundColor: politician.party_color || '#95A5A6' }}
            >
              {initials}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-heading font-extrabold text-foreground mb-3">
                {politician.first_name} {politician.last_name}
              </h1>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6">
                <span className="text-xl text-muted-foreground font-medium">{politician.role}</span>
                <span className="text-muted-foreground">•</span>
                <span 
                  className="px-3 py-1 text-sm font-bold rounded-full text-white"
                  style={{ backgroundColor: politician.party_color || '#95A5A6' }}
                >
                  {politician.party}
                </span>
              </div>

              <div className="bg-background rounded-2xl p-5 border border-border mt-4 w-full">
                <div className="flex justify-between items-end mb-3">
                  <span className="font-heading font-bold text-lg">Suivi des promesses</span>
                  <span className="text-2xl font-bold text-primary">{kept}/{total} <span className="text-sm text-muted-foreground font-normal">tenues</span></span>
                </div>
                <ProgressBar total={total} kept={kept} inProgress={inProgress} broken={broken} pending={pending} />
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 text-sm text-center md:text-left">
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="font-semibold">{kept} tenues</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <Clock className="w-5 h-5 text-yellow-500" />
                    <span className="font-semibold">{inProgress} en cours</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <span className="font-semibold">{broken} non tenues</span>
                  </div>
                  <div className="flex items-center justify-center md:justify-start gap-2">
                    <HelpCircle className="w-5 h-5 text-gray-400" />
                    <span className="font-semibold">{pending} en attente</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 mt-12">
        <h2 className="text-2xl font-bold font-heading mb-6 flex items-center gap-2">
          Garde à vue des engagements
        </h2>
        
        <div className="flex gap-2 mb-8 overflow-x-auto pb-4 hide-scrollbar">
          {filters.map(filter => (
            <button
              key={filter.value}
              onClick={() => setActiveFilter(filter.value)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shadow-sm border ${
                activeFilter === filter.value 
                  ? "bg-primary text-primary-foreground border-primary" 
                  : "bg-card text-foreground border-border hover:bg-muted"
              }`}
            >
              {filter.label} <span className="text-[10px] bg-foreground/10 px-2 py-0.5 rounded-full">{filter.count}</span>
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {filteredPromises.length === 0 ? (
            <div className="text-center p-12 bg-card rounded-3xl border border-border shadow-sm">
              <p className="text-muted-foreground text-lg">Aucune promesse avec ce statut.</p>
            </div>
          ) : (
            filteredPromises.map((promise: any) => (
              <PromiseItem key={promise.id} promise={promise} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
