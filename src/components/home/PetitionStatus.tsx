"use client";

import { Clock, CheckCircle2, Send, Archive, Gavel } from "lucide-react";

/**
 * Statut factuel d'une pétition dans le processus de l'Assemblée nationale.
 *
 * On NE prédit PAS l'issue (« va-t-elle aboutir ? ») : on décrit où en est la pétition
 * et ce que cet état signifie concrètement dans la procédure. Le libellé brut vient de la
 * plateforme officielle ; les seuils (100 000 signatures) sont ceux du règlement de l'AN.
 */
type Info = { label: string; explain: string; cls: string; Icon: any };

const SEUIL = 100000;

export function petitionStatusInfo(status: string | null, signatures: number, threshold: number): Info {
  const s = (status || "").toLowerCase();

  if (/class[ée]/.test(s)) {
    return {
      label: "Examinée puis classée",
      explain: "Une commission de l'Assemblée a examiné la pétition et décidé de la classer : pas de suite législative directe à ce stade.",
      cls: "bg-slate-100 text-slate-600 border-slate-200",
      Icon: Archive,
    };
  }
  if (/transmis|commission|renvoy/.test(s)) {
    return {
      label: "Transmise à une commission",
      explain: "Le seuil requis a été franchi : une commission de l'Assemblée est saisie et doit décider de la suite (rapport, débat, ou classement).",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
      Icon: Send,
    };
  }
  if (/d[ée]bat|s[ée]ance|inscrit/.test(s)) {
    return {
      label: "Vers un débat en séance",
      explain: "La pétition a franchi les étapes menant à une possible inscription à l'ordre du jour de l'Assemblée.",
      cls: "bg-violet-50 text-violet-700 border-violet-200",
      Icon: Gavel,
    };
  }
  if (/cl[ôo]tur|termin[ée]|expir/.test(s)) {
    return {
      label: "Clôturée",
      explain: "La période de recueil des signatures est terminée.",
      cls: "bg-slate-100 text-slate-500 border-slate-200",
      Icon: Archive,
    };
  }

  // Par défaut : en recueil de signatures (« Enregistrée » ou statut inconnu).
  if (signatures >= SEUIL) {
    return {
      label: "Seuil des 100 000 franchi",
      explain: "La pétition peut désormais être transmise à la Conférence des présidents de l'Assemblée, qui décide de la suite : examen en commission, débat, ou classement.",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: CheckCircle2,
    };
  }
  const manque = SEUIL - signatures;
  return {
    label: "En recueil de signatures",
    explain: `Encore ${manque.toLocaleString("fr-FR")} signature${manque > 1 ? "s" : ""} avant le seuil de 100 000 qui ouvre un examen possible par l'Assemblée.`,
    cls: "bg-slate-50 text-slate-500 border-slate-200",
    Icon: Clock,
  };
}

export default function PetitionStatus({ status, signatures, threshold }: { status: string | null; signatures: number; threshold: number }) {
  const info = petitionStatusInfo(status, signatures, threshold);
  return (
    <div className={`rounded-2xl border px-3 py-2.5 ${info.cls}`}>
      <div className="flex items-center gap-2">
        <info.Icon size={13} className="shrink-0" />
        <span className="text-[10px] font-black uppercase tracking-widest">{info.label}</span>
      </div>
      <p className="mt-1 text-[11px] leading-snug opacity-90">{info.explain}</p>
    </div>
  );
}
