// Verrou de défilement robuste (iOS Safari inclus) : fige TOTALEMENT l'arrière-plan quand une
// surcouche (modale, menu mobile) est ouverte — plus de page qui bouge derrière, ni de
// glissement latéral vers le vide. `overflow:hidden` sur body ne suffit pas sur iOS ; on
// bascule le body en position fixe en mémorisant le scroll. Compteur pour gérer plusieurs
// surcouches empilées (on ne déverrouille qu'à la fermeture de la dernière).
let count = 0;
let savedY = 0;

export function lockScroll() {
  if (typeof document === "undefined") return;
  if (count === 0) {
    savedY = window.scrollY;
    const b = document.body.style;
    b.position = "fixed";
    b.top = `-${savedY}px`;
    b.left = "0";
    b.right = "0";
    b.width = "100%";
    b.overflow = "hidden";
    b.overscrollBehavior = "none";
  }
  count++;
}

export function unlockScroll() {
  if (typeof document === "undefined") return;
  count = Math.max(0, count - 1);
  if (count === 0) {
    const b = document.body.style;
    b.position = "";
    b.top = "";
    b.left = "";
    b.right = "";
    b.width = "";
    b.overflow = "";
    b.overscrollBehavior = "";
    window.scrollTo(0, savedY);
  }
}
