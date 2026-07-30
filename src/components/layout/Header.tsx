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
  MessageSquareQuote,
  Home,
  Users,
  Star,
  Landmark,
  MapPin,
  Search
} from "lucide-react";
import EuFlag from "@/components/icons/EuFlag";
import GlobalSearch from "@/components/layout/GlobalSearch";

import { usePremium } from "@/lib/hooks/usePremium";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const { isPremium } = usePremium();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

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

  const navLinks = [
    { href: "/", label: "Accueil", icon: Home, color: "text-indigo-600", iconColor: "text-indigo-500" },
    { href: "/deputes", label: "Assemblée", icon: Users, color: "text-blue-600", iconColor: "text-blue-500" },
    { href: "/senateurs", label: "Sénat", icon: Landmark, color: "text-rose-600", iconColor: "text-rose-500" },
    { href: "/eurodeputes", label: "Europe", icon: EuFlag, color: "text-sky-600", iconColor: "text-sky-500" },
    { href: "/local", label: "Local", icon: MapPin, color: "text-rose-600", iconColor: "text-rose-500" },
    { href: "/executif", label: "Exécutif", icon: ShieldCheck, color: "text-amber-600", iconColor: "text-amber-500" },
    { href: "/presidentielles-2027", label: "Présidentielles 2027", icon: MessageSquareQuote, color: "text-purple-600", iconColor: "text-purple-500" },
    { href: "/premium", label: "Premium", icon: Star, color: "text-yellow-600", iconColor: "text-yellow-500", isSpecial: true },
  ];

  return (
    <>
    <header className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <Link 
            href="/" 
            className="flex items-center gap-2 group"
            onClick={() => setIsMenuOpen(false)}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-rose-500 to-fuchsia-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-fuchsia-500/30 group-hover:scale-110 transition-transform">
              <Landmark size={20} />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-slate-900 font-sans font-black text-[15px] sm:text-[16px] tracking-tight uppercase leading-none">La politique,</span>
              <span className="font-sans font-black tracking-tight uppercase leading-none pt-0.5 flex items-center gap-1">
                <span className="text-slate-900 text-[13px] sm:text-[14px]">c'est</span>
                <span className="bg-[#0bb274] text-white px-1.5 py-0.5 rounded-[4px] text-[11px] sm:text-[12px] leading-none">
                  Simple.
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-3">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link 
                  key={link.href}
                  href={link.href} 
                  className={`flex items-center gap-1 group transition-all duration-300 whitespace-nowrap ${link.isSpecial ? 'underline decoration-yellow-400 decoration-2 underline-offset-4' : ''}`}
                >
                  <Icon size={14} className={`${link.iconColor} group-hover:scale-110 transition-transform`} />
                  <span className={`font-staatliches text-lg uppercase tracking-wide ${link.color} pt-0.5 group-hover:opacity-80 transition-all`}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
            
            <button onClick={() => setSearchOpen(true)} title="Rechercher (élu, territoire, loi…)" aria-label="Rechercher"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-900 transition">
              <Search size={18} />
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            {user ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-[background-color,border-color,box-shadow] duration-200 hover:shadow-md ${isPremium ? 'bg-amber-50 border-amber-200 shadow-sm hover:border-amber-400' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isPremium ? 'bg-amber-400 text-white' : 'bg-blue-100 text-blue-600'}`}>
                    {isPremium ? <Star size={10} fill="currentColor" /> : <User size={12} />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 leading-none mb-0.5">
                      {isPremium ? <span className="text-amber-600">Tableau de Bord</span> : "Mon Compte"}
                    </span>
                    <span className="text-xs font-bold text-slate-700 truncate max-w-[120px] leading-none">{user.email}</span>
                  </div>
                </Link>
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
                className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-gradient-to-r hover:from-blue-600 hover:to-rose-600 transition-all shadow-lg shadow-slate-900/10"
              >
                <LogIn size={16} />
                Se connecter
              </Link>
            )}
          </div>

          {/* Mobile : loupe + menu */}
          <div className="lg:hidden flex items-center gap-3">
            <button className="text-slate-600" onClick={() => setSearchOpen(true)} aria-label="Rechercher">
              <Search size={22} />
            </button>
            <button className="text-slate-600" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:hidden bg-white border-b border-slate-100 px-4 py-6 space-y-4 shadow-xl"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link 
                key={link.href}
                href={link.href} 
                className="flex items-center gap-3 group" 
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon className={link.iconColor} size={20} /> 
                <span className={`font-staatliches text-2xl uppercase tracking-wider ${link.color} pt-1`}>
                  {link.label}
                </span>
              </Link>
            );
          })}
          
          <div className="pt-2">
            <Link href="/login" className="flex items-center gap-3 text-lg font-bold text-rose-600 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
              <LogIn size={20} /> Mon Compte
            </Link>
          </div>
        </motion.div>
      )}

    </header>

    {/* Modale de recherche globale — HORS du header (dont le backdrop-blur casserait le
        positionnement fixed). Toujours centrée en haut, quelle que soit la page. */}
    {searchOpen && (
      <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
        <div className="mx-auto mt-24 w-[92%] max-w-2xl" onClick={e => e.stopPropagation()}>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[11px] font-black uppercase tracking-widest text-white/70">Recherche sur tout le site</p>
            <button onClick={() => setSearchOpen(false)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20"><X size={16} /></button>
          </div>
          <GlobalSearch variant="mobile" onNavigate={() => setSearchOpen(false)} />
        </div>
      </div>
    )}
    </>
  );
}
