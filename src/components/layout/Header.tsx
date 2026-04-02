"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  User, 
  LogIn, 
  LogOut, 
  ShieldCheck, 
  Menu, 
  X,
  CreditCard,
  Settings,
  BookOpen,
  CalendarDays,
  MessageSquareQuote,
  Home
} from "lucide-react";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  return (
    <header className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-red-600 rounded-lg flex items-center justify-center text-white font-black text-sm shadow-md group-hover:scale-110 transition-transform">
              LP
            </div>
            <span className="font-extrabold text-slate-900 tracking-tight text-lg">
              La Politique, <span className="text-blue-600">C'est Simple</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-5">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"><Home size={14} />Accueil</Link>
            <Link href="/deputes" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Députés</Link>
            <Link href="/lois" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors">Lois</Link>
            <Link href="/vocabulaire" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"><BookOpen size={14} />Vocabulaire</Link>
            <Link href="/calendrier" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"><CalendarDays size={14} />Calendrier</Link>
            <Link href="/promesses" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors flex items-center gap-1"><MessageSquareQuote size={14} />Ils avaient dit...</Link>
            <Link href="/newsletter" className="text-sm font-semibold text-slate-600 hover:text-blue-600 transition-colors underline decoration-red-400 decoration-2 underline-offset-4">Newsletter</Link>
            
            <div className="h-6 w-[1px] bg-slate-200 mx-2" />

            {user ? (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100">
                  <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User size={12} />
                  </div>
                  <span className="text-xs font-bold text-slate-700 truncate max-w-[120px]">{user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link 
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10"
              >
                <LogIn size={16} />
                Se connecter
              </Link>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="md:hidden text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden bg-white border-b border-slate-100 px-4 py-6 space-y-4 shadow-xl"
        >
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}><Home size={18} />Accueil</Link>
          <Link href="/deputes" className="block text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}>Les Députés</Link>
          <Link href="/lois" className="block text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}>Les Lois</Link>
          <Link href="/vocabulaire" className="flex items-center gap-2 text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}><BookOpen size={18} />Vocabulaire</Link>
          <Link href="/calendrier" className="flex items-center gap-2 text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}><CalendarDays size={18} />Calendrier</Link>
          <Link href="/promesses" className="flex items-center gap-2 text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}><MessageSquareQuote size={18} />Ils avaient dit que...</Link>
          <Link href="/newsletter" className="block text-lg font-bold text-slate-900" onClick={() => setIsMenuOpen(false)}>Newsletter</Link>
          <Link href="/login" className="block text-lg font-bold text-blue-600" onClick={() => setIsMenuOpen(false)}>Mon Compte</Link>
        </motion.div>
      )}
    </header>
  );
}
