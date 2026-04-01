"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Landmark,
  CalendarDays,
  Quote,
  BookOpen,
  Vote,
  Scale,
  Mail,
  Menu,
  X,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const NAVIGATION = [
  { name: "Accueil", href: "/", icon: Landmark },
  { name: "Calendrier", href: "/calendrier", icon: CalendarDays },
  { name: "Promesses", href: "/promesses", icon: Quote },
  { name: "Vocabulaire", href: "/vocabulaire", icon: BookOpen },
  { name: "Députés", href: "/deputes", icon: Vote },
  { name: "Lois", href: "/lois", icon: Scale },
  { name: "Newsletter", href: "/newsletter", icon: Mail },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-lg border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 to-red-600 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
            <span className="text-white font-extrabold text-sm leading-none">LP</span>
          </div>
          <div className="hidden sm:flex flex-col leading-tight">
            <span className="text-[15px] font-extrabold text-slate-900 dark:text-white tracking-tight">
              La Politique, C&apos;est Simple
            </span>
          </div>
        </Link>

        {/* Desktop Controls */}
        <div className="flex items-center gap-4">
          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 transition-all"
                >
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden lg:block" />
          
          <ThemeToggle />

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition"
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Nav Panel */}
      {mobileOpen && (
        <div className="lg:hidden bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-900 shadow-lg animate-fade-in transition-colors duration-300">
          <nav className="flex flex-col p-4 gap-1">
            {NAVIGATION.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  <Icon className="w-5 h-5 text-slate-400" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      )}
    </header>
  );
}
