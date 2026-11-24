/**
 * Retrouver la page vidéo d'une réunion de l'Assemblée à partir de son compte rendu (lien direct,
 * ou lien court assnat.fr). Partagé par la transcription (transcribe-auditions.ts) et par la
 * collecte des fichiers vidéo lus sur le site (videos-commissions.ts).
 */
import { request as requeteHttps } from "node:https";
import { rootCertificates } from "node:tls";

const UA = "lapolitiquecestsimple/1.0 (+https://lapolitiquecestsimple.fr)";

export function texteBrut(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#xa0;|&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * assnat.fr ne présente que son certificat final, sans l'intermédiaire « GandiCert » : les
 * navigateurs vont chercher le maillon manquant à l'adresse indiquée dans le certificat ; Node
 * ne le fait pas et refuse la connexion (« unable to verify the leaf signature »).
 * On fait comme le navigateur : on télécharge cet intermédiaire chez DigiCert et on l'ajoute
 * aux autorités racines. La chaîne est alors vérifiée jusqu'au bout — un intermédiaire falsifié
 * ne se rattacherait à aucune racine reconnue.
 */
let autorites: string[] | null = null;
async function autoritesAssnat(): Promise<string[]> {
  if (autorites) return autorites;
  const r = await fetch("http://cacerts.digicert.com/GandiCert.crt", { signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`certificat intermédiaire : HTTP ${r.status}`);
  const der = Buffer.from(await r.arrayBuffer());
  const pem = `-----BEGIN CERTIFICATE-----\n${der.toString("base64").match(/.{1,64}/g)!.join("\n")}\n-----END CERTIFICATE-----\n`;
  return (autorites = [...rootCertificates, pem]);
}

async function suivreLienCourt(url: string): Promise<string | null> {
  const ca = await autoritesAssnat();
  return new Promise(resolve => {
    const r = requeteHttps(url, { method: "HEAD", ca, headers: { "User-Agent": UA } }, res => {
      res.resume();
      resolve(typeof res.headers.location === "string" ? res.headers.location : null);
    });
    r.on("error", () => resolve(null));
    r.end();
  });
}

/** La page de la vidéo d'une réunion, lue dans son compte rendu (lien direct ou lien court). */
export async function pageVideo(crUrl: string): Promise<string | null> {
  const r = await fetch(crUrl, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(60_000) });
  if (!r.ok) throw new Error(`compte rendu : HTTP ${r.status}`);
  const html = await r.text();
  const directe = html.match(/https?:\/\/videos\.assemblee-nationale\.fr\/video\.\d+_[0-9a-f]+[^"'\s<]*/i)?.[0];
  if (directe) return directe.replace(/^http:/, "https:");
  const court = texteBrut(html).match(/(?:https?:\/\/)?assnat\.fr\/\w+/)?.[0];
  if (!court) return null;
  const page = await suivreLienCourt(court.startsWith("http") ? court.replace(/^http:/, "https:") : `https://${court}`);
  // Garde-fou : on n'ira lire que chez l'Assemblée nationale.
  if (!page || !/^https?:\/\/videos\.assemblee-nationale\.fr\/video\.\d+_/.test(page)) return null;
  return page.replace(/^http:/, "https:");
}
