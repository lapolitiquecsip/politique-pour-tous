"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-white border-t border-white/10">
      <div className="container mx-auto px-6 py-12 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand Section */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-6 group">
              <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/20 group-hover:scale-110 transition-transform">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-staatliches tracking-wider uppercase italic">
                La Politique, <span className="text-red-500">C'est Simple</span>
              </span>
            </Link>
            <p className="text-slate-400 text-sm leading-relaxed max-w-xs">
              Le premier média immersif pour décrypter la vie politique française sans filtre ni jargon.
            </p>
          </div>

          {/* Site Map */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 font-staatliches">Navigation</h4>
            <ul className="space-y-4">
              <li><Link href="/" className="text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">Accueil</Link></li>
              <li><Link href="/deputes" className="text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block font-medium whitespace-nowrap">Vote des élus</Link></li>
              <li><Link href="/lois" className="text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">Dossiers Législatifs</Link></li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 font-staatliches">Légal</h4>
            <ul className="space-y-4">
              <li><Link href="/mentions-legales" className="text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">Mentions Légales</Link></li>
              <li><Link href="/cgu" className="text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">CGU</Link></li>
              <li><Link href="/cgv" className="text-slate-300 hover:text-white hover:translate-x-1 transition-all inline-block font-medium">CGV</Link></li>
            </ul>
          </div>

          {/* Contact Section */}
          <div>
            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-white/40 mb-6 font-staatliches">Assistance</h4>
            <ul className="space-y-4">
              <li>
                <Link 
                  href="/contact" 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-950 font-black rounded-xl hover:bg-red-500 hover:text-white transition-all text-xs uppercase tracking-widest shadow-xl shadow-white/5"
                >
                  Contactez-nous
                </Link>
              </li>
              <li className="text-slate-500 text-[10px] uppercase tracking-widest font-bold pt-4">
                © {currentYear} La Politique Simple Media
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
             <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Liberté</span>
             <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Égalité</span>
             <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Fraternité</span>
          </div>
          <div className="text-[10px] text-slate-500 font-medium">
            Made with passion for Democracy 🇫🇷
          </div>
        </div>
      </div>
    </footer>
  );
}
