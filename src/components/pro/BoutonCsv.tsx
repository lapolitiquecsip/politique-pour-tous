"use client";

import { Download } from "lucide-react";

/** Bouton « Export CSV » des écrans Pro ; grisé tant qu'il n'y a rien à exporter. */
export default function BoutonCsv({ onClick, disabled = false, libelle = "Export CSV", className = "" }: { onClick: () => void; disabled?: boolean; libelle?: string; className?: string }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-border bg-card px-3 text-[12px] font-black text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40 ${className}`}>
      <Download size={13} /> {libelle}
    </button>
  );
}
