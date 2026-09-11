// Suivi des candidats à la présidentielle par un membre premium. Stocké dans le navigateur
// (localStorage) — aucune colonne « candidat » n'existe côté serveur (user_follows est typé
// député/sénateur/eurodéputé). Sert à afficher, sur le profil premium, le fil des candidats
// suivis. Un évènement window synchronise la cloche (modal) et le profil.

const KEY = "lpcs_followed_candidates";
export const CANDIDATE_FOLLOWS_EVENT = "lpcs-candidate-follows";

export type FollowedCandidate = { id: string; slug: string; name: string; photo_url?: string | null; party?: string | null };

export function getFollowedCandidates(): FollowedCandidate[] {
  if (typeof window === "undefined") return [];
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

export function isFollowingCandidate(id: string): boolean {
  return getFollowedCandidates().some(c => c.id === id);
}

// Ajoute/retire le candidat. Renvoie true si désormais suivi.
export function toggleFollowCandidate(c: FollowedCandidate): boolean {
  const list = getFollowedCandidates();
  const exists = list.some(x => x.id === c.id);
  const next = exists ? list.filter(x => x.id !== c.id) : [...list, c];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(CANDIDATE_FOLLOWS_EVENT));
  } catch { /* stockage indisponible */ }
  return !exists;
}
