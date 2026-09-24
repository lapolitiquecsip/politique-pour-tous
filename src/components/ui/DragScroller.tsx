"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Un rail horizontal qu'on fait défiler au doigt ou à la souris.
 *
 * Le parti pris tient en une phrase : sur écran tactile, on ne touche à RIEN.
 * Le défilement natif du navigateur a l'inertie du système, le rebond en fin de
 * course et la précision du pouce ; toute reprise en JavaScript est
 * immanquablement moins fluide, parce qu'elle arrive une image trop tard. On se
 * contente donc d'un `overflow-x: auto`, et le doigt glisse comme ailleurs.
 *
 * La souris, elle, n'a pas de geste de défilement horizontal : c'est là, et là
 * seulement, qu'on ajoute le glisser-déposer, avec son inertie à nous. Les deux
 * ne se marchent jamais dessus puisqu'on regarde `pointerType`.
 *
 * Trois détails font toute la différence entre « ça glisse » et « c'est fluide » :
 *
 *   — pas d'ancrage (scroll-snap). Il se bat contre l'inertie et donne ces
 *     à-coups en fin de course qu'on sent sans savoir les nommer ;
 *   — pas de `scroll-behavior: smooth` en CSS. Il s'appliquerait à CHAQUE
 *     écriture de scrollLeft, donc soixante fois par seconde pendant un glisser,
 *     et chaque image tenterait d'animer vers la précédente. Les flèches
 *     demandent l'animation ponctuellement, par scrollBy ;
 *   — un clic avalé après un glisser. Sans cela, relâcher au-dessus d'une carte
 *     ouvre le lien qu'on venait de faire défiler.
 */

/** Au-delà de ce déplacement, on a glissé — en deçà, on a cliqué. */
const SEUIL_GLISSER = 6;

/** Frottement par image à 60 Hz. 0.94 laisse courir environ une demi-seconde. */
const FROTTEMENT = 0.94;

/** En deçà, le mouvement ne se voit plus : on arrête plutôt que d'animer pour rien. */
const VITESSE_MINIMALE = 0.08;

export default function DragScroller({
  children,
  ariaLabel,
  className = "",
  sombre = false,
}: {
  children: React.ReactNode;
  ariaLabel: string;
  className?: string;
  /**
   * Pour les rails posés sur une surface volontairement sombre en permanence —
   * le panneau du Journal officiel, l'espace Pro — où les jetons de thème
   * donneraient des flèches blanches sur fond noir en thème clair.
   */
  sombre?: boolean;
}) {
  const piste = useRef<HTMLDivElement>(null);
  const [aGauche, setAGauche] = useState(false);
  const [aDroite, setADroite] = useState(false);

  // État du glisser. Volontairement hors de React : ces valeurs changent à chaque
  // image, et un rendu par image ferait exactement ce qu'on cherche à éviter.
  const glisse = useRef(false);
  const departX = useRef(0);
  const departScroll = useRef(0);
  const parcouru = useRef(0);
  const echantillons = useRef<{ t: number; x: number }[]>([]);
  const inertie = useRef<number | null>(null);

  const majFleches = useCallback(() => {
    const el = piste.current;
    if (!el) return;
    setAGauche(el.scrollLeft > 4);
    setADroite(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    majFleches();
    const el = piste.current;
    if (!el) return;
    // ResizeObserver plutôt que l'événement resize : le rail change aussi de
    // taille quand ses cartes arrivent, sans que la fenêtre ne bouge.
    const ro = new ResizeObserver(majFleches);
    ro.observe(el);
    return () => ro.disconnect();
  }, [majFleches, children]);

  const stopperInertie = () => {
    if (inertie.current !== null) {
      cancelAnimationFrame(inertie.current);
      inertie.current = null;
    }
  };

  useEffect(() => stopperInertie, []);

  const onPointerDown = (e: React.PointerEvent) => {
    // Remis à zéro pour TOUS les pointeurs, y compris ceux qu'on laisse au
    // navigateur : sans cela, la distance d'un ancien glisser à la souris
    // subsistait et le premier appui tactile suivant voyait son clic avalé.
    parcouru.current = 0;
    // Le tactile garde le défilement natif, qui est meilleur que tout ce qu'on
    // pourrait écrire. Le stylet aussi : il se comporte comme un doigt.
    if (e.pointerType !== "mouse") return;
    const el = piste.current;
    if (!el) return;
    stopperInertie();
    glisse.current = true;
    departX.current = e.clientX;
    departScroll.current = el.scrollLeft;
    echantillons.current = [{ t: performance.now(), x: e.clientX }];
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!glisse.current) return;
    const el = piste.current;
    if (!el) return;
    const dx = e.clientX - departX.current;
    parcouru.current = Math.max(parcouru.current, Math.abs(dx));
    el.scrollLeft = departScroll.current - dx;
    // On ne garde que les cent dernières millisecondes : la vitesse au moment du
    // relâcher, pas la moyenne de tout le geste.
    const t = performance.now();
    echantillons.current.push({ t, x: e.clientX });
    while (echantillons.current.length > 2 && t - echantillons.current[0].t > 100) {
      echantillons.current.shift();
    }
    majFleches();
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!glisse.current) return;
    glisse.current = false;
    const el = piste.current;
    if (el?.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);

    const ech = echantillons.current;
    const premier = ech[0];
    const dernier = ech[ech.length - 1];
    const duree = dernier && premier ? dernier.t - premier.t : 0;
    if (!el || !duree) return;

    // Pixels par image, dans le sens du défilement (inverse du geste).
    let vitesse = -((dernier.x - premier.x) / duree) * 16.7;
    const courir = () => {
      if (Math.abs(vitesse) < VITESSE_MINIMALE) { inertie.current = null; return; }
      const avant = el.scrollLeft;
      el.scrollLeft = avant + vitesse;
      // Arrivé en butée, insister ne fait que brûler des images.
      if (el.scrollLeft === avant) { inertie.current = null; majFleches(); return; }
      vitesse *= FROTTEMENT;
      majFleches();
      inertie.current = requestAnimationFrame(courir);
    };
    inertie.current = requestAnimationFrame(courir);
  };

  // Le clic qui suit un glisser est avalé, en phase de capture pour arriver
  // avant le lien. On ne l'avale QUE s'il y a eu un vrai déplacement.
  const onClickCapture = (e: React.MouseEvent) => {
    if (parcouru.current > SEUIL_GLISSER) {
      e.preventDefault();
      e.stopPropagation();
      parcouru.current = 0;
    }
  };

  const pousser = (sens: 1 | -1) => {
    const el = piste.current;
    if (!el) return;
    stopperInertie();
    // Une « page » moins un peu, pour qu'une carte reste visible et montre la
    // continuité — sauter d'un écran entier fait perdre le fil.
    el.scrollBy({ left: sens * Math.round(el.clientWidth * 0.85), behavior: "smooth" });
  };

  return (
    <div className="relative">
      <div
        ref={piste}
        role="region"
        aria-label={ariaLabel}
        tabIndex={0}
        onScroll={majFleches}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
        // Le curseur est laissé à CSS : `glisse` est une référence, la changer ne
        // provoque aucun rendu, et un curseur calculé depuis elle ne bougerait
        // jamais. `active:` fait le travail sans coûter une image.
        className={`flex cursor-grab gap-4 overflow-x-auto overscroll-x-contain scroll-px-1 pb-4 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 active:cursor-grabbing md:gap-8 [&::-webkit-scrollbar]:hidden ${className}`}
        // Le doigt défile horizontalement sans que la page parte en biais ; le
        // geste vertical, lui, continue d'appartenir à la page.
        style={{ touchAction: "pan-x pan-y" }}
      >
        {children}
      </div>

      {/* Flèches : repère visuel autant que commande, et seulement quand il y a
          quelque part où aller. Masquées au tactile, où le geste suffit. */}
      {[-1, 1].map(sens => {
        const actif = sens === -1 ? aGauche : aDroite;
        const Icone = sens === -1 ? ChevronLeft : ChevronRight;
        return (
          <button
            key={sens}
            onClick={() => pousser(sens as 1 | -1)}
            aria-label={sens === -1 ? "Voir les précédentes" : "Voir les suivantes"}
            tabIndex={-1}
            className={`absolute top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border shadow-lg backdrop-blur transition md:flex ${
              sombre
                ? "border-white/15 bg-slate-900/90 text-white"
                : "border-border bg-card/95 text-foreground"
            } ${sens === -1 ? "-left-3 lg:-left-5" : "-right-3 lg:-right-5"} ${
              actif ? "opacity-100 hover:scale-110" : "pointer-events-none opacity-0"
            }`}
          >
            <Icone size={20} />
          </button>
        );
      })}
    </div>
  );
}
