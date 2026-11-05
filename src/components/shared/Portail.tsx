"use client";

import { createPortal } from "react-dom";

/**
 * Affiche une fenêtre à la racine de la page (document.body). Ouverte depuis un bloc animé ou
 * empilé (fiche d'un député, carte qui se soulève au survol), une fenêtre « fixe » restait prise
 * dans ce bloc : l'en-tête du site passait par-dessus et cachait le bouton de fermeture.
 */
export default function Portail({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.body);
}
