"use client";

import { useEffect, useState } from "react";
import { Coins, Scale } from "lucide-react";
import { api } from "@/lib/api";

type Fin = {
  slug: string; name: string; abbrev: string | null; color: string | null;
  subventions_eur: number | null; dettes_eur: number | null; produits_eur: number | null;
};

const fmtMd = (n: number) => n >= 1e9 ? (n / 1e9).toLocaleString("fr-FR", { maximumFractionDigits: 2 }) + " Md€" : (n / 1e6).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " M€";

// Une barre de classement : label + barre (largeur relative au max) + valeur, parti courant surligné.
function Ranking({ rows, currentSlug, format, accent }: {
  rows: { slug: string; label: string; color: string; value: number; display: string }[];
  currentSlug: string; format: (n: number) => string; accent: string;
}) {
  const max = Math.max(1, ...rows.map(r => r.value));
  return (
    <div className="space-y-2">
      {rows.map((r, i) => {
        const me = r.slug === currentSlug;
        return (
          <div key={r.slug} className={`flex items-center gap-3 rounded-xl px-2 py-1.5 transition ${me ? "bg-slate-50 ring-2" : ""}`} style={me ? { boxShadow: `0 0 0 2px ${accent}55, 0 6px 18px ${accent}22` } : undefined}>
            <span className={`w-6 shrink-0 text-right font-black tabular-nums ${me ? "text-[13px]" : "text-[11px] text-slate-400"}`} style={me ? { color: accent } : undefined}>{i + 1}</span>
            <span className={`w-16 shrink-0 truncate uppercase ${me ? "text-[13px] font-black text-slate-900" : "text-xs font-black text-slate-500"}`} title={r.label}>{r.label}</span>
            <div className="h-3.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div className={`h-full overflow-hidden rounded-full ${me ? "bar-shine" : ""}`} style={{ width: `${(r.value / max) * 100}%`, background: me ? accent : `${r.color || "#94a3b8"}`, opacity: me ? 1 : 0.5, boxShadow: me ? `0 0 12px ${accent}` : undefined }} />
            </div>
            <span className={`shrink-0 text-right tabular-nums ${me ? "w-24 text-base font-black" : "w-20 text-xs font-black text-slate-500"}`} style={me ? { color: accent } : undefined}>{r.display}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function PartyFinanceCompare({ currentSlug }: { currentSlug: string }) {
  const [rows, setRows] = useState<Fin[] | null>(null);
  useEffect(() => {
    let active = true;
    api.getPartyFinances().then(d => { if (active) setRows(d as Fin[]); }).catch(() => setRows([]));
    return () => { active = false; };
  }, []);
  if (!rows) return null;

  const subv = rows.filter(r => r.subventions_eur != null)
    .map(r => ({ slug: r.slug, label: r.abbrev || r.name, color: r.color || "#10b981", value: r.subventions_eur as number, display: fmtMd(r.subventions_eur as number) }))
    .sort((a, b) => b.value - a.value);

  const dette = rows.filter(r => r.dettes_eur != null && r.produits_eur)
    .map(r => { const t = Math.round(((r.dettes_eur as number) / (r.produits_eur as number)) * 100); return { slug: r.slug, label: r.abbrev || r.name, color: r.color || "#f43f5e", value: t, display: `${t}%` }; })
    .sort((a, b) => b.value - a.value);

  if (subv.length < 2 && dette.length < 2) return null;

  return (
    <div className="mt-5 border-t border-slate-100 pt-5">
      <p className="mb-4 text-[11px] font-black uppercase tracking-widest text-slate-400">Comparaison avec les autres partis</p>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {subv.length >= 2 && (
          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-emerald-700"><Coins className="h-3.5 w-3.5" /> Subventions publiques</p>
            <Ranking rows={subv} currentSlug={currentSlug} format={fmtMd} accent="#059669" />
          </div>
        )}
        {dette.length >= 2 && (
          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-rose-700"><Scale className="h-3.5 w-3.5" /> Taux d'endettement</p>
            <Ranking rows={dette} currentSlug={currentSlug} format={(n) => `${n}%`} accent="#e11d48" />
          </div>
        )}
      </div>
    </div>
  );
}
