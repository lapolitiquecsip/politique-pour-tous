"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, LogOut, BarChart3 } from "lucide-react";
import GardeAdministrateur from "@/components/admin/GardeAdministrateur";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const chemin = usePathname();
  return (
    <GardeAdministrateur>
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 md:min-h-screen flex flex-col shadow-xl flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <Link href="/" className="font-heading text-xl font-bold text-white hover:text-primary transition-colors">
            La Politique...
          </Link>
          <span className="ml-2 px-2 py-0.5 mt-1 bg-red-600 font-bold text-[10px] uppercase tracking-wider rounded text-white inline-block">
            Admin
          </span>
        </div>
        
        {/* Trois entrées, toutes actives. « Abonnés » et « Scrapers » étaient des liens
            morts grisés : on cliquait sur « Abonnés » en cherchant la liste des
            membres, qui était ailleurs. */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          {[
            { href: "/admin/statistiques", Icone: BarChart3, titre: "Statistiques", sous: "Visites, pages, actions, parrainage", actif: "bg-emerald-600" },
            { href: "/admin/membres", Icone: Users, titre: "Membres et abonnés", sous: "Tous les e-mails · Premium · Pro", actif: "bg-violet-600" },
            { href: "/admin/dashboard", Icone: LayoutDashboard, titre: "Tableau technique", sous: "Mises à jour des données", actif: "bg-slate-700" },
          ].map(({ href, Icone, titre, sous, actif }) => {
            const ici = chemin?.startsWith(href);
            return (
              <Link key={href} href={href}
                className={`flex items-start gap-3 rounded-xl px-4 py-3 transition ${ici ? `${actif} text-white shadow-lg` : "text-slate-300 hover:bg-slate-800 hover:text-white"}`}>
                <Icone className="mt-0.5 h-5 w-5 shrink-0" />
                <span>
                  <span className="block font-semibold">{titre}</span>
                  <span className={`block text-xs ${ici ? "text-white/75" : "text-slate-500"}`}>{sous}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition">
            <LogOut className="w-5 h-5" />
            Quitter
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-10 overflow-auto">
        {children}
      </main>
    </div>
    </GardeAdministrateur>
  );
}
