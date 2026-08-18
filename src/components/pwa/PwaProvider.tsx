"use client";

import { useEffect, useState } from "react";
import { Download, X, Share } from "lucide-react";

// Enregistre le service worker et propose l'installation de l'app (PWA). Sur Android/desktop,
// on capte l'événement natif `beforeinstallprompt` ; sur iOS (pas d'événement), on explique le
// geste « Partager → Sur l'écran d'accueil ». Le bandeau est discret et mémorise le refus.
const DISMISS_KEY = "pwa-install-dismissed";
// Bandeau d'installation désactivé pour le moment (le service worker reste actif).
// Repasser à true pour le réafficher.
const BANNER_ENABLED = false;

export default function PwaProvider() {
  const [deferred, setDeferred] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    if (standalone || localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e); setShow(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS Safari : pas de beforeinstallprompt → on propose l'aide au geste.
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);
    if (isIOS && isSafari) { setIosHint(true); setShow(true); }

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!show || !BANNER_ENABLED) return null;

  const dismiss = () => { setShow(false); try { localStorage.setItem(DISMISS_KEY, "1"); } catch {} };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    try { await deferred.userChoice; } catch {}
    setDeferred(null); setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900 sm:inset-x-auto sm:right-4 sm:left-auto sm:w-96">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#1a3566] to-[#0b1c3b]">
          <Download size={20} className="text-[#FFCC00]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-black text-slate-900 dark:text-white">Installer l'application</p>
          {iosHint ? (
            <p className="mt-0.5 text-xs leading-snug text-slate-500">
              Appuyez sur <Share size={12} className="inline -mt-0.5" /> puis « Sur l'écran d'accueil » pour installer l'app.
            </p>
          ) : (
            <p className="mt-0.5 text-xs leading-snug text-slate-500">Ajoutez « La Politique C Simple » à votre écran d'accueil — accès rapide, plein écran, hors-ligne.</p>
          )}
          {!iosHint && (
            <button onClick={install} className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#1a3566] px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-[#24408e]">
              <Download size={13} /> Installer
            </button>
          )}
        </div>
        <button onClick={dismiss} aria-label="Fermer" className="shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800">
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
