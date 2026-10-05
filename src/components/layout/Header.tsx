"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
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
  Search,
  BarChart3,
  Gift
} from "lucide-react";
import EuFlag from "@/components/icons/EuFlag";
import GlobalSearch from "@/components/layout/GlobalSearch";

import { usePremium } from "@/lib/hooks/usePremium";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  // Le hook tient à jour l'attribut d'abonnement posé sur <html>, et se souvient de la
  // session précédente. Supabase restaure la sienne de façon asynchrone : sans cette
  // mémoire, l'en-tête affichait « Se connecter » une seconde à chaque page.
  const { connecteMemorise, courrielMemorise } = usePremium();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  // Administrateur du site : un accès direct aux statistiques. La page vérifie
  // elle-même les droits ; ce test ne sert qu'à montrer le bouton à qui en a l'usage.
  const [adminPour, setAdminPour] = useState<string | null>(null);
  useEffect(() => {
    if (!user?.id) return;
    let actif = true;
    supabase.rpc("est_administrateur").then(({ data }) => { if (actif) setAdminPour(data === true ? user.id : null); });
    return () => { actif = false; };
  }, [user?.id]);
  const estAdmin = !!user?.id && adminPour === user.id;

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Une session absente n'est une déconnexion que si elle est annoncée comme telle :
    // l'événement initial arrive parfois vide avant que la session ne soit restaurée.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((evenement, session) => {
      if (session) setUser(session.user);
      else if (evenement === "SIGNED_OUT") setUser(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Menu mobile ouvert → on FIGE l'arrière-plan (la page principale ne bouge plus ; seul le
  // panneau du menu défile). Indispensable sur iOS où overflow:hidden ne suffit pas.
  useEffect(() => {
    if (!isMenuOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [isMenuOpen]);

  // Même verrou pour la recherche : sur iPhone, la page défilait sous la fenêtre et
  // l'arrivée du clavier la faisait glisser — la recherche « flottait » sous le doigt.
  useEffect(() => {
    if (!searchOpen) return;
    lockScroll();
    return () => unlockScroll();
  }, [searchOpen]);

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
    <header className="fixed top-0 left-0 w-full z-40 bg-white/80 backdrop-blur-md border-b border-border dark:bg-slate-950/85 dark:border-slate-800">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
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
              <span className="text-foreground font-sans font-black text-[15px] sm:text-[16px] tracking-tight uppercase leading-none">La politique,</span>
              <span className="font-sans font-black tracking-tight uppercase leading-none pt-0.5 flex items-center gap-1">
                <span className="text-foreground text-[13px] sm:text-[14px]">c'est</span>
                <span className="bg-[#0bb274] text-white px-1.5 py-0.5 rounded-[4px] text-[11px] sm:text-[12px] leading-none">
                  Simple.
                </span>
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden xl:flex shrink-0 items-center gap-2 2xl:gap-3">
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
                    {link.isSpecial ? (
                      <>
                        {/* Deux libellés, un seul visible : c'est la feuille de style qui
                            tranche, depuis l'attribut posé sur <html> avant le premier rendu.
                            Pour un abonné Pro, ce lien ne mène plus à une offre mais à son
                            espace de travail. */}
                        <span className="lbl-offre">{link.label}</span>
                        <span className="lbl-pro">Mon espace Pro</span>
                      </>
                    ) : link.label}
                  </span>
                </Link>
              );
            })}
            
            <button onClick={() => setSearchOpen(true)} title="Rechercher (élu, territoire, loi…)" aria-label="Rechercher"
              className="flex items-center justify-center w-9 h-9 rounded-full border border-border text-muted-foreground hover:border-slate-400 hover:text-foreground transition">
              <Search size={18} />
            </button>

            <div className="h-6 w-[1px] bg-slate-200 mx-1" />

            {/* Les DEUX versions sont rendues, et globals.css en masque une d'après
                l'attribut posé sur <html> avant le premier rendu. Choisir ici, en
                React, revenait à attendre que Supabase ait restauré la session :
                un abonné lisait « Se connecter » une seconde à chaque page. */}
            <div className="auth-connecte items-center gap-3">
                {/* Parrainage, ouvert à tous les membres. Bouton plein et placé AVANT le
                    tableau de bord : en contour pâle et en bout de ligne, il passait
                    inaperçu, et une adresse e-mail un peu longue le poussait hors de l'écran. */}
                <Link href="/parrainage" title="Parrainage : partagez le site et suivez vos invitations"
                  className="flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 px-2.5 text-white shadow-md shadow-teal-500/30 ring-2 ring-white/60 transition hover:brightness-110 dark:ring-white/10 2xl:px-3.5">
                  <Gift size={17} strokeWidth={2.4} />
                  <span className="hidden text-[11px] font-black uppercase tracking-wider 2xl:inline">Parrainer</span>
                </Link>
                {/* Habillage entièrement en CSS (voir globals.css) : la couleur, l'icône
                    et le libellé se décident depuis l'attribut posé sur <html> avant le
                    premier rendu, ce qui évite le gris qui vire à l'or à chaque page. */}
                <Link href="/dashboard" className="btn-tdb sword-shine flex items-center gap-2 rounded-full border px-3 py-1.5 transition-[border-color,box-shadow] duration-200 hover:shadow-md">
                  <div className="tdb-ico flex h-5 w-5 items-center justify-center rounded-full">
                    <Star size={10} fill="currentColor" className="tdb-abonne" />
                    <User size={12} className="tdb-simple" />
                  </div>
                  <div className="flex flex-col">
                    <span className="tdb-sur text-[10px] font-black uppercase leading-none 2xl:mb-0.5">
                      <span className="tdb-abonne">Tableau de Bord</span>
                      <span className="tdb-simple">Mon Compte</span>
                    </span>
                    <span className="tdb-mail hidden max-w-[140px] truncate text-xs font-bold leading-none 2xl:block">{user?.email ?? courrielMemorise ?? ""}</span>
                  </div>
                </Link>
                {estAdmin && (
                  <Link href="/admin/statistiques" title="Statistiques du site (administrateurs)"
                    className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-white shadow-sm transition hover:bg-emerald-500">
                    <BarChart3 size={15} /> Stats
                  </Link>
                )}
                <button 
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                  title="Déconnexion"
                >
                  <LogOut size={20} />
                </button>
            </div>
            <Link
              href="/login"
              className="auth-anonyme items-center gap-2 px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-gradient-to-r hover:from-blue-600 hover:to-rose-600 transition-all shadow-lg shadow-slate-900/10"
            >
              <LogIn size={16} />
              Se connecter
            </Link>
          </div>

          {/* Mobile : loupe + menu */}
          <div className="xl:hidden flex items-center gap-3">
            {/* Le parrainage à portée de pouce, sans ouvrir le menu (membres connectés). */}
            <Link href="/parrainage" aria-label="Parrainage"
              className="auth-connecte h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-emerald-600 text-white shadow-md shadow-teal-500/30">
              <Gift size={18} strokeWidth={2.4} />
            </Link>
            <button className="text-muted-foreground" onClick={() => setSearchOpen(true)} aria-label="Rechercher">
              <Search size={22} />
            </button>
            <button className="text-muted-foreground" onClick={() => setIsMenuOpen(!isMenuOpen)}>
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
          className="xl:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain bg-card border-b border-border px-4 py-6 space-y-4 shadow-xl"
        >
          {navLinks.map((link) => {
            const Icon = link.icon;
            // L'item Premium est mis en valeur en PANNEAU DORÉ sur mobile (fond dégradé, texte blanc).
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 group ${link.isSpecial ? "rounded-2xl bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-500 px-4 py-3 shadow-lg shadow-amber-500/30" : ""}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon className={link.isSpecial ? "text-white" : link.iconColor} size={link.isSpecial ? 22 : 20} fill={link.isSpecial ? "currentColor" : "none"} />
                <span className={`font-staatliches text-2xl uppercase tracking-wider pt-1 ${link.isSpecial ? "text-white drop-shadow-sm" : link.color}`}>
                  {link.isSpecial ? (
                    <>
                      <span className="lbl-offre">{link.label}</span>
                      <span className="lbl-pro">Mon espace Pro</span>
                    </>
                  ) : link.label}
                </span>
              </Link>
            );
          })}
          
          <div className="pt-2">
            <Link href={(user || connecteMemorise) ? "/dashboard" : "/login"} className="flex items-center gap-3 text-lg font-bold text-rose-600 hover:text-blue-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
              <User size={20} /> Mon Compte
            </Link>
            {(user || connecteMemorise) && (
              <Link href="/parrainage" className="mt-4 flex items-center gap-3 text-lg font-bold text-teal-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
                <Gift size={20} /> Parrainage
              </Link>
            )}
            {estAdmin && (
              <Link href="/admin/statistiques" className="mt-4 flex items-center gap-3 text-lg font-bold text-emerald-600 transition-colors" onClick={() => setIsMenuOpen(false)}>
                <BarChart3 size={20} /> Statistiques du site
              </Link>
            )}
          </div>
        </motion.div>
      )}

    </header>

    {/* Modale de recherche globale — HORS du header (dont le backdrop-blur casserait le
        positionnement fixed). Toujours centrée en haut, quelle que soit la page. */}
    {searchOpen && (
      <div className="fixed inset-0 z-[100] overflow-hidden overscroll-none bg-slate-950/60 backdrop-blur-sm" onClick={() => setSearchOpen(false)}>
        <div className="mx-auto mt-20 w-[92%] max-w-2xl sm:mt-24" onClick={e => e.stopPropagation()}>
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
