import Link from "next/link";
import { LayoutDashboard, Users, Webhook, LogOut } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
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
        
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 opacity-50 cursor-not-allowed transition">
            <Users className="w-5 h-5" />
            Abonnés
          </Link>
          <Link href="/admin/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 opacity-50 cursor-not-allowed transition">
            <Webhook className="w-5 h-5" />
            Scrapers
          </Link>
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
  );
}
