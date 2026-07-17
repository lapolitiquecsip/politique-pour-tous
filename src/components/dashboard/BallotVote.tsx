"use client";

/**
 * Représentation d'un vote citoyen : une enveloppe glissée dans une urne.
 *
 * Pourquoi une urne plutôt qu'une simple pastille : le geste de voter est immédiatement
 * reconnaissable, là où une coche verte pouvait se confondre avec un « validé / terminé ».
 * La couleur porte le sens (vert = pour, rouge = contre, gris = abstention), et l'enveloppe
 * de l'abstention reste hors de l'urne — le bulletin n'est pas déposé.
 */

export type VoteValue = "POUR" | "CONTRE" | "ABSTENTION" | string;

type Style = {
  label: string;
  /** couleur de l'enveloppe */
  env: string;
  envStroke: string;
  /** habillage du badge texte */
  chip: string;
  urn: string;
};

export const VOTE_STYLES: Record<string, Style> = {
  POUR: {
    label: "Pour",
    env: "#34d399", envStroke: "#059669",
    chip: "bg-emerald-50 text-emerald-700 border-emerald-200",
    urn: "#065f46",
  },
  CONTRE: {
    label: "Contre",
    env: "#f87171", envStroke: "#dc2626",
    chip: "bg-rose-50 text-rose-700 border-rose-200",
    urn: "#7f1d1d",
  },
  ABSTENTION: {
    label: "Abstention",
    env: "#cbd5e1", envStroke: "#94a3b8",
    chip: "bg-slate-100 text-slate-600 border-slate-200",
    urn: "#475569",
  },
};

export const voteStyle = (v: VoteValue): Style =>
  VOTE_STYLES[String(v || "").toUpperCase()] || VOTE_STYLES.ABSTENTION;

/** Urne + enveloppe. `size` en pixels. */
export function BallotBox({ vote, size = 48 }: { vote: VoteValue; size?: number }) {
  const s = voteStyle(vote);
  const isAbstention = String(vote || "").toUpperCase() === "ABSTENTION";

  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
      {/* Enveloppe : engagée dans la fente pour un vote exprimé, restée à l'écart
          (décalée et inclinée) pour une abstention. */}
      <g transform={isAbstention ? "translate(9 -1) rotate(-16 24 12)" : ""}>
        <rect x="15" y="5" width="18" height="12" rx="2" fill={s.env} stroke={s.envStroke} strokeWidth="1.5" />
        {/* rabat */}
        <path d="M15.6 6.4 L24 12.6 L32.4 6.4" fill="none" stroke={s.envStroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Corps de l'urne, légèrement tronconique */}
      <path
        d="M8.5 21 h31 l-2.6 20.4 a2.6 2.6 0 0 1 -2.6 2.3 h-20.6 a2.6 2.6 0 0 1 -2.6 -2.3 z"
        fill={s.urn} fillOpacity="0.10" stroke={s.urn} strokeWidth="1.8" strokeLinejoin="round"
      />
      {/* Couvercle */}
      <rect x="6.5" y="17.5" width="35" height="5" rx="2.5" fill={s.urn} fillOpacity="0.18" stroke={s.urn} strokeWidth="1.8" />
      {/* Fente */}
      <rect x="17" y="19.2" width="14" height="2" rx="1" fill={s.urn} />
    </svg>
  );
}

/** Badge textuel « Pour / Contre / Abstention » avec la mini-urne. */
export function BallotChip({ vote }: { vote: VoteValue }) {
  const s = voteStyle(vote);
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[10px] font-black uppercase tracking-widest ${s.chip}`}
    >
      <BallotBox vote={vote} size={18} />
      {s.label}
    </span>
  );
}
