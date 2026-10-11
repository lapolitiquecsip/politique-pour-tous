import missionsRaw from "./missions.json";
import lfiRaw from "./lfi-precedente.json";
import { LIBELLE_COURT, type Mission, type PlfAnnee } from "./index";

export const MISSIONS = missionsRaw as unknown as Record<string, Mission[]>;
export const missionsDe = (a: PlfAnnee) => MISSIONS[String(a)];
export const libelleCourt = (m: Mission) => LIBELLE_COURT[m.cle] ?? m.mission;
/** total des crédits de paiement du budget général (y c. remboursements et dégrèvements), en € */
export const totalCP = (a: PlfAnnee) => missionsDe(a).reduce((s, m) => s + m.cp, 0);

/**
 * Crédits VOTÉS l'année précédente (LFI N-1), par mission, tels que rappelés dans l'annexe de
 * chaque PLF (2025, 2026, 2027). Extrait par scripts/plf/extraire-lfi-precedente.py.
 */
const LFI = lfiRaw as unknown as Record<string, Record<string, { ae: number; cp: number }>>;
export const lfiPrecedente = (a: PlfAnnee, cle: string) => LFI[String(a)]?.[cle] ?? null;
export const totalLfiPrecedente = (a: PlfAnnee) => Object.values(LFI[String(a)] ?? {}).reduce((s, v) => s + v.cp, 0);
