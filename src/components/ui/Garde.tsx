"use client";

import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Barrière d'erreur : une rubrique qui tombe ne doit pas emporter la page.
 *
 * Sans elle, une exception levée pendant le rendu d'un composant démonte tout
 * l'arbre React au-dessus : le lecteur se retrouve devant une page blanche,
 * sans rien à cliquer, et sans savoir ce qui s'est passé. C'est d'autant moins
 * acceptable sur une rubrique réservée à un abonnement payant.
 *
 * Elle affiche donc le message de l'erreur plutôt que de le taire. Un message
 * technique n'aide pas le lecteur à réparer, mais il lui permet de le
 * rapporter — et c'est la seule chose qui fasse avancer un défaut qu'on ne
 * reproduit pas soi-même.
 *
 * Deux limites, à connaître : une barrière ne rattrape QUE les erreurs de
 * rendu. Ni les rappels asynchrones, ni un plantage du moteur de rendu
 * lui-même — mémoire saturée, couche graphique — ne passent par ici.
 */
type Props = {
  children: React.ReactNode;
  /** Nom de la rubrique, affiché au lecteur. */
  quoi: string;
  /** Rendu de repli, si l'on préfère autre chose que le message par défaut. */
  repli?: (erreur: Error, reessayer: () => void) => React.ReactNode;
};
type State = { erreur: Error | null };

export default class Garde extends React.Component<Props, State> {
  state: State = { erreur: null };

  static getDerivedStateFromError(erreur: Error): State {
    return { erreur };
  }

  componentDidCatch(erreur: Error, info: React.ErrorInfo) {
    // La console garde la pile complète : c'est là qu'on la lira si le défaut
    // se reproduit chez quelqu'un d'autre.
    console.error(`[${this.props.quoi}]`, erreur, info.componentStack);
  }

  render() {
    const { erreur } = this.state;
    if (!erreur) return this.props.children;

    const reessayer = () => this.setState({ erreur: null });
    if (this.props.repli) return this.props.repli(erreur, reessayer);

    return (
      <div className="my-6 rounded-3xl border border-amber-400/30 bg-amber-500/10 p-5 text-left">
        <p className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-amber-300">
          <AlertTriangle size={14} /> {this.props.quoi} n&apos;a pas pu s&apos;afficher
        </p>
        <p className="mt-2 text-sm leading-snug text-white/70">
          Le reste de la page fonctionne normalement. Si cela se reproduit,
          transmettez-nous le message ci-dessous : il dit exactement ce qui a
          échoué.
        </p>
        <code className="mt-3 block overflow-x-auto rounded-xl bg-black/40 px-3 py-2 text-[11px] text-amber-200">
          {erreur.message || String(erreur)}
        </code>
        <button
          onClick={reessayer}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-white/20"
        >
          <RotateCcw size={12} /> Réessayer
        </button>
      </div>
    );
  }
}
