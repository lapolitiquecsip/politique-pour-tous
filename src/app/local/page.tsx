"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  MapPin, Users, Building2, TrendingUp, Search, ArrowRight, Vote,
  History, Building, ChevronRight, Map, Layers, LayoutGrid, Lock, Loader2, Star
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import GlossaryText from "@/components/ui/GlossaryText";
import { usePremium } from "@/lib/hooks/usePremium";
import { api } from "@/lib/api";
import { getPremiumUrl } from "@/lib/utils";
import { useCommuneSearch } from "@/lib/hooks/useCommuneSearch";
import type { CommuneResult } from "@/lib/hooks/useCommuneSearch";
import CommuneDetailPanel from "@/components/local/CommuneDetailPanel";

// Featured cities shown by default
const FEATURED_CITIES = [
  { name: "Paris", code: "75056", mayor: "Emmanuel Grégoire", party: "PS", population: "2.1M", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/La_Tour_Eiffel_vue_du_trocad%C3%A9ro.jpg/800px-La_Tour_Eiffel_vue_du_trocad%C3%A9ro.jpg" },
  { name: "Marseille", code: "13055", mayor: "Benoît Payan", party: "DVG", population: "870K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Marseille_Vieux_Port.jpg/800px-Marseille_Vieux_Port.jpg" },
  { name: "Lyon", code: "69123", mayor: "Grégory Doucet", party: "EELV", population: "522K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Lyon_-_Place_Bellecour.jpg/800px-Lyon_-_Place_Bellecour.jpg" },
  { name: "Toulouse", code: "31555", mayor: "Jean-Luc Moudenc", party: "LR", population: "498K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b3/Capitole_de_Toulouse.jpg/800px-Capitole_de_Toulouse.jpg" },
  { name: "Nice", code: "06088", mayor: "Eric Ciotti", party: "Horizons", population: "342K", image: "https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Promenade_des_Anglais_Nice.jpg/800px-Promenade_des_Anglais_Nice.jpg" },
  { name: "Nantes", code: "44109", mayor: "Johanna Rolland", party: "PS", population: "320K", image: "https://images.unsplash.com/photo-1584466977773-e625c37cdd50?auto=format&fit=crop&q=80&w=800" },
];

const REGIONS = [
  { name: "Île-de-France", president: "Valérie Pécresse", party: "LR", budget: "5.0 Md€", population: "12.3M", image: "/images/regions/ile_de_france.png" },
  { name: "Auvergne-Rhône-Alpes", president: "Laurent Wauquiez", party: "LR", budget: "3.6 Md€", population: "8.1M", image: "/images/regions/auvergne_rhone_alpes.png" },
  { name: "Hauts-de-France", president: "Xavier Bertrand", party: "LR", budget: "3.4 Md€", population: "6.0M", image: "/images/regions/hauts_de_france.png" },
  { name: "Nouvelle-Aquitaine", president: "Alain Rousset", party: "PS", budget: "3.2 Md€", population: "6.0M", image: "/images/regions/nouvelle_aquitaine.png" },
  { name: "Occitanie", president: "Carole Delga", party: "PS", budget: "3.1 Md€", population: "5.9M", image: "/images/regions/occitanie.png" },
  { name: "Grand Est", president: "Franck Leroy", party: "LR", budget: "2.9 Md€", population: "5.6M", image: "/images/regions/grand_est.png" },
  { name: "Provence-Alpes-Côte d'Azur", president: "Renaud Muselier", party: "LR", budget: "2.8 Md€", population: "5.1M", image: "/images/regions/paca.png" },
  { name: "Pays de la Loire", president: "Christelle Morançais", party: "LR", budget: "1.9 Md€", population: "3.8M", image: "/images/regions/pays_de_la_loire.png" },
  { name: "Normandie", president: "Hervé Morin", party: "LC", budget: "1.8 Md€", population: "3.3M", image: "/images/regions/normandie.png" },
  { name: "Bretagne", president: "Loïg Chesnais-Girard", party: "PS", budget: "1.6 Md€", population: "3.4M", image: "/images/regions/bretagne.png" },
  { name: "Bourgogne-Franche-Comté", president: "Marie-Guite Dufay", party: "PS", budget: "1.4 Md€", population: "2.8M", image: "/images/regions/bourgogne_franche_comte.png" },
  { name: "Centre-Val de Loire", president: "François Bonneau", party: "PS", budget: "1.3 Md€", population: "2.6M", image: "/images/regions/centre_val_de_loire.png" },
  { name: "Corse", president: "Gilles Simeoni", party: "Femu a Corsica", budget: "0.6 Md€", population: "0.3M", image: "/images/regions/corse.png" },
  { name: "Guadeloupe", president: "Ary Chalus", party: "GUSR", budget: "0.8 Md€", population: "0.4M", image: "/images/regions/guadeloupe.png" },
  { name: "Martinique", president: "Serge Letchimy", party: "PPM", budget: "0.9 Md€", population: "0.4M", image: "/images/regions/martinique.png" },
  { name: "Guyane", president: "Gabriel Serville", party: "DVG", budget: "0.4 Md€", population: "0.3M", image: "/images/regions/guyane.png" },
  { name: "La Réunion", president: "Huguette Bello", party: "PLR", budget: "1.0 Md€", population: "0.9M", image: "/images/regions/la_reunion.png" },
  { name: "Mayotte", president: "Ben Issa Ousseni", party: "LR", budget: "0.3 Md€", population: "0.3M", image: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?auto=format&fit=crop&q=80&w=800" },
];

const DEPARTMENTS = [
  { "name": "Ain (01)", "president": "Jean Deguerry", "party": "LR", "budget": "760 M€", "population": "663K" },
  { "name": "Aisne (02)", "president": "Nicolas Fricoteaux", "party": "UDI", "budget": "610 M€", "population": "527K" },
  { "name": "Allier (03)", "president": "Claude Riboulet", "party": "UDI", "budget": "385 M€", "population": "335K" },
  { "name": "Alpes-de-Haute-Provence (04)", "president": "Eliane Barreille", "party": "LR", "budget": "190 M€", "population": "165K" },
  { "name": "Hautes-Alpes (05)", "president": "Jean-Marie Bernard", "party": "LR", "budget": "165 M€", "population": "141K" },
  { "name": "Alpes-Maritimes (06)", "president": "Charles-Ange Ginesy", "party": "LR", "budget": "1.25 Md€", "population": "1.1M" },
  { "name": "Ardèche (07)", "president": "Olivier Amrane", "party": "LR", "budget": "380 M€", "population": "331K" },
  { "name": "Ardennes (08)", "president": "Noël Bourgeois", "party": "LR", "budget": "310 M€", "population": "269K" },
  { "name": "Ariège (09)", "president": "Christine Téqui", "party": "PS", "budget": "180 M€", "population": "155K" },
  { "name": "Aube (10)", "president": "Philippe Pichery", "party": "DVD", "budget": "360 M€", "population": "312K" },
  { "name": "Aude (11)", "president": "Hélène Sandragné", "party": "PS", "budget": "430 M€", "population": "376K" },
  { "name": "Aveyron (12)", "president": "Arnaud Viala", "party": "LR", "budget": "320 M€", "population": "280K" },
  { "name": "Bouches-du-Rhône (13)", "president": "Martine Vassal", "party": "DVD", "budget": "2.85 Md€", "population": "2.0M" },
  { "name": "Calvados (14)", "president": "Jean-Léonce Dupont", "party": "LC", "budget": "810 M€", "population": "701K" },
  { "name": "Cantal (15)", "president": "Bruno Faure", "party": "LR", "budget": "170 M€", "population": "144K" },
  { "name": "Charente (16)", "president": "Philippe Bouty", "party": "DVG", "budget": "405 M€", "population": "351K" },
  { "name": "Charente-Maritime (17)", "president": "Sylvie Marcilly", "party": "DVD", "budget": "760 M€", "population": "661K" },
  { "name": "Cher (18)", "president": "Jacques Fleury", "party": "LR", "budget": "345 M€", "population": "300K" },
  { "name": "Corrèze (19)", "president": "Pascal Coste", "party": "LR", "budget": "275 M€", "population": "240K" },
  { "name": "Corse-du-Sud (2A)", "president": "Pierre-Jean Luciani", "party": "DVD", "budget": "190 M€", "population": "163K" },
  { "name": "Haute-Corse (2B)", "president": "François Orlandi", "party": "PRG", "budget": "215 M€", "population": "185K" },
  { "name": "Côte-d'Or (21)", "president": "François Sauvadet", "party": "UDI", "budget": "620 M€", "population": "536K" },
  { "name": "Côtes-d'Armor (22)", "president": "Christian Coail", "party": "PS", "budget": "700 M€", "population": "606K" },
  { "name": "Creuse (23)", "president": "Valérie Simonet", "party": "LR", "budget": "135 M€", "population": "116K" },
  { "name": "Dordogne (24)", "president": "Germinal Peiro", "party": "PS", "budget": "475 M€", "population": "413K" },
  { "name": "Doubs (25)", "president": "Christine Bouquin", "party": "DVD", "budget": "630 M€", "population": "547K" },
  { "name": "Drôme (26)", "president": "Marie-Pierre Mouton", "party": "LR", "budget": "600 M€", "population": "519K" },
  { "name": "Eure (27)", "president": "Alexandre Rassaërt", "party": "DVD", "budget": "690 M€", "population": "599K" },
  { "name": "Eure-et-Loir (28)", "president": "Christophe Le Dorven", "party": "LR", "budget": "500 M€", "population": "431K" },
  { "name": "Finistère (29)", "president": "Maël de Calan", "party": "DVD", "budget": "1.06 Md€", "population": "922K" },
  { "name": "Gard (30)", "president": "Françoise Laurent-Perrigot", "party": "PS", "budget": "870 M€", "population": "757K" },
  { "name": "Haute-Garonne (31)", "president": "Sébastien Vincini", "party": "PS", "budget": "1.65 Md€", "population": "1.4M" },
  { "name": "Gers (32)", "president": "Philippe Dupouy", "party": "PS", "budget": "225 M€", "population": "192K" },
  { "name": "Gironde (33)", "president": "Jean-Luc Gleyze", "party": "PS", "budget": "1.95 Md€", "population": "1.7M" },
  { "name": "Hérault (34)", "president": "Kléber Mesquida", "party": "PS", "budget": "1.40 Md€", "population": "1.2M" },
  { "name": "Ille-et-Vilaine (35)", "president": "Jean-Luc Chenut", "party": "PS", "budget": "1.30 Md€", "population": "1.1M" },
  { "name": "Indre (36)", "president": "Marc Fleuret", "party": "LR", "budget": "250 M€", "population": "217K" },
  { "name": "Indre-et-Loire (37)", "president": "Jean-Gérard Paumier", "party": "LR", "budget": "710 M€", "population": "612K" },
  { "name": "Isère (38)", "president": "Jean-Pierre Barbier", "party": "LR", "budget": "1.50 Md€", "population": "1.3M" },
  { "name": "Jura (39)", "president": "Clément Pernot", "party": "LR", "budget": "300 M€", "population": "259K" },
  { "name": "Landes (40)", "president": "Xavier Fortinon", "party": "PS", "budget": "490 M€", "population": "422K" },
  { "name": "Loir-et-Cher (41)", "president": "Philippe Gouet", "party": "UDI", "budget": "380 M€", "population": "329K" },
  { "name": "Loire (42)", "president": "Georges Ziegler", "party": "LR", "budget": "890 M€", "population": "769K" },
  { "name": "Haute-Loire (43)", "president": "Marie-Agnès Petit", "party": "LR", "budget": "265 M€", "population": "228K" },
  { "name": "Loire-Atlantique (44)", "president": "Michel Ménard", "party": "PS", "budget": "1.70 Md€", "population": "1.5M" },
  { "name": "Loiret (45)", "president": "Marc Gaudet", "party": "UDI", "budget": "790 M€", "population": "684K" },
  { "name": "Lot (46)", "president": "Serge Rigal", "party": "DVG", "budget": "205 M€", "population": "174K" },
  { "name": "Lot-et-Garonne (47)", "president": "Sophie Borderie", "party": "PS", "budget": "385 M€", "population": "331K" },
  { "name": "Lozère (48)", "president": "Sophie Pantel", "party": "PS", "budget": "110 M€", "population": "77K" },
  { "name": "Maine-et-Loire (49)", "president": "Florence Dabin", "party": "DVD", "budget": "955 M€", "population": "825K" },
  { "name": "Manche (50)", "president": "Jean Morin", "party": "DVD", "budget": "575 M€", "population": "496K" },
  { "name": "Marne (51)", "president": "Christian Bruyen", "party": "DVD", "budget": "655 M€", "population": "565K" },
  { "name": "Haute-Marne (52)", "president": "Nicolas Lacroix", "party": "LR", "budget": "200 M€", "population": "171K" },
  { "name": "Mayenne (53)", "president": "Olivier Richefou", "party": "UDI", "budget": "355 M€", "population": "306K" },
  { "name": "Meurthe-et-Moselle (54)", "president": "Chaynesse Khirouni", "party": "PS", "budget": "850 M€", "population": "732K" },
  { "name": "Meuse (55)", "president": "Jérôme Dumont", "party": "DVD", "budget": "215 M€", "population": "182K" },
  { "name": "Morbihan (56)", "president": "David Lappartient", "party": "DVD", "budget": "890 M€", "population": "769K" },
  { "name": "Moselle (57)", "president": "Patrick Weiten", "party": "UDI", "budget": "1.20 Md€", "population": "1.0M" },
  { "name": "Nièvre (58)", "president": "Fabien Bazin", "party": "PS", "budget": "235 M€", "population": "202K" },
  { "name": "Nord (59)", "president": "Christian Poiret", "party": "DVD", "budget": "3.55 Md€", "population": "2.6M" },
  { "name": "Oise (60)", "president": "Nadège Lefebvre", "party": "LR", "budget": "960 M€", "population": "830K" },
  { "name": "Orne (61)", "president": "Christophe de Balorre", "party": "LR", "budget": "320 M€", "population": "277K" },
  { "name": "Pas-de-Calais (62)", "president": "Jean-Claude Leroy", "party": "PS", "budget": "1.75 Md€", "population": "1.5M" },
  { "name": "Puy-de-Dôme (63)", "president": "Lionel Chauvin", "party": "LR", "budget": "765 M€", "population": "662K" },
  { "name": "Pyrénées-Atlantiques (64)", "president": "Jean-Jacques Lasserre", "party": "MoDem", "budget": "800 M€", "population": "693K" },
  { "name": "Hautes-Pyrénées (65)", "president": "Michel Pélieu", "party": "PRG", "budget": "270 M€", "population": "231K" },
  { "name": "Pyrénées-Orientales (66)", "president": "Hermeline Malherbe", "party": "PS", "budget": "565 M€", "population": "487K" },
  { "name": "Bas-Rhin (67)", "president": "Frédéric Bierry", "party": "LR", "budget": "1.35 Md€", "population": "1.2M" },
  { "name": "Haut-Rhin (68)", "president": "Frédéric Bierry", "party": "LR", "budget": "890 M€", "population": "767K" },
  { "name": "Rhône (69)", "president": "Christophe Guilloteau", "party": "LR", "budget": "545 M€", "population": "468K" },
  { "name": "Métropole de Lyon (69M)", "president": "Bruno Bernard", "party": "EELV", "budget": "3.90 Md€", "population": "1.4M" },
  { "name": "Haute-Saône (70)", "president": "Yves Krattinger", "party": "PS", "budget": "270 M€", "population": "234K" },
  { "name": "Saône-et-Loire (71)", "president": "André Accary", "party": "DVD", "budget": "635 M€", "population": "549K" },
  { "name": "Sarthe (72)", "president": "Dominique Le Mèner", "party": "DVD", "budget": "655 M€", "population": "566K" },
  { "name": "Savoie (73)", "president": "Hervé Gaymard", "party": "LR", "budget": "515 M€", "population": "442K" },
  { "name": "Haute-Savoie (74)", "president": "Martial Saddier", "party": "LR", "budget": "980 M€", "population": "841K" },
  { "name": "Paris (75)", "president": "Anne Hidalgo", "party": "PS", "budget": "10.5 Md€", "population": "2.1M" },
  { "name": "Seine-Maritime (76)", "president": "Bertrand Bellanger", "party": "DVD", "budget": "1.45 Md€", "population": "1.3M" },
  { "name": "Seine-et-Marne (77)", "president": "Jean-François Parigi", "party": "LR", "budget": "1.65 Md€", "population": "1.4M" },
  { "name": "Yvelines (78)", "president": "Pierre Bédier", "party": "LR", "budget": "1.70 Md€", "population": "1.5M" },
  { "name": "Deux-Sèvres (79)", "president": "Coralie Dénoues", "party": "DVD", "budget": "435 M€", "population": "375K" },
  { "name": "Somme (80)", "president": "Stéphane Haussoulier", "party": "DVD", "budget": "655 M€", "population": "566K" },
  { "name": "Tarn (81)", "president": "Christophe Ramond", "party": "PS", "budget": "455 M€", "population": "394K" },
  { "name": "Tarn-et-Garonne (82)", "president": "Michel Weill", "party": "PRG", "budget": "305 M€", "population": "263K" },
  { "name": "Var (83)", "president": "Jean-Louis Masson", "party": "LR", "budget": "1.25 Md€", "population": "1.1M" },
  { "name": "Vaucluse (84)", "president": "Dominique Santoni", "party": "PS", "budget": "655 M€", "population": "565K" },
  { "name": "Vendée (85)", "president": "Alain Leboeuf", "party": "LR", "budget": "800 M€", "population": "694K" },
  { "name": "Vienne (86)", "president": "Alain Pichon", "party": "DVD", "budget": "510 M€", "population": "439K" },
  { "name": "Haute-Vienne (87)", "president": "Jean-Claude Leblois", "party": "PS", "budget": "430 M€", "population": "372K" },
  { "name": "Vosges (88)", "president": "François Vannson", "party": "DVD", "budget": "415 M€", "population": "361K" },
  { "name": "Yonne (89)", "president": "Patrick Gendraud", "party": "LR", "budget": "385 M€", "population": "333K" },
  { "name": "Territoire de Belfort (90)", "president": "Florian Bouquet", "party": "LR", "budget": "165 M€", "population": "140K" },
  { "name": "Essonne (91)", "president": "François Durovray", "party": "LR", "budget": "1.50 Md€", "population": "1.3M" },
  { "name": "Hauts-de-Seine (92)", "president": "Georges Siffredi", "party": "LR", "budget": "2.20 Md€", "population": "1.6M" },
  { "name": "Seine-Saint-Denis (93)", "president": "Stéphane Troussel", "party": "PS", "budget": "2.10 Md€", "population": "1.7M" },
  { "name": "Val-de-Marne (94)", "president": "Olivier Capitanio", "party": "LR", "budget": "1.80 Md€", "population": "1.4M" },
  { "name": "Val-d'Oise (95)", "president": "Marie-Christine Cavecchi", "party": "LR", "budget": "1.45 Md€", "population": "1.3M" },
  { "name": "Guadeloupe (971)", "president": "Guy Losbar", "party": "GUSR", "budget": "650 M€", "population": "384K" },
  { "name": "Martinique (972)", "president": "Serge Letchimy", "party": "PPM", "budget": "600 M€", "population": "353K" },
  { "name": "Guyane (973)", "president": "Gabriel Serville", "party": "PeP-G", "budget": "550 M€", "population": "287K" },
  { "name": "La Réunion (974)", "president": "Cyrille Melchior", "party": "DVD", "budget": "1.30 Md€", "population": "871K" },
  { "name": "Mayotte (976)", "president": "Ben Issa Ousseni", "party": "LR", "budget": "450 M€", "population": "289K" }
];

export default function LocalPoliticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="animate-spin text-rose-600" size={40} /></div>}>
      <LocalPoliticsContent />
    </Suspense>
  );
}

function LocalPoliticsContent() {
  const { userId, isPremium, loading: pLoading } = usePremium();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"region" | "departement" | "commune">("commune");
  const [search, setSearch] = useState("");
  const communeSearch = useCommuneSearch();
  const [selectedCommune, setSelectedCommune] = useState<CommuneResult | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [savedItems, setSavedItems] = useState<any[]>([]);
  const [loadingSave, setLoadingSave] = useState<string | null>(null);

  useEffect(() => {
    if (userId && isPremium) {
      api.getUserSavedItems(userId).then(setSavedItems);
    }
  }, [userId, isPremium]);

  useEffect(() => {
    const code = searchParams.get('code');
    const type = searchParams.get('type');
    
    if (code && type) {
      if (type === 'commune') {
        setActiveTab('commune');
        // Fetch commune data and open panel
        const fetchCommune = async () => {
           try {
             const res = await fetch(`https://geo.api.gouv.fr/communes/${code}?fields=nom,code,codesPostaux,population,departement,region`);
             const data = await res.json();
             if (data && data.code) {
               setSelectedCommune(data);
             }
           } catch (e) {
             console.error("Error fetching linked commune:", e);
           }
        };
        fetchCommune();
      } else if (type === 'region') {
        setActiveTab('region');
        setSearch(code); // Filter by region name
      } else if (type === 'department') {
        setActiveTab('departement');
        setSearch(code); // Filter by department name
      }
    }
  }, [searchParams]);

  const toggleFavorite = async (id: string, type: 'region' | 'department') => {
    if (!userId) {
      alert("Veuillez vous connecter pour enregistrer vos favoris.");
      return;
    }

    if (!isPremium) {
      alert("Cette fonctionnalité est réservée aux membres PREMIUM. Passez à l'offre Elite pour suivre vos territoires !");
      return;
    }

    setLoadingSave(id);
    try {
      const isCurrentlySaved = savedItems.some(i => i.item_id === id && i.item_type === type);
      if (isCurrentlySaved) {
        await api.unsaveItem(userId, id, type);
      } else {
        await api.saveItem(userId, id, type);
      }
      
      // Refresh saved items list
      const updated = await api.getUserSavedItems(userId);
      setSavedItems(updated);
    } catch (err: any) {
      console.error("Error toggling favorite:", err);
    } finally {
      setLoadingSave(null);
    }
  };

  const filteredItems = (() => {
    const s = search.toLowerCase();
    if (activeTab === "region") {
      return REGIONS.filter(r => r.name.toLowerCase().includes(s) || r.president.toLowerCase().includes(s));
    } else if (activeTab === "departement") {
      return DEPARTMENTS.filter(d => d.name.toLowerCase().includes(s) || d.president.toLowerCase().includes(s));
    }
    return []; // communes handled separately
  })();

  return (
    <>
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* 1. HERO SECTION (POSTER IMPACT STYLE) */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden bg-white">
        <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none select-none">
          <span className="absolute top-10 left-10 text-[15rem] font-staatliches leading-none rotate-12">TERRITOIRES</span>
          <span className="absolute bottom-10 right-10 text-[15rem] font-staatliches leading-none -rotate-12">PROXIMITÉ</span>
        </div>

        <div className="container mx-auto max-w-6xl relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600"></span>
              </span>
              <span className="text-xs font-black uppercase tracking-widest text-rose-600">Action Locale</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-staatliches uppercase tracking-tight leading-tight mb-8 py-4">
              La Politique <span className="inline-block bg-gradient-to-r from-rose-600 via-fuchsia-600 to-rose-600 bg-clip-text text-transparent italic pl-2 pr-12">Locale</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-slate-500 font-medium italic leading-relaxed max-w-3xl mx-auto text-pretty">
              Découvrez les acteurs de vos territoires, des maires aux conseillers municipaux, et comprenez comment vos impôts locaux façonnent votre ville.
            </p>

            <div className="h-1.5 w-32 bg-gradient-to-r from-rose-600 to-fuchsia-600 mt-8 rounded-full" />
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-4 mt-12">
        {/* 1.5 TABS NAVIGATION (GROS PANNEAU) */}
        <div className="mb-16">
          <div className="bg-white p-2 rounded-[2.5rem] border border-slate-200 shadow-2xl shadow-slate-200/50 flex flex-col md:flex-row gap-2">
            {[
              { id: "region", label: "La Région", icon: Map },
              { id: "departement", label: "Le Département", icon: Layers },
              { id: "commune", label: "La Commune", icon: LayoutGrid }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`
                    flex-1 flex items-center justify-center gap-4 py-8 rounded-[2rem] transition-all duration-500 relative overflow-hidden group
                    ${isActive ? 'bg-white text-rose-600 shadow-[0_20px_50px_rgba(225,29,72,0.15)] border border-rose-100 translate-y-[-4px]' : 'hover:bg-slate-50 text-slate-400'}
                  `}
                >
                  {isActive && (
                    <motion.div 
                      layoutId="activeGlow"
                      className="absolute inset-0 bg-gradient-to-r from-rose-50 to-fuchsia-50 pointer-events-none" 
                    />
                  )}
                  <Icon size={24} className={isActive ? 'text-rose-600' : 'group-hover:text-slate-600'} />
                  <div className="text-left relative z-10">
                    <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isActive ? 'text-rose-400' : 'text-slate-300'}`}>Échelon</p>
                    <span className="text-xl font-bold font-staatliches uppercase tracking-wide">{tab.label}</span>
                  </div>
                  {isActive && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-rose-600 rounded-t-full" />}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MAIN CONTENT - ITEMS GRID */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* SEARCH & FILTERS */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
              <div className="relative w-full md:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                {activeTab === 'commune' && communeSearch.loading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 text-rose-400 animate-spin" size={18} />
                )}
                <input 
                  type="text"
                  placeholder={
                    activeTab === 'commune' ? "Rechercher parmi 35 000 communes..." : 
                    activeTab === 'departement' ? "Rechercher un département, un président..." :
                    "Rechercher une région, un président..."
                  }
                  value={activeTab === 'commune' ? communeSearch.query : search}
                  onChange={(e) => {
                    if (activeTab === 'commune') {
                      communeSearch.setQuery(e.target.value);
                      communeSearch.ensureMayorsLoaded();
                      setShowDropdown(true);
                    } else {
                      setSearch(e.target.value);
                    }
                  }}
                  onFocus={() => {
                    if (activeTab === 'commune') {
                      communeSearch.ensureMayorsLoaded();
                      setShowDropdown(true);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white border border-slate-200 focus:ring-2 focus:ring-rose-500 outline-none transition-all shadow-sm font-medium text-slate-900"
                />

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {activeTab === 'commune' && showDropdown && communeSearch.results.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/60 overflow-hidden z-40 max-h-[400px] overflow-y-auto"
                    >
                      {communeSearch.results.map((commune, i) => {
                        const mayor = communeSearch.getMayor(commune.code);
                        return (
                          <button
                            key={commune.code}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSelectedCommune(commune);
                              setShowDropdown(false);
                              communeSearch.setQuery(commune.nom);
                            }}
                            className="w-full px-5 py-3.5 flex items-center gap-4 hover:bg-rose-50 transition-colors text-left border-b border-slate-50 last:border-0"
                          >
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-100 to-fuchsia-100 flex items-center justify-center text-rose-600 flex-shrink-0">
                              <MapPin size={16} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 truncate">{commune.nom}</span>
                                <span className="text-[10px] text-slate-400 font-medium">{commune.codesPostaux?.[0]}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                                <span>{commune.departement?.nom}</span>
                                {mayor && (
                                  <>
                                    <span className="text-slate-300">·</span>
                                    <span className="font-semibold text-slate-700">{mayor.n}</span>
                                    {mayor.p && <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-bold">{mayor.p}</span>}
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <span className="text-[10px] font-bold text-slate-400">{commune.population?.toLocaleString('fr-FR')} hab.</span>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Counter badge */}
                {activeTab === 'commune' && (
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {communeSearch.mayorsDb ? '34 637 communes disponibles' : communeSearch.mayorsLoading ? 'Chargement de la base...' : 'Tapez pour rechercher'}
                    </span>
                    {communeSearch.mayorsDb && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </div>
                )}
              </div>
            </div>

            {/* COMMUNE TAB: Featured cities + search results */}
            {activeTab === 'commune' && (
              <>
                {!communeSearch.query && (
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Grandes villes</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {FEATURED_CITIES.map((city, idx) => (
                        <motion.button
                          key={city.code}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.08 }}
                          onClick={async () => {
                            await communeSearch.ensureMayorsLoaded();
                            const res = await fetch(`https://geo.api.gouv.fr/communes/${city.code}?fields=nom,code,codesPostaux,population,departement,region`);
                            const data = await res.json();
                            setSelectedCommune(data);
                          }}
                          className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500 text-left"
                        >
                          <div className="relative h-48 overflow-hidden">
                            <img src={city.image} alt={city.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                            <div className="absolute bottom-4 left-6">
                              <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">Commune</p>
                              <h4 className="text-white font-bold text-xl leading-tight">{city.name}</h4>
                            </div>
                          </div>
                          <div className="p-8 space-y-6">
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Maire</span>
                                <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">{city.party}</span>
                              </div>
                              <h3 className="text-2xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">{city.mayor}</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Users size={10} /> Population</span>
                                <p className="text-sm font-black text-slate-900">{city.population}</p>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Building2 size={10} /> Mandat</span>
                                <p className="text-sm font-black text-slate-900">2026</p>
                              </div>
                            </div>
                            <div className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-rose-600 transition-colors pt-2">
                              <span className="text-[10px] font-black uppercase tracking-widest">Voir les détails</span>
                              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-rose-600 group-hover/btn:text-white transition-all"><ChevronRight size={18} /></div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* REGION / DEPARTMENT TAB: Card grid */}
            {activeTab !== 'commune' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredItems.map((item: any, idx: number) => (
                  <motion.div
                    key={`${activeTab}-${idx}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.06 }}
                    className="group bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden hover:shadow-2xl transition-all duration-500"
                  >
                    {item.image && (
                      <div className="relative h-48 overflow-hidden">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent" />
                        
                        <div className="absolute top-4 right-4 flex gap-2">
                          {isPremium && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.name, activeTab === 'region' ? 'region' : 'department');
                              }}
                              disabled={loadingSave === item.name}
                              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                                savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department'))
                                  ? "bg-amber-400 text-slate-900" 
                                  : "bg-white/20 text-white hover:bg-white/30"
                              }`}
                            >
                              {loadingSave === item.name ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Star size={14} className={savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department')) ? "fill-current" : ""} />
                              )}
                            </button>
                          )}
                        </div>

                        <div className="absolute bottom-4 left-6">
                          <p className="text-rose-400 font-black text-[9px] uppercase tracking-widest mb-1">{activeTab === 'region' ? 'Région' : 'Département'}</p>
                          <h4 className="text-white font-bold text-xl leading-tight">{item.name}</h4>
                        </div>
                      </div>
                    )}
                    {!item.image && (
                      <div className="relative h-28 bg-gradient-to-br from-rose-600 to-fuchsia-600 flex items-end p-6">
                        <div className="absolute top-4 right-4 flex gap-2">
                          {isPremium && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(item.name, activeTab === 'region' ? 'region' : 'department');
                              }}
                              disabled={loadingSave === item.name}
                              className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-all ${
                                savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department'))
                                  ? "bg-amber-400 text-slate-900" 
                                  : "bg-white/20 text-white hover:bg-white/30"
                              }`}
                            >
                              {loadingSave === item.name ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Star size={14} className={savedItems.some(i => i.item_id === item.name && i.item_type === (activeTab === 'region' ? 'region' : 'department')) ? "fill-current" : ""} />
                              )}
                            </button>
                          )}
                        </div>
                        <div>
                          <p className="text-rose-200 font-black text-[9px] uppercase tracking-widest mb-1">{activeTab === 'region' ? 'Région' : 'Département'}</p>
                          <h4 className="text-white font-bold text-xl leading-tight">{item.name}</h4>
                        </div>
                      </div>
                    )}
                    <div className="p-8 space-y-6">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Président(e)</span>
                          <span className="px-2 py-0.5 bg-rose-50 text-rose-600 text-[10px] font-bold rounded-full">{item.party}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 group-hover:text-rose-600 transition-colors leading-tight">{item.president}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-6 py-6 border-y border-slate-50">
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><TrendingUp size={10} /> Budget</span>
                          <p className="text-sm font-black text-slate-900">{item.budget}</p>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Users size={10} /> Population</span>
                          <p className="text-sm font-black text-slate-900">{item.population || "N/A"}</p>
                        </div>
                      </div>
                      <button className="w-full flex items-center justify-between group/btn text-slate-900 hover:text-rose-600 transition-colors pt-2">
                        <span className="text-[10px] font-black uppercase tracking-widest">Voir les compétences</span>
                        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover/btn:bg-rose-600 group-hover/btn:text-white transition-all"><ChevronRight size={18} /></div>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* SECTION: ÉLECTIONS */}
            <section className="bg-rose-950 rounded-[3rem] p-10 md:p-16 text-white relative overflow-hidden">
               <Vote className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 -rotate-12" />
               <div className="relative z-10 space-y-8">
                 <div className="space-y-4">
                   <h2 className="text-4xl md:text-6xl font-staatliches uppercase tracking-tighter leading-none">
                     Prochaines <span className="text-rose-400 italic">Échéances</span>
                   </h2>
                   <p className="text-white/60 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                     Préparez-vous pour les scrutins de 2026. La démocratie commence au bas de chez vous.
                   </p>
                 </div>
                 
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-rose-400 font-black text-[10px] uppercase tracking-widest mb-4">Printemps 2026</p>
                     <h4 className="text-xl font-bold mb-2">Municipales</h4>
                     <p className="text-white/40 text-sm">Élection des maires pour 6 ans.</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-fuchsia-400 font-black text-[10px] uppercase tracking-widest mb-4">2027</p>
                     <h4 className="text-xl font-bold mb-2">Législatives</h4>
                     <p className="text-white/40 text-sm">Renouvellement des députés.</p>
                   </div>
                   <div className="p-6 bg-white/5 border border-white/10 rounded-2xl">
                     <p className="text-pink-400 font-black text-[10px] uppercase tracking-widest mb-4">2028</p>
                     <h4 className="text-xl font-bold mb-2">Sénatoriales</h4>
                     <p className="text-white/40 text-sm">Renouvellement partiel.</p>
                   </div>
                 </div>
               </div>
            </section>
          </div>

          {/* SIDEBAR - TOOLS & INFO */}
          <div className="lg:col-span-4 space-y-8">
            
            {/* INFO INTRO */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 relative overflow-hidden">
               <div className="relative z-10 space-y-6">
                 <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center">
                   <History size={24} />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-xl font-bold text-slate-900">Le Saviez-vous ?</h3>
                   <p className="text-slate-500 text-sm leading-relaxed font-medium">
                     <GlossaryText>
                       Les maires sont élus par le conseil municipal, qui est lui-même élu au suffrage universel direct.
                     </GlossaryText>
                   </p>
                 </div>
                 <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Astuce</p>
                   <p className="text-[10px] text-slate-600 font-medium italic">
                     Passez votre souris sur les mots soulignés pour voir leur définition.
                   </p>
                 </div>
               </div>
            </div>

            {/* BUDGET CHART */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20">
               <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-bold text-slate-900">Top Budgets</h3>
                 <Building size={20} className="text-slate-400" />
               </div>
               <div className="space-y-6">
                 {[
                   { label: "Paris", val: 100, color: "bg-rose-600" },
                   { label: "Marseille", val: 16, color: "bg-fuchsia-600" },
                   { label: "Lyon", val: 8, color: "bg-pink-600" }
                 ].map((item, i) => (
                   <div key={i} className="space-y-2">
                     <div className="flex justify-between text-[11px] font-bold">
                       <span>{item.label}</span>
                       <span className="text-slate-400">{item.val / 10} Md€</span>
                     </div>
                     <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <motion.div 
                         initial={{ width: 0 }}
                         whileInView={{ width: `${item.val}%` }}
                         transition={{ duration: 1, delay: i * 0.1 }}
                         className={`h-full ${item.color}`}
                       />
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* TEASER/TOOL: LE COMPARATEUR TERRITORIAL */}
            <Link 
              href={isPremium ? "/local/comparateur/app" : "/local/comparateur"}
              className="relative group block overflow-hidden bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-slate-900">Comparateur Territorial</h3>
                  {isPremium && <span className="px-2 py-0.5 bg-amber-100 text-amber-600 text-[8px] font-black uppercase rounded-full">Premium Unlocked</span>}
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                  <Map size={16} />
                </div>
              </div>
              
              <div className={`space-y-4 transition-all duration-700 ${!isPremium ? 'opacity-40 blur-[5px] pointer-events-none' : 'opacity-100'}`}>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">{isPremium ? "Sélectionner une ville..." : "Région A..."}</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
                <div className="flex justify-center">
                  <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-black text-xs shadow-lg shadow-amber-500/40">VS</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-400">{isPremium ? "Comparer avec..." : "Région B..."}</span>
                  <ChevronRight size={14} className="text-slate-300" />
                </div>
              </div>

              {/* TEASER OVERLAY - ONLY FOR NON-PREMIUM */}
              {(!isPremium && !pLoading) && (
                <div className="absolute inset-0 bg-white/20 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-10">
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xl font-staatliches uppercase tracking-tight text-amber-600">Le Comparateur <span className="text-slate-900">Territorial</span></h4>
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest leading-relaxed">
                      Villes vs Villes, Départements vs Départements <br />
                      ou Régions vs Régions : comparez tout.
                    </p>
                  </div>
                  <div className="px-6 py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-xl transition-all group-hover:bg-amber-500 group-hover:scale-105">
                    Découvrir l'outil
                  </div>
                </div>
              )}
            </Link>

            {/* TEASER/TOOL: RADAR DES GRANDS TRAVAUX */}
            <Link 
              href={isPremium ? "/local/radar/app" : "/local/radar"}
              className="relative group block overflow-hidden bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl shadow-slate-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="absolute top-0 right-0 p-8 opacity-10">
                <Building2 size={80} className="text-amber-400" />
              </div>

              <div className="flex items-center justify-between mb-8 relative z-20">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold">Radar des Grands Travaux</h3>
                  {isPremium && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[8px] font-black uppercase rounded-full border border-amber-500/30">Accès Illimité</span>}
                </div>
                <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
                  <TrendingUp size={16} />
                </div>
              </div>

              <div className={`space-y-4 transition-all duration-700 relative z-10 ${!isPremium ? 'opacity-20 blur-[6px] pointer-events-none' : 'opacity-100'}`}>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold mb-2">Extension du Métro</h4>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-2/3 shadow-[0_0_10px_#f59e0b]" />
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <h4 className="text-xs font-bold mb-2">Pôle Santé Régional</h4>
                  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 w-1/3 shadow-[0_0_10px_#f59e0b]" />
                  </div>
                </div>
              </div>

              {/* TEASER OVERLAY - ONLY FOR NON-PREMIUM */}
              {(!isPremium && !pLoading) && (
                <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[3px] flex flex-col items-center justify-center p-6 text-center z-30">
                  <div className="space-y-2 mb-6">
                    <h4 className="text-xl font-staatliches uppercase tracking-tight text-white">Radar des <span className="text-amber-500 italic">Grands Travaux</span></h4>
                    <p className="text-[10px] text-white/50 font-black uppercase tracking-widest leading-relaxed">
                      Suivi budgétaire, retards et <br />
                      coulisses des chantiers locaux.
                    </p>
                  </div>
                  <div className="px-6 py-3 bg-amber-500 text-slate-900 text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-amber-500/20 group-hover:bg-white group-hover:text-amber-600 transition-all">
                    Accéder aux dossiers
                  </div>
                </div>
              )}
            </Link>

          </div>
        </div>
      </div>
    </main>

      {/* COMMUNE DETAIL PANEL */}
      <CommuneDetailPanel
        commune={selectedCommune}
        mayor={selectedCommune ? communeSearch.getMayor(selectedCommune.code) : null}
        onClose={() => setSelectedCommune(null)}
      />
    </>
  );
}
