/**
 * La fenêtre « Essai gratuit Premium » (vitrine dorée + film + accord), ouverte depuis N'IMPORTE
 * QUEL bouton du site qui mène à l'abonnement Premium (24/11/2026, demande de l'éditeur).
 *
 * Une seule fenêtre, montée dans la mise en page (components/premium/EssaiPremium). Elle s'ouvre :
 *  - au clic sur tout lien vers « /premium » (sans paramètre ; « #offres » accepté), intercepté par
 *    la fenêtre elle-même ;
 *  - par `ouvrirEssaiPremium()` pour les redirections faites dans le code.
 * Jamais pour un membre déjà abonné (Premium ou Pro : le lien mène à son espace), ni quand la vente
 * est fermée, ni pour un lien marqué `data-offre-lien="pro"` (bouton de l'offre Pro) ou
 * `data-offre-lien="page"` (lien vers la page des offres elle-même, ex. CGV).
 */
export const EVENEMENT_ESSAI = "lpcs:essai-premium";

export function ouvrirEssaiPremium(origine = "code") {
  window.dispatchEvent(new CustomEvent(EVENEMENT_ESSAI, { detail: { origine } }));
}

/** Le lien mène-t-il à l'abonnement (la page des offres), et non à une rubrique de l'espace ? */
export function lienVersOffres(href: string): boolean {
  try {
    const u = new URL(href, window.location.origin);
    if (u.origin !== window.location.origin) return false;
    if (!/^\/premium\/?$/.test(u.pathname)) return false;
    // « ?offres=1 » ouvre volontairement la page comparative (lien « Comparer avec l'offre Pro »).
    if (u.search) return false;
    return !u.hash || u.hash === "#offres";
  } catch { return false; }
}
