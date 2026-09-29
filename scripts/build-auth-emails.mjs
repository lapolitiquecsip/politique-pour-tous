/**
 * Modèles des e-mails d'authentification (Supabase Auth), à l'identité du site.
 *
 * Un seul gabarit pour tous : logo et nom du site en tête, carte blanche, bandeau
 * aux couleurs du logo, bouton en dégradé. Mise en page en TABLEAUX et styles en
 * ligne : c'est la seule qui tienne dans Gmail, Outlook et les messageries mobiles
 * (pas de flexbox, pas de feuille de style, pas de SVG). Le logo est un PNG servi
 * par le site lui-même.
 *
 * Usage :
 *   node scripts/build-auth-emails.mjs            # écrit supabase/templates/*.html
 * puis pousser vers l'Auth (voir supabase/templates/README.md).
 */
import fs from "node:fs";
import path from "node:path";

const SITE = "https://lapolitiquecestsimple.fr";
const LOGO = `${SITE}/icons/icon-192.png`;
const ROSE = "#e11d74";
const DEGRADE = "linear-gradient(90deg,#f43f5e 0%,#d946ef 55%,#a855f7 100%)";
const POLICE = "Arial,Helvetica,sans-serif";

/** Le gabarit commun. `apres` s'insère sous le bouton, dans la carte. */
function gabarit({ titreOnglet, avantPropos, surtitre, titre, texte, bouton, apres = "", note }) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${titreOnglet}</title>
</head>
<body style="margin:0;padding:0;background:#f5f3ec;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${avantPropos}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f5f3ec;">
  <tr>
    <td align="center" style="padding:36px 16px 40px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">

        <!-- La marque -->
        <tr>
          <td align="center" style="padding:0 0 24px;">
            <a href="${SITE}" style="text-decoration:none;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="${LOGO}" width="52" height="52" alt="La Politique, C'est Simple" style="display:block;border:0;outline:none;border-radius:14px;">
                  </td>
                  <td style="vertical-align:middle;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:15px;line-height:19px;font-weight:900;color:#0f172a;letter-spacing:0.3px;text-align:left;">
                    LA POLITIQUE,<br>C'EST <span style="background:#10b981;color:#ffffff;padding:1px 6px;border-radius:5px;">SIMPLE.</span>
                  </td>
                </tr>
              </table>
            </a>
          </td>
        </tr>

        <!-- La carte -->
        <tr>
          <td style="background:#ffffff;border-radius:24px;border:1px solid #ece8dc;overflow:hidden;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr><td style="height:6px;line-height:6px;font-size:0;background:${ROSE};background-image:${DEGRADE};border-radius:24px 24px 0 0;">&nbsp;</td></tr>
              <tr>
                <td style="padding:40px 40px 36px;font-family:${POLICE};">
                  <p style="margin:0 0 10px;font-size:12px;line-height:16px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#c026d3;">${surtitre}</p>
                  <h1 style="margin:0 0 16px;font-size:26px;line-height:33px;font-weight:800;color:#0f172a;">${titre}</h1>
                  <p style="margin:0 0 30px;font-size:16px;line-height:26px;color:#475569;">${texte}</p>

                  <!-- Bouton (couleur pleine en secours, dégradé là où il est lu) -->
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td align="center" bgcolor="${ROSE}" style="border-radius:14px;background:${ROSE};background-image:${DEGRADE};">
                        <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:16px 34px;font-family:${POLICE};font-size:16px;line-height:20px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:14px;">${bouton}&nbsp;&nbsp;→</a>
                      </td>
                    </tr>
                  </table>
${apres}
                  <p style="margin:30px 0 0;padding-top:22px;border-top:1px solid #f1efe7;font-size:13px;line-height:20px;color:#94a3b8;">
                    Le bouton ne fonctionne pas ? Copiez ce lien dans votre navigateur :<br>
                    <a href="{{ .ConfirmationURL }}" style="color:#c026d3;word-break:break-all;">{{ .ConfirmationURL }}</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Le pied -->
        <tr>
          <td align="center" style="padding:26px 24px 0;font-family:${POLICE};font-size:12px;line-height:19px;color:#94a3b8;">
            ${note}<br>
            <a href="${SITE}" style="color:#64748b;font-weight:700;text-decoration:none;">lapolitiquecestsimple.fr</a> · La vie politique, expliquée simplement.
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>
`;
}

/** Ce que le nouveau membre va trouver : donne une raison de cliquer. */
const avantages = `
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:32px;background:#faf8f2;border-radius:16px;">
                    <tr><td style="padding:20px 22px 6px;font-family:${POLICE};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#64748b;">Ce qui vous attend</td></tr>
                    ${[
                      ["🗳️", "Les votes de vos élus", "Député, sénateur, eurodéputé : chaque vote, expliqué."],
                      ["📜", "Les lois en clair", "Ce qui change pour vous, sans jargon."],
                      ["🔔", "Des alertes sur votre territoire", "Votre commune, votre département, votre région."],
                    ].map(([ico, t, d]) => `<tr>
                      <td style="padding:8px 22px;font-family:${POLICE};">
                        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                          <td style="width:34px;vertical-align:top;font-size:20px;line-height:24px;">${ico}</td>
                          <td style="vertical-align:top;font-size:14px;line-height:21px;color:#334155;"><strong style="color:#0f172a;">${t}</strong><br>${d}</td>
                        </tr></table>
                      </td>
                    </tr>`).join("\n                    ")}
                    <tr><td style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>
                  </table>`;

const modeles = {
  confirmation: {
    sujet: "Bienvenue ! Confirmez votre adresse — La Politique, C'est Simple",
    html: gabarit({
      titreOnglet: "Confirmez votre adresse",
      avantPropos: "Un clic pour activer votre compte La Politique, C'est Simple.",
      surtitre: "Bienvenue",
      titre: "Confirmez votre adresse e-mail",
      texte: "Merci de nous rejoindre ! Il ne reste qu'une étape pour activer votre compte : confirmez que cette adresse est bien la vôtre.",
      bouton: "Activer mon compte",
      apres: avantages,
      note: "Vous n'avez pas créé de compte ? Ignorez simplement ce message, rien ne sera activé.",
    }),
  },
  recovery: {
    sujet: "Votre nouveau mot de passe — La Politique, C'est Simple",
    html: gabarit({
      titreOnglet: "Nouveau mot de passe",
      avantPropos: "Choisissez un nouveau mot de passe en un clic.",
      surtitre: "Mot de passe oublié",
      titre: "Choisissez un nouveau mot de passe",
      texte: "Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous : vous pourrez en choisir un nouveau et serez connecté aussitôt.",
      bouton: "Choisir un mot de passe",
      note: "Vous n'avez rien demandé ? Ignorez ce message : votre mot de passe reste inchangé.",
    }),
  },
  magic_link: {
    sujet: "Votre lien de connexion — La Politique, C'est Simple",
    html: gabarit({
      titreOnglet: "Votre lien de connexion",
      avantPropos: "Connectez-vous en un clic, sans mot de passe.",
      surtitre: "Connexion",
      titre: "Votre lien de connexion",
      texte: "Cliquez sur le bouton ci-dessous pour vous connecter. Ce lien est personnel et ne sert qu'une fois.",
      bouton: "Me connecter",
      note: "Vous n'avez pas demandé à vous connecter ? Ignorez ce message.",
    }),
  },
  email_change: {
    sujet: "Confirmez votre nouvelle adresse — La Politique, C'est Simple",
    html: gabarit({
      titreOnglet: "Confirmez votre nouvelle adresse",
      avantPropos: "Confirmez le changement d'adresse de votre compte.",
      surtitre: "Changement d'adresse",
      titre: "Confirmez votre nouvelle adresse",
      texte: "Vous avez demandé à remplacer l'adresse de votre compte par <strong style=\"color:#0f172a;\">{{ .NewEmail }}</strong>. Confirmez ce changement pour qu'il prenne effet.",
      bouton: "Confirmer le changement",
      note: "Vous n'êtes pas à l'origine de cette demande ? Ignorez ce message et changez votre mot de passe.",
    }),
  },
};

const dossier = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "supabase", "templates");
fs.mkdirSync(dossier, { recursive: true });
for (const [nom, m] of Object.entries(modeles)) fs.writeFileSync(path.join(dossier, `${nom}.html`), m.html);
fs.writeFileSync(path.join(dossier, "sujets.json"), JSON.stringify(Object.fromEntries(Object.entries(modeles).map(([n, m]) => [n, m.sujet])), null, 2) + "\n");
console.log(`${Object.keys(modeles).length} modèles écrits dans ${dossier}`);
