import { fetchGovernmentComposition } from '@/lib/services/governmentService';
import ministersBios from '@/lib/data/ministersBios.json';
import { api } from '@/lib/api';
import FeedItemCard from '@/components/home/FeedItemCard';
import { Building2, Users, CircleDollarSign, ArrowLeft, ShieldAlert, BookOpen, Briefcase, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default async function MinistryPage({ params }: { params: { slug: string } }) {
  // 1. Fetch Government Data
  const government = await fetchGovernmentComposition();
  
  // 2. Find the correct ministry using slug comparison
  const ministryData = government.find(m => {
    const minSlug = m.ministryName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    return minSlug === params.slug;
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
  const bioData = ministersBios.find(b => b.name.toLowerCase() === ministryData.ministerName.toLowerCase());
  
  // 4. Fetch News specifically for this ministry (fallback to 'gouvernement')
  const news = await api.getContent(4, "gouvernement");
  // Simple filter based on minister name or ministry name (in real life, we'd use better tags)
  const filteredNews = news.filter(n => 
    n.title.toLowerCase().includes(ministryData.ministerName.toLowerCase().split(' ')[1] || '') ||
    n.title.toLowerCase().includes('ministre') ||
    n.title.toLowerCase().includes('gouvernement')
  ).slice(0, 4);

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
              <p className="text-blue-400 font-black text-sm uppercase tracking-widest mb-2 flex items-center gap-2">
                <Building2 size={16} /> Fiche Ministère
              </p>
              <h1 className="text-5xl md:text-6xl font-staatliches uppercase tracking-wide leading-tight capitalize">
                {ministryData.ministryName}
              </h1>
            </div>
            
            <div className="flex items-center gap-6 bg-white/10 p-4 rounded-2xl backdrop-blur-md border border-white/10">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Effectifs</p>
                <p className="text-xl font-bold flex items-center gap-2">
                  <Users size={18} className="text-blue-400" />
                  {bioData?.employeesCount ? new Intl.NumberFormat('fr-FR').format(bioData.employeesCount) : 'N/C'}
                </p>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="space-y-1">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Budget</p>
                <p className="text-xl font-bold flex items-center gap-2">
                  <CircleDollarSign size={18} className="text-blue-400" />
                  {bioData?.budget ? `${bioData.budget} Md€` : 'N/C'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTENT */}
      <div className="container mx-auto max-w-5xl px-4 -mt-8 relative z-20 space-y-8">
        
        {/* MINISTER SECTION */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-xl shadow-slate-200/50">
          <div className="flex flex-col md:flex-row gap-12">
            
            {/* Left: Avatar & Identity */}
            <div className="md:w-1/3 flex flex-col items-center text-center space-y-4">
              <div className="w-48 h-48 rounded-full border-4 border-slate-50 overflow-hidden shadow-lg bg-slate-100">
                <img 
                  src={bioData?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(ministryData.ministerName)}&background=0D8ABC&color=fff&size=512`} 
                  alt={ministryData.ministerName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Ministre en fonction</p>
                <h2 className="text-2xl font-bold text-slate-900">{ministryData.ministerName}</h2>
                <p className="text-sm font-medium text-slate-500 italic mt-1">{ministryData.role}</p>
              </div>
            </div>

            {/* Right: Biography */}
            <div className="md:w-2/3 space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-2xl font-staatliches uppercase tracking-wider text-slate-900">
                  Parcours & Carrière
                </h3>
              </div>
              
              <div className="prose prose-slate prose-sm md:prose-base prose-p:leading-relaxed prose-strong:text-slate-900 prose-strong:font-bold">
                {bioData?.biography ? (
                  <div dangerouslySetInnerHTML={{ __html: bioData.biography.replace(/\n/g, '<br/>') }} />
                ) : (
                  <p className="italic text-slate-500">Biographie en cours de rédaction par nos analystes. Ce ministre n'a pas encore de fiche complète détaillant son parcours dans le secteur privé et public.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* JUDICIAL AFFAIRS */}
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-sm">
           <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-6">
             <div className="w-10 h-10 bg-red-50 text-red-600 rounded-xl flex items-center justify-center">
               <ShieldAlert size={20} />
             </div>
             <h3 className="text-2xl font-staatliches uppercase tracking-wider text-slate-900">
               Transparence & Affaires
             </h3>
           </div>

           {bioData?.judicialAffairs && bioData.judicialAffairs.length > 0 ? (
             <div className="space-y-4">
               {bioData.judicialAffairs.map((affair, idx) => (
                 <div key={idx} className="p-6 rounded-2xl border border-red-100 bg-red-50/30 space-y-2">
                   <div className="flex items-center justify-between gap-4">
                     <h4 className="font-bold text-slate-900 text-lg">{affair.title}</h4>
                     <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-black uppercase tracking-widest whitespace-nowrap">
                       {affair.status}
                     </span>
                   </div>
                   <p className="text-sm text-slate-600 leading-relaxed">{affair.description}</p>
                 </div>
               ))}
             </div>
           ) : (
             <div className="p-6 rounded-2xl border border-emerald-100 bg-emerald-50/30 flex items-center gap-4">
               <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shrink-0">
                 <ShieldAlert size={20} className="text-emerald-500" />
               </div>
               <div>
                 <h4 className="font-bold text-slate-900">Aucune affaire connue</h4>
                 <p className="text-sm text-slate-600">À notre connaissance, ce ministre n'a fait l'objet d'aucune condamnation ou mise en examen dans le cadre de ses fonctions.</p>
               </div>
             </div>
           )}
        </div>

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
             <Link href="/" className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 hover:gap-3 transition-all">
               Voir tout le fil d'actualité <ChevronRight size={14} />
             </Link>
           </div>
        </div>

      </div>
    </main>
  );
}
