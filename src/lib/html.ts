/**
 * Convertit un fragment HTML (souvent renvoyé par les sources officielles :
 * balises `<p>`, `<body>`, entités numériques `&#233;`/`&#8217;`, CDATA…) en
 * texte brut lisible. Utilisé notamment pour l'objet des amendements.
 */
export function cleanHtmlText(input?: string | null): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[/gi, "")
    .replace(/\]\]>/gi, "")
    .replace(/<[^>]*>/g, " ")
    // Entités numériques (décimales et hexadécimales) — cas des accents FR
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    // Entités nommées courantes
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&(apos|#39);/gi, "'")
    .replace(/&(rsquo|lsquo);/gi, "'")
    .replace(/&(rdquo|ldquo);/gi, '"')
    .replace(/&hellip;/gi, "…")
    .replace(/&(ndash|mdash);/gi, "–")
    // Normalisation des espaces
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalise le statut d'un amendement vers un libellé FR propre.
 * Les valeurs en base sont abîmées par l'encodage : double-encodage UTF-8
 * (« AssemblÃ©e ») ou perte pure et simple de l'accent (« Adopt� »). Comme
 * ce statut est un vocabulaire fermé, on reconstitue le libellé correct à
 * partir des lettres restantes plutôt que de tenter de réparer les octets.
 */
export function formatAmendmentOutcome(raw?: string | null): string {
  const text = cleanHtmlText(raw);
  if (!text) return "En attente";
  // Clé insensible aux accents, à la casse, aux espaces et aux caractères cassés
  const key = text.toLowerCase().replace(/[^a-z]/g, "");
  if (key.includes("napasadopt")) return "L'Assemblée nationale n'a pas adopté";
  if (key.includes("assemble") && key.includes("adopt")) return "L'Assemblée nationale a adopté";
  if (key.startsWith("adopt")) return "Adopté";
  if (key.startsWith("rejet")) return "Rejeté";
  if (key.startsWith("retir")) return "Retiré";
  if (key.startsWith("tomb")) return "Tombé";
  if (key.startsWith("nonsoutenu")) return "Non soutenu";
  if (key.startsWith("satisfait")) return "Satisfait ou sans objet";
  if (key.startsWith("enattente")) return "En attente";
  return text;
}
