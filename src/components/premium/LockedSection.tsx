"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Lock, ArrowRight, Check } from "lucide-react";

/**
 * Remplace entièrement une section réservée, pour un visiteur sans abonnement.
 *
 * On n'affiche PAS le contenu flouté : un aperçu illisible frustre sans informer, et
 * laisse croire qu'on cache peu de chose. On montre plutôt ce que l'abonnement apporte,
 * avec le chiffre réel de ce qui est déjà indexé — c'est la preuve que le contenu existe.
 */
export default function LockedSection({
  title,
  pitch,
  bullets,
  proOnly = false,
  alreadySubscribed = false,
  icon,
}: {
  title: string;
  pitch: string;
  bullets: string[];
  /** true si la section relève de l'offre Pro plutôt que du Premium. */
  proOnly?: boolean;
  /**
   * true quand le visiteur a DÉJÀ un abonnement, mais d'un niveau insuffisant.
   * Lui proposer de « découvrir les abonnements » serait absurde : il en a un. On lui
   * dit ce qui lui manque, et on l'envoie vers la montée en gamme.
   */
  alreadySubscribed?: boolean;
  icon?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const accent = proOnly ? "fuchsia" : "amber";

  return (
    <div className={`relative overflow-hidden rounded-[2rem] border-2 p-6 sm:p-10 ${
      proOnly
        ? "border-fuchsia-400/60 bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white"
        : "border-amber-300 bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:border-amber-500/40 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950/30 dark:text-white"
    }`}>
      {/* Halo discret, purement décoratif. */}
      <motion.div
        aria-hidden
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl ${proOnly ? "bg-fuchsia-500/25" : "bg-amber-400/25"}`}
        animate={reduce ? undefined : { scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative">
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${
          proOnly ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white" : "bg-amber-400 text-slate-950"
        }`}>
          <Lock size={12} /> {alreadySubscribed
            ? "Votre abonnement Premium ne couvre pas cette rubrique"
            : proOnly ? "Réservé à l'abonnement Pro" : "Réservé aux abonnés"}
        </span>

        <div className="mt-4 flex items-start gap-4">
          {icon && (
            <span className={`hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl sm:flex ${
              proOnly ? "bg-fuchsia-500/20 text-fuchsia-300" : "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300"
            }`}>
              {icon}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-staatliches text-3xl uppercase leading-none tracking-tight sm:text-4xl">{title}</h3>
            <p className={`mt-2 text-sm leading-relaxed sm:text-base ${proOnly ? "text-white/70" : "text-slate-600 dark:text-slate-300"}`}>
              {pitch}
            </p>
          </div>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {bullets.map(b => (
            <li key={b} className={`flex items-start gap-2 text-[13px] leading-snug ${proOnly ? "text-white/85" : "text-slate-700 dark:text-slate-200"}`}>
              <Check size={15} className={`mt-0.5 shrink-0 ${proOnly ? "text-fuchsia-400" : "text-emerald-500"}`} />
              {b}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Link href="/premium"
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-[12px] font-black uppercase tracking-widest shadow-lg transition hover:brightness-110 ${
              proOnly
                ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-fuchsia-500/30"
                : "bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 shadow-amber-500/30"
            }`}>
            {alreadySubscribed ? "Passer à l'offre Pro" : "Découvrir les abonnements"} <ArrowRight size={15} />
          </Link>
          <span className={`text-[11px] font-bold ${proOnly ? "text-white/50" : "text-slate-500"}`}>
            {alreadySubscribed
              ? "Offre Pro — 24,99 €/mois, sans engagement"
              : proOnly ? "Inclus dans l'offre Pro — 24,99 €/mois" : "À partir de 3,99 €/mois, sans engagement"}
          </span>
        </div>
      </div>
    </div>
  );
}
