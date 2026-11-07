/**
 * Export CSV commun à tout l'espace Pro.
 *
 * Format pensé pour Excel en français : séparateur « ; », BOM UTF-8 (sinon les accents sont
 * cassés), fins de ligne CRLF, décimales à virgule. Une cellule de texte qui commence par
 * = + - @ est désamorcée (Excel l'exécuterait comme une formule : un titre de presse relevé
 * automatiquement pourrait en contenir) ; un nombre négatif reste un nombre.
 */
export type Cellule = string | number | boolean | null | undefined | Date;

function cellule(v: Cellule): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "oui" : "non";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return Number.isFinite(v) ? String(v).replace(".", ",") : "";
  let s = String(v).replace(/\r?\n/g, " ").trim();
  if (/^[=+\-@\t]/.test(s) && !/^-?\d+([.,]\d+)?$/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export function versCsv(entete: string[], lignes: Cellule[][]): string {
  return "﻿" + [entete.map(cellule).join(";"), ...lignes.map(l => l.map(cellule).join(";"))].join("\r\n");
}

/** Télécharge le fichier « nom-AAAA-MM-JJ.csv ». */
export function telechargerCsv(nom: string, entete: string[], lignes: Cellule[][]) {
  const url = URL.createObjectURL(new Blob([versCsv(entete, lignes)], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${nom}-${new Date().toISOString().slice(0, 10)}.csv`;
  // Dans la page, et libéré plus tard : Firefox et Safari annulent un téléchargement dont le lien
  // est détaché ou révoqué dans la foulée du clic.
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
