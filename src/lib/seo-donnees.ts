import { cache } from "react";
import { api } from "@/lib/api";

/**
 * Lectures faites AU MOMENT DE LA CONSTRUCTION du site, pour que les pages publiques
 * (élus, lois) arrivent avec leur contenu dans le HTML : c'est ce que lisent les moteurs
 * de recherche, et ce que voit le visiteur même si la base ne répond pas.
 *
 * `cache` évite de lire deux fois la même fiche pour une page (titre + contenu).
 * Une lecture qui échoue rend null : la page se construit quand même, puis se remplit
 * dans le navigateur comme avant.
 */
export const deputeParSlug = cache(async (slug: string) => {
  try { return await api.getDeputyBySlug(slug); } catch { return null; }
});

export const senateurParSlug = cache(async (slug: string) => {
  try { return await api.getSenatorBySlug(slug); } catch { return null; }
});

/** Coupe un texte à la phrase, sans dépasser `max` caractères (descriptions des pages). */
export function extrait(source: unknown, max = 160): string {
  // Les biographies sont soit du texte, soit un objet structuré ({ summary, parcours, … }).
  const o = source && typeof source === "object" ? source as Record<string, unknown> : null;
  const brut = typeof source === "string" ? source
    : o ? [o.summary, o.parcours, o.profession].find(v => typeof v === "string" && v.trim()) as string | undefined
    : undefined;
  const t = (brut || "").replace(/\*\*|__|#+\s|\[(.*?)\]\(.*?\)/g, "$1").replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const coupe = t.slice(0, max - 1);
  const fin = Math.max(coupe.lastIndexOf(". "), coupe.lastIndexOf(" "));
  return `${coupe.slice(0, fin > 80 ? fin : coupe.length).trim()}…`;
}

export const eurodeputeParSlug = cache(async (slug: string) => {
  try { return await api.getMepBySlug(slug); } catch { return null; }
});
