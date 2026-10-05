"use client";

import Link from "next/link";
import { Lock, Check, Sparkles } from "lucide-react";
import { usePremium } from "@/lib/hooks/usePremium";

/**
 * Habillage commun des sections de l'onglet Dynamiques : en-tête éditorial et
 * réserve Pro (le contenu reste visible, flouté et estompé, sous une carte d'accès).
 */

export const BadgePro = () => (
  <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-500/40 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.15em] text-fuchsia-700 dark:text-fuchsia-300">
    <Sparkles size={10} /> Pro
  </span>
);

/** En-tête de section : repère numéroté, grand titre, chapeau, réglages à droite. */
export function EnTete({ numero, rubrique, titre, accent, degrade, chapeau, pro, actions }: {
  numero: string; rubrique: string; titre: string; accent: string; degrade: string;
  chapeau: React.ReactNode; pro?: boolean; actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
      <div className="min-w-0 max-w-3xl flex-1 basis-80">
        <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.25em] text-muted-foreground">
          <span className="tabular-nums text-foreground">{numero}</span>
          <span className="h-px w-8 bg-border" />
          {rubrique}
          {pro && <BadgePro />}
        </p>
        <h2 className="mt-3 font-staatliches text-[2.6rem] uppercase leading-[0.92] tracking-tight text-foreground md:text-6xl">
          {titre}{" "}
          <span className={`bg-gradient-to-r ${degrade} bg-clip-text text-transparent`}>{accent}</span>
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">{chapeau}</p>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </header>
  );
}

/** Contenu réservé au Pro : flouté sous une carte d'accès pour les autres. */
export function ZonePro({ titre, points, children }: { titre: string; points: string[]; children: React.ReactNode }) {
  const { isPro, loading } = usePremium();
  if (isPro) return <>{children}</>;
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none max-h-[560px] select-none overflow-hidden blur-[7px] saturate-[0.6] [mask-image:linear-gradient(to_bottom,black_35%,transparent_95%)]">
        {children}
      </div>
      {!loading && (
        <div className="absolute inset-x-0 top-10 flex justify-center px-2">
          <div className="w-full max-w-md rounded-[2rem] bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-500 p-px shadow-2xl shadow-fuchsia-500/25">
            <div className="rounded-[calc(2rem-1px)] bg-card/95 p-6 text-center backdrop-blur-xl md:p-7">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white shadow-lg shadow-fuchsia-500/30">
                <Lock size={20} />
              </span>
              <p className="mt-4 font-staatliches text-[1.7rem] uppercase leading-none text-foreground">{titre}</p>
              <ul className="mx-auto mt-4 max-w-xs space-y-2 text-left text-[13px] text-muted-foreground">
                {points.map(p => (
                  <li key={p} className="flex items-start gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-fuchsia-600 dark:text-fuchsia-400" /> {p}
                  </li>
                ))}
              </ul>
              <Link href="/premium" className="mt-6 block rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-700 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-white shadow-lg transition hover:brightness-110">
                Passer au Pro
              </Link>
              <Link href="/login?suite=/presidentielles-2027/%23dynamiques" className="mt-3 inline-block text-xs font-bold text-muted-foreground hover:text-foreground">
                Déjà abonné ? Se connecter
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Note de méthode repliée : présente pour qui la cherche, discrète pour les autres. */
export function Methode({ children }: { children: React.ReactNode }) {
  return (
    <details className="group mt-5 rounded-2xl border border-border bg-card/50 px-4 py-3 text-[12px] leading-relaxed text-muted-foreground">
      <summary className="cursor-pointer list-none text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground">
        <span className="mr-1 inline-block transition-transform group-open:rotate-90">›</span> Méthode et sources
      </summary>
      <div className="mt-2">{children}</div>
    </details>
  );
}
