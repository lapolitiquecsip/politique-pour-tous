"use client";

import { motion } from "framer-motion";
import { Coins } from "lucide-react";

export interface CommuneFiscalite {
  year: number;
  taux_fb: number | null; produit_fb: number | null;
  taux_th: number | null; produit_th: number | null;
  taux_fnb: number | null; produit_fnb: number | null;
  source_url?: string;
}

const fmtEuro = (v: number | null) =>
  v == null ? null : (Math.abs(v) >= 1e6
    ? (v / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " M€"
    : Math.round(v).toLocaleString("fr-FR") + " €");

const fmtTaux = (v: number | null) =>
  v == null ? "—" : v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " %";

/**
 * Fiscalité locale d'une commune (REI). On n'affiche que la part COMMUNALE : le taux
 * global payé par un contribuable inclut aussi, selon les cas, la part intercommunale
 * et les taxes annexes (TEOM…). La mention sous le bloc le précise explicitement.
 */
export default function FiscaliteSection({ fiscalite }: { fiscalite: CommuneFiscalite }) {
  if (!fiscalite) return null;

  const rows: Array<{ label: string; taux: number | null; produit: number | null; hint: string }> = [
    {
      label: "Taxe foncière (bâti)", taux: fiscalite.taux_fb, produit: fiscalite.produit_fb,
      hint: "Taux communal voté sur les propriétés bâties. Depuis 2021, il intègre l'ancienne part départementale.",
    },
    {
      label: "Taxe d'habitation (rés. secondaires)", taux: fiscalite.taux_th, produit: fiscalite.produit_th,
      hint: "La taxe d'habitation ne s'applique plus qu'aux résidences secondaires depuis 2023.",
    },
    {
      label: "Taxe foncière (non bâti)", taux: fiscalite.taux_fnb, produit: fiscalite.produit_fnb,
      hint: "Taux communal voté sur les terrains non bâtis (agricoles, terrains nus…).",
    },
  ].filter(r => r.taux != null || r.produit != null);

  if (rows.length === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="space-y-4">
      <div className="flex items-center gap-2">
        <Coins size={16} className="text-slate-900" />
        <h4 className="text-sm font-black uppercase tracking-widest text-slate-900">
          Fiscalité locale {fiscalite.year}
        </h4>
      </div>

      <div className="space-y-3">
        {rows.map((r, i) => (
          <div key={i} className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm" title={r.hint}>
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-tight">{r.label}</p>
              <p className="text-2xl font-black text-amber-600 whitespace-nowrap">{fmtTaux(r.taux)}</p>
            </div>
            {fmtEuro(r.produit) && (
              <p className="mt-1 text-[10px] font-bold text-slate-400">
                Rapporte {fmtEuro(r.produit)} à la commune
              </p>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-slate-400/80 italic">
        Taux votés — <strong>part communale uniquement</strong>. Le montant payé inclut aussi, selon les cas, la part
        intercommunale et les taxes annexes (ordures ménagères…). Source : REI {fiscalite.year} (DGFiP, via data.ofgl.fr).
      </p>
    </motion.div>
  );
}
