import missionsRaw from "./missions.json";
import { LIBELLE_COURT, type Mission, type PlfAnnee } from "./index";

export const MISSIONS = missionsRaw as unknown as Record<string, Mission[]>;
export const missionsDe = (a: PlfAnnee) => MISSIONS[String(a)];
export const libelleCourt = (m: Mission) => LIBELLE_COURT[m.cle] ?? m.mission;
/** total des crédits de paiement du budget général (y c. remboursements et dégrèvements), en € */
export const totalCP = (a: PlfAnnee) => missionsDe(a).reduce((s, m) => s + m.cp, 0);
