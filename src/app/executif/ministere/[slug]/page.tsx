import { fetchGovernmentComposition } from '@/lib/services/governmentService';
import ministersBios from '@/lib/data/ministersBios.json';
import { api } from '@/lib/api';
import FeedItemCard from '@/components/home/FeedItemCard';
import { Building2, ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import MinisterImage from '@/components/executif/MinisterImage';
import { cleanMinistryName, findMinistryBudget } from '@/lib/executif-utils';
import { CircleDollarSign, ExternalLink } from 'lucide-react';
import EntityNewsFeed from '@/components/shared/EntityNewsFeed';

const ministerSlug = (name: string) =>
  (name || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/^(m\.|mme\.?)\s*/, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const normalizeName = (name: string) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/^(m\.|mme\.|m\s|mme\s)/, "") // Remove M. or Mme
    .replace(/[^a-z0-9\s]/g, "") // Remove non-alphanumeric chars
    .replace(/\s+/g, " ") // Collapse multiple spaces
    .trim();
};

export default async function MinistryPage({ params }: { params: Promise<{ slug: string }> }) {
  // Await the params to get the slug
  const { slug } = await params;

  // 1. Fetch Government Data
  const government = await fetchGovernmentComposition();
  
  // 2. Find the correct ministry using slug comparison
  const ministryData = government.find(m => {
    const minSlug = m.ministryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return minSlug === slug;
  });

  if (!ministryData) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-staatliches uppercase mb-4">Ministère introuvable</h1>
        <Link href="/executif" className="text-blue-600 font-bold hover:underline flex items-center gap-2">
          <ArrowLeft size={16} /> Retour à l'Exécutif
        </Link>
      </div>
    );
  }

  // 3. Find the Bio
  const bios = Array.isArray(ministersBios) ? ministersBios : (ministersBios as any).default || [];
  const apiNameNorm = normalizeName(ministryData.ministerName);
  const bioData = bios.find((b: any) => 
    normalizeName(b.name) === apiNameNorm || 
    (b.name.toLowerCase().includes('moutchou') && ministryData.ministerName.toLowerCase().includes('moutchou'))
  );
  
  // 3b. Fiche ministre enrichie (photo Wikimedia fiable + lien fiche détaillée)
  const mSlug = ministerSlug(ministryData.ministerName);
  const profile = await api.getMinisterBySlug(mSlug).catch(() => null);

  // Budget officiel (mission budgétaire PLF 2026, source data.economie.gouv)
  const budgetRes: any = await api.getStateBudget(2026).catch(() => null);
  const missions = Array.isArray(budgetRes) ? budgetRes : (budgetRes?.missions || []);
  const ministryBudget = findMinistryBudget(ministryData.ministryName, missions);
  const programmes = ministryBudget ? await api.getMinistryProgrammes(ministryBudget.name).catch(() => []) : [];

  // 4. Fetch News specifically for this ministry (fallback to 'gouvernement')
  const news = await api.getContent(10, "gouvernement");
  // Simple filter based on minister name or ministry name
  const filteredNews = (news || []).filter(n => {
    if (!n || !n.title) return false;
    const title = n.title.toLowerCase();
    const ministerLastName = ministryData.ministerName.toLowerCase().split(' ').pop() || '';
    
    return title.includes(ministerLastName) ||
           title.includes('ministre') ||
           title.includes('gouvernement');
  }).slice(0, 4);

  return (
    <main className="min-h-screen bg-slate-50 pb-20">
      {/* HEADER SECTION */}
      <section className="bg-slate-900 text-white pt-32 pb-20 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-full h-full opacity-5 pointer-events-none">
          <Building2 className="w-[800px] h-[800px] absolute -right-40 -bottom-40 rotate-12" />
        </div>
        
        <div className="container mx-auto max-w-5xl relative z-10">
          <Link href="/executif" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest mb-8">
            <ArrowLeft size={14} /> Retour au gouvernement
          </Link>
          
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end justify-between">
            <div>
              <p className="text-amber-400 font-black text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                <Building2 size={16} /> Fiche Ministère
              </p>
              <h1 className="text-4xl md:text-5xl font-staatliches uppercase tracking-wide leading-tight">
                {cleanMinistryName(ministryData.ministryName)}
              </h1>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="container mx-auto max-w-5xl px-4 -mt-8 relative z-20 space-y-8">
        
        {/* CARTE MINISTRE — compacte, appelle à ouvrir la fiche détaillée */}
        <Link
          href={`/executif/ministre/${ministerSlug(ministryData.ministerName)}`}
          className="group block bg-white rounded-[2.5rem] p-6 md:p-8 border border-slate-200 shadow-xl shadow-slate-200/50 transition hover:border-amber-300 hover:shadow-amber-200/40"
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-28 h-28 shrink-0 rounded-full border-4 border-amber-50 overflow-hidden shadow-md bg-slate-100">
              <MinisterImage
                src={profile?.photo_url || bioData?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(ministryData.ministerName)}&background=f59e0b&color=fff&size=512`}
                fallbackSrc={`https://ui-avatars.com/api/?name=${encodeURIComponent(ministryData.ministerName)}&background=f59e0b&color=fff&size=512`}
                alt={ministryData.ministerName}
                className="w-full h-full object-cover object-top"
              />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Ministre en fonction</p>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors">{ministryData.ministerName}</h2>
              {profile?.summary && <p className="mt-2 text-sm leading-6 text-slate-600 line-clamp-2">{profile.summary}</p>}
              <span className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-widest text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                Voir la fiche détaillée du ministre <ChevronRight size={14} />
              </span>
            </div>
          </div>
        </Link>

        {/* FIL D'ACTUALITÉ DE L'INSTITUTION (#4) — masqué tant qu'il n'y a pas d'actu */}
        <EntityNewsFeed entityType="ministry" entityId={slug} />

        {/* BUDGET OFFICIEL DU MINISTÈRE */}
        {ministryBudget && (
          <div className="bg-white rounded-[2.5rem] p-8 md:p-10 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-6">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
                <CircleDollarSign size={20} />
              </div>
              <h3 className="text-2xl font-staatliches uppercase tracking-wider text-slate-900">Budget du ministère</h3>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <p className="text-4xl font-black text-slate-900">
                  {(ministryBudget.amount / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md€
                </p>
                <p className="mt-1 text-sm text-slate-500">Mission budgétaire « {ministryBudget.name} » — crédits {new Date().getFullYear()}</p>
              </div>
              <a
                href={(ministryBudget.source_urls && ministryBudget.source_urls[0]) || 'https://www.data.economie.gouv.fr'}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-[11px] font-black uppercase tracking-widest text-white hover:bg-slate-700 transition-colors"
              >
                Source officielle (PLF) <ExternalLink size={14} />
              </a>
            </div>
            {programmes.length > 0 && (() => {
              const total = programmes.reduce((s: number, p: any) => s + Number(p.amount_2026 || 0), 0) || 1;
              return (
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Où va ce budget — répartition par programme</p>
                  <div className="space-y-3">
                    {programmes.slice(0, 8).map((p: any) => {
                      const pct = (Number(p.amount_2026) / total) * 100;
                      return (
                        <div key={p.programme_num}>
                          <div className="flex justify-between items-baseline gap-3 text-sm">
                            <span className="font-medium text-slate-700 leading-tight">{p.programme_name}</span>
                            <span className="font-black text-slate-900 whitespace-nowrap">{(Number(p.amount_2026) / 1e9).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} Md€</span>
                          </div>
                          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                            <div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.max(pct, 1)}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
            <p className="mt-4 text-[11px] italic text-slate-400">
              Montant de la mission budgétaire principale rattachée à ce ministère (budget de l'État, hors Sécurité sociale). Un ministère peut recouvrir plusieurs missions. Source : PLF 2026 (data.economie.gouv).
            </p>
          </div>
        )}

        {/* NEWS FEED */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm mb-20">
           <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-6">
             <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
               <BookOpen size={20} />
             </div>
             <h3 className="text-2xl font-staatliches uppercase tracking-wider text-slate-900">
               Actualité du Ministère
             </h3>
           </div>
           
           {filteredNews.length > 0 ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {filteredNews.map(item => (
                 <FeedItemCard key={item.id} item={item} />
               ))}
             </div>
           ) : (
             <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
               <p className="text-slate-500 font-medium italic">Aucune actualité récente spécifique à ce ministère aujourd'hui.</p>
             </div>
           )}
           
           <div className="mt-8 text-center">
             <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 hover:gap-3 transition-all">
               Voir tout le fil d'actualité <ChevronRight size={14} />
             </Link>
           </div>
        </div>

      </div>
    </main>
  );
}

export async function generateStaticParams() {
  try {
    const government = await fetchGovernmentComposition();
    return government.map((m) => {
      const slug = m.ministryName
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      return { slug };
    });
  } catch (error) {
    console.error("Error generating static params for ministries:", error);
    return [];
  }
}
