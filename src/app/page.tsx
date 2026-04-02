import { api } from "@/lib/api";
import Link from "next/link";
import { 
  BookOpen, 
  CalendarDays, 
  CheckSquare, 
  Mail, 
  Newspaper, 
  MessageSquare,
  ArrowRight,
  Landmark
} from "lucide-react";
import FeedItemCard from "@/components/home/FeedItemCard";
import InstitutionsGrid from "@/components/home/InstitutionsGrid";
import StatsPanel from "@/components/home/StatsPanel";

export default async function Home() {
  const latestContent = await api.getContent(6);

  return (
    <div className="flex flex-col min-h-screen">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[80vh] flex flex-col items-center justify-center text-center px-4 -mt-16 pt-16">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-extrabold text-foreground leading-tight tracking-tight">
            La politique, <br className="hidden md:block" />
            <span className="text-primary">c&apos;est simple.</span>
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
            Comprendre la politique française n&apos;a jamais été aussi accessible.
          </p>
          <div className="pt-8">
            <a 
              href="#institutions" 
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:-translate-y-1 transform"
            >
              Explorer le site
              <ArrowRight className="ml-2 w-5 h-5" />
            </a>
          </div>
        </div>
      </section>

      {/* 2. LES 3 INSTITUTIONS (côte à côte avec zoom au clic) */}
      <section id="institutions" className="scroll-mt-24 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-center">
            Les institutions au quotidien
          </h2>
          <InstitutionsGrid />
        </div>
      </section>

      {/* 3. STATS + LE SAVIEZ-VOUS (fusionnés) */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <StatsPanel />
        </div>
      </section>

      {/* 4. FIL D'ACTUALITÉ */}
      <section id="actualites" className="scroll-mt-24 py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-12">
            <h2 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
              <Newspaper className="w-8 h-8 text-primary" />
              Aujourd&apos;hui en politique
            </h2>
          </div>

          {!latestContent || latestContent.length === 0 ? (
            <div className="bg-card text-center p-12 rounded-3xl border shadow-sm flex flex-col items-center justify-center max-w-3xl mx-auto">
              <Landmark className="w-16 h-16 text-muted-foreground/30 mb-6" />
              <h3 className="text-2xl font-bold mb-3">Les actualités arrivent bientôt</h3>
              <p className="text-muted-foreground text-lg">
                Nos robots sont en train de lire les textes du Parlement. 
                Revenez dans quelques instants pour l&apos;essentiel de la journée politique.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {latestContent.map((item: any) => (
                <FeedItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 5. APERÇU DES SECTIONS */}
      <section className="py-24 px-4 container mx-auto max-w-6xl">
        <h2 className="text-3xl font-bold mb-12 text-center">Explorez nos ressources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FeatureCard 
            href="/calendrier" 
            title="Calendrier" 
            desc="L'ordre du jour du Parlement, semaine après semaine."
            icon={<CalendarDays size={24} />}
            colorClass="bg-blue-50 text-blue-600 border-blue-100"
          />
          <FeatureCard 
            href="/promesses" 
            title="Ils avaient dit que..." 
            desc="Le suivi précis des promesses tenues ou oubliées."
            icon={<MessageSquare size={24} />}
            colorClass="bg-red-50 text-red-600 border-red-100"
          />
          <FeatureCard 
            href="/vocabulaire" 
            title="Vocabulaire" 
            desc="Le dico pour décoder enfin le lexique politique."
            icon={<BookOpen size={24} />}
            colorClass="bg-purple-50 text-purple-600 border-purple-100"
          />
          <FeatureCard 
            href="/deputes" 
            title="Que vote votre député ?" 
            desc="Trouvez votre circonscription et observez ses votes."
            icon={<CheckSquare size={24} />}
            colorClass="bg-orange-50 text-orange-600 border-orange-100"
          />
          <FeatureCard 
            href="/lois" 
            title="On va plus loin" 
            desc="Des décryptages complets sur les grandes lois en cours."
            icon={<Newspaper size={24} />}
            colorClass="bg-emerald-50 text-emerald-600 border-emerald-100"
          />
          <FeatureCard 
            href="/newsletter" 
            title="Newsletter" 
            desc="Recevez l'essentiel, adapté à votre profil, par mail."
            icon={<Mail size={24} />}
            colorClass="bg-pink-50 text-pink-600 border-pink-100"
          />
        </div>
      </section>

      {/* 6. ENCART NEWSLETTER PREMIUM */}
      <section className="py-24 px-4 bg-muted/30 border-t border-border">
        <div className="container mx-auto max-w-3xl text-center bg-card shadow-sm border border-border rounded-3xl p-12 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-white to-accent"></div>
          <h2 className="text-4xl md:text-5xl mb-4 text-primary font-staatliches tracking-wider uppercase">Chaque semaine, ton résumé 100% personnalisé sur la vie politique</h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Ne laissez plus les décisions politiques vous surprendre. Chaque dimanche, recevez le décryptage exclusif des <span className="text-foreground font-bold">lois et projets</span>&nbsp;qui impactent directement votre ville et votre budget. L&apos;essentiel du Parlement, résumé en 3 minutes.
          </p>
          
          <div className="flex flex-col items-center gap-6">
            <Link 
              href="/newsletter" 
              className="px-10 py-5 bg-primary text-white font-black rounded-2xl hover:bg-primary/90 transition-all shadow-xl hover:shadow-primary/20 hover:-translate-y-1 text-xl flex items-center gap-3 group"
            >
              S&apos;abonner au service <span className="px-2 py-1 bg-white/20 rounded-lg text-sm">3€ / mois</span>
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              Personnalisé • Hebdomadaire • Sans jargon
            </p>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="bg-card border-t border-border py-12 px-4 shadow-[0_-1px_3px_rgba(0,0,0,0.02)]">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start">
            <p className="font-bold text-xl mb-2 text-foreground">La Politique, C&apos;est Simple</p>
            <p className="text-sm text-muted-foreground">© 2026. Tous droits réservés.</p>
          </div>
          <div className="flex gap-6 text-sm font-medium">
            <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link>
            <Link href="/mentions-legales" className="text-muted-foreground hover:text-primary transition-colors">Mentions légales</Link>
            <Link href="/politique-confidentialite" className="text-muted-foreground hover:text-primary transition-colors">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Composant interne pour les cartes "Explorez"
function FeatureCard({ href, title, desc, icon, colorClass }: { href: string, title: string, desc: string, icon: React.ReactNode, colorClass: string }) {
  return (
    <Link href={href} className="group flex flex-col p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow-md transition-all hover:-translate-y-1">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 border ${colorClass}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2 text-foreground group-hover:text-primary transition-colors">{title}</h3>
      <p className="text-muted-foreground">{desc}</p>
    </Link>
  );
}
