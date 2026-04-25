"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { FileText, Calendar, ChevronRight, Search, Filter } from "lucide-react";
import Link from "next/link";

export default function LawsGrid() {
  const [laws, setLaws] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api.getLaws();
        setLaws(data);
      } catch (err) {
        console.error("Error loading laws:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredLaws = laws
    .filter(law => 
      law.title.toLowerCase().includes(search.toLowerCase()) ||
      (law.category && law.category.toLowerCase().includes(search.toLowerCase()))
    )
    .sort((a, b) => (b.context || "").localeCompare(a.context || ""));

  return (
    <div className="space-y-8">
      {/* Search Bar */}
      <div className="relative max-w-2xl mx-auto">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Rechercher un projet ou une proposition de loi..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-14 pr-8 py-5 rounded-[2rem] bg-white border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-slate-800 font-medium"
        />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-48 bg-slate-100 animate-pulse rounded-[2rem]" />
          ))}
        </div>
      ) : filteredLaws.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredLaws.map((law, index) => (
            <motion.div
              key={law.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-500 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-600 text-[10px] font-black uppercase tracking-widest">
                      {law.category || 'Législation'}
                    </span>
                    {law.date_adopted && (
                      <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[10px] font-black uppercase tracking-widest">
                        Adopté
                      </span>
                    )}
                  </div>
                  <FileText className="text-slate-300 w-6 h-6 group-hover:text-blue-500 transition-colors" />
                </div>
                
                <h3 className="text-xl font-bold text-slate-900 mb-4 leading-tight group-hover:text-blue-600 transition-colors line-clamp-3">
                  {law.title}
                </h3>
                
                <p className="text-slate-500 text-sm leading-relaxed mb-6 line-clamp-2">
                  {law.summary}
                </p>
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Calendar size={14} />
                  <span>{law.context?.replace(/\[.*?\]\s*/, "") || "Dossier en cours"}</span>
                </div>
                <Link 
                  href={law.source_urls?.[0] || "#"} 
                  target="_blank"
                  className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-900 hover:text-blue-600 transition-colors"
                >
                  Détails du dossier <ChevronRight size={14} />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200">
          <FileText className="mx-auto text-slate-300 w-16 h-16 mb-4" />
          <h3 className="text-xl font-bold text-slate-900">Aucun dossier trouvé</h3>
          <p className="text-slate-500">Essayez d'ajuster votre recherche.</p>
        </div>
      )}
    </div>
  );
}
