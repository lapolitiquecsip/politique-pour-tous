/**
 * Le modèle Claude utilisé par les services d'ingestion, en un seul endroit.
 *
 * Trois fichiers portaient chacun leur `claude-3-5-sonnet-latest` écrit en dur.
 * Cet alias a été retiré : l'API répond 404 « model: claude-3-5-sonnet-latest »,
 * et comme le service attrape l'erreur lot par lot pour ne pas perdre le
 * passage entier, le fil d'actualité rendait **zéro carte** en annonçant
 * « ✅ Terminé ». Trois cents articles étaient lus chaque matin pour rien.
 *
 * La leçon n'est pas « mettre à jour le nom » mais « ne l'écrire qu'une fois » :
 * une constante partagée se remplace en une ligne le jour où ce modèle sera à
 * son tour retiré, au lieu de laisser un troisième fichier en arrière.
 *
 * CONTENT_MODEL permet d'en changer sans redéployer le code.
 */
export const CLAUDE_MODEL = process.env.CONTENT_MODEL || "claude-sonnet-5";
