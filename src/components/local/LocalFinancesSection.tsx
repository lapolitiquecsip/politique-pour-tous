"use client";

import { motion } from "framer-motion";
import { Landmark } from "lucide-react";

export interface LocalFinances {
  year: number;
  recettes: number | null; recettes_hab: number | null;
  depenses: number | null; depenses_hab: number | null;
  epargne: number | null; epargne_hab: number | null;
  investissement: number | null; investissement_hab: number | null;
  encours_dette: number | null; encours_dette_hab: number | null;
  // Action sociale — départements uniquement.
  rsa?: number | null; rsa_hab?: number | null;
  apa?: number | null; apa_hab?: number | null;
  pch?: number | null; pch_hab?: number | null;
  // Renseigné quand l'entité budgétaire diffère du territoire historique
  // (ex. Collectivité européenne d'Alsace pour le 67 et le 68).
  entity_note?: string | null;
  source_url?: string;
}

const fmt = (v: number | null) =>
  v == null ? "—" : (Math.abs(v) >= 1e6
    ? (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " M€"
    : Math.round(v).toLocaleString("fr-FR") + " €");

const perHab = (v: number | null) => v == null ? null : Math.round(v).toLocaleString("fr-FR") + " €/hab.";

/**
 * Finances réelles d'une collectivité (commune ou département), source OFGL.
 * Le millésime affiché est celui remonté par l'API (le plus récent en base).
 */
export default function LocalFinancesSection({ finances, label }: { finances: LocalFinances; label: string }) {
  if (!finances) return null;
  const has = finances.recettes != null || finances.depenses != null || finances.encours_dette != null;
  if (!has) return null;

  const rows: Array<{ label: string; value: number | null; hab: number | null; accent: string; hint: string }> = [
    { label: "Recettes de fonctionnement", value: finances.recettes, hab: finances.recettes_hab, accent: "text-emerald-600", hint: "Recettes réelles de fonctionnement (retraité OFGL)." },
    { label: "Dépenses de fonctionnement", value: finances.depenses, hab: finances.depenses_hab, accent: "text-rose-600", hint: "Dépenses réelles de fonctionnement (retraité OFGL)." },
    { label: "Épargne brute", value: finances.epargne, hab: finances.epargne_hab, accent: (finances.epargne ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600", hint: "Recettes réelles − dépenses réelles de fonctionnement." },
    { label: "Dépenses d'investissement", value: finances.investissement, hab: finances.investissement_hab, accent: "text-blue-600", hint: "Dépenses réelles d'investissement." },
    { label: "Encours de dette", value: finances.encours_dette, hab: finances.encours_dette_hab, accent: "text-amber-600", hint: "Dette totale restant à rembourser au 31/12." },
  ];

  // Action sociale : n'existe que pour les départements (compétence propre).
  const social: Array<{ label: string; value: number | null; hab: number | null; hint: string }> = [
    { label: "Allocations RSA", value: finances.rsa ?? null, hab: finances.rsa_hab ?? null, hint: "Revenu de solidarité active versé par le département." },
    { label: "Allocations APA", value: finances.apa ?? null, hab: finances.apa_hab ?? null, hint: "Allocation personnalisée d'autonomie (personnes âgées)." },
    { label: "Allocations PCH", value: finances.pch ?? null, hab: finances.pch_hab ?? null, hint: "Prestation de compensation du handicap." },
  ].filter(r => r.value != null);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <Landmark size={16} className="text-slate-900" />
        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">
          {label} {finances.year}
        </h4>
      </div>
      {finances.entity_note && (
        <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2">
          Budget de la {finances.entity_note} — l'entité qui exerce les compétences départementales sur ce territoire.
        </p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {rows.map((r, i) => (
          <div key={i} className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-1" title={r.hint}>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{r.label}</p>
            <p className={`text-xl font-black ${r.accent}`}>{fmt(r.value)}</p>
            {perHab(r.hab) && <p className="text-[10px] font-bold text-slate-400">{perHab(r.hab)}</p>}
          </div>
        ))}
      </div>
      {social.length > 0 && (
        <div className="pt-2 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
            Action sociale — compétence du département
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {social.map((r, i) => (
              <div key={i} className="p-4 rounded-3xl bg-slate-50 border border-slate-100 space-y-1" title={r.hint}>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{r.label}</p>
                <p className="text-lg font-black text-slate-900">{fmt(r.value)}</p>
                {perHab(r.hab) && <p className="text-[10px] font-bold text-slate-400">{perHab(r.hab)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="text-[10px] text-slate-400/80 italic">
        Budget principal, exercice {finances.year}. Dépenses/recettes réelles retraitées. Source : OFGL (data.ofgl.fr).
      </p>
    </motion.div>
  );
}
